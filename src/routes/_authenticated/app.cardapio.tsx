import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEst } from "@/lib/establishment";
import { brl } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — WEPIC AI" }, { name: "description", content: "Gerencie produtos e adicionais." }] }),
  component: Cardapio,
});

function useMenu(estId: string) {
  return useQuery({
    queryKey: ["menu", estId],
    queryFn: async () => {
      const [c, p, m] = await Promise.all([
        supabase.from("categories").select("*").eq("establishment_id", estId).order("position"),
        supabase.from("products").select("*").eq("establishment_id", estId).order("name"),
        supabase.from("modifiers").select("*").eq("establishment_id", estId).order("name"),
      ]);
      return { cats: c.data ?? [], products: p.data ?? [], mods: m.data ?? [] };
    },
  });
}

function Cardapio() {
  const { est, role } = useEst();
  const qc = useQueryClient();
  const { data } = useMenu(est.id);
  const canEdit = role === "owner";
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu", est.id] });

  async function toggle(id: string, available: boolean) {
    const { error } = await supabase.from("products").update({ available }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cardápio</h1>
          <p className="text-sm text-muted-foreground">A IA só responde com o que estiver aqui. Itens “demo” são fictícios — substitua pelos seus.</p>
        </div>
        {canEdit && data && <ProductDialog estId={est.id} cats={data.cats} onDone={refresh} />}
      </div>
      {data?.cats.map((c) => {
        const ps = data.products.filter((p) => p.category_id === c.id);
        return (
          <section key={c.id}>
            <h2 className="mb-3 text-lg font-semibold">{c.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {ps.map((p) => (
                <div key={p.id} className="rounded-2xl border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        {p.is_demo && <span className="rounded bg-warning/20 px-1.5 text-[10px] font-semibold uppercase">demo</span>}
                        {!p.available && <span className="rounded bg-destructive/15 px-1.5 text-[10px] font-semibold uppercase text-destructive">esgotado</span>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                      {p.ingredients && <p className="mt-2 text-xs text-muted-foreground"><b>Ingredientes:</b> {p.ingredients}</p>}
                      {p.allergens && <p className="text-xs text-muted-foreground"><b>Alergênicos:</b> {p.allergens}</p>}
                    </div>
                    <p className="whitespace-nowrap font-display font-bold text-primary">{brl(Number(p.price))}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.mods.filter((m) => m.product_id === p.id).map((m) => (
                      <span key={m.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs">+ {m.name} {brl(Number(m.price))}</span>
                    ))}
                    {canEdit && <ModifierDialog estId={est.id} productId={p.id} onDone={refresh} />}
                  </div>
                  {canEdit && (
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                      <label className="flex items-center gap-2"><Switch checked={p.available} onCheckedChange={(v) => toggle(p.id, v)} />Disponível</label>
                      <Button variant="ghost" size="sm" onClick={() => remove(p.id)} aria-label="Excluir"><Trash2 className="size-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
              {ps.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProductDialog({ estId, cats, onDone }: { estId: string; cats: { id: string; name: string }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", description: "", ingredients: "", allergens: "", price: "", category_id: cats[0]?.id ?? "" });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(f.price.replace(",", "."));
    if (!(price >= 0)) { toast.error("Preço inválido"); return; }
    const { error } = await supabase.from("products").insert({ ...f, price, establishment_id: estId });
    if (error) { toast.error(error.message); return; }
    toast.success("Produto adicionado");
    setOpen(false); setF({ ...f, name: "", description: "", ingredients: "", allergens: "", price: "" }); onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="hero"><Plus className="size-4" />Novo produto</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label>Nome</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Categoria</Label>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Preço (R$)</Label><Input required inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div className="space-y-1"><Label>Descrição</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="space-y-1"><Label>Ingredientes</Label><Input value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} /></div>
          <div className="space-y-1"><Label>Alergênicos</Label><Input value={f.allergens} onChange={(e) => setF({ ...f, allergens: e.target.value })} /></div>
          <Button type="submit" variant="hero" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModifierDialog({ estId, productId, onDone }: { estId: string; productId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("modifiers").insert({ establishment_id: estId, product_id: productId, name, price: Number(price.replace(",", ".")) || 0 });
    if (error) { toast.error(error.message); return; }
    setOpen(false); setName(""); setPrice(""); onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">+ adicional</button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo adicional</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Input placeholder="Nome (ex.: Bacon extra)" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Preço (R$)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button type="submit" variant="hero" className="w-full">Adicionar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
