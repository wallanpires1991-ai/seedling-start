// Pure cart pricing. Prices ALWAYS come from the menu data, never from AI text.
export type MenuProduct = { id: string; name: string; price: number; available: boolean };
export type MenuModifier = { id: string; product_id: string; name: string; price: number };
export type CartInput = { product_id: string; qty: number; modifier_ids?: string[]; notes?: string };
export type CartLine = {
  product_id: string;
  name: string;
  qty: number;
  modifiers: { id: string; name: string; price: number }[];
  notes?: string | undefined;
  unit_price: number;
  line_total: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function computeCart(
  items: CartInput[],
  products: MenuProduct[],
  modifiers: MenuModifier[],
  fulfillment: "delivery" | "pickup" | "unknown",
  deliveryFee: number,
) {
  const lines: CartLine[] = [];
  const rejected: string[] = [];
  for (const it of items) {
    const p = products.find((x) => x.id === it.product_id);
    if (!p || !p.available) {
      rejected.push(it.product_id);
      continue;
    }
    const qty = it.qty;
    const ids = it.modifier_ids ?? [];
    if (!Number.isInteger(qty) || qty < 1 || qty > 50 || new Set(ids).size !== ids.length ||
      ids.some((id) => !modifiers.some((m) => m.id === id && m.product_id === p.id)) ||
      !Number.isFinite(p.price) || p.price < 0) {
      rejected.push(it.product_id);
      continue;
    }
    const mods = ids
      .map((id) => modifiers.find((m) => m.id === id && m.product_id === p.id))
      .filter((m): m is MenuModifier => !!m)
      .map((m) => ({ id: m.id, name: m.name, price: Number(m.price) }));
    if (mods.some((m) => !Number.isFinite(m.price) || m.price < 0)) {
      rejected.push(it.product_id);
      continue;
    }
    const unit = round(Number(p.price) + mods.reduce((s, m) => s + m.price, 0));
    lines.push({
      product_id: p.id,
      name: p.name,
      qty,
      modifiers: mods,
      notes: it.notes?.slice(0, 300) || undefined,
      unit_price: unit,
      line_total: round(unit * qty),
    });
  }
  const subtotal = round(lines.reduce((s, l) => s + l.line_total, 0));
  const fee = fulfillment === "delivery" && lines.length > 0 ? round(deliveryFee) : 0;
  return { lines, rejected, subtotal, fee, total: round(subtotal + fee) };
}

export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
