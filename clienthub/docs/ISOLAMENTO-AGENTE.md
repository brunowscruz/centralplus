# Isolamento entre clientes na sessão de chat (Agent SDK)

Contexto: em 2026-07-31, ao investigar como dar à sessão de chat acesso a
skills do B-O-S, foi descoberto que **a sessão de um cliente conseguia ler e
listar a pasta de qualquer OUTRO cliente** (`Read ../outro-cliente/config.json`,
`Bash ls ..` etc funcionavam sem erro). O CLAUDE.md do B-O-S já documentava
isolamento por `cwd` como regra de ouro, mas isso nunca foi de fato reforçado
— era só uma convenção que o agente normalmente seguia, não uma trava real.

## Causa raiz

`app/api/tenants/[slug]/chat/route.ts` chamava `query()` do
`@anthropic-ai/claude-agent-sdk` com `permissionMode: "bypassPermissions"` +
`allowDangerouslySkipPermissions: true`. Testado e confirmado: essas duas
opções juntas fazem o SDK pular o sistema de permissão **inteiro**, inclusive
qualquer `canUseTool` que existisse — não tem meio-termo. Também testado e
descartado como solução: o `sandbox: { enabled: true }` nativo do SDK não
restringe caminho de arquivo (nem de `Read` nem de `Bash`) neste ambiente —
ele cobre outra coisa (rede/processo), não isolamento de diretório.

## Correção

`lib/agentSandbox.ts` → `criarGuardaSandbox(cwd, extrasPermitidos?)` — usado
como `canUseTool` na `query()`, **sem** `bypassPermissions`/
`allowDangerouslySkipPermissions`. Regra: nega qualquer caminho fora do `cwd`
(a pasta do próprio cliente), exceto uma allowlist pequena e explícita:

- o próprio `cwd`
- `CLIENTHUB_ROOT` (o app clienthub — scripts como `render-modelo.mjs`)
- `B-O-S/scripts/` (ex: `gerar-imagem.js`)
- diretórios extras passados explicitamente por quem chama (ex: pasta de
  skills compartilhadas, ver `docs/AGENTE-CAMPANHA-GOOGLE-ADS.md`)

`Read`/`Write`/`Edit`/`NotebookEdit`/`Glob`/`Grep` são barrados com certeza —
o parâmetro de caminho é estruturado, a resolução é exata. `Bash` é **melhor
esforço**: inspeciona o texto do comando à procura de `..`, `~` ou caminho
absoluto fora da allowlist. Cobre o caso real (pedir pro agente ler/copiar
arquivo de outro cliente, inclusive via `cd ..`), mas não é um parser de
shell de verdade — sintaxe deliberadamente ofuscada (variáveis exóticas,
`pushd`, encoding) pode escapar disso. Read/Write/Edit continuam sendo a
proteção sólida; o guard de Bash é uma camada a mais, não a garantia final.

Testado (`lib/agentSandbox.ts` tem 12 casos de unidade cobrindo isso) e
validado ao vivo contra a rota real: tentativa de cross-tenant bloqueada com
mensagem clara, uso normal (Read do próprio cliente, Bash `ls .`, scripts
compartilhados via `../../scripts/...` e `$CLIENTHUB_ROOT/...`) continua
funcionando sem fricção.

## Se for adicionar uma nova sessão do Agent SDK no futuro

**Nunca** use `bypassPermissions`/`allowDangerouslySkipPermissions` numa
sessão que roda com `cwd` dentro de `clientes/<slug>/`. Sempre passe
`canUseTool: criarGuardaSandbox(cwd, extrasSeHouver)`.
