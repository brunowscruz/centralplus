import { listAccounts } from "@/lib/claude-accounts";
import ConectarContaModal from "@/app/console/contas-claude/ConectarContaModal";

export const dynamic = "force-dynamic";

// Assentos Claude (seção 6/23 do spec): credenciais do TIME no plano Team —
// cada assento é uma pessoa (ou cliente dedicado) com sua própria conta
// Claude, provisionada via `claude setup-token`. Reaproveita o mesmo modelo
// de Contas Claude (lib/claude-accounts.ts), filtrado ao tipo "seat_token".
// Hoje a agência opera com a chave de API padrão (ver Contas Claude); esta
// tela fica pronta pra registrar o primeiro assento real assim que fizer
// sentido financeiramente — o provisionamento na VPS em si (rodar o token
// remotamente) ainda é manual, não é executado por este app.
export default async function AssentosPage() {
  const assentos = listAccounts().filter((a) => a.tipo === "seat_token");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Assentos Claude</h1>
          <p className="text-muted text-sm mt-0.5">
            Credenciais do TIME no plano Team — {assentos.length} ativo{assentos.length === 1 ? "" : "s"}.
          </p>
        </div>
        <ConectarContaModal buttonLabel="+ Novo assento" titulo="Novo assento Claude" />
      </div>

      <div className="card p-4 text-xs text-muted leading-relaxed">
        Cada assento = 1 pessoa do time (ou cliente dedicado) = 1 conta Claude (Team) = 1 usuário
        Linux na VPS. Fluxo: crie o assento aqui (já cola o token na hora) → roda o provisionamento
        na VPS (manual por enquanto). O token vem de{" "}
        <code className="text-app">claude setup-token</code> logado na conta do assento, dura ~1
        ano e deve ficar só na VPS (arquivo <code className="text-app">0600</code> no root — nunca
        no banco); um canary de hora em hora confere se continua vivo e marca &ldquo;reautenticar&rdquo;
        quando cair — isso ainda não está automatizado nesta instalação.
      </div>

      {assentos.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">Nenhum assento cadastrado.</p>
          <p className="text-[11px] text-muted mt-1">
            Use &ldquo;+ Novo assento&rdquo; quando for criar o primeiro.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assentos.map((a) => (
            <div key={a.id} className="card p-5">
              <h3 className="font-semibold text-sm">{a.nome}</h3>
              <p className="text-xs text-muted mt-0.5">{a.plano}</p>
              <p className="text-[11px] text-muted font-mono mt-2">Token: {a.token}</p>
              <p className="text-[11px] text-muted mt-3">
                Gerencie compartilhamento e limite em{" "}
                <a href="/console/contas-claude" className="text-accent underline underline-offset-2">
                  Contas Claude
                </a>
                .
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
