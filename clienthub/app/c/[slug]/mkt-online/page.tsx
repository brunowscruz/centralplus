import { requireWorkspace } from "@/lib/access";
import { anthropicApiKey } from "@/lib/agent";
import MktOnlineWorkspace from "./MktOnlineWorkspace";

export const dynamic = "force-dynamic";

// Módulo MKT Online: Google Meu Negócio, Google Ads e Meta Ads gerados pela
// IA — autoatendimento do cliente, nada publica/ativa sozinho (o próprio
// cliente baixa/copia e sobe na plataforma dele). Ver docs no CLAUDE.md.
export default async function MktOnlinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { session } = await requireWorkspace(slug);
  const chatEnabled = !!anthropicApiKey();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">MKT Online</h1>
        <p className="text-sm text-muted">
          Google Meu Negócio e Google Ads — a IA prepara tudo pronto, você só revisa e sobe.
        </p>
      </div>
      <MktOnlineWorkspace slug={slug} chatEnabled={chatEnabled} isOwner={session.role === "owner"} />
    </div>
  );
}
