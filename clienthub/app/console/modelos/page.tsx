import Placeholder from "@/components/console/Placeholder";

export const dynamic = "force-dynamic";

export default function ModelosPage() {
  return (
    <Placeholder
      title="Modelos"
      description="Biblioteca de templates de posts/criativos (Post, Carrossel, Story) usada pelo gerador de conteúdo do módulo Instagram — categorias com dimensão declarada (ex: 1080x1080px), upload de imagem/HTML e organização por pasta."
      dependsOn={[
        "Definir onde os modelos ficam guardados (proposta: B-O-S/templates/conteudo/, fora de clientes/ — é ativo da agência, não de um cliente)",
        "Tela de upload + categorização (Post/Carrossel/Story) no Console",
        "Gerador de posts do módulo Instagram passar a consumir esses modelos em vez de gerar do zero a cada vez",
      ]}
    />
  );
}
