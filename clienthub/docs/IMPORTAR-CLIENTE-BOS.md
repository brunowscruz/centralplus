# Importar cliente que já tinha B-O-S standalone

Antes do CentralPlus existir, cada cliente rodava sua própria instalação
completa do B-O-S (pasta raiz própria, com `.env` próprio, `_memoria/`,
`identidade/`, `.claude/skills/`, etc). Este documento é o contrato de como
migrar uma instalação dessas pra dentro do Hub, como um cliente novo — sem
perder nada real e sem sujar a arquitetura multi-tenant.

Caso de referência real: `exacta-labs` (importado de `_referencias/ExactaLabs/`
em 2026-07-23) e `dr-lawer` (importado antes, mesma lógica, ver
`observacoes_internas` no `config.json` dele).

## Fluxo (pro operador)

1. Suba a pasta inteira da instalação B-O-S standalone do cliente em
   `../_referencias/<Nome>/` (fora do `clienthub/`, não entra no build).
2. Rode:
   ```bash
   cd clienthub
   node scripts/importar-cliente-bos.mjs ../_referencias/<Nome> --hub=<id-do-hub>
   ```
   `--hub` é opcional (ver `lib/catalog/hubs.json` pros ids existentes — hoje
   inclui `agencia`, criado justamente pro caso Exacta Labs). Também aceita
   `--slug=` e `--nome=` pra sobrescrever o que o script detectaria sozinho.
3. O script imprime login + senha gerada (mostrada só uma vez) e um resumo do
   que foi migrado. Guarde a senha.
4. Confira o cliente no Console (`/console/clientes`) e abra o workspace pra
   olhar `_memoria/`, `identidade/` e os arquivos reais migrados.
5. **Libere os módulos manualmente** (Editar cliente → Módulos) — o import
   nunca ativa módulo nenhum de propósito. Essa decisão fica sempre com o
   operador, cliente a cliente.
6. Depois de conferir que ficou tudo certo, pode apagar a pasta original em
   `_referencias/<Nome>/` — o script nunca apaga sozinho.

## O que é copiado, o que não é, e por quê

Uma instalação B-O-S standalone tem duas categorias de conteúdo bem
diferentes, e o import trata cada uma diferente:

### Copiado por inteiro (é dado real do cliente)

| Pasta origem | Vira | Observação |
|---|---|---|
| `_memoria/*.md` | `clientes/<slug>/_memoria/*.md` | Conteúdo real — nunca regenerado/resumido. |
| `identidade/design-guide.md` (+ logo, se tiver) | idem | Usado pra extrair `corPrincipal`/`tema` do `config.json` (best-effort, ver abaixo). |
| `dados/*` (exceto `README.md`) | idem | Normalmente vazio numa instalação nova — só tem algo se o cliente já gerava relatórios/exports. |
| `marketing/*` (exceto `README.md`) | idem | Imagens, LPs, o que já existir. Não precisa seguir o formato `conteudo/<post>/` do módulo Instagram — se não seguir, só não aparece na lista de posts do módulo, mas o arquivo continua lá, acessível pelo navegador de arquivos. |
| `saidas/*` (exceto `README.md`) | idem | Sites, artes, propostas — **exceto** `node_modules/`, `dist/` e `.DS_Store` em qualquer profundidade (regeneráveis via `npm install`/build, e cada projeto ali já tem isso no próprio `.gitignore`). |
| `CLAUDE.md` | `clientes/<slug>/CLAUDE.md`, com um cabeçalho padrão do Hub por cima | Ver seção própria abaixo. |

### Sites em `saidas/sites/<nome>/` — normalizados automaticamente

O módulo Meu Site (`lib/site.ts`) espera `index.html` **direto** na raiz de
cada rascunho — é isso que a skill `criar-site` gera hoje. Mas instalações
mais antigas às vezes empacotavam o mesmo site estático dentro de um
mini-servidor Node (NestJS, Vite com `public/`, etc.) só porque a
hospedagem de origem exigia um processo rodando (ex: Hostinger) — nesse
caso o HTML real fica em `<rascunho>/public/index.html`, um nível abaixo
de onde o módulo procura.

O script detecta esse padrão (sem `index.html` direto, mas com
`public/index.html`) e **normaliza**: move o conteúdo de `public/` pra
raiz do rascunho (onde o Meu Site já sabe abrir/aprovar normalmente) e
guarda o wrapper Node original (package.json, `src/`, etc.) numa subpasta
`_deploy-nodejs/` só de referência — não atrapalha o Meu Site (que só olha
a raiz do rascunho), mas fica preservado caso precise redeployar
exatamente nesse formato de novo. Caso real: os 3 sites da Exacta Labs
vieram assim (NestJS pra rodar na Hostinger) e foram normalizados na
importação.

Se um rascunho não tiver `index.html` nem `public/index.html` (estrutura
que o script não reconhece), ele fica como está — o relatório final avisa
o nome, pra revisar na mão pelo navegador de arquivos.

Boilerplate (`README.md` solto direto dentro de `_memoria/`, `dados/`,
`marketing/`, `saidas/`, `scripts/`) é ignorado — é o texto padrão que todo
instalador novo gera explicando "pra que serve essa pasta", não é dado do
cliente. `README.md` **dentro** de um projeto em `saidas/sites/<algo>/` é
preservado normalmente (é parte do projeto, não boilerplate do instalador).

### Nunca copiado (infraestrutura genérica ou segredo)

| Pasta/arquivo origem | Por quê fica de fora |
|---|---|
| `.claude/skills/*` | É a biblioteca de skills padrão do B-O-S (as mesmas ~25 skills que toda instalação nova recebe) — já existe e é mantida na raiz compartilhada (`B-O-S/.claude/skills/`). Copiar de novo por cliente só duplica ~centenas de arquivos sem necessidade. O cliente nasce com `.claude/skills/` vazio (`.gitkeep`), igual todo provisionamento novo. |
| `scripts/*` (`gerar-imagem.js` etc) | Mesma lógica — ferramenta compartilhada, não por-cliente. |
| `templates/`, `.vscode/`, `.gitignore`, `.env.example`, `README.md` da raiz | Infra do repositório B-O-S em si, não fazem parte do contrato de uma pasta de tenant (comparar com `clientes/dr-lawer/` — nenhum desses existe lá). |
| `.env` | **Nunca** — regra de ouro do Hub: segredo não pode viver dentro da pasta do tenant, porque essa pasta é exposta ao próprio cliente via navegador de arquivos (módulo Claude Code). Ver tratamento específico abaixo. |

### O `.env` de origem — tratado campo a campo, nunca copiado como arquivo

O script lê o `.env` só pra extrair valor, nunca grava o arquivo em si no
workspace novo:

- **`META_PAGE_ACCESS_TOKEN` + `META_IG_USER_ID`** (se os dois estiverem
  preenchidos): migrados pra `B-O-S/_integracoes/<slug>.json` — o mesmo
  lugar/formato que `lib/integrations.ts` usa pra qualquer cliente
  (fora da pasta do tenant, só acessível pelo owner). Marcado com uma nota
  pra conferir se o token ainda é válido (tokens de Página da Meta expiram —
  ver o trabalho de renovação automática em `lib/integrations.ts`/
  `Configurações → Instagram (API)`).
- **`SITE_URL`**: só é aproveitado (vira `presencaDigital.site`) se não for
  o placeholder padrão do instalador (`https://seudominio.com.br`) — caso
  contrário fica em branco, nunca inventa domínio.
- **Qualquer outra chave** (ex: `OPENAI_API_KEY` própria do cliente): fica
  só citada por nome em `observacoes_internas`, nunca migrada — o Hub usa
  uma chave compartilhada (`clienthub/.env.local`), não uma por cliente. Se
  o valor encontrado for **diferente** do que já está configurado no Hub,
  vale conferir na mão se faz sentido reconciliar.

## O `CLAUDE.md` do cliente — por que é preservado por inteiro

Uma instalação standalone às vezes tem um `CLAUDE.md` que é só o template
genérico do instalador, e às vezes tem esse mesmo template **mais** uma
seção customizada no final (`## Regras do negócio — <Nome>`, gerada pelo
`/instalar`) — foi o caso da Exacta Labs.

Tentar separar automaticamente "o que é customizado" do "o que é genérico"
por um script é frágil (depende de cada cliente ter usado exatamente o
mesmo cabeçalho de seção, o que não é garantido). Por isso o import faz o
seguro: mantém o `CLAUDE.md` original **inteiro**, só com um cabeçalho
padrão do Hub (mesmo texto de "Instruções específicas deste cliente...")
colado por cima. Pode duplicar conteúdo que já existe na raiz do B-O-S — é
inofensivo, o Claude só lê a mesma orientação duas vezes — mas garante que
nenhuma regra real do cliente se perde.

## `config.json` gerado — best-effort, sempre revisar

O script tenta detectar automaticamente, a partir dos arquivos reais:

- **`nome`**: linha `**Nome:**` de `_memoria/empresa.md` (fallback: nome da pasta).
- **`tipo`**: linha `**Negócio:**` ou `**Perfil:**` de `_memoria/empresa.md`.
- **`corPrincipal`**: primeiro hex de 6 dígitos encontrado na linha de
  "destaque"/"CTA" de `identidade/design-guide.md`.
- **`tema`** (`"preto"` ou `"branco"`): calculado pela luminância do hex da
  linha "fundo principal" do mesmo arquivo.

Esses três últimos são **heurística sobre texto livre em markdown** — não
tem garantia de acertar 100% se o cliente escreveu o design-guide de um
jeito muito diferente do template padrão. **Sempre conferir** em
Configurações → Identidade visual depois do import.

Campos que o script **nunca** tenta adivinhar (ficam em branco/default, pra
não inventar dado): `responsavel`, `presencaDigital` (exceto `SITE_URL`
real, ver acima), `healthScore` (fica no default 100), `tipoCliente`
(`"nao_definido"`), `crmPreset` (`null`, já que nenhum módulo é ativado).

## Login gerado

O script sempre gera uma senha nova aleatória (formato `xxxxx-xxxxx`, sem
caracteres ambíguos) e grava só o hash bcrypt — a senha em texto puro
aparece **uma vez**, no output do terminal, na hora do import. Se perder,
troque em Editar cliente → Acesso, não tem como recuperar a original.

## Rodar de novo pro mesmo cliente

O script se recusa a rodar se já existir `clientes/<slug>/` — não
sobrescreve nada por segurança. Se precisar reimportar (ex: corrigir um
erro), apague a pasta do tenant primeiro (ou use `--slug=` diferente) e
rode de novo.
