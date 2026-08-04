import { requireWorkspace } from "@/lib/access";
import { getTenant } from "@/lib/tenants";
import { optionalModules } from "@/lib/modules";
import { listAccounts } from "@/lib/claude-accounts";
import { readIntegrations, maskToken, metaAppConfigurado, googleAdsConfigurado } from "@/lib/integrations";
import { siteStatus } from "@/lib/site";
import ConfigTabs from "./ConfigTabs";

export const dynamic = "force-dynamic";

// Configurações do cliente: acesso, identidade visual, token do Instagram e
// sites — o que o próprio workspace precisa. Módulos ativos e configuração
// de IA (conta Claude, modelos, limite de tokens) ficam no admin
// (Console → Clientes → Editar cliente), não aqui. Publicação do site (FTP/
// git) mora no módulo Meu Site (app/c/[slug]/site/), não aqui.
export default async function ConfigPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session } = await requireWorkspace(slug);
  const tenant = getTenant(slug);
  const isOwner = session.role === "owner";
  const { metaInstagram, openai, wordpress, googleAds } = readIntegrations(slug);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted mt-0.5">{tenant.nome}</p>
      </div>

      <ConfigTabs
        slug={slug}
        isOwner={isOwner}
        tenant={{
          nome: tenant.nome,
          nomeComercial: tenant.nomeComercial,
          corPrincipal: tenant.corPrincipal,
          presencaDigital: tenant.presencaDigital,
          acessoLogin: tenant.acesso?.login,
          modulosAtivos: tenant.modulos_ativos,
          claude: tenant.claude || null,
          temSite: !!siteStatus(slug).current,
        }}
        metaInstagram={{
          igUserId: metaInstagram?.igUserId,
          tokenMasked: maskToken(metaInstagram?.pageAccessToken),
          obtidoEm: metaInstagram?.obtidoEm,
          renovacaoAutomatica: metaAppConfigurado(),
        }}
        openai={{
          apiKeyMasked: maskToken(openai?.apiKey),
          obtidoEm: openai?.obtidoEm,
        }}
        wordpress={{
          baseUrl: wordpress?.baseUrl,
          usuario: wordpress?.usuario,
          temSenha: !!wordpress?.applicationPassword,
          obtidoEm: wordpress?.obtidoEm,
        }}
        googleAds={{
          customerId: googleAds?.customerId,
          vinculadoEm: googleAds?.vinculadoEm,
          instalado: googleAdsConfigurado(),
        }}
        moduleOptions={optionalModules().map((m) => ({
          id: m.id,
          label: m.label,
          description: m.description,
          enabled: tenant.modulos_ativos.includes(m.id),
        }))}
        contasClaude={
          isOwner
            ? listAccounts().map((a) => ({ id: a.id, nome: a.nome, compartilhada: a.compartilhada }))
            : []
        }
      />
    </div>
  );
}
