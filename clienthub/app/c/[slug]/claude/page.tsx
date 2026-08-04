import { requireWorkspace } from "@/lib/access";
import { getTenant } from "@/lib/tenants";
import { anthropicApiKey } from "@/lib/agent";
import ClaudeWorkspace from "./ClaudeWorkspace";

export const dynamic = "force-dynamic";

export default async function ClaudePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireWorkspace(slug);
  const tenant = getTenant(slug);
  const chatEnabled = !!anthropicApiKey();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Claude Code</h1>
        <p className="text-sm text-muted">
          O B-O-S rodando dentro de{" "}
          <code className="text-app font-mono">clientes/{tenant.slug}/</code>. Toda
          ação fica travada nesta pasta.
        </p>
      </div>
      <ClaudeWorkspace slug={slug} chatEnabled={chatEnabled} />
    </div>
  );
}
