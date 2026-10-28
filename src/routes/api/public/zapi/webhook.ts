import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Payload = z.object({
  instanceId: z.string(),
  messageId: z.string().min(1),
  phone: z.string().min(8).max(20),
  fromMe: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  type: z.string().optional(),
  senderName: z.string().optional(),
  text: z.object({ message: z.string() }).optional(),
}).passthrough();

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export const Route = createFileRoute("/api/public/zapi/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ZAPI_WEBHOOK_SECRET"];
        const token = new URL(request.url).searchParams.get("token");
        if (!secret || token !== secret) return new Response("unauthorized", { status: 401 });

        let raw: unknown;
        try { raw = await request.json(); } catch { return new Response("bad json", { status: 400 }); }
        const parsed = Payload.safeParse(raw);
        if (!parsed.success) return new Response("ignored");
        const p = parsed.data;
        if (p.fromMe || p.isGroup || !p.text?.message) return new Response("ignored");

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: est } = await db.from("establishments").select("id").eq("whatsapp_instance_id", p.instanceId).maybeSingle();
        if (!est) return new Response("no establishment");

        // Durable inbox + dedupe by message id
        const { data: existing } = await db.from("whatsapp_webhook_events").select("id,processed_at").eq("message_id", p.messageId).maybeSingle();
        if (existing?.processed_at) return new Response("duplicate");
        if (!existing) {
          const { error } = await db.from("whatsapp_webhook_events").insert({ message_id: p.messageId, establishment_id: est.id, payload: raw as never });
          if (error) return new Response("db error", { status: 500 });
        }

        try {
          const { runAttendant } = await import("@/lib/attendant.server");
          const { sendText } = await import("@/lib/zapi.server");

          const { data: conv0 } = await db.from("whatsapp_conversations").select("*").eq("establishment_id", est.id).eq("phone", p.phone).maybeSingle();
          let conv = conv0;
          if (!conv) {
            const { data: c, error } = await db.from("whatsapp_conversations").insert({ establishment_id: est.id, phone: p.phone, customer_name: p.senderName ?? null }).select("*").single();
            if (error) throw error;
            conv = c;
          }
          const history = (conv.messages as { role: "user" | "assistant"; content: string }[]) ?? [];
          const msgs = [...history, { role: "user" as const, content: p.text.message.slice(0, 2000) }].slice(-30);

          const r = await runAttendant(db, est.id, msgs);
          if ("error" in r) {
            await sendText(p.phone, "Desculpe, tive um probleminha agora. Já já te respondo! 🙏");
            throw new Error(r.error);
          }
          await sendText(p.phone, r.reply);
          let newMsgs = [...msgs, { role: "assistant" as const, content: r.reply }];
          let session = conv.session;
          let lastOrder = conv.last_order_id;

          if (r.readyToConfirm && r.fulfillment !== "unknown") {
            const { data: orderId, error } = await db.rpc("place_order", {
              _est: est.id, _items: r.cartInput, _customer_name: r.customerName || p.senderName || "Cliente",
              _customer_phone: p.phone, _fulfillment: r.fulfillment, _address: r.address,
              _payment_method: "on_delivery", _is_test: false,
              _idempotency_key: `wa-${est.id}-${p.phone}-${conv.session}`, _source: "whatsapp",
            });
            if (error) throw error;
            const { data: o } = await db.from("orders").select("code,total,fulfillment").eq("id", orderId).single();
            const prep = r.est.prep_minutes;
            await sendText(p.phone,
              `✅ *Pedido #${o?.code} recebido!*\n\n` +
              r.cart.lines.map((l) => `${l.qty}x ${l.name}${l.modifiers.length ? " (+ " + l.modifiers.map((m) => m.name).join(", ") + ")" : ""} — ${brl(l.line_total)}`).join("\n") +
              (r.cart.fee ? `\nTaxa de entrega — ${brl(r.cart.fee)}` : "") +
              `\n\n*Total: ${brl(Number(o?.total ?? r.cart.total))}*\n` +
              (o?.fulfillment === "pickup" ? `Retirada no local em ~${prep} min.` : `Entrega em: ${r.address}\nPrevisão: ~${prep} min.`) +
              `\n\nObrigado pela preferência! 🧡`);
            session += 1; lastOrder = orderId; newMsgs = [];
          }

          await db.from("whatsapp_conversations").update({
            messages: newMsgs, session, last_order_id: lastOrder, handoff: r.handoffHuman,
            customer_name: r.customerName || conv.customer_name, updated_at: new Date().toISOString(),
          }).eq("id", conv.id);
          await db.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("message_id", p.messageId);
          return new Response("ok");
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("zapi webhook failed", msg);
          await db.from("whatsapp_webhook_events").update({ processing_error: msg.slice(0, 500) }).eq("message_id", p.messageId);
          return new Response("ok");
        }
      },
    },
  },
});
