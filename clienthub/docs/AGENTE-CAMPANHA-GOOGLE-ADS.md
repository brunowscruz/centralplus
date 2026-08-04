# Agente completo de campanha Google Ads (skill do B-O-S no chat)

Contexto: o módulo MKT Online já tinha um fluxo rápido de Google Ads
("Nova campanha" — descreve em 1 mensagem, a IA gera direto). Esse fluxo
continua existindo. Este documento cobre o SEGUNDO caminho, mais robusto:
"Criar com agente completo", que usa a skill `/anuncio-google` do B-O-S
(briefing guiado pergunta-por-pergunta, pesquisa de palavra-chave real via
WebSearch, clusters de grupo de anúncio, RSAs bem trabalhados, negativas,
extensões) e entrega o resultado já pronto pra aplicar na API, um card por
grupo de anúncio.

## Por que a skill não aparecia sozinha

Sessão de chat do workspace roda com `cwd` = pasta do cliente
(`clientes/<slug>/`). Skills do B-O-S ficam em `B-O-S/.claude/skills/` — um
nível ACIMA da pasta do cliente. Diferente do CLAUDE.md (que é literalmente
copiado pra dentro de cada cliente na hora do cadastro), não existe
mecanismo de skill "subir" por diretório pai sozinha — testado e confirmado.

## Onde a skill mora pro chat enxergar

**Nunca** aponte a sessão do cliente direto pra `B-O-S/.claude/` — essa
pasta é irmã de `clientes/`, então isso exporia a pasta de TODOS os outros
clientes junto (achado de segurança relacionado, ver
`docs/ISOLAMENTO-AGENTE.md`).

Em vez disso: `B-O-S/_skills-compartilhadas/.claude/skills/<nome>/` — uma
CÓPIA da skill, numa pasta própria fora de `clientes/` (mesmo padrão de
`B-O-S/_integracoes/`, `B-O-S/_contas_claude.json`). Só essa pasta é
liberada via `additionalDirectories` pra sessão que precisa de skill.

Sincronizar (fonte de verdade continua sendo `B-O-S/.claude/skills/`, edite
lá):

```
node B-O-S/scripts/sincronizar-skill-compartilhada.mjs anuncio-google
```

Rode de novo sempre que editar a skill original. Pra liberar uma skill nova
nesse mecanismo, sincronize ela também e adicione no wiring abaixo.

## Wiring (`app/api/tenants/[slug]/chat/route.ts`)

Só o módulo `"mkt-online-agente-ads-google"` pede a pasta extra:

```ts
const usaSkillsCompartilhadas = body.module === "mkt-online-agente-ads-google";
const skillsCompartilhadasDir = path.join(bosRoot(), "_skills-compartilhadas", ".claude");
// ...
canUseTool: criarGuardaSandbox(cwd, usaSkillsCompartilhadas ? [skillsCompartilhadasDir] : []),
...(usaSkillsCompartilhadas
  ? { settingSources: ["project"], additionalDirectories: [skillsCompartilhadasDir] }
  : {}),
```

`settingSources: ["project"]` é o que liga a descoberta de skill de verdade
(sem isso o Skill tool não acha nada, nem dentro do próprio `cwd`).

**O prompt do módulo precisa mandar usar a ferramenta Skill explicitamente**
("use a ferramenta Skill com o nome exato 'anuncio-google'") — sem essa
instrução direta, o modelo tenta achar o arquivo na mão via Read/Glob/Bash
(procurando em caminho que ele não conhece) e conclui erradamente que a
skill "não existe". Testado e confirmado esse comportamento duas vezes.

## A ponte pro formato do CentralPlus

A skill sozinha entrega CSVs (`marketing/campanhas/google-ads-<data>/`) pro
Google Ads Editor — isso continua sendo gerado normalmente, não muda. Além
disso, o prompt do módulo pede um passo extra: pra CADA grupo de
anúncio/cluster que a skill decidiu, grava TAMBÉM um `campanha.json` no
formato de sempre do CentralPlus, um por grupo, em
`marketing/mkt-online/ads-google/<slug-do-grupo>-<data>/`. É a mesma IA que
já sabe escrever esse formato (mesmas regras de `headlines`/`descriptions`/
`palavrasNegativas`/`localizacoes`/`callouts`/`snippetsEstruturados` do
módulo MKT Online normal — mantenha os dois prompts em sincronia se
alterar um). Sem parser de CSV: é conteúdo gerado direto no formato certo,
mesmo princípio de sempre (IA decide conteúdo, código determinístico decide
ação — aplicar continua sendo só o botão de sempre, `lib/googleAds.ts`).

Cada grupo aparece como uma campanha separada na lista de Google Ads do
CentralPlus, pronta pra revisar e aplicar — a lista de palavras negativas
GLOBAIS da skill entra em todas.

## Limitação conhecida

A IA erra o limite de caracteres de descrição com frequência (escreve mais
de 90 caracteres, mesmo instruída) — a validação determinística em
`aplicarCampanhaGoogleAds` sempre pega isso antes de mandar pra API, com
mensagem clara de qual texto encurtar. Não é bug, é o gate funcionando —
espere precisar ajustar 1-2 textos antes de aplicar boa parte das
campanhas geradas por esse fluxo.

## UI

Botão "Criar com agente completo" na lista de Google Ads
(`app/c/[slug]/mkt-online/tabs/AdsTab.tsx`, só aparece pra
`plataforma === "google"`) abre um `ChatPanel` (mesmo componente genérico
usado no módulo Claude Code e em Meu Site) com `module:
"mkt-online-agente-ads-google"`.
