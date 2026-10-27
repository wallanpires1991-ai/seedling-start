import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, Printer } from "lucide-react";
import { toast } from "sonner";
import { useEst, statusLabels } from "@/lib/establishment";
import { useOrders, setOrderStatus } from "@/lib/useOrders";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/cozinha")({
  head: () => ({ meta: [{ title: "Cozinha (KDS) — WALPIC AI" }, { name: "description", content: "Tela de comandas para a cozinha." }] }),
  component: Cozinha,
});

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  return now;
}

function Cozinha() {
  const { est } = useEst();
  const qc = useQueryClient();
  const now = useNow();
  const { data = [] } = useOrders(est.id);
  const tickets = data.filter((o) => ["new", "confirmed", "preparing"].includes(o.status));
  const advance = async (id: string, s: string) => { await setOrderStatus(id, s); qc.invalidateQueries({ queryKey: ["orders", est.id] }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Cozinha</h1>
          <p className="text-sm text-muted-foreground">Comandas em aberto · alerta após {est.prep_minutes} min.</p>
        </div>
      </div>
      {tickets.length === 0 && <div className="grid h-64 place-items-center rounded-2xl border border-dashed text-muted-foreground">Nenhuma comanda em aberto 🎉</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tickets.map((o) => {
          const mins = now ? Math.floor((now - new Date(o.created_at).getTime()) / 60000) : 0;
          const late = mins >= est.prep_minutes;
          return (
            <div key={o.id} className={`rounded-2xl border-2 bg-card p-5 shadow-card ${late ? "border-destructive" : o.status === "preparing" ? "border-primary" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-3xl font-bold">#{o.code}</p>
                  <p className="text-sm text-muted-foreground">{o.customer_name} · {o.fulfillment === "pickup" ? "Retirada" : "Entrega"}{o.is_test ? " · TESTE" : ""}</p>
                </div>
                <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${late ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>
                  <Clock className="size-4" />{mins} min
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Entrada {new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {statusLabels[o.status]}</p>
              <ul className="mt-4 space-y-2">
                {o.order_items.map((i) => {
                  const mods = (i.modifiers as { name: string }[]) ?? [];
                  return (
                    <li key={i.id} className="text-lg">
                      <b>{i.qty}×</b> {i.name}
                      {mods.length > 0 && <p className="text-sm text-primary">+ {mods.map((m) => m.name).join(", ")}</p>}
                      {i.notes && <p className="text-sm font-medium text-destructive">⚠ {i.notes}</p>}
                    </li>
                  );
                })}
              </ul>
              {o.notes && <p className="mt-3 rounded-lg bg-warning/15 p-2 text-sm">{o.notes}</p>}
              <div className="mt-5 flex gap-2">
                {o.status !== "preparing" ? (
                  <Button className="h-12 flex-1 text-base" onClick={() => advance(o.id, "preparing")}>Iniciar preparo</Button>
                ) : (
                  <Button variant="hero" className="h-12 flex-1 text-base" onClick={() => advance(o.id, "ready")}>Marcar pronto</Button>
                )}
                <Button variant="outline" className="h-12" aria-label="Imprimir" onClick={() => toast.info("Impressão automática requer o conector local de impressão (não instalado).")}><Printer className="size-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
