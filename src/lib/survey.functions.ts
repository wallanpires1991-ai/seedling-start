import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Sends the post-delivery satisfaction survey over WhatsApp once per order.
export const sendDeliverySurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // RLS: the caller must be a member of the order's restaurant to read it.
    const { data: order } = await context.supabase.from("orders").select("id,establishment_id,customer_phone,customer_name,code,status,source").eq("id", data.orderId).maybeSingle();
    if (!order || order.status !== "delivered") return { sent: false };
    if (!order.customer_phone || order.source !== "whatsapp") return { sent: false, reason: "Pedido sem WhatsApp do cliente." };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("order_surveys").insert({ establishment_id: order.establishment_id, order_id: order.id, phone: order.customer_phone, customer_name: order.customer_name });
    if (error) return { sent: false }; // already sent for this order
    const { data: est } = await db.from("establishments").select("name,ai_name").eq("id", order.establishment_id).single();
    const first = (order.customer_name ?? "").split(" ")[0];
    try {
      const { sendText } = await import("./zapi.server");
      await sendText(order.customer_phone, `Oi${first ? `, ${first}` : ""}! Aqui é a ${est?.ai_name ?? "Rebeca"}, do ${est?.name ?? "restaurante"} 💚\nSeu pedido #${order.code} foi entregue. De 1 a 5, que nota você dá pra sua experiência? É só responder com o número.`);
      return { sent: true };
    } catch {
      await db.from("order_surveys").update({ state: "failed" }).eq("order_id", order.id);
      return { sent: false, reason: "Não foi possível enviar a pesquisa pelo WhatsApp." };
    }
  });
