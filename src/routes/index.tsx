import { createFileRoute, Link } from "@tanstack/react-router";
import { Cat, ChefHat, MessageCircle, ShoppingBag, Utensils, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WALPIC AI — IA que atende e vende pelo WhatsApp" },
      { name: "description", content: "Atendimento inteligente para restaurantes, hamburguerias e delivery: cardápio, pedidos, cozinha e IA treinada no seu negócio." },
      { property: "og:title", content: "WALPIC AI — IA que atende e vende pelo WhatsApp" },
      { property: "og:description", content: "Cardápio, pedidos, cozinha e uma IA treinada no seu restaurante." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: MessageCircle, t: "IA no WhatsApp", d: "Atende, tira dúvidas e monta o pedido com base no seu cardápio real." },
  { icon: Utensils, t: "Cardápio inteligente", d: "Produtos, adicionais, alergênicos e esgotados em um só lugar." },
  { icon: ChefHat, t: "Tela da cozinha", d: "Comandas grandes, tempo decorrido e alertas de atraso." },
  { icon: ShieldCheck, t: "Preços sempre corretos", d: "Totais calculados pelo sistema, nunca pela IA." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-hero text-sidebar-foreground">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo />
          <Button asChild variant="hero" size="sm"><Link to="/auth">Entrar</Link></Button>
        </header>
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 md:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3.5 text-primary-glow" /> Para restaurantes, pizzarias, açaiterias e delivery
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-sidebar-accent-foreground md:text-6xl">
            Sua atendente de IA que <span className="text-gradient">vende enquanto você cozinha.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-sidebar-foreground/80">
            Conecte o WhatsApp, cadastre o cardápio e deixe a IA montar pedidos, sugerir adicionais e mandar a comanda direto para a cozinha.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg"><Link to="/auth">Começar grátis</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Link to="/auth">Ver demonstração</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><f.icon className="size-5" /></div>
            <h3 className="mt-4 font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© 2026 WALPIC AI</footer>
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Cat className="size-8 text-primary-glow" strokeWidth={2.2} />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-wide">WALPIC <span className="text-primary-glow">AI</span></span>
      </div>
    </div>
  );
}
