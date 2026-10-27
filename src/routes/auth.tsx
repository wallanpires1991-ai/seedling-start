import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "./index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — WALPIC AI" },
      { name: "description", content: "Acesse o painel do seu restaurante no WALPIC AI." },
      { property: "og:title", content: "Entrar — WALPIC AI" },
      { property: "og:description", content: "Acesse o painel do seu restaurante." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/app" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
        else nav({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/app" });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      toast.error(/invalid login/i.test(m) ? "E-mail ou senha incorretos." : /not confirmed/i.test(m) ? "Confirme seu e-mail antes de entrar." : m || "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-hero p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div>
          <h2 className="text-4xl font-bold text-sidebar-accent-foreground">Pedidos certos,<br />cozinha organizada.</h2>
          <p className="mt-4 max-w-md text-sidebar-foreground/80">Treine sua IA com o cardápio real, teste no simulador e acompanhe tudo no painel.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">Seus dados ficam isolados por estabelecimento.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h1 className="text-2xl font-bold">{mode === "in" ? "Entrar no painel" : "Criar sua conta"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Bem-vindo de volta!" : "Comece a testar em minutos."}</p>
          </div>
          {mode === "up" && (
            <div className="space-y-2"><Label htmlFor="name">Seu nome</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>{loading ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}</Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
