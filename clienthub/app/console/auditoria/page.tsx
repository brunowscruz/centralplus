import { readAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ACAO_LABEL: Record<string, string> = {
  "cliente.criado": "Cliente criado",
  "cliente.status_alterado": "Status do cliente alterado",
  "modulo.ativado": "Módulo ativado",
  "modulo.desativado": "Módulo desativado",
  "ideia.registrada": "Ideia registrada no backlog",
  "hub.criado": "Hub criado",
  "conta_claude.criada": "Conta Claude conectada",
  "conta_claude.compartilhamento_alterado": "Compartilhamento de conta Claude alterado",
  "conta_claude.apagada": "Conta Claude apagada",
  "claude.config_alterada": "Configuração de IA do cliente alterada",
  "instagram.token_atualizado": "Token do Instagram atualizado",
  "credenciais.alteradas": "Credenciais do cliente alteradas",
  "identidade.alterada": "Identidade visual do cliente alterada",
  "cliente.editado": "Cliente editado",
  "cliente.excluido": "Cliente excluído",
};

// Auditoria (seção 3/8 do spec): log real, append-only, de toda ação
// administrativa relevante. Lê B-O-S/_auditoria.jsonl via lib/audit.ts.
export default async function AuditoriaPage() {
  const entries = readAudit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-muted text-sm mt-0.5">
          Últimas {entries.length} ações administrativas registradas.
        </p>
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {entries.map((e, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between text-sm gap-4">
            <div>
              <p>
                <span className="font-medium">{ACAO_LABEL[e.acao] || e.acao}</span>
                {e.alvo && <span className="text-muted"> · {e.alvo}</span>}
              </p>
              {e.detalhe && <p className="text-xs text-muted mt-0.5">{e.detalhe}</p>}
            </div>
            <div className="text-right text-xs text-muted shrink-0">
              <p>{e.ator}</p>
              <p>{new Date(e.ts).toLocaleString("pt-BR")}</p>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted text-center py-10">
            Nenhuma ação registrada ainda — crie um cliente ou altere um módulo
            para ver o log em ação.
          </p>
        )}
      </div>
    </div>
  );
}
