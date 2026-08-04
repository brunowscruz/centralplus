# Design Guide — CentralPlus

Guia de referência visual do produto. Nasceu de uma análise comparativa
especialista (UX/UI) entre o design system atual do CentralPlus e o Toggl
Track (referência trazida pelo operador via export do Mobbin, 55 telas —
onboarding, app shell, timesheets, relatórios, projetos, clientes, membros,
billing, configurações, conta, dark mode). Objetivo: não copiar o Toggl —
usar os padrões dele para validar o que já está certo e priorizar o que
falta no CentralPlus.

**Atualização (rodada 2 — comparação com protótipo Lovable):** o operador
trouxe um segundo protótipo (`central-client-harmony.lovable.app`, o
CentralPlus remontado com dados reais da Exacta Labs) pra comparar contra
este guia e contra o Toggl. Decisão batida: manter o menu de topo horizontal
como já é (`.ws-tab` em `components/WorkspaceNav.tsx` — isso NÃO muda), mas
adotar a **sub-navegação vertical** (o mesmo padrão `.module-sidebar`/
`.module-sidebar-item` que Financeiro e CRM já usavam) em todo módulo com
3+ sub-seções fixas, em vez da barra horizontal (`.ws-tab`/`.ws-subtab`) que
quebra linha em tela estreita. **Já aplicado** em MKT Online
(`MktOnlineWorkspace.tsx`) e Meu Site (`SiteWorkspace.tsx`) — ambos tinham 4
sub-seções e usavam a barra horizontal. Config (2 abas) ficou como está — a
regra é: **3+ sub-seções fixas por módulo → `.module-sidebar` vertical;
menos que isso, `.ws-tab`/`.ws-subtab` horizontal continua certo.**

**Atualização (rodada 3 — implementação completa dos 5 gaps):** todo o
punch-list da seção 7 foi implementado e verificado ao vivo (tsc + build +
pm2 restart + screenshot real, incluindo o empty state ilustrado rodando
com a cor de um cliente de verdade). Status final:

- ✅ **Toast** — `components/ToastProvider.tsx` (`useToast()`), montado no
  `app/layout.tsx` (estado) + `<ToastViewport/>` dentro do `<ThemeScope>` de
  cada layout (Console e Hub do cliente), pra herdar a cor certa.
- ✅ **Confirmação estilizada** — `components/ConfirmProvider.tsx`
  (`useConfirm()`, promise-based, variantes `danger`/`neutral`). Todo
  `alert()`/`confirm()` nativo do app foi substituído (18 ocorrências, 7
  arquivos) — a única exceção deliberada é o `alert()` dentro do snippet de
  formulário em `Integracoes` (CRM), que é HTML/JS gerado pra rodar no site
  EXTERNO do cliente, fora do nosso app, sem acesso ao nosso Toast.
- ✅ **Empty state ilustrado** — `components/EmptyState.tsx` (canvas,
  técnica validada na exploração). Aplicado em: Google Ads (MKT Online),
  CRM → Leads (dois casos: zero leads / zero com o filtro atual), Meu Site
  (os dois estados que usavam "◈" solto), Console → Clientes.
- ✅ **Celebração full-screen** — `components/Celebration.tsx`
  (`useCelebration()`, confete em canvas, respeita `prefers-reduced-motion`).
  Disparada em dois marcos reais e únicos: primeira campanha aplicada de
  verdade no Google Ads, e primeiro site aprovado.
- ✅ **Filtro composável** — `components/FilterChip.tsx` (chip → popover
  ancorado, busca + checkbox, multi-seleção). Aplicado em CRM → Leads
  (Situação/Origem/Tags), substituindo os 3 `<select>` de valor único.
- ✅ **Seleção em massa** — `components/BulkActionBar.tsx`. Aplicado em CRM
  → Leads (excluir selecionados) e Console → Clientes (arquivar
  selecionados — excluir cliente continua exigindo digitar o slug no modal
  dedicado, ação grande demais pra um botão de seleção em massa).

Nenhum item do punch-list original ficou pendente.

**Regras que não mudam** (já valem hoje, o Toggl não muda isso):
- Cor de ação é **azul** por padrão, ou a cor customizada do cliente
  (`--accent`, painel do cliente) — nunca a cor de marca de terceiro.
- **Claro e escuro sempre suportados**, os dois com o mesmo nível de
  acabamento (o Toggl também suporta os dois — ver seção 6).
- Tokens vivem em `app/globals.css`, nunca inline/hardcoded num componente.

---

## 1. Veredito rápido

O direcionamento visual atual do CentralPlus **está no caminho certo** —
tipografia, densidade, paleta neutra com cor de destaque pontual, cards com
borda fina, badges em pílula, tabs em chip — tudo isso já é,
estruturalmente, o mesmo vocabulário do Toggl Track. Não é um produto que
precisa de reforma visual. O gap real está em **5 padrões de interação**
que o Toggl aplica com disciplina em toda tela e o CentralPlus ainda usa de
forma inconsistente ou não tem:

| # | Padrão que falta/está inconsistente | Onde dói mais hoje |
|---|---|---|
| 1 | Toast de feedback (sucesso/erro) em vez de `alert()`/mensagem inline sumida | `AdsTab.tsx` usa `alert()` nativo do navegador pra erro de exclusão |
| 2 | Empty state ilustrado (padrão único, não texto solto) | Telas com lista vazia (campanhas, leads, arquivos etc.) |
| 3 | Modal de confirmação estilizado pra ação destrutiva, nunca `confirm()` nativo | `AdsTab.tsx` usa `confirm()` nativo pra excluir campanha |
| 4 | Barra de filtro composável (chip → popover com busca+checkbox) | Tabelas com filtro simples ou sem filtro |
| 5 | Seleção em massa + barra de ação flutuante | Listas do Console (clientes) e CRM (leads) |

Esses 5 valem mais retorno de UX por hora investida do que qualquer
"repintura" — são invisíveis quando ausentes (o usuário só sente "feio"/
"cru" sem saber apontar o quê) e muito visíveis quando presentes.

---

## 2. O que o Toggl confirma que já fazemos certo (não mexer)

- **Paleta neutra + 1 cor de destaque usada com moderação.** O Toggl usa
  rosa só em: item de nav ativo, botão primário, linha de gráfico, avatar,
  foco de campo. Todo o resto é cinza/branco/preto. Isso é exatamente
  `--accent` no CentralPlus — a diferença é só a cor em si (deles é fixa,
  a nossa é azul-padrão ou por cliente), não o *quanto* ela aparece.
- **Chip de tab com borda + fundo tintado no item ativo** (`.ws-tab`,
  `.ws-subtab`) é o mesmo conceito do sub-menu de Settings do Toggl
  (General / Alerts / Reminders / Billable rates / ...).
- **Stat card com label pequeno maiúsculo + número grande em negrito**
  (`.stat-card`) é praticamente pixel-a-pixel o padrão dos cards do Admin
  Overview do Toggl.
- **Animação de "pensando" em etapas** (`.thinking-orb`/`.thinking-steps`
  do MKT Online) é mais informativa que qualquer coisa equivalente no
  Toggl — eles só usam spinner genérico em alguns lugares. Não regredir
  isso pra um spinner mudo em nenhuma tela nova.
- **Modal centralizado com scrim escuro pra ação pesada, header com X,
  botão primário destacado** (`ModalPortal`) é o mesmo padrão do "Create
  new project"/"Create a new alert" do Toggl.
- **Sub-navegação em abas horizontais dentro de módulo** (recém-aplicado
  no MKT Online) é o mesmo padrão do Settings/Reports do Toggl.
- **Ícones outline finos e pequenos** (lucide-react) — mesma família
  visual, mesmo peso de traço do Toggl. Não precisa trocar biblioteca.

---

## 3. Os 5 gaps — o que fazer

### 3.1 Sistema de toast (prioridade mais alta)

O Toggl nunca deixa uma ação sem resposta visual: toda operação
(salvar, excluir, convidar, importar) termina num toast pequeno no
canto — verde pra sucesso, com ícone, aparece e some sozinho em ~3s.
Hoje o CentralPlus mistura `alert()` nativo (feio, bloqueia a tela,
quebra o tema), mensagem inline que já existe em algumas telas
(`GoogleDashboardTab`, por exemplo) e nada em outras.

**Proposta:** um `<Toast />` global (`components/Toast.tsx` +
`useToast()` hook, contexto no layout do workspace), classes novas em
`globals.css` (`.toast`, `.toast--good`, `.toast--bad`), substituir todo
`alert()`/`confirm()` de erro simples nos módulos por `toast.error(...)`.

### 3.2 Empty state ilustrado padrão

Toda lista vazia no Toggl segue a mesma fórmula: ilustração pequena
(estilo flat, cor neutra + toque do accent), título curto, subtítulo de
uma linha, botão de ação primária. Hoje o CentralPlus provavelmente varia
tela a tela (texto solto, ou nada).

**Proposta:** componente `<EmptyState icon title subtitle action />`
reutilizável (`components/EmptyState.tsx`), usando ícone lucide grande
(48-56px) num círculo tintado com `--accent` em vez de ilustração
desenhada à mão (mais barato de manter, mais consistente com o resto do
produto) — aplicar em toda lista vazia (campanhas, leads do CRM,
arquivos, notificações etc.).

### 3.3 Confirmação destrutiva estilizada

Toggl nunca usa `confirm()` nativo do navegador. Ação destrutiva (excluir
organização, excluir conta, arquivar clientes) abre um modal pequeno:
título curto, uma frase de consequência (às vezes num box de alerta
amarelo/vermelho explicando o que mais vai junto — "All projects linked
to these clients will be archived as well"), botão vermelho de
confirmação + botão neutro de cancelar.

**Proposta:** `<ConfirmDialog />` (`components/ConfirmDialog.tsx`) sobre
o `ModalPortal` já existente, com variante `danger` (botão vermelho) e
`neutral`. Trocar todo `confirm()` nativo do produto por ele — o caso
mais visível hoje é `AdsTab.tsx` (excluir campanha, inclusive quando
excluir também mexe na conta real do Google Ads, que merece exatamente
esse box de alerta explicando a consequência extra).

### 3.4 Barra de filtro composável

Toggl usa o mesmo padrão em Reports, Approvals, Projects, Clients e
Members: uma fileira de "chips" de filtro (Member, Client, Project,
Billable, Tag...) — cada um abre um popover pequeno e ancorado (não
modal) com busca + lista de checkbox, "+ Add filter" no fim pra adicionar
mais critério.

**Proposta:** componente `<FilterBar />` + `<FilterChip />` reutilizável
com popover ancorado (mesma família visual do `.ws-tab`, mas clicável
pra abrir um menu). Primeiro candidato de aplicação: lista de clientes do
Console e lista de leads do CRM, que hoje têm filtro mais rígido.

### 3.5 Seleção em massa + barra de ação flutuante

Ao marcar 1+ linha de uma tabela no Toggl, aparece uma barra fina acima
da tabela ("3 items selected · Archive · Delete") em vez de exigir ação
linha a linha.

**Proposta:** adicionar `checkbox` de seleção + `<BulkActionBar />` nas
tabelas que já usam `.table-clean` e fazem sentido pra ação em lote
(Console → Clientes, CRM → Leads). Não é urgente pra telas de item único
(ex: Google Ads, que já tem confirmação por linha).

---

## 4. Padrões novos — tokens propostos (a validar antes de implementar)

Nada abaixo entra em produção sem mockup aprovado primeiro (regra já
validada com o operador pra tela nova de porte médio/grande). Ficam aqui
como direção, não como implementação.

```css
/* Toast — inspirado no canto-inferior-direito do Toggl */
.toast { border-radius: 12px; padding: 0.7rem 1rem; font-size: 0.83rem;
  display: flex; align-items: center; gap: 8px; box-shadow: 0 12px 32px -12px rgba(0,0,0,.35); }
.toast--good { background: color-mix(in srgb, #4ade80 12%, var(--card)); border: 1px solid color-mix(in srgb, #4ade80 35%, var(--border)); color: #4ade80; }
.toast--bad  { background: color-mix(in srgb, #f87171 12%, var(--card)); border: 1px solid color-mix(in srgb, #f87171 35%, var(--border)); color: #f87171; }

/* Empty state — ícone grande em círculo tintado, não ilustração */
.empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; padding: 3rem 1.5rem; }
.empty-state__icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); }

/* Filtro composável — chip que abre popover, mesma família do .ws-tab */
.filter-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 8px;
  border: 1px solid var(--border); font-size: 12px; color: var(--muted); }
.filter-chip:hover { color: var(--text); border-color: color-mix(in srgb, var(--text) 20%, var(--border)); }
.filter-chip--active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); background: color-mix(in srgb, var(--accent) 8%, transparent); }

/* Barra de ação em massa — flutua acima da tabela quando há seleção */
.bulk-bar { display: flex; align-items: center; gap: 0.9rem; padding: 0.55rem 0.9rem; border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 10%, var(--card)); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); font-size: 12.5px; }
```

Uma evolução opcional de nível-2 (mexe em visual existente, então
mockup obrigatório antes): dar ao `.ws-tab--active` de navegação de
TOPO (não a sub-tab) um preenchimento sólido em vez de borda+tint —
mais parecido com o "pill" ativo da sidebar do Toggl — mantendo
`.ws-subtab` como está (o contraste entre os dois níveis fica mais
claro). Não fazer isso ainda; é gosto, não gap funcional.

---

## 5. Padrões do Toggl deliberadamente NÃO adotados

- **Sidebar vertical fixa como navegação primária do produto inteiro.**
  O CentralPlus é multi-tenant com módulos plugáveis por cliente — abas
  horizontais por módulo (já em uso) escalam melhor pra esse catálogo
  variável do que uma sidebar longa com seções fixas tipo TRACK/ANALYZE/
  MANAGE/ADMIN. `module-sidebar` (Financeiro) já cobre o caso onde uma
  sidebar interna faz sentido (módulo com muitas sub-áreas).
- **Ilustrações desenhadas à mão** (personagens, blobs orgânicos) no
  onboarding/empty state — foge do vocabulário atual (ícone + geometria
  limpa) e tem custo de manutenção alto (precisaria gerar uma família
  inteira consistente). Ícone grande em círculo tintado entrega o mesmo
  efeito de "não é só texto cru" sem esse custo.
- **Tela de takeover full-screen de celebração** (confete de marco
  atingido) — delighter de baixa prioridade, não resolve nenhuma dor
  relatada.
- **Cor de marca do Toggl (rosa)** — como já combinado, o CentralPlus
  segue com azul-padrão ou a cor configurada por cliente.

---

## 6. Confirmação: claro e escuro

O Toggl também suporta os dois modos (visto em Admin Overview, Reports e
Settings renderizados em dark) com a mesma estratégia que o CentralPlus
já usa: acentuar por troca de token (`--bg`/`--card`/`--border`/`--text`),
manter a cor de destaque constante entre os dois modos, cards ganham só
uma camada de cinza mais clara que o fundo em vez de sombra forte no
escuro. Não é uma mudança de direção — é confirmação de que o approach
via `color-scheme` + `color-mix()` que o `globals.css` já usa é o caminho
certo; não precisa reescrever o sistema de tema.

---

## 7. Ordem de aplicação sugerida

1. `<Toast />` + trocar `alert()`/`confirm()` nativos existentes (maior
   ganho, menor risco — não muda layout de nenhuma tela).
2. `<ConfirmDialog />` variante `danger`, aplicar primeiro em
   `AdsTab.tsx` (exclusão de campanha — já tem o texto de consequência
   pronto, só falta o componente estilizado).
3. `<EmptyState />`, aplicar nas listas vazias mais visitadas (MKT
   Online, CRM, Console → Clientes).
4. `<FilterBar />`/`<FilterChip />` — começar por uma tela só (CRM →
   Leads) antes de propagar.
5. Seleção em massa + `<BulkActionBar />` — última, é a que menos dói
   hoje.

Cada item dessa lista deve ser pedido explicitamente antes de começar
(este documento é a referência, não uma autorização pra implementar
tudo de uma vez).
