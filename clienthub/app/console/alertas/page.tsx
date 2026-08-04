import Placeholder from "@/components/console/Placeholder";

export const dynamic = "force-dynamic";

export default function AlertasPage() {
  return (
    <Placeholder
      title="Alertas"
      description="Regras de alerta — ex: saúde do workspace caindo, integração caindo (Instagram/Claude sem responder)."
      dependsOn={[
        "Um canal de notificação (e-mail, WhatsApp, Slack) — hoje não existe nenhum envio automático saindo do CentralPlus",
        "O Dashboard já calcula \"workspaces com força de contexto abaixo de 50%\" — esta tela é onde isso vira regra configurável e disparo automático, em vez de só aparecer no Dashboard quando o operador entra",
      ]}
    />
  );
}
