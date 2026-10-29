import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LayoutDashboard, Utensils, Bot, ClipboardList, ChefHat, MessageCircle, LogOut, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EstCtx, type Establishment, type MemberRole } from "@/lib/establishment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "../index";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: pageMeta("Painel — WALPIC AI", "Painel do restaurante.") }),
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/cardapio", label: "Cardápio", icon: Utensils },
  { to: "/app/simulador", label: "Treinar minha IA", icon: Bot },
  { to: "/app/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/app/cozinha", label: "Cozinha", icon: ChefHat },
  { to: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["membership"],
    queryFn: async () => {
      const { data, error } = await supabase.from("memberships").select("role, establishments(*)").order("created_at").limit(1);
      if (error) throw error;
      const m = data?.[0];
      return m ? { role: m.role as MemberRole, est: m.establishments as unknown as Establishment } : null;
    },
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando painel…</div>;
  if (!data) return <Onboarding />;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <EstCtx.Provider value={data}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
          <div className="px-2 py-2"><Logo /></div>
          <div className="mt-6 rounded-xl bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/60">Estabelecimento</p>
            <p className="truncate font-semibold text-sidebar-accent-foreground">{data.est.name}</p>
          </div>
          <nav className="mt-6 flex-1 space-y-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground" }}>
                <n.icon className="size-4" />{n.label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"><LogOut className="size-4" />Sair</button>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
            <Logo />
            <button onClick={logout} aria-label="Sair"><LogOut className="size-5 text-muted-foreground" /></button>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8"><Outlet /></main>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card py-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="flex flex-col items-center gap-0.5 px-2 text-[10px] text-muted-foreground" activeProps={{ className: "text-primary" }}>
              <n.icon className="size-5" />{n.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </EstCtx.Provider>
  );
}

function Onboarding() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("create_establishment", { _name: name });
    setBusy(false);
    if (error) { toast.error("Não foi possível criar: " + error.message); return; }
    toast.success("Estabelecimento criado com cardápio de demonstração!");
    qc.invalidateQueries({ queryKey: ["membership"] });
  }
  return (
    <div className="grid min-h-screen place-items-center bg-hero p-6">
      <form onSubmit={create} className="w-full max-w-md space-y-5 rounded-2xl bg-card p-8 shadow-card">
        <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><Store className="size-6" /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Passo 1 de 1</p>
          <h1 className="mt-1 text-2xl font-bold">Como se chama seu restaurante?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Vamos criar seu painel com um cardápio de demonstração (marcado como “demo”) para você testar a IA na hora.</p>
        </div>
        <Input placeholder="Ex.: Hamburgueria do Zé" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy ? "Criando…" : "Criar meu painel"}</Button>
      </form>
    </div>
  );
}
