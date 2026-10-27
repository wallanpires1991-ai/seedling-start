import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, CircleDashed, Webhook, ShieldCheck } from "lucide-react";
import { useEst } from "@/lib/establishment";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  head: () => ({ meta: [{ title: "Conectar WhatsApp — AtendeChef AI" }, { name: "description", content: "Status da conexão com o WhatsApp Business." }] }),
  component: WhatsApp,
});

function WhatsApp() {
  const { est } = useEst();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conectar WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Use o WhatsApp Business oficial da Meta para a IA atender seus clientes.</p>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle className="size-6" /></div>
          <div className="flex-1">
            <p className="font-semibold">Estado da conexão</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CircleDashed className="size-3.5" />{est.whatsapp_status === "connected" ? "Conectado" : "Configuração pendente — nenhum número conectado"}</p>
          </div>
          <Button variant="outline" disabled>Conectar (em breve)</Button>
        </div>
        <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Enquanto o número não estiver conectado, nenhuma mensagem real é enviada ou recebida. Teste tudo no <Link to="/app/simulador" className="text-primary underline">simulador</Link>.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Info icon={Webhook} t="Mensagens e status" d="Recebimento de mensagens, confirmações de entrega e histórico de eventos serão ativados após a conexão." />
        <Info icon={ShieldCheck} t="Regras da Meta" d="Fora da janela de 24h só é possível enviar modelos aprovados. Marketing exige consentimento do cliente." />
      </div>
    </div>
  );
}

function Info({ icon: I, t, d }: { icon: typeof Webhook; t: string; d: string }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-card"><I className="size-5 text-primary" /><p className="mt-3 font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>;
}
