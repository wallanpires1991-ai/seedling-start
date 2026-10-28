import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ establishmentId: z.string().uuid(), action: z.enum(["status", "qr", "disconnect"]) });

export const whatsappAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { data: m } = await context.supabase.from("memberships").select("role").eq("establishment_id", data.establishmentId).eq("user_id", context.userId).maybeSingle();
    if (!m || m.role !== "owner") return { error: "Apenas o dono pode conectar o WhatsApp." };

    const { zapi, zapiInstanceId, WEBHOOK_BASE } = await import("./zapi.server");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    let instanceId: string;
    try { instanceId = zapiInstanceId(); } catch { return { error: "Serviço de WhatsApp ainda não configurado." }; }

    const { data: owner } = await db.from("establishments").select("id").eq("whatsapp_instance_id", instanceId).maybeSingle();
    if (owner && owner.id !== data.establishmentId) return { error: "O número de teste já está em uso por outro restaurante." };

    try {
      if (data.action === "disconnect") {
        await zapi("disconnect");
        await db.from("establishments").update({ whatsapp_status: "pending", whatsapp_phone: null }).eq("id", data.establishmentId);
        return { connected: false };
      }
      const st = await zapi<{ connected?: boolean; smartphoneConnected?: boolean }>("status");
      if (st.connected) {
        let phone: string | null = null;
        try { const d = await zapi<{ phone?: string }>("device"); phone = d.phone ?? null; } catch { /* optional */ }
        await zapi("update-webhook-received", { method: "PUT", body: { value: `${WEBHOOK_BASE}?token=${process.env["ZAPI_WEBHOOK_SECRET"]}` } });
        await db.from("establishments").update({ whatsapp_status: "connected", whatsapp_instance_id: instanceId, whatsapp_phone: phone }).eq("id", data.establishmentId);
        return { connected: true, phone };
      }
      if (owner) await db.from("establishments").update({ whatsapp_status: "pending" }).eq("id", data.establishmentId);
      if (data.action === "qr") {
        const q = await zapi<{ value?: string }>("qr-code/image");
        return { connected: false, qr: q.value ?? null };
      }
      return { connected: false };
    } catch (e) {
      console.error("whatsappAction", e);
      return { error: "Não foi possível falar com o serviço de WhatsApp. Confira as chaves da Z-API." };
    }
  });
