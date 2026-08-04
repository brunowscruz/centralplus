import Placeholder from "@/components/console/Placeholder";

export const dynamic = "force-dynamic";

export default function FeatureFlagsPage() {
  return (
    <Placeholder
      title="Feature Flags"
      description="Ligar/desligar funcionalidades em teste antes de disponibilizar para todos os clientes — diferente do catálogo de Módulos (que liga/desliga por cliente), isto controla se uma funcionalidade existe na plataforma como um todo."
      dependsOn={[
        "Ainda não há necessidade real de testar algo em produção com um subconjunto de clientes — quando aparecer, o padrão é o mesmo do catálogo de módulos: JSON versionado, não hardcode",
      ]}
    />
  );
}
