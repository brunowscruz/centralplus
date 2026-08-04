import { bosRoot } from "@/lib/bos";
import { anthropicApiKey } from "@/lib/agent";
import { loadCatalog } from "@/lib/modules";

export const dynamic = "force-dynamic";

// Configurações (seção 3, grupo SYSTEM): estado real da instalação, lido de
// variáveis de ambiente — nunca exibe valores secretos, só se estão
// configurados ou não (seção 20: tudo por env var, nunca hardcoded).
export default function ConfiguracoesPage() {
  const apiKeyConfigured = !!anthropicApiKey();
  const env = process.env.NODE_ENV || "development";
  const modulos = loadCatalog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-muted text-sm mt-0.5">Estado geral desta instalação do CentralPlus.</p>
      </div>

      <div className="card divide-y divide-[var(--border)] text-sm">
        <Row label="Ambiente" value={env} />
        <Row label="Raiz do B-O-S" value={bosRoot()} mono />
        <Row
          label="Chave Anthropic (ANTHROPIC_API_KEY)"
          value={apiKeyConfigured ? "configurada" : "ausente"}
          tone={apiKeyConfigured ? "good" : "bad"}
        />
        <Row label="Módulos no catálogo" value={String(modulos.length)} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm mb-2">O que ainda não existe aqui</h2>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>Domínio próprio (seção 20) — hoje só localhost:4300</li>
          <li>Multi-usuário por workspace (seção 16)</li>
          <li>Migração para VPS / Coolify (seção 9/20) — checklist fica no README</li>
        </ul>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "#4ade80" : tone === "bad" ? "#f87171" : undefined;
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-xs"} style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
