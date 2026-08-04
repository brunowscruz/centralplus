import { loadCatalog } from "@/lib/modules";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pronto: "Pronto",
  parcial: "Parcial",
  stub: "Stub",
};

const ORIGEM_LABEL: Record<string, string> = {
  nativo: "Nativo",
  "adaptado-de-open-source": "Adaptado de open source",
};

// Módulos (seção 2.5/3): o catálogo em si — a tela que alimenta a grade de
// toggles do cadastro de cliente e o menu dinâmico. Lida direto de
// lib/catalog/modulos.json (dado, não código) via lib/modules.ts.
export default async function ModulosPage() {
  const modulos = loadCatalog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Módulos</h1>
        <p className="text-muted text-sm mt-0.5">
          Catálogo da plataforma — adicionar um módulo aqui (
          <code className="text-app">lib/catalog/modulos.json</code>) é o que
          faz ele aparecer no cadastro de cliente e no menu, sem mexer em código.
        </p>
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {modulos.map((m) => (
          <div key={m.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <span>{m.icon}</span>
                  {m.label}
                  <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-app">
                    v{m.versao}
                  </span>
                  <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-app">
                    {STATUS_LABEL[m.status]}
                  </span>
                  <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-app">
                    {ORIGEM_LABEL[m.origem]}
                  </span>
                  {m.always && (
                    <span className="text-[11px] text-accent px-2 py-0.5 rounded-full border border-app">
                      sempre ativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted mt-1 max-w-2xl">{m.description}</p>
                {m.dependencias.length > 0 && (
                  <p className="text-[11px] text-muted mt-1">
                    Depende de: {m.dependencias.join(", ")}
                  </p>
                )}
                {m.fonte && (
                  <p className="text-[11px] text-muted mt-1">
                    Fonte candidata:{" "}
                    <a
                      href={m.fonte.repo}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      {m.fonte.repo.replace("https://github.com/", "")}
                    </a>{" "}
                    · {m.fonte.licenca} · {m.fonte.adotado ? "adotado" : "avaliado, não adotado"}
                    {m.fonte.nota && <span className="block mt-0.5">{m.fonte.nota}</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
