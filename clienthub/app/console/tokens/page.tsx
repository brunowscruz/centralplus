import Placeholder from "@/components/console/Placeholder";

export const dynamic = "force-dynamic";

export default function TokensPage() {
  return (
    <Placeholder
      title="Tokens"
      description="Consumo de tokens por conta Claude e por cliente — para cobrança e para respeitar os limites configurados por cliente (0 = ilimitado)."
      dependsOn={[
        "O Agent SDK expor consumo por sessão (o módulo Claude Code hoje não grava métricas de uso, só faz stream da resposta — ver app/api/tenants/[slug]/chat/route.ts)",
        "Um limite de tokens por cliente ainda não existe como campo no cadastro",
      ]}
    />
  );
}
