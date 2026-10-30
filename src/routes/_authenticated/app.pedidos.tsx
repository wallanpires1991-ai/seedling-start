import { pageMeta } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, X } from "lucide-react";
import { useEst, statusLabels, nextStatus } from "@/lib/establishment";
import { useOrders, setOrderStatus } from "@/lib/useOrders";
import { brl } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/pedidos")({
  head: () => ({ meta: pageMeta("Pedidos — WALPIC AI", "Painel Kanban de pedidos.") }),
  component: Pedidos,
});

const cols = ["pending_payment", "new", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];

function Pedidos() {
  const { est } = useEst();
  const qc = useQueryClient();
  const { data = [] } = useOrders(est.id);
  const move = async (id: string, s: string) => { await setOrderStatus(id, s); qc.invalidateQueries({ queryKey: ["orders", est.id] }); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Últimas 48h · atualiza em tempo real.</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {cols.map((c) => {
          const list = data.filter((o) => o.status === c);
          return (
            <div key={c} className="w-72 shrink-0 rounded-2xl bg-muted p-3">
              <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{statusLabels[c]}<span className="rounded-full bg-card px-2 text-xs">{list.length}</span></div>
              <div className="space-y-2">
                {list.map((o) => {
                  const n = nextStatus(o.status, o.fulfillment);
                  return (
                    <div key={o.id} className="rounded-xl border bg-card p-3 text-sm shadow-card">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold">#{o.code}</span>
                      </div>
                      <p className="text-muted-foreground">{o.customer_name} · {o.fulfillment === "pickup" ? "Retirada" : "Entrega"}</p>
                      <ul className="mt-2 text-xs">{o.order_items.map((i) => <li key={i.id}>{i.qty}× {i.name}</li>)}</ul>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold">{brl(Number(o.total))}</span>
                        <div className="flex gap-1">
                          {!["delivered", "cancelled"].includes(o.status) && (
                            <Button size="sm" variant="ghost" onClick={() => move(o.id, "cancelled")} aria-label="Cancelar"><X className="size-3.5" /></Button>
                          )}
                          {o.status === "pending_payment" && <Button size="sm" variant="outline" disabled title="Aguarda confirmação do gateway">Aguardando</Button>}
                          {n && <Button size="sm" onClick={() => move(o.id, n)}>{statusLabels[n]}<ArrowRight className="size-3" /></Button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
