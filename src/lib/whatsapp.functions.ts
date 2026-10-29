import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { connectionRoleAllowed, qrImage } from "./whatsapp-connection";

const Input = z.object({ establishmentId: z.string().uuid(), action: z.enum(["status", "qr", "disconnect"]) });

export const whatsappAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { data: m, error: membershipError } = await context.supabase.from("memberships").select("role").eq("establishment_id", data.establishmentId).eq("user_id", context.userId).maybeSingle();
    if (membershipError || !connectionRoleAllowed(m?.role)) return { error: "Apenas o dono pode conectar o WhatsApp." };

    const { zapi, zapiInstanceId, WEBHOOK_BASE, ZapiError } = await import("./zapi.server");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    let instanceId: string;
    try { instanceId = zapiInstanceId(); } catch { return { error: "Serviço de WhatsApp ainda não configurado." }; }

    const { data: owner, error: ownerError } = await db.from("establishments").select("id").eq("whatsapp_instance_id", instanceId).maybeSingle();
    if (ownerError) return { error: "Não foi possível verificar o restaurante desta conexão." };
    if (owner && owner.id !== data.establishmentId) return { error: "Esta instância já está em uso por outro restaurante. Cada restaurante precisa de sua própria conexão." };
    const update = async (values: { whatsapp_status: string; whatsapp_phone?: string | null; whatsapp_instance_id?: string }) => {
      const { error } = await db.from("establishments").update(values).eq("id", data.establishmentId);
      if (error) throw new Error("Não foi possível salvar a conexão.");
    };

    try {
      if (data.action === "disconnect") {
        await zapi("disconnect");
        await update({ whatsapp_status: "pending", whatsapp_phone: null });
        return { connected: false };
      }
      const st = await zapi<{ connected?: boolean; smartphoneConnected?: boolean }>("status");
      if (st.connected) {
        let phone: string | null = null;
        try { const d = await zapi<{ phone?: string }>("device"); phone = d.phone ?? null; } catch { /* optional */ }
        const webhookSecret = process.env["ZAPI_WEBHOOK_SECRET"];
        if (!webhookSecret) return { error: "Número conectado, mas o recebimento de mensagens ainda não está configurado." };
        await zapi("update-webhook-received", { method: "PUT", body: { value: `${WEBHOOK_BASE}?token=${encodeURIComponent(webhookSecret)}` } });
        await update({ whatsapp_status: "connected", whatsapp_instance_id: instanceId, whatsapp_phone: phone });
        return { connected: true, phone };
      }
      if (owner) await update({ whatsapp_status: "pending" });
      if (data.action === "qr") {
        const q = await zapi<{ value?: string }>("qr-code/image");
        const image = qrImage(q.value);
        if (!image) return { error: "A Z-API não retornou um QR code válido. Gere novamente em alguns instantes." };
        return { connected: false, qr: image };
      }
      return { connected: false };
    } catch (e) {
      if (e instanceof ZapiError) {
        if (e.status === 400 || e.status === 401 || e.status === 403 || e.status === 404) return { error: `A Z-API recusou a conexão (${e.status}). Confira a instância ativa e as três chaves.` };
        if (e.status === 402) return { error: "Verifique o plano e o pagamento da sua instância na Z-API." };
      }
      return { error: "Não foi possível falar com o serviço de WhatsApp. Confira as chaves da Z-API." };
    }
  });
