import { createContext, useContext } from "react";
import type { Database } from "@/integrations/supabase/types";

export type Establishment = Database["public"]["Tables"]["establishments"]["Row"];
export type MemberRole = Database["public"]["Enums"]["member_role"];

export const EstCtx = createContext<{ est: Establishment; role: MemberRole } | null>(null);

export function useEst() {
  const v = useContext(EstCtx);
  if (!v) throw new Error("useEst fora do painel");
  return v;
}

export const statusLabels: Record<string, string> = {
  pending_payment: "Aguard. pagamento",
  new: "Novo",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Saiu p/ entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const flow = ["new", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"] as const;

export function nextStatus(s: string, fulfillment: string) {
  const i = flow.indexOf(s as (typeof flow)[number]);
  if (i < 0 || i >= flow.length - 1) return null;
  const n = flow[i + 1];
  if (n === "out_for_delivery" && fulfillment === "pickup") return "delivered";
  return n;
}
