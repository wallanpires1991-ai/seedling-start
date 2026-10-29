// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";

const token = process.env['WALPIC_TEST_ACCESS_TOKEN'];
const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
describe.skipIf(!token || !url || !key)("authenticated order safeguards", () => {
  const db = createClient<Database>(url ?? "http://localhost", key ?? "test", {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  let estId = "";
  let productId = "";
  let price = 0;
  let min = 0;
  let orderId = "";
  const requestKey = `phase1-${crypto.randomUUID()}`;
  beforeAll(async () => {
    const { data, error } = await db.from("memberships").select("establishment_id").order("created_at").limit(1).single();
    expect(error).toBeNull();
    if (!data) throw new Error("Test membership unavailable");
    estId = data.establishment_id;
    const [est, product] = await Promise.all([
      db.from("establishments").select("min_order").eq("id", estId).single(),
      db.from("products").select("id,price").eq("establishment_id", estId).eq("available", true).gt("price", 0).order("price", { ascending: false }).limit(1).single(),
    ]);
    if (!est.data || !product.data) throw new Error("Test menu unavailable");
    min = Number(est.data.min_order); productId = product.data.id; price = Number(product.data.price);
  });
  const args = () => ({ _est: estId, _items: [{ product_id: productId, qty: Math.max(1, Math.ceil(min / price)), modifier_ids: [] }], _customer_name: "Verificação fase 1 — TESTE", _customer_phone: "", _fulfillment: "pickup", _address: "", _payment_method: "on_delivery", _is_test: true, _idempotency_key: requestKey, _source: "simulator" });
  it("repeated concurrent confirmations create one tenant order", async () => {
    const [a, b] = await Promise.all([db.rpc("place_order", args()), db.rpc("place_order", args())]);
    expect(a.error).toBeNull(); expect(b.error).toBeNull(); expect(a.data).toBe(b.data);
    if (!a.data) throw new Error("Order missing");
    orderId = a.data;
    const { data } = await db.from("orders").select("total,is_test,payment_status,establishment_id").eq("id", orderId).single();
    expect(data?.total).toBe(price * Math.max(1, Math.ceil(min / price)));
    expect(data?.is_test).toBe(true); expect(data?.payment_status).toBe("test"); expect(data?.establishment_id).toBe(estId);
  });
  it("cannot reuse a key through an unauthorized restaurant", async () => {
    const r = await db.rpc("place_order", { ...args(), _est: crypto.randomUUID() });
    expect(r.error).not.toBeNull(); expect(r.data).toBeNull();
  });
  it("staff cannot overwrite money or payment confirmation", async () => {
    const r = await db.from("orders").update({ total: 0, payment_status: "paid" }).eq("id", orderId);
    expect(r.error).not.toBeNull();
  });
  it("rejects quantities outside 1 to 50", async () => {
    const r = await db.rpc("place_order", { ...args(), _idempotency_key: requestKey + "-qty", _items: [{ product_id: productId, qty: 0 }] });
    expect(r.error?.message).toContain("quantidade");
  });
  it("rejects additions not belonging to this product", async () => {
    const r = await db.rpc("place_order", { ...args(), _idempotency_key: requestKey + "-mods", _items: [{ product_id: productId, qty: 1, modifier_ids: [crypto.randomUUID()] }] });
    expect(r.error?.message).toContain("adicional");
  });
  it("requires an address for delivery", async () => {
    const r = await db.rpc("place_order", { ...args(), _idempotency_key: requestKey + "-address", _fulfillment: "delivery" });
    expect(r.error?.message).toContain("endereço");
  });
  it("never converts simulator requests into real orders", async () => {
    const r = await db.rpc("place_order", { ...args(), _idempotency_key: requestKey + "-real", _is_test: false });
    expect(r.error?.message).toContain("teste");
  });
  it("rejects invalid status jumps, permits kitchen steps and cancels this test", async () => {
    expect((await db.rpc("transition_order", { _id: orderId, _status: "delivered" })).error).not.toBeNull();
    expect((await db.rpc("transition_order", { _id: orderId, _status: "preparing" })).error).toBeNull();
    expect((await db.rpc("transition_order", { _id: orderId, _status: "ready" })).error).toBeNull();
    expect((await db.rpc("transition_order", { _id: orderId, _status: "cancelled" })).error).toBeNull();
  });
});