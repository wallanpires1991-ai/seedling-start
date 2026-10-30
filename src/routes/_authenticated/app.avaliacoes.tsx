import { pageMeta } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEst } from "@/lib/establishment";

export const Route = createFileRoute("/_authenticated/app/avaliacoes")({
  head: () => ({ meta: pageMeta("Avaliações — WALPIC AI", "Acompanhe as pesquisas de satisfação dos clientes.") }),
  component: Avaliacoes,
});

const stateLabel: Record<string, string> = { sent: "Aguardando nota", awaiting_comment: "Aguardando comentário", done: "Respondida", failed: "Falha no envio" };

function Avaliacoes() {
  const { est } = useEst();
  const { data = [] } = useQuery({
    queryKey: ["surveys", est.id],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_surveys").select("*, orders(code)").eq("establishment_id", est.id).order("sent_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const rated = data.filter((s) => s.rating);
  const avg = rated.length ? rated.reduce((a, s) => a + (s.rating ?? 0), 0) / rated.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avaliações</h1>
        <p className="text-sm text-muted-foreground">Pesquisa enviada pelo WhatsApp quando o pedido é marcado como entregue.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Pesquisas enviadas" value={String(data.length)} />
        <Kpi label="Respostas" value={String(rated.length)} />
        <Kpi label="Nota média" value={rated.length ? avg.toFixed(1).replace(".", ",") : "—"} />
      </div>
      <div className="space-y-2">
        {data.length === 0 && <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Nenhuma pesquisa ainda. Marque um pedido do WhatsApp como entregue para enviar a primeira.</p>}
        {data.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">#{(s.orders as { code: number } | null)?.code} · {s.customer_name || s.phone}</p>
              <span className="text-xs text-muted-foreground">{stateLabel[s.state] ?? s.state} · {new Date(s.sent_at).toLocaleString("pt-BR")}</span>
            </div>
            {s.rating && <div className="mt-2 flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= (s.rating ?? 0) ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}</div>}
            {s.comment && <p className="mt-2 text-sm">“{s.comment}”</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-card"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p></div>;
}
