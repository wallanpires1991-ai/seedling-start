import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ShoppingBag, Wallet, Receipt, XCircle, Bot, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEst } from "@/lib/establishment";
import { brl } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: pageMeta("Dashboard — WALPIC AI", "Resumo do dia do restaurante.") }),
  component: Dashboard,
});

function Dashboard() {
  const { est } = useEst();
  const { data } = useQuery({
    queryKey: ["dash", est.id],
    queryFn: async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { data: orders } = await supabase.from("orders").select("id,total,status,is_test,created_at").eq("establishment_id", est.id).gte("created_at", since.toISOString());
      const ids = (orders ?? []).map((o) => o.id);
      const { data: items } = ids.length ? await supabase.from("order_items").select("name,qty").in("order_id", ids) : { data: [] };
      return { orders: orders ?? [], items: items ?? [] };
    },
  });
  const orders = data?.orders ?? [];
  const valid = orders.filter((o) => o.status !== "cancelled");
  const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
  const top = Object.entries((data?.items ?? []).reduce<Record<string, number>>((a, i) => ({ ...a, [i.name]: (a[i.name] ?? 0) + i.qty }), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty }));
  const testCount = orders.filter((o) => o.is_test).length;

  const kpis = [
    { label: "Pedidos hoje", value: String(orders.length), icon: ShoppingBag },
    { label: "Faturamento", value: brl(revenue), icon: Wallet },
    { label: "Ticket médio", value: brl(valid.length ? revenue / valid.length : 0), icon: Receipt },
    { label: "Cancelados", value: String(orders.length - valid.length), icon: XCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá 👋</p>
          <h1 className="text-3xl font-bold">{est.name}</h1>
        </div>
        <Button asChild variant="hero"><Link to="/app/simulador"><Bot className="size-4" />Testar minha IA</Link></Button>
      </div>
      {testCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <FlaskConical className="size-4" /> {testCount} pedido(s) de hoje são de teste (simulador) e estão incluídos nos números abaixo.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-sm text-muted-foreground">{k.label}<k.icon className="size-4 text-primary" /></div>
            <p className="mt-3 font-display text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-2">
          <h3 className="font-semibold">Mais vendidos hoje</h3>
          {top.length === 0 ? (
            <Empty text="Sem vendas hoje ainda. Faça um pedido de teste no simulador." />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="var(--color-primary)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Integrações</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <Status label="WhatsApp" state="Configuração pendente" />
            <Status label="Pagamentos (Pix/cartão)" state="Configuração pendente" />
            <Status label="Impressora de comandas" state="Não instalada" />
            <li className="flex justify-between"><span>IA atendente</span><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">Ativa (simulador)</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Status({ label, state }: { label: string; state: string }) {
  return <li className="flex justify-between"><span>{label}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{state}</span></li>;
}
export function Empty({ text }: { text: string }) {
  return <div className="mt-4 grid h-48 place-items-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">{text}</div>;
}
