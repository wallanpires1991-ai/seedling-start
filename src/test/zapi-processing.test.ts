import { describe, expect, it, vi } from "vitest";
import { recoverZapiEvents } from "@/lib/zapi-processing.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const { send, ai } = vi.hoisted(() => ({ send: vi.fn(), ai: vi.fn() }));
vi.mock("@/lib/zapi.server", () => ({ sendText: send, sendAudio: vi.fn(async () => ({ messageId: "a" })) }));
vi.mock("@/lib/tts.server", () => ({ synthesizeVoice: vi.fn(async () => null) }));
vi.mock("@/lib/attendant.server", () => ({ runAttendant: ai }));

function fakeDb(handoff: boolean, checkpoint: object) {
  const rpc = vi.fn(async (name: string) => ({ data: name === "claim_zapi_events" ? [{ id: "event", claim_token: "claim", establishment_id: "est", phone: "5511999999999", payload: { text: { message: "oi" } }, checkpoint, attempts: 1 }] : null, error: null }));
  const builder = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ["select", "eq", "upsert", "update", "in", "order", "limit"]) q[method] = () => q;
    q['maybeSingle'] = async () => ({ data: null, error: null });
    q['single'] = async () => ({ data: table === "establishments" ? { automation_active: true } : { id: "conversation", messages: [], handoff, session: 1, last_order_id: null }, error: null });
    q['then'] = (resolve: (r: object) => void) => resolve({ error: null });
    return q;
  };
  return { rpc, from: vi.fn(builder) };
}

describe("durable WhatsApp processing", () => {
  it("does not invoke AI or send while a human owns the conversation", async () => {
    send.mockClear(); ai.mockClear();
    const db = fakeDb(true, {});
    await recoverZapiEvents(db as unknown as SupabaseClient<Database>);
    expect(send).not.toHaveBeenCalled(); expect(ai).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith("finish_zapi_event", expect.objectContaining({ _claim: "claim", _handoff: true, _messages: [{ role: "user", content: "oi" }] }));
  });
  it("resumes after an accepted reply without sending it again", async () => {
    send.mockClear(); ai.mockClear();
    const db = fakeDb(false, { reply_state: "accepted", reply_id: "provider-id", messages: [{ role: "user", content: "oi" }], result: { reply: "Olá", readyToConfirm: false, handoffHuman: false, customerName: "" } });
    await recoverZapiEvents(db as unknown as SupabaseClient<Database>);
    expect(send).not.toHaveBeenCalled(); expect(ai).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith("finish_zapi_event", expect.objectContaining({ _claim: "claim", _messages: [{ role: "user", content: "oi" }, { role: "assistant", content: "Olá" }] }));
  });
  it("never resends a reply whose delivery outcome is uncertain", async () => {
    send.mockClear(); ai.mockClear();
    const db = fakeDb(false, { reply_state: "sending", result: { reply: "Olá", readyToConfirm: false } });
    await expect(recoverZapiEvents(db as unknown as SupabaseClient<Database>)).rejects.toThrow("incerto");
    expect(send).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalledWith("finish_zapi_event", expect.anything());
  });
});