# Exacta Labs — workspace do cliente

Instruções específicas deste cliente. Sobrescrevem as regras da raiz do
B-O-S quando relevantes. O contexto de `_memoria/` e `identidade/`
desta pasta é lido no início de toda conversa.

## Regras deste cliente

- Toda peça pública (post, site, anúncio) passa por aprovação do operador
  da agência antes de publicar.
- Nunca usar a identidade visual da agência nas peças deste cliente.

---

> Importado de uma instalação B-O-S standalone em 2026-07-23. O
> conteúdo abaixo é o CLAUDE.md original dessa instalação, preservado na
> íntegra — pode repetir regras gerais que já existem na raiz do B-O-S
> (inofensivo) e também pode ter regras específicas que esse cliente já
> tinha customizado (essas continuam valendo).

# B-O-S — Sistema operacional do negócio

Sua empresa roda em cima desse arquivo. Aqui ficam as regras de operação
do B-O-S — como o Claude lê o contexto, aprende com correções, mantém
tudo atualizado e cria skills novas conforme a operação evolui.

Esse arquivo é editável. Quando o `/instalar` rodar, ele complementa o
final dessa página com as regras específicas do seu negócio.

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos (quando existirem
e estiverem preenchidos):

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho — o gerenciador decide

**O usuário nunca precisa escolher skill.** Ele descreve o que quer
("cria um site", "monta a campanha", "faz um post") e o Claude atua
como gerenciador: analisa o pedido, identifica o tipo de entrega,
escolhe a(s) skill(s) que maximizam a qualidade e executa. Se o pedido
cruza áreas (ex: "lançar produto novo" = site + campanha + conteúdo),
montar o plano com todas as frentes e executar em sequência lógica.

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/` (e nas skills de plugin disponíveis, como as
`seo-*`). Se encontrar, seguir as instruções da skill. Se não
encontrar, executar a tarefa normalmente — sempre no padrão de
qualidade da seção "Padrões de qualidade" abaixo.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Roteamento — mapa de entrega → skill

O gerenciador usa esse mapa. Ao construir qualquer coisa — site,
campanha, carrossel, sistema, relatório — nunca usar abordagem
genérica. Analisar a entrega e escolher (ou combinar) a skill certa
antes de começar.

### Marketing, conteúdo e social

| Entrega | Skill principal | Skill de apoio |
|---|---|---|
| Post/carrossel Instagram, TikTok, LinkedIn | `/carrossel` | `frontend-design` (direção visual), `gerar-imagem.js` (fotos) |
| Tema completo (artigo blog + carrossel + legendas) | `/publicar-tema` | `/carrossel`, `/seo` |
| Publicar post aprovado (blog + Insta + FB) | `/aprovar-post` | — |
| Email pra cliente/fornecedor | `/email-profissional` | `brand` (tom) |
| Voz de marca, mensagens, posicionamento | `brand` | — |
| Vídeo YouTube completo | `/novovideo` | — |

### SEO, Google Meu Negócio e presença local

| Entrega | Skill principal | Skill de apoio |
|---|---|---|
| Estratégia completa (demanda→GMB→ads→GEO) | `/seo` (8 passos) | skills de plugin `seo-*` abaixo |
| Auditoria técnica de site existente | `seo-audit` / `seo-technical` (plugin) | `seo-performance` |
| Análise de uma página específica | `seo-page` (plugin) | `seo-content`, `seo-images` |
| Schema/dados estruturados | `seo-schema` (plugin) | — |
| Aparecer em IAs (ChatGPT, Perplexity) | `seo-geo` (plugin) | passo 8 do `/seo` |
| Sitemap | `seo-sitemap` (plugin) | — |
| Responder reviews do Google | `/responder-avaliacoes` | — |

### Anúncios pagos

| Entrega | Skill principal | Skill de apoio |
|---|---|---|
| Campanha Google Ads completa (CSV) | `/anuncio-google` | `/seo` passo 1 (keywords reais) |
| Relatório de performance (Google + Meta) | `/relatorio-ads` | `/analisar-dados` |

### Sites e sistemas

| Entrega | Skill principal | Skill de apoio |
|---|---|---|
| Site institucional / landing page | `/criar-site` | `frontend-design`, `ui-ux-pro-max`, `gerar-imagem.js`, `seo-page` |
| Dashboard, app, sistema com dados | `frontend-design` + `ui-ux-pro-max` | `ui-styling`, `design-system`, regras de segurança abaixo |
| Artefato interativo complexo (state, rotas) | `web-artifacts-builder` | `frontend-design` |

### Dados e operação

| Entrega | Skill principal | Skill de apoio |
|---|---|---|
| Analisar CSV/XLSX/PDF | `/analisar-dados` | — |
| Gráficos e visualização de dados | `dataviz` (plugin) | `/analisar-dados` |
| Rotina repetitiva → skill nova | `/mapear-rotinas` | — |
| Contexto/memória | `/abrir`, `/atualizar`, `/salvar` | — |

### Visual e design (arte, peças, apresentações)

1. **`identidade/design-guide.md` manda primeiro.** Se a marca já tem
   cores/fontes/estilo definido, ele sobrescreve qualquer sugestão de
   estilo das skills abaixo — elas entram pra executar com qualidade,
   não pra reinventar a marca.

2. **Mapear a entrega pra skill certa:**

   | Entrega | Skill principal | Skill de apoio |
   |---|---|---|
   | Banner (ads, hero, social) | `banner-design` | `ui-ux-pro-max`, `design` |
   | Logo, CIP, ícone, foto social | `design` | `brand` |
   | Apresentação/slide | `slides` | `design-system` |
   | Arte generativa/algorítmica | `algorithmic-art` | — |
   | Pôster/arte estática PNG/PDF | `canvas-design` | `frontend-design` |
   | GIF animado pro Slack | `slack-gif-creator` | — |

3. **Combinar, não escolher só uma.** Pra entregas grandes (landing
   page, app, carrossel premium), primeiro decidir a direção (paleta,
   tipografia, estilo) com `frontend-design` e/ou `ui-ux-pro-max`, e só
   depois construir com a skill de execução. Não pular direto pro
   código quando a entrega for visual.

4. **Geração de imagem (fotos, logos, ilustrações, hero images):**
   `scripts/gerar-imagem.js` chama a API da OpenAI (gpt-image-1) e já
   está configurado — só depende da `OPENAI_API_KEY` no `.env`. Usar
   sempre que **qualquer entrega visual** precisar de uma imagem
   realista/gerada em vez de placeholder, ícone genérico ou texto
   substituindo imagem. Isso inclui: foto de carrossel, rascunho de
   logo, ilustração de banner, e também **imagens dentro de site, landing
   page, app ou dashboard** — hero image, foto de fundo, mockup de
   produto, avatar, imagem de seção, ilustração de empty state. Não
   se limita ao `/carrossel`: `frontend-design`, `web-artifacts-builder`,
   `ui-ux-pro-max`, `design` e qualquer outra skill visual devem chamar
   o script sempre que o layout pedir uma imagem de verdade — nunca
   deixar `<img>` quebrada, placeholder cinza ou serviço externo tipo
   Unsplash/Lorem Picsum quando dá pra gerar a imagem real.

5. **Skill relevante não é opcional.** Se uma dessas skills cobre a
   tarefa, ela é obrigatória — não vale preferir fazer "na mão" por
   rapidez. O objetivo é sempre a versão mais bem-acabada possível.

---

## Padrões de qualidade

Independente da skill usada, toda entrega respeita esses pisos:

**Sites e landing pages** — únicos, modernos e interativos:
- Nunca entregar template genérico de IA (hero centralizado + 3 cards +
  gradiente roxo). Cada site tem direção estética própria derivada do
  negócio real (via `frontend-design` + `ui-ux-pro-max`)
- Interação de verdade: micro-interações em hover, scroll reveal,
  transições suaves (150-300ms), um elemento-assinatura memorável
- Imagens reais geradas via `gerar-imagem.js` — nunca placeholder
- Responsivo (375/768/1024/1440px), acessível (contraste 4.5:1, focus
  visível, `prefers-reduced-motion`), rápido (imagens otimizadas, sem
  libs desnecessárias)
- SEO on-page de fábrica: title, description, headings, schema JSON-LD,
  Open Graph — não como retrabalho depois

**Sistemas e apps** — segurança de dados em primeiro lugar:
- Segredos SEMPRE em `.env` (nunca hardcoded, nunca commitados —
  conferir `.gitignore` antes de qualquer commit)
- Toda entrada de usuário é validada e sanitizada (XSS, SQL injection,
  path traversal) — no servidor, não só no front
- Senhas com hash forte (bcrypt/argon2), nunca texto puro; sessões com
  expiração; autenticação antes de autorização
- Dados pessoais (LGPD): coletar o mínimo, avisar o uso, nunca logar
  CPF/senha/cartão em texto claro
- HTTPS sempre; headers de segurança (CSP, X-Frame-Options) em produção
- Antes de entregar sistema que lida com dados sensíveis, rodar um
  passe de revisão de segurança no próprio código

**Campanhas e marketing** — decisão com dado real:
- Pesquisa real via WebSearch antes de qualquer estratégia — nunca
  inventar volume, CPC ou concorrência
- Toda campanha nasce com conversão configurada e lista de negativas
- Copy segue a voz do negócio (`_memoria/preferencias.md`), fala como
  o cliente real fala

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Seguir o fluxo da skill-creator nativa do Claude Code

---

## Regras do negócio — Exacta Labs

> Adaptado pelo `/instalar` a partir do molde de agência/consultoria.
> As seções acima (gerenciador, roteamento, padrões de qualidade,
> memória) continuam valendo por igual — isso aqui é o que é
> específico da Exacta Labs.

### O que é esse workspace

Operação da Exacta Labs — agência de tecnologia, marketing e IA com
mais de 10 anos de história, hoje em relançamento como "Exacta Labs
2.0". Aqui ficam o site institucional, redes sociais, sistemas de
captação/CRM, propostas e o próprio produto B-O-S.

**Estrutura de pastas:**
- `_memoria/` — quem é a Exacta Labs, como falamos, foco atual
- `identidade/` — marca da Exacta Labs (logo, cores, tipografia)
- `clientes/` — uma subpasta por cliente, autossuficiente (criar
  conforme surgir o primeiro cliente pós-relançamento)
- `marketing/` — conteúdo institucional, site, redes sociais
- `saidas/` — documentos pontuais, análises, propostas
- `dados/` — arquivos a analisar (relatórios, exports)
- `scripts/` — automações e geração de imagem

### Sobre a agência

Duas frentes históricas: (1) sistemas/SaaS/arquitetura/sustentação
para grandes corporações — legado, não é o foco atual; (2) marketing +
tecnologia + IA para negócios locais (autos, beleza, serviços, varejo,
saúde, coaching) — foco dos últimos 2 anos e da 2.0. Serviços
principais:

- Sites e sistemas sob medida (CRM, financeiro, captação de leads)
- Gestão de redes sociais e Google Meu Negócio
- Google Ads e Meta Ads
- B-O-S — produto próprio de sistema operacional de marketing com
  agentes de IA, vendido ao cliente final ou usado internamente

Time: 1 pessoa (fundador), com plano de montar equipe em breve.

### Prioridade atual — Exacta Labs 2.0

Relançamento do zero: site novo, redes sociais novas com publicação
automatizada, sistema de captação de leads/CRM, Google Ads, mensageria
(WhatsApp/email/chatbot). A Exacta Labs é a primeira vitrine do B-O-S
— toda automação que vender pro cliente, testar em si mesma primeiro.
Ver `_memoria/estrategia.md` para detalhes e prioridades.

### Tom de voz

Profissional e leve, sem jargão de guru nem formalidade engessada —
gente jovem que fala com propriedade. Toda comunicação (site, posts,
propostas) conecta a tecnologia ao resultado financeiro real do
cliente: "o cliente ganhando, a gente ganha junto". Ver
`_memoria/preferencias.md`.

### Regras do sistema

- Cliente novo → criar pasta `clientes/<Nome>/` com briefing, estratégia
  e subpastas conforme as entregas contratadas
- Proposta nova → `saidas/propostas/<cliente>-<data>.html` antes de fechar
- Casos de sucesso ficam em `clientes/<Nome>/caso.md` (reuso em pitches
  e no site)
- Toda entrega visual (site, posts, propostas) segue
  `identidade/design-guide.md` — cores azul marinho + teal do logo já
  são fixas; demais elementos de design são construídos com as skills
  visuais (`frontend-design`, `ui-ux-pro-max`, `design`) e pesquisa
  online de referência quando fizer sentido
- Publicação em redes sociais e captação de leads são gargalos
  recorrentes semanais — candidatos prioritários a virar skill via
  `/mapear-rotinas`

### Ferramentas conectadas

- [ ] Notion
- [ ] Gmail
- [ ] Google Calendar
- [ ] Meta Ads
- [ ] Google Ads
- [x] `scripts/gerar-imagem.js` (OpenAI gpt-image-1)

*(Marcar conforme for instalando os MCPs)*

