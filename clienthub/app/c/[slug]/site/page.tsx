import { requireWorkspace } from "@/lib/access";
import { anthropicApiKey } from "@/lib/agent";
import { getTenant } from "@/lib/tenants";
import { readIntegrations } from "@/lib/integrations";
import type { PublicacaoSummary } from "../config/types";
import SiteWorkspace from "./SiteWorkspace";

export const dynamic = "force-dynamic";

// Módulo Meu Site (Fase 4): preview do site do cliente + geração/edição via
// skills criar-site/frontend-design pelo chat. Rascunhos em saidas/sites/*,
// site oficial em site/ — e só o operador aprova (regra de ouro do spec).
// Se o cliente já tinha um site externo (cadastrado em Presença Digital no
// Editar cliente) e ainda não existe rascunho/aprovado dentro do Hub, mostra
// esse link em vez do estado vazio — o site não desaparece do radar do owner.
export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { session } = await requireWorkspace(slug);
  const isOwner = session.role === "owner";
  const chatEnabled = !!anthropicApiKey();
  const tenant = getTenant(slug);
  // publicacao mora em B-O-S/_integracoes/ (segredo de FTP) — só o owner
  // pode ler isso; pro cliente comum fica sempre null (a aba Publicação já
  // é owner-only em SiteWorkspace de qualquer forma, isso aqui é só reforço
  // de não ler/expor o que não precisa). Senha nunca volta em texto puro.
  const publicacaoRaw = isOwner ? readIntegrations(slug).publicacao : undefined;
  const publicacao: PublicacaoSummary | null = isOwner
    ? {
        metodo: publicacaoRaw?.metodo || "nenhum",
        ftp: publicacaoRaw?.ftp
          ? {
              host: publicacaoRaw.ftp.host,
              porta: publicacaoRaw.ftp.porta,
              usuario: publicacaoRaw.ftp.usuario,
              diretorioRemoto: publicacaoRaw.ftp.diretorioRemoto,
              seguro: publicacaoRaw.ftp.seguro,
              temSenha: !!publicacaoRaw.ftp.senha,
            }
          : undefined,
        git: publicacaoRaw?.git,
        ultimaPublicacao: publicacaoRaw?.ultimaPublicacao,
      }
    : null;

  return (
    <div className="space-y-4">
      <SiteWorkspace
        slug={slug}
        chatEnabled={chatEnabled}
        isOwner={isOwner}
        siteExterno={tenant.presencaDigital?.site || null}
        publicacao={publicacao}
      />
    </div>
  );
}
