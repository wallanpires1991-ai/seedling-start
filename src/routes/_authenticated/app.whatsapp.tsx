import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, CircleDashed, CheckCircle2, QrCode, ShieldCheck, Bot } from "lucide-react";
import { toast } from "sonner";
import { useEst } from "@/lib/establishment";
import { whatsappAction } from "@/lib/whatsapp.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  head: () => ({ meta: [{ title: "Conectar WhatsApp — WALPIC AI" }, { name: "description", content: "Conecte o WhatsApp do restaurante por QR code." }] }),
  component: WhatsApp,
});

function WhatsApp() {
  const { est } = useEst();
  const qc = useQueryClient();
  const call = useServerFn(whatsappAction);
  const [connected, setConnected] = useState(est.whatsapp_status === "connected");
  const [phone, setPhone] = useState<string | null>(est.whatsapp_phone ?? null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: "status" | "qr" | "disconnect") {
    const r = await call({ data: { establishmentId: est.id, action } });
    if ("error" in r && r.error) { toast.error(r.error); setQr(null); return; }
    if ("connected" in r) {
      if (r.connected && !connected) { toast.success("WhatsApp conectado! A IA já está atendendo."); qc.invalidateQueries({ queryKey: ["membership"] }); }
      setConnected(!!r.connected);
      if (r.connected) { setQr(null); if ("phone" in r) setPhone(r.phone ?? null); }
      else if ("qr" in r && r.qr) setQr(r.qr);
    }
  }

  useEffect(() => { run("status"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(() => run("qr"), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conectar WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Leia o QR code com o celular do restaurante e a IA passa a atender seus clientes.</p>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle className="size-6" /></div>
          <div className="flex-1">
            <p className="font-semibold">Estado da conexão</p>
            {connected
              ? <p className="flex items-center gap-1.5 text-sm text-primary"><CheckCircle2 className="size-3.5" />Conectado{phone ? ` — ${phone}` : ""}</p>
              : <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CircleDashed className="size-3.5" />Nenhum número conectado</p>}
          </div>
          {connected
            ? <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await run("disconnect"); setBusy(false); }}>Desconectar</Button>
            : <Button variant="hero" disabled={busy} onClick={async () => { setBusy(true); await run("qr"); setBusy(false); }}><QrCode className="size-4" />{qr ? "Gerar novo QR" : "Gerar QR code"}</Button>}
        </div>
        {qr && !connected && (
          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <img src={qr} alt="QR code para conectar o WhatsApp" className="size-64 rounded-xl border bg-background p-2" />
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Abra o WhatsApp no celular do restaurante.</li>
              <li>Toque em <b>Mais opções ⋮</b> ou <b>Configurações</b> → <b>Aparelhos conectados</b>.</li>
              <li>Toque em <b>Conectar um aparelho</b> e aponte para este QR code.</li>
              <li>Aguarde: esta tela muda para “Conectado” sozinha.</li>
            </ol>
          </div>
        )}
        {!connected && !qr && (
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Enquanto o número não estiver conectado, nenhuma mensagem real é enviada. Teste no <Link to="/app/simulador" className="text-primary underline">simulador</Link>.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Info icon={Bot} t="Atendimento automático" d="A IA responde com o seu cardápio, monta o pedido, envia para a cozinha e manda a confirmação com o total para o cliente." />
        <Info icon={ShieldCheck} t="Boas práticas" d="Use para atender quem fala com você. Envio em massa para quem não pediu pode bloquear o número." />
      </div>
    </div>
  );
}

function Info({ icon: I, t, d }: { icon: typeof Bot; t: string; d: string }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-card"><I className="size-5 text-primary" /><p className="mt-3 font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>;
}
