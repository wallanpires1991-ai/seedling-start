import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Send, RotateCcw, UserRound, AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { simulateChat } from "@/lib/simulator.functions";
import { useEst } from "@/lib/establishment";
import { brl, type CartLine } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/simulador")({
  head: () => ({ meta: [{ title: "Treinar minha IA — WALPIC AI" }, { name: "description", content: "Converse com sua IA antes de conectar o WhatsApp." }] }),
  component: Simulador,
});

type Msg = { role: "user" | "assistant"; content: string };
type Cart = { lines: CartLine[]; subtotal: number; fee: number; total: number };
type CartInput = { product_id: string; qty: number; modifier_ids: string[]; notes: string };

function Simulador() {
  const { est } = useEst();
  const chat = useServerFn(simulateChat);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: est.welcome_message }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartInput, setCartInput] = useState<CartInput[]>([]);
  const [meta, setMeta] = useState<{ fulfillment: string; address: string; customerName: string; ready: boolean; handoff: boolean; unanswered: string[]; used: string[] }>({ fulfillment: "unknown", address: "", customerName: "", ready: false, handoff: false, unanswered: [], used: [] });
  const [placed, setPlaced] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [sessionKey, setSessionKey] = useState(() => crypto.randomUUID());
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await chat({ data: { establishmentId: est.id, messages: next.slice(-30) } });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      if (!("reply" in r)) return;
      setMsgs([...next, { role: "assistant", content: r.reply }]);
      setCart(r.cart); setCartInput(r.cartInput);
      setMeta((m) => ({
        fulfillment: r.fulfillment, address: r.address, customerName: r.customerName, ready: r.readyToConfirm, handoff: r.handoffHuman,
        unanswered: r.unanswered ? [...m.unanswered, r.unanswered] : m.unanswered, used: r.usedProducts,
      }));
    } catch {
      toast.error("Falha ao falar com a IA.");
    } finally { setBusy(false); }
  }

  async function confirmOrder() {
    if (!meta.ready || placing || placed || meta.handoff) return;
    setPlacing(true);
    try {
    const { data, error } = await supabase.rpc("place_order", {
      _est: est.id, _items: cartInput, _customer_name: meta.customerName || "Cliente teste", _customer_phone: "",
      _fulfillment: meta.fulfillment === "pickup" ? "pickup" : "delivery", _address: meta.address, _payment_method: "on_delivery",
      _is_test: true, _idempotency_key: `sim-${est.id}-${sessionKey}`, _source: "simulator",
    });
    if (error) { toast.error(error.message); return; }
    const { data: o, error: readError } = await supabase.from("orders").select("code").eq("id", data).eq("establishment_id", est.id).single();
    if (readError) { toast.error("Pedido salvo, mas não foi possível ler a confirmação. Confira em Pedidos."); return; }
    setPlaced(o?.code ?? null);
    toast.success("Pedido de teste enviado para a cozinha!");
    } finally { setPlacing(false); }
  }

  function reset() {
    setMsgs([{ role: "assistant", content: est.welcome_message }]); setCart(null); setCartInput([]); setPlaced(null);
    setMeta({ fulfillment: "unknown", address: "", customerName: "", ready: false, handoff: false, unanswered: [], used: [] });
    setSessionKey(crypto.randomUUID());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Treinar minha IA</h1>
          <p className="text-sm text-muted-foreground">Converse como se fosse um cliente. Nada aqui gera cobrança real — pedidos ficam marcados como teste.</p>
        </div>
        <Button variant="outline" onClick={reset}><RotateCcw className="size-4" />Nova conversa</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex items-center gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-accent-foreground">
            <div className="grid size-9 place-items-center rounded-full bg-brand-gradient font-bold text-primary-foreground">{est.ai_name[0]}</div>
            <div><p className="text-sm font-semibold">{est.ai_name}</p><p className="text-xs text-sidebar-foreground/70">Simulador · modo teste</p></div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/50 p-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-card ${m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card"}`}>
                  <div className="prose prose-sm max-w-none text-inherit [&_p]:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground">{est.ai_name} está digitando…</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <Input placeholder='Ex.: "quero 2 x-burger com bacon pra entrega"' value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
            <Button type="submit" variant="hero" disabled={busy || !text.trim()} aria-label="Enviar"><Send className="size-4" /></Button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h3 className="font-semibold">Carrinho</h3>
            <p className="text-xs text-muted-foreground">Valores calculados pelo sistema, não pela IA.</p>
            {!cart || cart.lines.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Vazio.</p>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                {cart.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <div>
                      <p>{l.qty}× {l.name}</p>
                      {l.modifiers.length > 0 && <p className="text-xs text-muted-foreground">+ {l.modifiers.map((m) => m.name).join(", ")}</p>}
                      {l.notes && <p className="text-xs text-muted-foreground">Obs.: {l.notes}</p>}
                    </div>
                    <span>{brl(l.line_total)}</span>
                  </div>
                ))}
                <div className="border-t pt-2">
                  <Row a="Subtotal" b={brl(cart.subtotal)} />
                  <Row a="Entrega" b={brl(cart.fee)} />
                  <Row a="Total" b={brl(cart.total)} strong />
                </div>
                <p className="text-xs text-muted-foreground">
                  {meta.fulfillment === "pickup" ? "Retirada no balcão" : meta.fulfillment === "delivery" ? `Entrega${meta.address ? ": " + meta.address : " — endereço pendente"}` : "Modalidade não definida"}
                  {meta.customerName && ` · ${meta.customerName}`}
                </p>
              </div>
            )}
            {placed ? (
              <div className="mt-4 rounded-xl bg-secondary p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="size-4" />Pedido de teste #{placed} criado</p>
                <Link to="/app/cozinha" className="mt-1 inline-block text-xs underline">Ver na cozinha →</Link>
              </div>
            ) : (
              <Button className="mt-4 w-full" variant="hero" disabled={!meta.ready || placing || meta.handoff} onClick={confirmOrder}>
                <FlaskConical className="size-4" />Enviar pedido de teste
              </Button>
            )}
            {!meta.ready && !placed && cart && cart.lines.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Liberado quando o cliente confirmar o resumo.</p>}
          </div>

          {meta.handoff && (
            <div className="flex gap-2 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm">
              <UserRound className="size-4 shrink-0" /> A IA pediu transferência para um atendente humano.
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold">Informações usadas</h3>
            <p className="mt-2 text-xs text-muted-foreground">{meta.used.length ? meta.used.join(", ") : "—"}</p>
            <h3 className="mt-4 flex items-center gap-1 text-sm font-semibold"><AlertTriangle className="size-3.5 text-warning" />Perguntas sem resposta</h3>
            {meta.unanswered.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{meta.unanswered.map((u, i) => <li key={i}>{u}</li>)}</ul>
            ) : <p className="mt-2 text-xs text-muted-foreground">Nenhuma até agora.</p>}
            <Link to="/app/cardapio" className="mt-3 inline-block text-xs text-primary underline">Corrigir no cardápio</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ a, b, strong }: { a: string; b: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "font-bold" : "text-muted-foreground"}`}><span>{a}</span><span>{b}</span></div>;
}
