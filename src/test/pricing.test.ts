import { describe, expect, it } from "vitest";
import { computeCart } from "@/lib/pricing";

const products = [
  { id: "p1", name: "X-Burger", price: 29.9, available: true },
  { id: "p2", name: "Esgotado", price: 10, available: false },
];
const modifiers = [
  { id: "m1", product_id: "p1", name: "Bacon", price: 5 },
  { id: "m2", product_id: "p2", name: "Outro", price: 99 },
];

describe("computeCart", () => {
  it("uses menu prices plus modifiers and delivery fee", () => {
    const r = computeCart([{ product_id: "p1", qty: 2, modifier_ids: ["m1"] }], products, modifiers, "delivery", 6);
    expect(r.subtotal).toBe(69.8);
    expect(r.fee).toBe(6);
    expect(r.total).toBe(75.8);
  });
  it("rejects unavailable or unknown products", () => {
    const r = computeCart([{ product_id: "p2", qty: 1 }, { product_id: "zzz", qty: 1 }], products, modifiers, "pickup", 6);
    expect(r.lines).toHaveLength(0);
    expect(r.rejected).toEqual(["p2", "zzz"]);
  });
  it("ignores modifiers from other products and charges no fee on pickup", () => {
    const r = computeCart([{ product_id: "p1", qty: 1, modifier_ids: ["m2"] }], products, modifiers, "pickup", 6);
    expect(r.total).toBe(29.9);
  });
});
