# Referências (código-fonte de terceiros + intake de clientes pra importar)

Essas pastas **não fazem parte do CentralPlus** (o produto vive só em
`../clienthub/`) e nunca entram no build. Dois usos:

1. **Referência de terceiros** — repositórios usados como inspiração de
   UX/modelo de dados pra construir módulos nativos do Hub, nunca
   `yarn install`ados nem copiados. Seguem a mesma regra da seção 2.5 do spec
   ("módulo é dado + pacote", nunca copiar código sob licença incompatível
   com SaaS comercial fechado): a gente lê, entende o modelo, e reimplementa
   do zero em `clienthub/lib/*.ts`. Mantidas aqui (não apagadas) porque a
   equipe pode precisar reconsultá-las quando o módulo evoluir, mas são
   descartáveis a qualquer momento.
2. **Intake de cliente pra importar** — quando um cliente que já tinha uma
   instalação B-O-S standalone (de antes do Hub existir) vai virar cliente do
   Hub, a pasta inteira dessa instalação sobe aqui (`_referencias/<Nome>/`) e
   é importada com `clienthub/scripts/importar-cliente-bos.mjs` — ver
   **[`clienthub/docs/IMPORTAR-CLIENTE-BOS.md`](../clienthub/docs/IMPORTAR-CLIENTE-BOS.md)**
   pro contrato completo. Depois de importada e conferida, a pasta de origem
   pode ser apagada — o script nunca apaga sozinho. Ex.: `ExactaLabs/` (virou
   o cliente `exacta-labs` em 2026-07-23).

## actual-master

Fonte completo do [Actual Budget](https://actualbudget.org) (monorepo
Node/React, sync via CRDT). **Licença: MIT.**

Usado como referência pro **modelo de dados** do módulo Financeiro nativo
(`clienthub/lib/financeiro.ts`): schema em
`packages/loot-core/src/server/aql/schema/index.ts` (accounts, categories,
category_groups, payees, transactions, reflect_budgets/zero_budgets —
envelope budgeting). O CentralPlus **não** usa o motor de sync/CRDT nem
SQLite do Actual — isso seria overengineering pra um storage por-tenant em
JSON já decidido em `clienthub/README.md`. O que foi adaptado:
- Conceito de "carteiras" (contas bancárias/caixas) separado de "contas a
  pagar/receber" — ver `Carteira` em `lib/financeiro.ts`.
- Orçamento por categoria/mês (envelope budgeting) — ver `MetaCategoria` /
  `definirMeta` / `orcamentoDoMes`.

## fscl-main

Fonte do [fscl (Fiscal)](https://fiscal.sh) — CLI headless + **skill de
agente** (`skills/fiscal/SKILL.md`) que faz um agente de IA operar o Actual
Budget em linguagem natural ("Help me set up my budget", "How am I doing this
month?"). **Licença: MIT.**

Não foi portado (é construído em cima do próprio motor do Actual, incompatível
com nosso storage em JSON) — foi usado como referência de **playbook de
agente**: como instruir um assistente a executar ações financeiras diretas
(não só responder perguntas), confirmar antes de gravar valores ambíguos, ser
proativo sobre contas atrasadas/orçamento estourado. Esse padrão foi
adaptado pro prompt do módulo Financeiro em
`clienthub/app/api/tenants/[slug]/chat/route.ts` (`MODULE_PREFIX.financeiro`)
— nosso Claude Code já tem acesso de leitura/escrita sandboxado à pasta do
tenant, então "executar" pra gente é só editar `dados/financeiro.json`
diretamente, sem precisar de CLI própria.

## crm-develop

Fonte do [Frappe CRM](https://github.com/frappe/crm) (Vue + Frappe
Framework). **Licença: AGPL-3.0** — não pode ser embutido num SaaS comercial
fechado (por isso nunca foi instalado/rodado aqui).

Usado só como referência **visual** (layout de sidebar, Painel/dashboard,
Funil, Leads, Integrações) pro módulo CRM nativo
(`clienthub/app/c/[slug]/crm/CrmWorkspace.tsx`) — nenhum código Vue/Python
foi copiado, só a organização de telas.
