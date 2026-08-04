import { listTenants } from "@/lib/tenants";
import { siteStatus } from "@/lib/site";
import ImportarSiteButton from "./ImportarSiteButton";

export const dynamic = "force-dynamic";

// Sites (seção 3, grupo PLATFORM): visão cross-cliente do módulo "Meu Site" —
// dado real, lido de saidas/sites/ e site/ de cada tenant (lib/site.ts),
// não fabricado.
export default async function SitesPage() {
  const tenants = listTenants().filter((t) => t.modulos_ativos.includes("site"));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Sites</h1>
          <p className="text-muted text-sm mt-0.5">
            {tenants.length} cliente{tenants.length === 1 ? "" : "s"} com o módulo
            Meu Site ativo.
          </p>
        </div>
        <ImportarSiteButton tenants={tenants.map((t) => ({ slug: t.slug, nome: t.nome }))} />
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {tenants.map((t) => {
          const s = siteStatus(t.slug);
          return (
            <div key={t.slug} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{t.nome}</p>
                <p className="text-xs text-muted font-mono">clientes/{t.slug}/site/</p>
              </div>
              <div className="text-right text-xs">
                <p className={s.current ? "text-app" : "text-muted"}>
                  {s.current ? "Site aprovado publicado" : "Sem site aprovado ainda"}
                </p>
                <p className="text-muted mt-0.5">
                  {s.versions.length} rascunho{s.versions.length === 1 ? "" : "s"} gerado
                  {s.versions.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          );
        })}
        {tenants.length === 0 && (
          <p className="text-sm text-muted text-center py-10">
            Nenhum cliente com o módulo Meu Site ativo ainda.
          </p>
        )}
      </div>
    </div>
  );
}
