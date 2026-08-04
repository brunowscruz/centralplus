# CentralPlus

Interface web multi-tenant que **envelopa** o motor B-O-S (em `../B-O-S`). Não
recria as capacidades do B-O-S — dá a elas uma cara de produto SaaS: login,
multi-tenant de verdade, Console do Owner completo e agentes conversando via
chat embutido.

> Contexto operacional pro Claude Code (regras de ouro, mapa de arquitetura,
> fluxos administrativos, como adicionar módulo): ver **[CLAUDE.md](CLAUDE.md)**.
> Toda evolução do produto é feita via Claude Code e esses dois arquivos devem
> ser mantidos atualizados a cada mudança estrutural.

> **Princípio central:** o CentralPlus é instalado **uma vez**. Cliente novo nunca
> é um deploy novo — é um registro em `../B-O-S/clientes/<slug>/`. O menu de cada
> cliente é gerado dinamicamente a partir de `modulos_ativos` no `config.json`
> daquele cliente, cruzado com o catálogo de módulos (`lib/catalog/modulos.json`).

## Decisões de arquitetura

**Tenancy por pasta, não Postgres+RLS.** O spec original pede RLS desde o
dia 1. Este projeto usa outro mecanismo de isolamento — `tenantRoot(slug)` +
`assertInsideTenant()` (`lib/bos.ts`) — que garante o mesmo resultado (nenhum
tenant lê/escreve fora do próprio espaço), só que a nível de filesystem em vez
de linha de banco. Foi uma decisão deliberada, não uma lacuna esquecida:

- Está testado e funcionando desde a Fase 1, sem migração de storage.
- No estágio atual (uso solo-operador, poucos clientes), Postgres+RLS
  adicionaria complexidade operacional sem ganho real de segurança. Isso
  vale mesmo agora que CRM e Financeiro são módulos nativos reais — os
  dados deles (leads, lançamentos, contas) continuam JSON por-tenant; a
  única "relação" entre módulos é o campo opcional `clienteId` apontando
  pra `dados/clientes.json` (ver `lib/clientes.ts`), resolvido em memória
  na leitura, não via join de banco.
- **Quando revisitar:** no dia em que entrar multi-usuário por workspace
  (seção 16 do spec) ou WhatsApp com escrita concorrente de verdade — os
  dois exigem controle de concorrência que arquivo JSON não dá de graça.

**Catálogo de módulos é JSON, não Postgres, mas já é dado — não código.**
`lib/catalog/modulos.json` é a fonte única; `lib/modules.ts` só carrega e
tipa. Trocar para uma tabela de banco no futuro é trocar só essa função de
carregamento — o resto do app (formulário de cadastro, menu dinâmico, tela
Módulos) já itera sobre a mesma interface `ModuleDef[]` e não muda.

## O que já está pronto

- **Casca do Hub** — login owner/cliente, tema dinâmico lido do
  `identidade/design-guide.md` (da agência no Console, do cliente no workspace),
  navegação por abas gerada dinamicamente.
- **Console do Owner (seção 3 do spec)** — sidebar fixa com os 4 grupos
  (`components/console/ConsoleShell.tsx`, `app/console/layout.tsx`):
  - **Operation:** Dashboard com estatísticas agregadas reais (workspaces por
    status, saúde média, adoção de módulos).
  - **Users:** Clientes (tabela com status editável inline) e Workspaces
    (mesma fonte de dado, lente de infraestrutura).
  - **Platform:** Hubs (presets por vertical), Módulos (catálogo real, com
    versão/origem/dependências/fonte), Banco de Ideias (backlog vivo, com
    formulário pra registrar ideias novas), Sites (status real por cliente),
    e placeholders honestos para Modelos, Contas Claude, Assentos, Tokens e
    Suporte — cada um documentando do que depende para deixar de ser
    placeholder.
  - **System:** Auditoria (log real, append-only, em
    `B-O-S/_auditoria.jsonl`), Configurações (estado real da instalação:
    ambiente, se a chave Anthropic está configurada, etc.), e placeholders
    para Segurança, Alertas e Feature Flags.
- **Workspace do cliente** — Visão Geral, Meu Site, Instagram,
  **Configurações** com toggles de módulo, e o **módulo Claude Code**.
- **Tema (2 presets, claro/escuro)** — `lib/theme.ts` normaliza qualquer
  `tema` salvo pra `"preto"` (escuro) ou `"branco"` (claro), calculando
  contraste automático (`--accent-text`) pra cor de marca do cliente ficar
  legível nos dois. `ThemeScope` aplica os tokens como CSS vars **e** como
  `bg-app text-app` no wrapper raiz do layout — sem isso, fundo/texto fora
  de `.card` ficam presos na cor padrão do `:root` (bug real já corrigido:
  conteúdo "sumia" contra fundo preto quando o tema do cliente era claro).
- **CRM (nativo)** — `lib/crm.ts` + `app/c/[slug]/crm/`. Sidebar própria
  (Início/Funil/Negócios/WhatsApp/Tarefas/Leads/Anotações/Ligações/
  Integrações), Painel com gráficos reais (leads por origem, negócios por
  etapa, tendência), Funil em Kanban com etapas customizáveis,
  Integrações com webhook público de captação de lead (token por tenant,
  `/api/crm/lead-capture/[slug]`) pronto pra colar num site externo ou
  Zapier/Make. Modelo inspirado no Frappe CRM (AGPL — só layout, ver
  `../_referencias/`).
  **WhatsApp real via Evolution API** (`lib/whatsapp.ts`, self-hosted, ver
  `../_referencias/evolution-api-main/` e
  [docs/WHATSAPP-EVOLUTION-API.md](docs/WHATSAPP-EVOLUTION-API.md)): mensagem
  recebida vira lead automaticamente, ligação vira registro em Ligações,
  QR code de conexão e importação de contatos (com busca + selecionar todos)
  pela própria aba WhatsApp. **Chat ao vivo** dentro do CRM — manda e recebe
  mensagem sem abrir o WhatsApp, tanto na aba WhatsApp (caixa de entrada com
  lista de conversas) quanto dentro da ficha do lead — e **importação de
  histórico retroativo** de um contato específico. **Automação por etapa do
  funil** (botão Ação) — "quando o lead entra nesta etapa, espera N dias,
  manda esta mensagem" — disparada por um cron externo batendo em
  `/api/cron/whatsapp-automacoes` (não roda sozinho, precisa de uma tarefa
  agendada na VPS). **Agente de IA** que responde sozinho no WhatsApp por
  etapa do funil (personalidade configurável, pode mover o lead de fase e
  pedir atendimento humano) — inspirado no
  [wa-agent](../_referencias/wa-agent-main), plugado no Evolution API já
  existente via `lib/whatsappAgente.ts`, usa a `ANTHROPIC_API_KEY` global
  (mesma do Claude Code). Editor visual de fluxo **editável** (nós
  arrastáveis) fica de fora de propósito — o Funil já mostra visualmente
  (sem arrastar) as automações e o agente ativos por etapa; ver a seção "o
  que foi deixado de fora" do doc acima.
- **Financeiro (nativo, sidebar 100% real)** — `lib/financeiro.ts` +
  `app/c/[slug]/financeiro/`. Genérico o bastante pra servir profissional
  autônomo (encanador: Material/Mão de obra como categorias, calculadora de
  precificação), corretor (categoria "Venda de imóvel"/"Aluguel", calculadora
  de comissão) ou agência (Funcionários/Folha, categorias por cliente,
  despesas de escritório) — nada é fabricado, tudo é dado real do tenant:
  - **Visão Geral** / **Saúde Financeira** (score 0-100 + alertas calculados)
    / **Orçamento** (meta planejada por categoria/mês, envelope budgeting) /
    **Relatórios** (gasto por categoria, saldo por carteira, fluxo de caixa).
  - **Financeiro** (grupo com sub-abas): Entradas/Saídas/Carteiras (contas
    bancárias com saldo)/Contas a Pagar-Receber/Assinaturas/Fluxo de Caixa.
  - **Categorias** — CRUD completo (nome/cor/tipo), pra cada negócio adaptar
    o plano de contas à própria realidade.
  - **Funcionários** — cadastro com salário/cargo/dia de pagamento; botão
    "Lançar folha do mês" gera as saídas automaticamente (com proteção
    contra lançar duas vezes o mesmo mês).
  - **Agenda** — contas a pagar/receber pendentes + próxima cobrança de cada
    assinatura, numa linha do tempo só, atrasados destacados.
  - **Projeção de Caixa** (era "Mapas Estratégicos") — saldo projetado dos
    próximos 6 meses a partir do que já está agendado (contas + recorrências)
    — não inventa vendas futuras não cadastradas.
  - **Calculadoras** — comissão de venda, precificação de serviço (material +
    hora + margem), margem/markup, ponto de equilíbrio. Puro cálculo client-side,
    não grava nada.
  - **Configurações** — exportar lançamentos/contas em CSV (pra planilha ou
    contador).
  - **Permissões** — único item que segue placeholder honesto: depende de
    multi-usuário por workspace (fora de escopo, ver seção abaixo).
  Modelo inspirado no Actual Budget (MIT, ver `../_referencias/`) — carteiras
  (contas bancárias) e orçamento por categoria vieram de lá, sem reusar o
  motor de sync/CRDT original.
- **Base de clientes única** — `lib/clientes.ts` → `dados/clientes.json`.
  CRM e Financeiro apontam pro mesmo cadastro por `clienteId` em vez de
  duplicar contato; marcar um negócio como "Ganho" no CRM (com Financeiro
  ativo) oferece gerar a conta a receber correspondente na hora.
- **Módulo Claude Code** — navegador de arquivos read/write + editor +
  chat com o Agent SDK, tudo com `cwd` travado em `clientes/<slug>/`
  (sandbox verificado: traversal e caminhos absolutos são bloqueados).
- **Provisionamento web** — `/console/novo`: formulário multi-etapas com as
  perguntas da entrevista do `/instalar` (negócio → voz → foco → identidade →
  módulos, status inicial, observações internas e acesso). Gera
  `clientes/<slug>/` completo, com credencial gerada automaticamente
  (senha em **hash bcrypt**, nunca texto puro) e tela final com QR code.
  Backend em `lib/provision.ts` + `POST /api/tenants` (owner-only, com
  entrada no log de auditoria).
- **Meu Site** — preview em iframe com seletor de versões (rascunhos em
  `saidas/sites/<nome>/`, site oficial em `site/`). Só o operador aprova um
  rascunho como site oficial.
- **Instagram** — galeria dos posts gerados pela skill carrossel, com
  aprovação do operador antes da publicação real (skill `aprovar-post`).
- **Segurança básica** — senha do cliente com hash bcrypt (`lib/password.ts`),
  com migração silenciosa de configs antigas em texto puro no primeiro login
  bem-sucedido; log de auditoria para criação de cliente, toggle de módulo e
  mudança de status.

## Rodar

```bash
cp .env.local.example .env.local   # ajuste OWNER_* e SESSION_SECRET
npm install
node scripts/seed-cliente.mjs      # cria um cliente de demo (opcional)
npm run dev                        # http://localhost:4300
```

### Credenciais

- **Operador (agência):** `OWNER_EMAIL` / `OWNER_PASSWORD` do `.env.local`
  (padrão do exemplo: `admin@agencia.com` / `owner123`).
- **Cliente:** login = `slug` do cliente, senha definida no cadastro.

### Ativar o chat do Claude Code

O chat precisa de `ANTHROPIC_API_KEY`. O app procura a chave em:
1. `ANTHROPIC_API_KEY` no `.env.local` do CentralPlus; senão
2. `ANTHROPIC_API_KEY` no `.env` do B-O-S.

Sem a chave, o navegador de arquivos funciona normalmente e o chat exibe um aviso.
Hoje é uma única chave global — a tela **Contas Claude** (placeholder) é onde
isso evolui pra múltiplas contas/tokens por `claude setup-token` (seção 6 do spec).

## Referências externas

`../_referencias/` (fora deste projeto, não entra no build) guarda fontes de
terceiros usadas como inspiração de modelo de dados/UX pros módulos nativos
— nunca código copiado. Detalhe de licença e o que foi adaptado de cada um:
ver `_referencias/README.md`.

## Mapa arquitetura → spec

| Peça | Onde | Regra do spec |
|---|---|---|
| Tenancy por pasta + sandbox | `lib/bos.ts` (`assertInsideTenant`) | seção 1, regra de ouro |
| Catálogo + menu dinâmico | `lib/modules.ts` + `lib/catalog/modulos.json` | seção 2.5 |
| Console do Owner (sidebar 4 grupos) | `components/console/ConsoleShell.tsx`, `app/console/*` | seção 3 |
| Hubs (presets por vertical) | `lib/hubs.ts` + `lib/catalog/hubs.json` | seção 3 |
| Banco de Ideias | `lib/ideias.ts` + `lib/catalog/ideias.json` | seção 18/23 |
| Auditoria | `lib/audit.ts` | seção 3/8 |
| Senha com hash | `lib/password.ts` | seção 8 |
| Força do contexto (real) | `lib/tenants.ts` (`computeContextStrength`) | seção 1 |
| Tema por cliente/agência | `lib/theme.ts` | seção 7 |
| Sessão do agente (`cwd` travado) | `app/api/tenants/[slug]/chat/route.ts` | seção 6 |
| Acesso owner/cliente + MODO OWNER | `lib/access.ts`, `lib/apiauth.ts`, `components/OwnerBar.tsx` | seção 3/8, regra de ouro |

## Próximas fases (não construídas nesta rodada, registradas para não se perder)

Cada item abaixo exige integração externa com credenciais que não temos hoje,
ou é uma mudança de storage grande demais para uma única passada — por isso
ficou de fora, não por esquecimento:

- **Contas Claude / Assentos / Tokens reais** — múltiplos tokens via
  `claude setup-token`, pool compartilhado vs. dedicado, limites por cliente.
- **Ads & Analytics, link-in-bio, WhatsApp Business API oficial (Meta —
  diferente do WhatsApp via Evolution API/Baileys já construído no CRM),
  editor visual de fluxo de automação editável (nós arrastáveis)** —
  agente de IA no WhatsApp e a representação visual (não-editável) do
  funil já existem, ver seção do CRM acima (seções 12–15).
- **Multi-usuário por workspace** (seção 16) — necessário antes de vender pra
  clientes com equipe; enquanto isso, "responsável" do lead é só texto
  livre, sem login próprio.
- **CRM: múltiplos pipelines, campos customizáveis por vertical, e-mail
  integrado, anexos em lead, views/filtros salvos, exportação CSV, busca
  global** — ficam de fora desta rodada de robustez do CRM (que trouxe
  timeline unificada no lead, tags, responsável, editar/excluir etapa).
- **Importador de pasta B-O-S** — já construído (`scripts/importar-cliente-bos.mjs`,
  ver [docs/IMPORTAR-CLIENTE-BOS.md](docs/IMPORTAR-CLIENTE-BOS.md)) — é um
  script de linha de comando, não um botão dentro do Console ainda (o
  operador sobe a pasta em `_referencias/` e roda o script na mão).
- **Wiki "for dummies" / Central de Ajuda dentro do produto** (seção 22).
- **2FA** para login do operador/cliente.
- **Migração Postgres+RLS** — se/quando o produto crescer além do que o
  isolamento por pasta aguenta com conforto (ver "Decisões de arquitetura" acima).
- **Deploy em VPS/Coolify** (seção 9/20) — hoje só roda local; checklist do
  spec (trocar `APP_ENV`, domínio próprio, SSL, CORS/callbacks de produção)
  fica pendente até a primeira publicação real.

## Notas de segurança (foundation)

- Senha do cliente é hash bcrypt (`acesso.senha_hash` no `config.json`);
  configs antigas com `acesso.senha` em texto puro continuam autenticando e
  são migradas para hash automaticamente no primeiro login bem-sucedido.
- A sessão é um cookie assinado por HMAC (`SESSION_SECRET`), `httpOnly`.
- Nenhuma sessão de agente ou chamada de API escapa de `clientes/<slug>/`.
- Log de auditoria em `B-O-S/_auditoria.jsonl` para criação de cliente,
  toggle de módulo e mudança de status — ainda não cobre todas as ações
  administrativas possíveis (cresce conforme novas telas ficam reais).
