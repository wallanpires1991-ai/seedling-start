import { pageMeta } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, CircleDashed, CheckCircle2, QrCode, ShieldCheck, Bot, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEst } from "@/lib/establishment";
import { whatsappAction } from "@/lib/whatsapp.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  head: () => ({ meta: pageMeta("Conectar WhatsApp — WALPIC AI", "Conecte o WhatsApp do restaurante por QR code.") }),
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
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [qrUntil, setQrUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  const run = useCallback(async (action: "status" | "qr" | "disconnect") => {
    try {
      const r = await call({ data: { establishmentId: est.id, action } });
      if ("error" in r && r.error) { setError(r.error); setQr(null); setConnected(false); return; }
      setError(null);
      if ("connected" in r) {
        setConnected(!!r.connected);
        if (r.connected) {
          setQr(null);
          if ("phone" in r) setPhone(r.phone ?? null);
          void qc.invalidateQueries({ queryKey: ["membership"] });
        } else if ("qr" in r && r.qr) {
          setQr(r.qr); setQrUntil(Date.now() + 15000);
        } else if (action === "disconnect") {
          setPhone(null); setQr(null);
          void qc.invalidateQueries({ queryKey: ["membership"] });
        }
      }
    } catch {
      setError("Não foi possível verificar a conexão. Tente novamente.");
      setQr(null); setConnected(false);
    } finally {
      setBusy(false); setChecking(false);
    }
  }, [call, est.id, qc]);

  useEffect(() => { void run("status"); }, [run]);
  useEffect(() => {
    if (!qr) return;
    let disposed = false;
    const t = setTimeout(() => { if (!disposed) void run("qr"); }, 15000);
    const tick = setInterval(() => setRemaining(Math.max(0, Math.ceil(((qrUntil ?? 0) - Date.now()) / 1000))), 1000);
    return () => { disposed = true; clearTimeout(t); clearInterval(tick); };
  }, [qr, qrUntil, run]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conectar WhatsApp</h1>
        <p className="text-sm text-muted-foreground">WhatsApp do restaurante</p>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle className="size-6" /></div>
          <div className="flex-1">
            <p className="font-semibold">Estado da conexão</p>
            {checking ? <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Verificando conexão</p> : connected
              ? <p className="flex items-center gap-1.5 text-sm text-primary"><CheckCircle2 className="size-3.5" />Conectado{phone ? ` — ${phone}` : ""}</p>
              : <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CircleDashed className="size-3.5" />Nenhum número conectado</p>}
          </div>
          {connected
            ? <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void run("disconnect"); }}>Desconectar</Button>
            : <Button variant="hero" disabled={busy || checking} onClick={() => { setBusy(true); void run("qr"); }}>{busy ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}{busy ? "Gerando QR…" : qr ? "Gerar novo QR" : "Conectar por QR code"}</Button>}
        </div>
        {error && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 border border-destructive p-3 text-sm text-destructive"><p className="flex-1">{error}</p><Button variant="outline" size="sm" disabled={busy} onClick={() => { setBusy(true); void run("status"); }}><RefreshCw className="size-4" />Verificar novamente</Button></div>}
        {connected && <p className="mt-4 text-sm text-muted-foreground">Número conectado. A confirmação do atendimento depende de uma mensagem real recebida e respondida.</p>}
        {qr && !connected && (
          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="space-y-2"><img src={qr} alt="QR code para conectar o WhatsApp" className="aspect-square w-64 max-w-full rounded-lg border bg-background p-2" /><p className="text-xs text-muted-foreground">{remaining > 0 ? `Atualização em ${remaining}s` : "Atualizando QR code…"}</p></div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Abra o WhatsApp no celular do restaurante.</li>
              <li>Toque em <b>Mais opções ⋮</b> ou <b>Configurações</b> → <b>Aparelhos conectados</b>.</li>
              <li>Toque em <b>Conectar um aparelho</b> e aponte para este QR code.</li>
              <li>Aguarde: esta tela muda para “Conectado” sozinha.</li>
            </ol>
          </div>
        )}
        {!connected && !qr && !error && !checking && (
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Aguardando conexão do aparelho. Nenhuma mensagem real será enviada enquanto o número estiver desconectado.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Info icon={Bot} t="Atendimento" d="Respostas por texto. Respostas em áudio ainda não disponíveis." />
        <Info icon={ShieldCheck} t="Z-API" d="Conexão não oficial por aparelho vinculado. Sujeita a desconexões e bloqueios do WhatsApp." />
      </div>
    </div>
  );
}

function Info({ icon: I, t, d }: { icon: typeof Bot; t: string; d: string }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-card"><I className="size-5 text-primary" /><p className="mt-3 font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>;
}
