import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { runAttendant } from "./attendant.server";
import { sendText } from "./zapi.server";
import { brl } from "./pricing";

type Event = Database["public"]["Tables"]["whatsapp_webhook_events"]["Row"];
type Msg = { role: "user" | "assistant"; content: string };
type Result = Exclude<Awaited<ReturnType<typeof runAttendant>>, { error: string }>;
type Checkpoint = { result?: Result; messages?: Msg[]; session?: number; reply_state?: string; confirmation_state?: string; reply_id?: string; confirmation_id?: string; order_id?: string };

// Invoked only after webhook verification. No automatic resend after uncertain sends.
export async function recoverZapiEvents(db: SupabaseClient<Database>) {
  const { data: events, error } = await db.rpc("claim_zapi_events", { _limit: 1 });
  if (error) throw error;
  for (const event of events ?? []) await processEvent(db, event);
}

async function processEvent(db: SupabaseClient<Database>, event: Event) {
  const cp = (event.checkpoint ?? {}) as Checkpoint;
  const save = async () => {
    const { error } = await db.from("whatsapp_webhook_events").update({ checkpoint: cp as unknown as Json }).eq("id", event.id);
    if (error) throw error;
  };
  const send = async (kind: "reply" | "confirmation", phone: string, body: string) => {
    const key = kind === "reply" ? "reply_state" : "confirmation_state";
    if (cp[key] === "accepted") return;
    if (cp[key] === "sending") throw new Error("Envio de resultado incerto; revisão necessária");
    cp[key] = "sending";
    await save();
    // A network failure or missing provider ID remains ambiguous, never blindly replayed.
    const response = await sendText(phone, body);
    if (!response.messageId) throw new Error("Serviço não retornou identificação do envio; revisão necessária");
    cp[key] = "accepted";
    if (kind === "reply") cp.reply_id = response.messageId;
    else cp.confirmation_id = response.messageId;
    await save();
  };
  try {
    if (!event.establishment_id || !event.phone) throw new Error("Evento sem restaurante ou telefone");
    const payload = event.payload as { senderName?: string; text?: { message?: string } };
    if (!payload.text?.message) throw new Error("Evento sem mensagem de texto");
    const { data: est, error: estError } = await db.from("establishments").select("automation_active").eq("id", event.establishment_id).single();
    if (estError) throw estError;
    const { error: insertError } = await db.from("whatsapp_conversations").upsert({ establishment_id: event.establishment_id, phone: event.phone, customer_name: payload.senderName ?? null }, { onConflict: "establishment_id,phone", ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data: conv, error: convError } = await db.from("whatsapp_conversations").select("*").eq("establishment_id", event.establishment_id).eq("phone", event.phone).single();
    if (convError) throw convError;
    const messages = cp.messages ?? [...((conv.messages ?? []) as Msg[]), { role: "user" as const, content: payload.text.message.slice(0, 2000) }].slice(-30);
    // Preserve inbound history but stop automation immediately during human takeover.
    if (conv.handoff || !est.automation_active) {
      const { error: doneError } = await db.rpc("complete_zapi_event", { _event: event.id, _conversation: conv.id, _messages: messages as Json, _session: conv.session, _order: conv.last_order_id ?? null as unknown as string, _handoff: conv.handoff, _name: conv.customer_name ?? "" });
      if (doneError) throw doneError;
      return;
    }
    let result = cp.result;
    if (!result) {
      const r = await runAttendant(db, event.establishment_id, messages);
      if ("error" in r) throw new Error(r.error);
      result = r;
      cp.result = r;
      cp.messages = messages;
      cp.session = conv.session;
      await save();
    }
    await send("reply", event.phone, result.reply);
    let session = cp.session ?? conv.session;
    let order = cp.order_id ?? conv.last_order_id;
    let updated: Msg[] = [...messages, { role: "assistant", content: result.reply }];
    if (result.readyToConfirm && result.fulfillment !== "unknown" && !result.handoffHuman) {
      const { data: orderId, error: orderError } = await db.rpc("place_order", {
        _est: event.establishment_id, _items: result.cartInput, _customer_name: result.customerName,
        _customer_phone: event.phone, _fulfillment: result.fulfillment, _address: result.address,
        _payment_method: "on_delivery", _is_test: false,
        _idempotency_key: `wa-${event.establishment_id}-${event.phone}-${session}`, _source: "whatsapp",
      });
      if (orderError) throw orderError;
      cp.order_id = orderId;
      await save();
      const { data: saved, error: readError } = await db.from("orders").select("code,total,delivery_fee,order_items(*)").eq("id", orderId).eq("establishment_id", event.establishment_id).single();
      if (readError) throw readError;
      await send("confirmation", event.phone, `✅ Pedido #${saved.code} recebido!\n\n${saved.order_items.map((l) => `${l.qty}x ${l.name} — ${brl(Number(l.line_total))}`).join("\n")}\nEntrega: ${brl(Number(saved.delivery_fee))}\nTotal: ${brl(Number(saved.total))}\nPagamento na entrega ou retirada.\n${result.fulfillment === "pickup" ? "Retirada no local" : `Entrega: ${result.address}`}\nPreparo estimado: ${result.est.prep_minutes} min.`);
      session += 1;
      order = orderId;
      updated = [];
    }
    const { error: doneError } = await db.rpc("complete_zapi_event", {
      _event: event.id, _conversation: conv.id, _messages: updated as Json, _session: session,
      _order: order ?? null as unknown as string, _handoff: result.handoffHuman, _name: result.customerName,
    });
    if (doneError) throw doneError;
  } catch (error) {
    const ambiguous = cp.reply_state === "sending" || cp.confirmation_state === "sending";
    const { error: writeError } = await db.from("whatsapp_webhook_events").update({
      checkpoint: cp as unknown as Json, processing_state: ambiguous ? "awaiting_review" : "pending",
      processing_error: ambiguous ? "Envio de resultado incerto; revisão necessária" : "Processamento incompleto; aguardando recuperação",
      lease_until: null, next_attempt_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(event.attempts, 7))).toISOString(),
    }).eq("id", event.id);
    if (writeError) throw writeError;
    // No raw provider errors or customer contents in logs.
    console.error("zapi processing pending", event.id, ambiguous ? "awaiting_review" : "retryable");
    throw error;
  }
}