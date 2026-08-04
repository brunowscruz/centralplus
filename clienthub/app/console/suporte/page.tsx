import Placeholder from "@/components/console/Placeholder";

export const dynamic = "force-dynamic";

export default function SuportePage() {
  return (
    <Placeholder
      title="Suporte"
      description="Fila de solicitações/tickets abertos pelos clientes para o operador — em execução, resolvidas, total."
      dependsOn={[
        "Módulo \"Solicitações\" do lado do cliente ainda não existe no catálogo (lib/catalog/modulos.json) — precisa nascer primeiro lá, com sua própria persistência de ticket",
        "Definir onde um ticket é guardado (provável: clientes/<slug>/_solicitacoes/ + um índice agregado que esta tela lê)",
      ]}
    />
  );
}
