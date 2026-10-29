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
        const { data: est, error: estError } = await db.from("establishments").select("id").eq("whatsapp_instance_id", p.instanceId).maybeSingle();
        if (estError) return new Response("db error", { status: 503 });
        if (!est) return new Response("no establishment");
        // Provider ID is namespaced; duplicates are retained without racing inserts.
        const { error: receiptError } = await db.from("whatsapp_webhook_events").upsert({
          message_id: `${est.id}:${p.messageId}`, provider_message_id: p.messageId,
          establishment_id: est.id, phone: p.phone, payload: raw as never,
        }, { onConflict: "message_id", ignoreDuplicates: true });
        if (receiptError) return new Response("db error", { status: 503 });
        try {
          const { recoverZapiEvents } = await import("@/lib/zapi-processing.server");
          await recoverZapiEvents(db);
          return new Response("ok");
        } catch {
          return new Response("processing pending", { status: 503 });
        }
      },
    },
  },
});
