// Z-API (WhatsApp via QR code) client. Server-only.
export const WEBHOOK_BASE = "https://seedling-start.lovable.app/api/public/zapi/webhook";

function cfg() {
  const id = process.env["ZAPI_INSTANCE_ID"];
  const token = process.env["ZAPI_INSTANCE_TOKEN"];
  const client = process.env["ZAPI_CLIENT_TOKEN"];
  if (!id || !token || !client) throw new Error("Z-API não configurada");
  return { id, base: `https://api.z-api.io/instances/${id}/token/${token}`, client };
}

export function zapiInstanceId() {
  return cfg().id;
}

export async function zapi<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { base, client } = cfg();
  const res = await fetch(`${base}/${path}`, {
    method: init?.method ?? "GET",
    headers: { "Client-Token": client, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Z-API ${path} falhou [${res.status}]: ${text.slice(0, 300)}`);
  try { return JSON.parse(text) as T; } catch { return text as T; }
}

export function sendText(phone: string, message: string) {
  return zapi<{ messageId?: string }>("send-text", { method: "POST", body: { phone, message } });
}
