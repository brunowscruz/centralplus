# WhatsApp via Evolution API — arquitetura e instalação na VPS

O CRM se conecta ao WhatsApp de cada cliente através de um único servidor
[Evolution API](https://github.com/EvolutionAPI/evolution-api) (fonte
completo em `../_referencias/evolution-api-main/`, MIT) compartilhado pela
instalação inteira. Não roda um Evolution API por cliente — o Evolution API
já é multi-tenant nativo ("instance" = uma conexão WhatsApp isolada), e cada
cliente do Hub ganha a própria instance lá dentro.

## Arquitetura

```
WhatsApp do cliente  ⇄  Evolution API (1 servidor, várias instances)  →  webhook  →  CentralPlus
                                                                                       │
                                                          POST /message/sendText  ←────┘
```

- **Uma instance por cliente**, nome = slug do tenant. Criada pela aba
  WhatsApp do CRM (botão "Conectar WhatsApp" → QR code pra escanear).
- **Webhook por instance** aponta pra `HUB_URL/api/whatsapp/webhook/<slug>`
  — mensagem recebida, chamada, atualização de conexão chegam ali e viram
  lead/ligação/status no CRM daquele cliente automaticamente
  (`app/api/whatsapp/webhook/[slug]/route.ts`).
- **Envio de mensagem** (manual ou automação) chama de volta o Evolution
  API (`POST /message/sendText/:instance`).
- **Token de cada instance** (gerado pelo Evolution API na criação) fica em
  `B-O-S/_integracoes/<slug>.json`, nunca na pasta do tenant — mesmo padrão
  do token do Instagram.
- **Conversas** (histórico de mensagens) são dado de negócio do cliente,
  ficam dentro do workspace dele: `dados/whatsapp.json`.

## Automação por etapa do funil

Decisão de arquitetura (não é acidente, é escolha deliberada): em vez de
replicar um editor visual de nós/fluxos (como a referência MazyoHub
mostrava), a automação é uma regra simples anexada a cada etapa do funil —
"quando o lead entra aqui, espera N dias, manda esta mensagem". Isso cobre
o caso de uso real pedido (mover lead pra "Contato" → depois de X dias
manda mensagem automática) sem o custo de engenharia de um canvas
arrastável do zero. Configurável no botão **Ação** dentro do Funil.

Campos: `CrmFase.automacaoWhatsapp` (`lib/crm.ts`) — `ativo`, `atrasoDias`,
`mensagem` (aceita `{{nome}}`/`{{empresa}}`). `CrmLead.entrouNaFaseEm`
guarda quando o lead entrou na etapa ATUAL (não confundir com
`atualizadoEm`, que muda em qualquer edição) — é a base do cálculo do
atraso. `CrmLead.automacaoDisparadaEm` evita mandar a mesma mensagem duas
vezes pro mesmo lead na mesma etapa.

**Isso não dispara sozinho** — depende de uma tarefa agendada batendo em
`POST /api/cron/whatsapp-automacoes` (header `x-cron-secret: $CRON_SECRET`)
de tempos em tempos (15-30 min é granularidade suficiente pra "depois de N
dias"). Configure isso na VPS depois de subir o Hub — um `crontab` simples
resolve:

```cron
*/15 * * * * curl -s -X POST https://seuhub.com/api/cron/whatsapp-automacoes -H "x-cron-secret: SEU_SECRET" > /dev/null
```

Ou, se a VPS usa Dokploy/Coolify, use o recurso de "Scheduled Task" deles
apontando pro mesmo `curl`.

## Passo a passo — subir o Evolution API na VPS

A pasta `../_referencias/evolution-api-main/` já tem tudo pronto
(`docker-compose.yaml`, `Dockerfile`) — é o próprio fonte oficial do
Evolution API v2. Não precisa clonar de novo, só publicar essa pasta.

1. **Suba a pasta `evolution-api-main/` pra VPS** (ou clone o repositório
   oficial direto lá — o conteúdo é o mesmo).

2. **Crie o `.env`** a partir do `.env.example` que já vem na pasta.
   Campos mínimos pra funcionar com o `docker-compose.yaml` incluso:
   ```env
   SERVER_URL=https://seu-evolution-api.seudominio.com.br
   AUTHENTICATION_API_KEY=gere-uma-chave-longa-e-aleatoria-aqui

   DATABASE_PROVIDER=postgresql
   DATABASE_CONNECTION_URI=postgresql://evolution:SENHA_AQUI@evolution-postgres:5432/evolution_db?schema=evolution_api
   POSTGRES_DATABASE=evolution_db
   POSTGRES_USERNAME=evolution
   POSTGRES_PASSWORD=SENHA_AQUI

   WEBHOOK_GLOBAL_ENABLED=false
   ```
   (`WEBHOOK_GLOBAL_ENABLED=false` porque cada instance já leva o próprio
   webhook na criação — não precisa de um webhook global.)

3. **Suba os containers:**
   ```bash
   docker compose up -d
   ```
   Isso sobe 4 containers: `evolution_api` (a API em si, porta 8080),
   `evolution_postgres` (dados das instances/mensagens), `evolution_redis`
   (cache/fila) e `evolution_frontend` (o Evolution Manager, um painel web
   opcional — não precisa usar, o CentralPlus já cobre conectar/gerenciar).

   O `docker-compose.yaml` original assume uma rede externa chamada
   `dokploy-network` (é feito pra rodar atrás do Dokploy). Se não usar
   Dokploy, troque esse trecho por uma rede normal ou exponha a porta 8080
   direto com um proxy reverso (Nginx/Caddy/Traefik) na frente pra ter
   HTTPS — o Evolution API **precisa** estar em HTTPS público de verdade,
   porque tanto o CentralPlus quanto o WhatsApp do cliente precisam
   alcançá-lo pela internet.

4. **Confirme que subiu:** `curl https://seu-evolution-api.../` deve
   responder com informações da API (nome/versão).

5. **No CentralPlus**, adicione no `.env.local` (ou nas envs da VPS onde o
   Hub roda):
   ```env
   EVOLUTION_API_URL=https://seu-evolution-api.seudominio.com.br
   EVOLUTION_API_KEY=a-mesma-AUTHENTICATION_API_KEY-do-passo-2
   HUB_URL=https://seuhub.seudominio.com.br
   CRON_SECRET=outra-string-aleatoria
   ```
   Reinicie o Hub pra carregar as novas envs.

6. **Configure o cron** (seção acima) pra bater no
   `/api/cron/whatsapp-automacoes` periodicamente.

7. **No CRM de um cliente → aba WhatsApp → "Conectar WhatsApp"** — aparece
   um QR code. Escaneia com o WhatsApp do cliente (Aparelhos conectados →
   Conectar um aparelho) e pronto: mensagens recebidas já viram lead
   automaticamente, ligações aparecem em Ligações, e as automações por
   etapa passam a disparar de verdade.

## Chat ao vivo e histórico de conversa

O CRM tem uma caixa de entrada real (aba WhatsApp e dentro da ficha do
lead): manda e recebe mensagem sem abrir o WhatsApp. Recebimento usa poll
leve (a cada ~4s) enquanto uma conversa está aberta — não tem SSE/WebSocket
por enquanto (fica como melhoria futura, não é infra que já existe).

**Importar histórico** (`importarHistoricoConversa` em `lib/whatsapp.ts`)
puxa retroativo do Evolution API (`/chat/findMessages`) — só o que o
Baileys já sincronizou desde que a instância foi pareada, não o histórico
"de sempre" do celular. Só mensagens de texto entram (mesma limitação do
webhook: mídia é ignorada).

**Identificadores "@lid"**: o WhatsApp esconde o número de telefone real
de alguns contatos (grupos, contas business) atrás de um identificador
opaco `@lid` — o número de verdade só aparece num campo alternativo
(`remoteJidAlt`) quando existe. Contatos que só têm `@lid` (sem
`remoteJidAlt`) ficam de fora da importação — não tem como mandar mensagem
pra um identificador que não é um número de telefone.

**Retenção de mensagens**: `dados/whatsapp.json` guarda até 10.000
mensagens por tenant (todas as conversas somadas, não por contato) — limite
conhecido do storage file-based. Se um cliente tiver volume muito alto de
mensagens, isso é o gatilho pra reavaliar storage (Postgres), mesmo
raciocínio já documentado pro Financeiro/CRM em geral.

## Agente de IA no WhatsApp

Cada cliente pode ligar um agente de IA que responde sozinho as mensagens
recebidas (WhatsApp → aba WhatsApp → card "Agente de IA"). Arquitetura
inspirada no [wa-agent](../_referencias/wa-agent-main) (framework de
agente autônomo pra WhatsApp), mas **sem usar a camada de conexão dele** —
o wa-agent abre a própria conexão Baileys, o que duplicaria a conexão que
já existe via Evolution API. O que foi reaproveitado é só o *design*:
system prompt = personalidade configurada + histórico recente da conversa,
loop de tool-calling via `generateText`/`stopWhen: stepCountIs(6)` do
[Vercel AI SDK](https://sdk.vercel.ai/) (pacotes `ai` + `@ai-sdk/anthropic`),
handoff pra humano como uma tool que seta uma flag persistida no lead.

- Implementado em `lib/whatsappAgente.ts`, disparado pelo webhook
  (`app/api/whatsapp/webhook/[slug]/route.ts`) depois que a mensagem já
  virou lead/conversa — fire-and-forget, não atrasa a resposta 200 pro
  Evolution API.
- Usa a `ANTHROPIC_API_KEY` **global** da instalação (a mesma do módulo
  Claude Code) — sem segredo novo por cliente. Sem essa env configurada, o
  card na aba WhatsApp mostra que o agente não está disponível, sem quebrar
  nada.
- Configuração por instância fica em `_integracoes/<slug>.json` →
  `whatsapp.agenteIA` (`ativo`, `personalidade`, `faseIds?` — vazio =
  responde em qualquer etapa do funil).
- Duas ferramentas (tools) disponíveis pro agente: `mover_lead_fase` (avança
  o funil sozinho quando percebe intenção) e `pedir_atendimento_humano`
  (seta `CrmLead.atendimentoHumano = true` + cria uma tarefa avisando —
  reverte manualmente na ficha do lead pra reativar o agente naquele lead).
- Guarda simples em memória (`Set` de `slug:numero` em processamento) evita
  responder duas vezes se o Evolution API reenviar o mesmo webhook.

## O que foi deixado de fora de propósito (por enquanto)

- **Editor visual de fluxo editável** (nós arrastáveis tipo a referência
  MazyoHub) — em vez de um canvas do zero, o Funil mostra visualmente (sem
  arrastar) as automações e o agente de IA ativos por etapa (ícones no
  card de cada fase). Se um dia precisar de lógica condicional mais
  complexa, dá pra evoluir pra um canvas depois, reaproveitando o motor de
  automação e o agente já construídos — não precisa reescrever do zero.
- **Mensagens com mídia** (imagem, áudio, documento) — webhook, importação
  de histórico e agente de IA hoje só processam mensagens de texto
  (`conversation`/`extendedTextMessage`). Mensagens de outros tipos chegam
  no Evolution API mas são ignoradas pelo nosso lado — não travam nada, só
  não viram lead/conversa/resposta automática sozinhas.
- **Memória de longo prazo do agente** (resumo cumulativo de conversas
  antigas, perfil de usuário extraído por IA — o wa-agent tem isso via
  SQLite) — o agente de IA aqui usa só as últimas ~20 mensagens da conversa
  como contexto; sem resumo/perfil persistido. Suficiente pro caso de uso
  atual (responder no funil), mas é uma limitação conhecida se a conversa
  for muito longa.
