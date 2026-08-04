# CentralPlus — guia pro Claude Code

CentralPlus é o gerenciador ÚNICO da agência: um hub white-label multi-tenant
(estilo MazyoHub) com dois lados — **Console do Owner** (`/console`, só o
operador) e **Hub do Cliente** (`/c/<slug>`, cada cliente vê só o dele).
Toda evolução do produto é feita com Claude Code; este arquivo é o contexto
que mantém as mudanças coerentes.

## Regras de ouro (não negociáveis)

- **Uma instalação só.** Cliente novo = registro novo (pasta em
  `../B-O-S/clientes/<slug>/`), nunca deploy novo.
- **Módulo é dado + pacote.** O catálogo vive em `lib/catalog/modulos.json`;
  menu do cliente e toggles de cadastro ITERAM sobre o catálogo. Se adicionar
  módulo exigir mexer em formulário/menu na mão, a arquitetura foi violada.
- **Módulo desligado SOME do menu** (não fica desabilitado visível).
- **Cor e logo são do cliente** dentro do hub dele (tema via
  `identidade/design-guide.md`, parseado por `lib/theme.ts`).
- **Barra MODO OWNER obrigatória** quando o operador está dentro do workspace
  de um cliente (`components/OwnerBar.tsx`).
- **Nunca guardar senha da Anthropic** — só tokens de `claude setup-token`
  (mascarados na UI). Senha de cliente = só hash bcrypt.
- **Segredos de integração (Meta/Instagram) NUNCA na pasta do tenant** — ficam
  em `B-O-S/_integracoes/<slug>.json` (`lib/integrations.ts`), porque a pasta
  do tenant é exposta ao próprio cliente no navegador de arquivos.
- **`config.json` é invisível no navegador de arquivos** (HIDDEN_FILES em
  `lib/files.ts`) — contém hash de senha.
- **Toda ação administrativa → `logAudit()`** (`lib/audit.ts`, JSONL
  append-only em `B-O-S/_auditoria.jsonl`) + label em
  `app/console/auditoria/page.tsx`.
- **Toda ideia mencionada → Banco de Ideias** (`lib/ideias.ts`).
- **UX "for dummies" e 100% em português** — nenhuma tela pode exigir
  conhecimento técnico; textos de ajuda em linguagem simples.
- **Nunca inventar dado.** Se uma métrica/integração não existe, a tela diz
  isso honestamente (ver aba Métricas do Instagram) — nada de número fake.
- **Pedido específico de um cliente nunca pode mudar o comportamento dos
  outros.** Código de módulo (`lib/*.ts`, `app/c/[slug]/<modulo>/`) é
  COMPARTILHADO — editar esses arquivos afeta TODO cliente que usa aquele
  módulo, sempre. Isso é o correto quando o pedido é uma melhoria/correção do
  módulo em si. Mas se o pedido claramente só faz sentido pra UM cliente
  (menciona o cliente pelo nome, ou é sobre o jeito de trabalhar dele
  especificamente), **antes de editar código compartilhado, para e confirma**:
  isso é melhoria do módulo (vale pra todo mundo) ou customização só desse
  cliente (não pode vazar pros outros)? Se a intenção não estiver clara no
  pedido, pergunta — não assume.
  - Se for customização de um cliente só, resolve nessa ordem de preferência:
    1. **Dado/config por-tenant** (quase sempre resolve): campo novo no
       `config.json` do cliente, categoria/preset customizado, toggle — zero
       risco de vazar pra outro cliente, não mexe em código compartilhado.
    2. Só se dado/config não bastar (precisa de UI/lógica genuinamente
       diferente): **fork** do componente/rota só pra aquele cliente (arquivo
       novo, ex: `CrmWorkspaceDrLawer.tsx`, carregado condicionalmente pelo
       `page.tsx` só quando `slug === "dr-lawer"`) — nunca colocar
       `if (slug === "dr-lawer")` espalhado dentro do componente
       compartilhado; isso é o padrão frágil que quebra sem querer.
  - Nunca editar o componente/rota compartilhado achando que é "só esse
    cliente" sem essa confirmação — é assim que um ajuste pontual quebra
    silenciosamente todo o resto da base de clientes.

## Arquitetura (mapa rápido)

- **Tenancy por pasta** (decisão deliberada, não falta de RLS):
  `lib/bos.ts` → `tenantRoot(slug)` + `assertInsideTenant()` é o sandbox.
  Sessões do agente rodam com `cwd` travado na pasta do cliente
  (`app/api/tenants/[slug]/chat/route.ts`), com `canUseTool:
  criarGuardaSandbox(cwd)` (`lib/agentSandbox.ts`) barrando de verdade
  Read/Write/Edit/Glob/Grep/Bash fora dessa pasta — **nunca** use
  `bypassPermissions`/`allowDangerouslySkipPermissions` numa sessão dessas,
  as duas juntas desligam esse controle inteiro (achado real, ver
  `docs/ISOLAMENTO-AGENTE.md`). Migrar pra Postgres+RLS só quando entrarem
  CRM/Financeiro com dados relacionais de verdade + multi-usuário.
- **Auth**: cookie HMAC (`lib/auth.ts`), owner via `.env.local`
  (OWNER_EMAIL/OWNER_PASSWORD), cliente via `acesso.senha_hash` no
  `config.json`. Guards: `lib/access.ts` (páginas) e `lib/apiauth.ts` (APIs).
- **Catálogos (dado, não código)**: `lib/catalog/modulos.json` (módulos),
  `hubs.json` (marcas white-label), `ideias.json` (backlog).
- **Financeiro tem a sidebar inteira real** (não só Entradas/Saídas): Saúde
  Financeira, Orçamento (envelope budgeting), Relatórios, Categorias (CRUD,
  adaptável a qualquer negócio), Funcionários/Folha (com "lançar folha do
  mês" automático), Agenda, Projeção de Caixa, Calculadoras (comissão,
  precificação, margem, ponto de equilíbrio) e Configurações (export CSV).
  Único stub honesto que resta é Permissões (depende de multi-usuário).
- **Base de clientes única por tenant**: `lib/clientes.ts` →
  `dados/clientes.json`. CRM (leads) e Financeiro (lançamentos/contas a
  pagar-receber, via campo `clienteId`) apontam pro mesmo cadastro em vez de
  duplicar nome/telefone/e-mail — `upsertCliente()` casa por WhatsApp/e-mail.
  Handoff CRM→Financeiro: mover um lead pra fase tipo `ganho` com Financeiro
  ativo oferece gerar a conta a receber correspondente, já vinculada ao
  mesmo cliente (`CrmWorkspace.tsx` → `GerarRecebivelModal`, POST direto em
  `/api/tenants/[slug]/financeiro`).
- **Referências externas**: `../_referencias/` (fora de `clienthub/`, não
  entra no build) guarda fontes de terceiros usadas como inspiração de
  modelo de dados/UX — Actual Budget (Financeiro, MIT), fscl (playbook de
  agente financeiro, MIT), Frappe CRM (visual do CRM, AGPL — só layout,
  nunca código). Ver `_referencias/README.md` pra detalhe de licença e o que
  foi adaptado de cada um.
- **Contas Claude**: `lib/claude-accounts.ts` → `B-O-S/_contas_claude.json`.
  Tipo `api_key` (padrão, usa ANTHROPIC_API_KEY) e `seat_token` (assento
  Team via `claude setup-token`, pronto pro futuro; execução por assento em
  VPS ainda não automatizada). Config por cliente em `config.json.claude`
  (conta, modelos liberados, modelo do chat/gerador, limite de tokens).
- **Design system**: tokens em `app/globals.css` (`--mono`, `.nav-item`,
  `.stat-card`, `.badge-pill`, `.icon-badge`, `.table-clean`), ícones
  lucide-react, `components/console/{StatCard,Avatar,ModalPortal}.tsx`.
  Console usa fonte mono na navegação/tabelas (paridade com a referência
  MazyoHub); tema escuro base, cor por cliente.

## Fluxos administrativos (onde cada coisa se edita)

- **Cadastrar cliente**: `/console/novo` (seções: Plataforma/hub →
  Experimental → Identidade+logo → Responsável → Presença digital → Módulos →
  CRM preset → Operacional → Claude (sem/compartilhado/dedicado) → Acesso).
  Backend: `lib/provision.ts` + `POST /api/tenants`.
- **Editar cliente** (dados+módulos+IA num PATCH só): menu ⋯ da tabela
  Clientes → `EditarClienteModal` → `PATCH /api/tenants/[slug]/info`.
- **Excluir** (com confirmação por slug): `DELETE /api/tenants/[slug]`.
  **Arquivar** = status `arquivado` via `PATCH .../status`.
- **Configurações do Hub** (dentro do workspace, aba owner-only): Acesso do
  cliente, Identidade visual, Instagram (API) com tutorial numerado,
  Inteligência (Claude), Módulos do Hub, Sites & métricas.
- **Cliente comum** só vê Privacidade & Perfil (trocar a própria senha via
  `PATCH /api/tenants/[slug]/credenciais`).

## Como adicionar um módulo novo

1. Adicionar a linha em `lib/catalog/modulos.json` (id, nome, path, ícone,
   status, origem, dependências; se fork open source: fonte+licença).
2. Criar `app/c/[slug]/<path>/page.tsx` (+ componentes) seguindo o contrato:
   usa `requireWorkspace`, respeita o tema do cliente, dados por-tenant só
   via `lib/bos.ts`/`lib/files.ts`.
3. Ícone do menu: `MODULE_ICONS` em `components/WorkspaceNav.tsx`.
4. Card de resumo na Visão Geral (`app/c/[slug]/page.tsx`) se fizer sentido.
5. Nada mais — cadastro e menu já leem o catálogo.

## Como importar cliente que já tinha B-O-S standalone

Cliente sobe a pasta inteira da instalação antiga em `../_referencias/<Nome>/`
→ `node scripts/importar-cliente-bos.mjs ../_referencias/<Nome> --hub=<id>`.
Contrato completo (o que é copiado, o que nunca é copiado e por quê, como o
`config.json` é preenchido, tratamento do `.env`/segredos):
**[docs/IMPORTAR-CLIENTE-BOS.md](docs/IMPORTAR-CLIENTE-BOS.md)**. Nunca ativa
módulo sozinho — isso é sempre decisão manual do operador depois do import.

## Chave OpenAI e Publicação do site (por cliente)

Configurações → aba do Hub tem duas seções novas: **OpenAI** (chave própria
opcional pra geração de imagem no chat — sem ela, usa a chave compartilhada
da instalação; `lib/integrations.ts` → `openaiApiKeyEfetiva()`) e
**Publicação** (o que acontece depois do operador aprovar uma versão do
site — FTP funciona de verdade hoje, git é só configuração pronta até
existir um servidor real recebendo o push). Ambas guardadas em
`B-O-S/_integracoes/<slug>.json`, nunca na pasta do tenant (segredo). Existe
também um botão "baixar .zip" no módulo Meu Site (`GET
/api/tenants/[slug]/site/download`, owner-only) — alternativa manual que não
depende de nenhuma configuração de Publicação, pra quem prefere subir pelo
gerenciador de arquivos da própria hospedagem. Ver
**[docs/PUBLICACAO-DE-SITE.md](docs/PUBLICACAO-DE-SITE.md)** pro contrato
completo do FTP/git/ZIP.

## Google Ads API — aplicação real de campanha (MKT Online)

Além do CSV de sempre (autoatendimento, nunca removido), o módulo MKT
Online consegue criar uma campanha DE VERDADE (sempre pausada) na conta de
Ads do cliente via API — só pra `plataforma: "google"`, atrás de um botão
owner-only (`lib/googleAds.ts`, credencial global da instalação em
`.env.local`, Customer ID por cliente em Configurações → aba do Hub →
Google Ads). O agente nunca chama a API sozinho, só escreve o
`campanha.json` (`status: "rascunho"`) — aplicar é sempre ação separada do
operador. Ver **[docs/GOOGLE-ADS-API.md](docs/GOOGLE-ADS-API.md)** pro
contrato completo (arquitetura, geração de credencial/refresh token, o que
continua manual de propósito).

**Agente completo de campanha** ("Criar com agente completo", botão ao lado
de "Nova campanha" no Google Ads): usa a skill `/anuncio-google` do B-O-S
via chat conversacional de verdade (briefing pergunta-por-pergunta,
pesquisa de palavra-chave real, clusters, RSAs) — resultado sai um
`campanha.json` por grupo de anúncio, pronto pra aplicar pela API acima. A
skill mora numa cópia em `B-O-S/_skills-compartilhadas/.claude/skills/`
(nunca aponte sessão de cliente pra `B-O-S/.claude/` direto — isso é irmão
de `clientes/`, exporia todos os outros clientes). Ver
**[docs/AGENTE-CAMPANHA-GOOGLE-ADS.md](docs/AGENTE-CAMPANHA-GOOGLE-ADS.md)**.

## Executor de IA (OmniRoute) — desenvolvimento deste projeto, não módulo do produto

Pra tarefa mecânica/bem definida (função isolada bem especificada,
boilerplate repetitivo, refactor pontual sem ambiguidade de design), o
Claude principal decide SOZINHO delegar a execução pra um modelo mais
barato em vez de gastar token da Anthropic com trabalho que não exige o
raciocínio dele — por padrão `node scripts/executor-call.mjs "<prompt>"`,
que passa pelo **OmniRoute** (gateway local, `localhost:20128`, já com
Anthropic/Groq/OpenAI cadastrados, fallback automático entre eles): texto
entra, texto sai, o Claude sempre revisa e aplica o resultado com as
próprias ferramentas, o executor nunca recebe acesso a arquivo. Pra tarefa
grande o bastante que precisa de acesso a arquivo de verdade, existe um
segundo mecanismo mais pesado (`bash scripts/kimi-agent.sh`), que por
padrão também passa pelo OmniRoute. **Isso é só delegação MINHA de
sub-tarefa de desenvolvimento — não tem nada a ver com o chat que o
cliente final usa dentro do produto** (Claude Code do Hub, gerador de
site/Instagram/CRM), que continua direto na Anthropic, de propósito (risco
de tool-calling menos confiável + é a entrega paga do cliente). Nunca
delegar decisão de arquitetura, arquivo com segredo, ou módulo
compartilhado sem a MESMA checagem de isolamento entre clientes que vale
pro Claude principal. Contrato completo dos dois mecanismos, do OmniRoute,
de por que o produto não usa isso, e checklist pra portar pra VPS:
**[docs/EXECUTOR-IA.md](docs/EXECUTOR-IA.md)**.

## Anexos no chat (imagem, arquivo)

Qualquer `ChatPanel`/`VisaoGeralChat` aceita anexo de verdade (clipe ou
arrastar-soltar) via `hooks/useChatAttachments.ts` — sobe pro workspace do
próprio cliente em `_chat-uploads/` (reaproveita a API de upload do
navegador de arquivos) e o caminho vai junto do pedido mandado ao agente
(`hooks/useAgentChat.ts`), que já sabe ler qualquer arquivo da pasta com a
ferramenta Read — não precisou de suporte a mensagem multimodal na API do
SDK. Módulo "Meu Site" também ganhou um preview com cara de navegador
(barra de endereço com o domínio real do cliente) e um botão **Editar**
que só revela chat/aprovação quando clicado — por padrão só mostra o site,
igual a referência visual pedida.

## WhatsApp real no CRM (Evolution API)

Um Evolution API compartilhado pela instalação (self-hosted, ver
`../_referencias/evolution-api-main/`), uma "instance" por cliente
(`lib/whatsapp.ts`). Mensagem recebida → webhook público
(`/api/whatsapp/webhook/[slug]`) → vira lead/conversa/ligação no CRM
automaticamente. Chat ao vivo (manda/recebe sem abrir o WhatsApp, poll de
4s) e importação de histórico retroativo (`/chat/findMessages`) tanto na
aba WhatsApp quanto na ficha do lead. Automação por etapa do funil (botão
Ação, `CrmFase.automacaoWhatsapp` em `lib/crm.ts`) manda mensagem
programada N dias depois do lead entrar numa etapa — só dispara de verdade
com um cron externo batendo em `/api/cron/whatsapp-automacoes` (protegido
por `CRON_SECRET`, não roda sozinho). **Agente de IA** (`lib/whatsappAgente.ts`,
pacotes `ai`+`@ai-sdk/anthropic`, usa `ANTHROPIC_API_KEY` global) responde
sozinho por etapa do funil, disparado pelo webhook (fire-and-forget).
Contatos/mensagens com identificador `@lid` (WhatsApp esconde o número real
em alguns casos) ficam de fora quando não há `remoteJidAlt` resolvido — não
dá pra mandar mensagem pra um id que não é telefone. Contrato completo +
passo a passo de instalação do Evolution API na VPS:
**[docs/WHATSAPP-EVOLUTION-API.md](docs/WHATSAPP-EVOLUTION-API.md)**.
De propósito fora desta rodada: editor visual de fluxo **editável** (nós
arrastáveis) — o Funil já mostra visualmente as automações/agente ativos
por etapa, sem arrastar.

## Instagram — editor de camadas, arte da IA e publicação real

Todo post (implantado de um template da biblioteca Canva OU criado do zero
pela skill `carrossel`) usa o MESMO contrato: `modelo.json` (camadas
estruturadas — `lib/canvaTypes.ts`) → `paginaParaHtml` + Playwright
(`lib/canvaRender.ts`) → PNG em `instagram/`. Isso é o que torna QUALQUER
post editável no editor visual (`EditorDeCamadas.tsx`, motor
`react-moveable`+`react-selecto`: arrastar/redimensionar/girar de verdade,
snap, multi-seleção, undo/redo) — não existe mais o caminho antigo de HTML
solto por post. Publicação real no feed (`lib/instagramPublish.ts`, Meta
Graph API) e agendamento (`agendamento.json` + cron
`/api/cron/instagram-publicacoes`) substituem a antiga skill quebrada
`aprovar-post`. Depende de duas coisas externas pra funcionar de ponta a
ponta (o código já está pronto, só falta isso): `HUB_URL` público (não
localhost) e o scope `instagram_content_publish` aprovado pela Meta (App
Review). Contrato completo: **[docs/PUBLICACAO-INSTAGRAM.md](docs/PUBLICACAO-INSTAGRAM.md)**.

## Verificação padrão antes de dar por pronto

`npx tsc --noEmit` limpo → servidor dev na porta 4300 → login owner real via
curl (`/api/auth/login` com `{mode:"owner", id, password}`) → páginas tocadas
respondem 200 → fluxo funcional testado via API (criar/editar/excluir com
dados descartáveis, depois limpar). Cliente real atual: `dr-lawer` — não
apagar nem poluir com dados de teste.
