import { requireWorkspace } from "@/lib/access";
import { anthropicApiKey } from "@/lib/agent";
import { tenantTheme } from "@/lib/theme";
import InstagramWorkspace from "./InstagramWorkspace";

export const dynamic = "force-dynamic";

// Módulo Instagram: "estúdio" 100% conversacional (sem editor visual — todo
// post nasce e é editado só pelo chat, ver MODULE_PREFIX.instagram).
// Galeria de posts em marketing/conteudo/*, aprovação do operador, e
// publicação real/agendamento via lib/instagramPublish.ts.
export default async function InstagramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { session } = await requireWorkspace(slug);
  const chatEnabled = !!anthropicApiKey();
  const tema = tenantTheme(slug);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Instagram</h1>
        <p className="text-sm text-muted">
          Conteúdo gerado em{" "}
          <code className="text-app font-mono">marketing/conteudo/</code> com a
          identidade do cliente; o operador aprova antes de qualquer publicação.
        </p>
      </div>
      <InstagramWorkspace
        slug={slug}
        chatEnabled={chatEnabled}
        isOwner={session.role === "owner"}
        tema={tema}
      />
    </div>
  );
}
