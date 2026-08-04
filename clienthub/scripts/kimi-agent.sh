#!/usr/bin/env bash
# Executor via Kimi K3 (Moonshot AI) — um processo do Claude Code CLI
# INDEPENDENTE, apontado pro endpoint compatível com a API da Anthropic que
# a Moonshot expõe, em vez do endpoint real da Anthropic.
#
# Por que existe: Claude Code NÃO suporta hoje (jul/2026) apontar um
# subagente pra um provedor diferente do resto da sessão — é só um pedido de
# feature em aberto (github.com/anthropics/claude-code/issues/38698). A
# única forma real de ter "Kimi como executor" é rodar uma sessão do Claude
# Code inteira separada, com credenciais da Moonshot. Documentado por
# completo em docs/KIMI-EXECUTOR.md — ler antes de mudar este script.
#
# Uso: scripts/kimi-agent.sh "<prompt>" [pasta-de-trabalho]
#
# Quem decide QUANDO chamar isso é sempre o Claude principal (orquestrador),
# nunca o usuário direto — e só pra tarefa mecânica/bem definida (boilerplate,
# refactor pontual, geração repetitiva). Nunca pra decisão de arquitetura,
# nunca em arquivo com segredo, nunca em módulo compartilhado sem o mesmo
# cuidado de isolamento entre clientes que vale pro Claude principal.

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$DIR/.env.executor" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$DIR/.env.executor"
  set +a
fi

PROMPT="${1:?uso: kimi-agent.sh \"<prompt>\" [pasta-de-trabalho]}"
WORKDIR="${2:-$DIR}"

# Padrão: passa pelo OmniRoute local (ver docs/EXECUTOR-IA.md) — já tem
# Anthropic/Groq/OpenAI cadastrados e cai pra opção gratuita sozinho se
# alguma travar. EXECUTOR_PROVIDER=kimi-direto pra ir direto na Moonshot
# (sem o gateway, precisa de MOONSHOT_API_KEY e saldo lá).
PROVEDOR="${EXECUTOR_PROVIDER:-omniroute}"

if [ "$PROVEDOR" = "kimi-direto" ]; then
  if [ -z "${MOONSHOT_API_KEY:-}" ]; then
    echo "erro: MOONSHOT_API_KEY não configurado — veja docs/EXECUTOR-IA.md" >&2
    exit 1
  fi
  BASE_URL="https://api.moonshot.ai/anthropic"
  API_KEY="$MOONSHOT_API_KEY"
  MODELO="kimi-k3"
else
  BASE_URL="${OMNIROUTE_URL:-http://localhost:20128}/v1"
  API_KEY="${OMNIROUTE_API_KEY:-local}"
  MODELO="${EXECUTOR_MODEL:-auto/coding}"
  if ! curl -s -o /dev/null --max-time 2 "${OMNIROUTE_URL:-http://localhost:20128}"; then
    echo "erro: omniroute não parece estar rodando em ${OMNIROUTE_URL:-http://localhost:20128} — rode \`omniroute\` num terminal, ou use EXECUTOR_PROVIDER=kimi-direto." >&2
    exit 1
  fi
fi

cd "$WORKDIR"
ANTHROPIC_BASE_URL="$BASE_URL" \
ANTHROPIC_API_KEY="$API_KEY" \
claude -p "$PROMPT" \
  --model "$MODELO" \
  --dangerously-skip-permissions
