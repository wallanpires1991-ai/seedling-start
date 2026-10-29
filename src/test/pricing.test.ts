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
  it("rejects modifiers from other products", () => {
    const r = computeCart([{ product_id: "p1", qty: 1, modifier_ids: ["m2"] }], products, modifiers, "pickup", 6);
    expect(r.lines).toHaveLength(0);
    expect(r.rejected).toEqual(["p1"]);
  });
  it("does not charge delivery for pickup", () => {
    expect(computeCart([{ product_id: "p1", qty: 1 }], products, modifiers, "pickup", 6).total).toBe(29.9);
  });
  it("rejects duplicated paid additions", () => {
    const r = computeCart([{ product_id: "p1", qty: 1, modifier_ids: ["m1", "m1"] }], products, modifiers, "pickup", 6);
    expect(r.lines).toHaveLength(0);
    expect(r.rejected).toEqual(["p1"]);
  });
  it.each([0, -1, 1.5, 51, NaN])("rejects invalid quantity %s", (qty) => {
    expect(computeCart([{ product_id: "p1", qty }], products, modifiers, "pickup", 6).rejected).toEqual(["p1"]);
  });
});
