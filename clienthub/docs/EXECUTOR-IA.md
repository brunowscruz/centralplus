# Executor de IA — Claude arquiteto, modelo mais barato executa

## O que é isso e por quê

O Claude (este assistente, chave da Anthropic) age como "arquiteto" — decide
o quê fazer, mantém qualidade, revisa tudo. Pra tarefa mecânica/bem definida
(boilerplate longo, função isolada e bem especificada, refactor pontual sem
ambiguidade de design, digitação repetitiva de código já pensado), o Claude
pode delegar a EXECUÇÃO pra um modelo mais barato — ou de graça — em vez de
gastar token da Anthropic com trabalho que não exige o raciocínio dele.

**Importante — isso é só pra ESTE trabalho de desenvolvimento** (o Claude
principal decidindo delegar uma sub-tarefa mecânica enquanto constrói o
CentralPlus). **Não é** o motor que responde ao cliente final dentro do
produto (aba Claude Code do Hub, gerador de site/Instagram/CRM etc.) — isso
continua na Anthropic direto, sem OmniRoute no meio, de propósito (ver
"Por que o produto não usa isso" mais abaixo).

## OmniRoute — o gateway que torna isso tudo mais fácil

Instalado em 26/07/2026: [github.com/diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute)
(MIT, 30k+ estrelas). Um servidor local (`omniroute`, porta 20128) que
expõe um endpoint só (`http://localhost:20128/v1`) falando os formatos da
OpenAI E da Anthropic, e decide sozinho pra qual dos providers cadastrados
mandar cada pedido — com fallback automático se um travar por cota/erro.

Isso SUBSTITUI a necessidade de cada script escolher provider na mão
(era assim antes: `EXECUTOR_PROVIDER=groq|kimi|xai` cada um com sua própria
URL/chave). Agora os dois mecanismos abaixo apontam pro OmniRoute por
padrão, que já tem cadastrado (dashboard `http://localhost:20128/dashboard/providers`):

| Provider | Status (26/07/2026) |
|---|---|
| Anthropic | ✅ conectado, 11 modelos |
| Groq | ✅ conectado, 15 modelos, grátis |
| OpenAI | ✅ conectado |
| xAI (Grok) | ❌ chave sem crédito (conta nova precisa de saldo) |
| Kimi | não cadastrado como API key direta neste catálogo — só via OAuth ("Kimi Coding") ou Web Cookie; não configurado ainda |

**Precisa estar rodando** pra qualquer um dos dois mecanismos funcionar:
`omniroute` num terminal (ou configurar como serviço — ver seção VPS).
Senha do dashboard trocada do padrão `CHANGEME` — pedir ao operador se
precisar entrar lá de novo.

## 1. Chamada direta (`scripts/executor-call.mjs`) — padrão, recomendado

**Texto entra, texto sai.** O Claude principal monta um prompt com todo o
contexto necessário (trecho de arquivo relevante, especificação exata do
que quer), chama esse script via Bash, recebe o texto de volta, REVISA, e
aplica o resultado com as próprias ferramentas (Write/Edit) — o executor
NUNCA recebe acesso a arquivo, é só uma chamada de API de geração de texto.

Mais simples e mais seguro que o mecanismo 2 (nenhum agente autônomo solto
com acesso a arquivo).

```bash
node scripts/executor-call.mjs "prompt curto"
echo "prompt longo com contexto de arquivo colado dentro" | node scripts/executor-call.mjs
```

Padrão: `EXECUTOR_PROVIDER=omniroute`, modelo `auto/coding` (o OmniRoute
prioriza qualidade pra código, com fallback automático entre Anthropic/
Groq/OpenAI/grátis). Precisa de `stream:false` no corpo da chamada — o
OmniRoute responde em streaming (SSE) por padrão, o script já trata isso.

Sem o `omniroute` rodando, o script avisa e para (não falha silencioso) —
nesse caso, `EXECUTOR_PROVIDER=groq` chama a Groq direto, sem o gateway.

## 2. Agente aninhado (`scripts/kimi-agent.sh`) — só pra tarefa grande

Pra quando a tarefa é grande o bastante que precisa de um agente com acesso
a arquivo de verdade (não só "gere essa função", mas "implemente esses 8
endpoints em arquivos diferentes seguindo esse padrão"): roda uma sessão
**inteira e separada** do Claude Code CLI, headless, com
`ANTHROPIC_BASE_URL` apontando pro OmniRoute em vez da Anthropic — o Claude
Code "conversa" com o gateway sem saber a diferença, e o OmniRoute decide
qual provider real atende.

```bash
bash scripts/kimi-agent.sh "<tarefa>" [pasta-de-trabalho]
```

Roda com `--dangerously-skip-permissions` (modo headless não tem terminal
pra aprovar ferramenta em tempo real) — por isso o resultado SEMPRE precisa
ser revisado depois pelo Claude principal antes de considerar pronto.

**Importante — isso é DIFERENTE de um subagente nativo do Claude Code.** A
ideia original (de uma conversa com o Gemini) era declarar um subagente
customizado (`.claude/agents/kimi-worker.md`) com um campo `env:` no
frontmatter apontando só ele pra Moonshot. **Isso não existe hoje** — é um
pedido de feature em aberto
([github.com/anthropics/claude-code/issues/38698](https://github.com/anthropics/claude-code/issues/38698)).
`kimi-agent.sh` existe justamente pra contornar isso de um jeito que
funciona de verdade: um processo filho totalmente separado.

`EXECUTOR_PROVIDER=kimi-direto` pula o OmniRoute e vai direto na Moonshot
com `kimi-k3` (precisa de `MOONSHOT_API_KEY` com saldo — a conta desta
instalação ficou sem saldo no teste inicial, ver crédito de cadastro em
`platform.moonshot.ai` antes de recarregar).

## Onde ficam as chaves

`clienthub/.env.executor` (**nunca commitar** — já no `.gitignore`) — só é
lido pelos scripts se o OmniRoute não estiver disponível, já que as chaves
reais agora vivem DENTRO do OmniRoute (`~/.omniroute/`, criptografadas):

```
MOONSHOT_API_KEY=...   # Kimi, pago, sem saldo no momento do último teste
GROQ_API_KEY=...       # Groq, grátis — também cadastrado no OmniRoute
XAI_API_KEY=...        # Grok/xAI, pago, sem crédito na conta configurada
```

## Regras de quando delegar (o Claude principal decide sozinho, seguindo isto)

Delegar É apropriado pra:
- Função/trecho isolado com especificação clara e sem ambiguidade de design.
- Boilerplate repetitivo (variações parecidas de algo já definido).
- Refactor mecânico bem escopado.

Delegar NÃO é apropriado pra:
- Decisão de arquitetura, modelagem de dados nova, escolha entre abordagens.
- Qualquer arquivo com segredo (`.env*`, credenciais, tokens).
- Módulo compartilhado entre clientes sem a MESMA checagem de isolamento
  entre clientes que vale pro Claude principal (regra de ouro do
  `CLAUDE.md` da raiz — não é dispensada só porque quem gerou foi outro
  modelo).
- Qualquer coisa que o Claude principal não vá revisar antes de aplicar —
  o mecanismo 1 já força essa revisão por natureza (texto entra, Claude
  aplica); o mecanismo 2 exige revisão manual explícita depois, já que
  roda sem aprovação em tempo real.

## Por que o PRODUTO (chat do cliente final) não usa OmniRoute

Perguntado explicitamente em 26-27/07/2026: usar OmniRoute também nos
módulos que o CLIENTE FINAL usa (Claude Code do Hub, gerador de site/
Instagram/CRM) pra economizar token do produto todo, não só do
desenvolvimento. **Decisão: não, não por padrão** — dois motivos reais:

1. **Uso de ferramenta (tool use) não é garantido em todo modelo.** O chat
   do Hub não é "pergunta e resposta" — é um agente completo com Read/
   Write/Edit/Bash (`@anthropic-ai/claude-agent-sdk`). Cair num modelo de
   fallback com tool-calling menos confiável não dá só qualidade pior, pode
   quebrar a funcionalidade inteira (agente "não consegue" ler/escrever
   arquivo do cliente).
2. **É o produto pago do cliente da agência.** Site, post de Instagram,
   automação de CRM — isso é a entrega de verdade que o cliente da agência
   está pagando pra ver pronta. Trocar de modelo silenciosamente por
   economia arrisca qualidade inconsistente entre entregas do mesmo
   cliente, sem ele saber por quê.

Se um dia fizer sentido oferecer isso como opção mais barata pra ALGUM
cliente específico, o caminho certo é estender `lib/claude-accounts.ts`
(que já tem o conceito de conta configurável por cliente) com um tipo de
conta `omniroute` — sempre um MODELO ESPECÍFICO e testado escolhido pelo
operador (nunca `auto`), nunca ligado como padrão global. Não implementado
ainda — só documentado o caminho, se/quando for pedido de propósito.

## Quando for pra VPS

- **OmniRoute**: instalar (`npm i -g omniroute`) e deixar rodando como
  serviço (systemd, pm2, ou similar — o CLI tem `omniroute autostart` pra
  Linux/systemd). Repetir o cadastro das chaves (Anthropic/Groq/OpenAI) no
  dashboard de lá — as credenciais são armazenadas localmente por
  instalação (`~/.omniroute/`), não sincronizam sozinhas entre máquinas.
  Trocar a senha padrão do dashboard antes de expor a porta pra além de
  localhost.
- Mecanismo 1 (`executor-call.mjs`) e mecanismo 2 (`kimi-agent.sh`): sem
  mudança de código pra portar — só precisam do OmniRoute rodando em
  `localhost:20128` (padrão) na mesma máquina, ou `OMNIROUTE_URL` apontando
  pra onde ele estiver. Mecanismo 2 também precisa do binário `claude`
  (Claude Code CLI) instalado no servidor.
