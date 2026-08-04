---
name: carrossel
description: >
  Cria carrosséis e posts visuais pra Instagram, TikTok, LinkedIn com a identidade visual da marca.
  Gera HTML estilizado + renderiza em PNG 1080x1350 via Playwright, com legenda pronta no final.
  Suporta carrossel texto puro, carrossel com foto IA (gerada via OpenAI) e post único.
  Use quando o usuário pedir "carrossel", "post", "conteúdo pro instagram", "criar imagem",
  "gerar foto", "post educativo", ou /carrossel.
---

# /carrossel — Carrossel e posts visuais

Skill central de criação de conteúdo visual. Pega um tema → entrega HTMLs estilizados + PNGs prontos pra postar + legenda no padrão da marca.

## Dependências

- **Identidade visual:** `identidade/design-guide.md` — LER ANTES de criar qualquer visual
- **Contexto do negócio:** `_memoria/empresa.md`
- **Tom de voz:** `_memoria/preferencias.md`
- **Render:** `modelo.json` (camadas) → PNG via `scripts/render-modelo.mjs` do CentralPlus (Playwright por baixo, ver Passo 4) — nunca HTML solto
- **OpenAI API:** `scripts/gerar-imagem.js` já configurado (chave em `.env`) — usar sempre que o conteúdo pedir foto
- **Outputs vão em:** `marketing/conteudo/<tipo>-<tema>-<YYYY-MM-DD>/`

---

## Tipos de conteúdo

Ao receber um pedido, identificar qual tipo se encaixa:

### 1. CARROSSEL TEXTO PURO
- **Quando usar:** posts educacionais, dicas, listas, explicações
- **Formato:** 1080x1350 (4:5) — sempre
- **Estilo:** tipografia clean, cores da marca alternadas, sem fotos

### 2. CARROSSEL COM FOTO
- **Quando usar:** apresentação visual, conteúdo aspiracional, capa com personagem
- **Formato:** 1080x1350 (4:5)
- **Estilo:** foto como capa com gradient overlay + slides internos no padrão alternado
- **Foto:** pode ser IA (gerada por OpenAI) ou real (passada pelo usuário)

### 3. POST ÚNICO
- **Quando usar:** frase de impacto, dado/estatística, depoimento, bastidores
- **Formato:** 1080x1350
- **Estilo:** varia conforme o conteúdo (citação, número grande, foto com overlay)

Se o tipo não estiver claro, perguntar:
> "Que tipo de conteúdo? (1) carrossel texto, (2) carrossel com foto, (3) post único"

---

## Estilo visual base

O B-O-S tem um estilo próprio — editorial, calmo, premium. Sem clip-art, sem emoji decorativo, sem gradiente arco-íris, sem template genérico de IA. `identidade/design-guide.md` sobrescreve esses padrões; quando o design-guide for vago ou estiver em branco, usar o que tá aqui (não parar pra pedir `/instalar` — o `/carrossel` funciona com defaults bons).

### Tipografia padrão

- **Fonte:** Inter (Google Fonts), pesos 400/500/600/700/800/900
- **Título de capa:** 90-100px, weight 900, line-height 0.98, letter-spacing **-0.04em**
- **H2 (slides internos):** 60-72px, weight 800, line-height 1.04, letter-spacing **-0.035em**
- **Corpo:** 20-24px, weight 500, line-height 1.5
- **Eyebrow/kicker:** 13-16px, weight 700-800, **UPPERCASE**, letter-spacing **0.22-0.32em**, cor de destaque
- **Page counter (canto sup. dir.):** 14-16px, weight 500-600, letter-spacing 0.18em, cor muted
- **Meta/handle (@):** 15-18px, weight 600

Regra do tipo: títulos grandes com kerning **apertado** (-0.035em), eyebrows pequenos com kerning **aberto** (0.22em+). Esse contraste é o coração do estilo.

### Cores padrão (quando design-guide for vago)

Paleta sóbria: fundo dark + off-white + **UMA** cor de destaque. Nunca quatro cores brigando.

- Fundo escuro: `#0E1116` ou `#1A1A1A`
- Fundo claro alternativo: `#F5ECD7` (cream) ou `#FAFAF7`
- Texto sobre escuro: `#FAFAF7`
- Texto sobre claro: `#1A1A1A` (h2) e `#444` (corpo)
- Destaque: cor da marca (uma só)

### Elementos visuais recorrentes

- **Régua fina** (3-4px de altura, 60-80px de largura, cor de destaque) entre kicker e h2 ou como divisor
- **Logo top-left + page counter top-right** em todos os slides
- **Border-top 1px** `rgba(255,255,255,0.12)` separando rodapé do conteúdo (em slides escuros)
- **Stamps circulares** (200x200, border 3px translúcida, rotate -10deg) pra selos/datas/dados
- **Tags/pills** uppercase, padding generoso, kerning 0.2em, pra rotular categoria do slide
- Padding base: 70-100px nas laterais

### Layouts nomeados

Vocabulário de layout — cada slide tem um nome. Variar entre eles pra criar ritmo:

- **CAPA** — eyebrow + título grande + subtítulo + @handle. Fundo: foto com gradient overlay (`rgba(12,10,9,0.55)` → `rgba(12,10,9,0.85)`) OU sólido (escuro/claro/destaque)
- **SOLO** — split horizontal: foto à esquerda 50% + texto à direita 50% (kicker + h2 + régua + parágrafo)
- **DUO** — texto em cima (kicker + h2 + régua + p) + 2 fotos lado a lado embaixo (ou 1 foto larga)
- **NÚMERO** — numeral gigante (200-320px, weight 800, cor de destaque) como elemento gráfico + h2 + parágrafo de apoio
- **CITAÇÃO** — aspas grandes em watermark + frase em h2 + atribuição
- **CTA FINAL** — fundo na cor de destaque, logo centralizado, headline curta, botão/CTA, telefone/@handle

**Ritmo de slide a slide:** alternar fundo escuro ↔ claro ↔ destaque. Nunca dois slides seguidos com o mesmo fundo.

---

## Legibilidade (regra dura — o post é visto num celular de 6")

O carrossel é consumido em tela pequena, com scroll rápido, muitas vezes com sol na tela. Se precisa apertar os olhos, o slide falhou.

**Tamanhos mínimos (em px no canvas 1080x1350):**
- Título de capa: nunca abaixo de 72px
- H2 interno: nunca abaixo de 52px
- Corpo de texto: nunca abaixo de 30px — os 20-24px da tipografia padrão valem pra legenda de apoio/metadados, NÃO pro texto principal do slide
- Eyebrow/counter: mínimo 18px
- **Teste mental:** reduzir o slide pra 350px de largura (tamanho real no feed) — ainda lê tudo sem zoom?

**Quantidade de texto:**
- Máx ~20 palavras de corpo por slide. Se precisa de mais, é outro slide
- Título de capa: máx 8 palavras, uma ideia só
- Hierarquia clara: 1 elemento dominante por slide — o olho tem que saber onde começar

**Texto sobre foto (obrigatório quando usa imagem gerada):**
- Overlay SEMPRE: gradient mínimo `rgba(0,0,0,0.55)` na área do texto — nunca texto direto na foto
- Testar contraste: texto branco sobre a área mais CLARA da foto ainda passa 4.5:1?
- Posicionar o texto na área "calma" da foto (céu, parede, desfoque) — nunca sobre o ponto focal
- Se a foto não tem área calma, regenerar a foto pedindo espaço negativo no prompt (`negative space on the left/top for text overlay`)
- Sombra de reforço em títulos sobre foto: `text-shadow: 0 2px 24px rgba(0,0,0,0.45)`

**Verificação obrigatória no render:** ao ver os PNGs, checar cada slide: algum texto encostando na borda? Algum texto sobre área movimentada da foto? Alguma linha órfã feia? Corrigir ANTES de mostrar.

---

## Criatividade pra views e clientes (o post existe pra performar)

Bonito que ninguém para pra ver não gera cliente. Cada carrossel é pensado pros dois públicos: o algoritmo e a pessoa.

**Capa = 80% do resultado.** Ela compete com tudo no feed. Antes de escrever, escolher UM mecanismo de hook:
- **Curiosity gap:** "O erro que 9 em 10 [nicho] cometem" (sem entregar qual)
- **Número específico:** "R$ 3.400 perdidos por mês" bate "você perde dinheiro"
- **Contraste/polêmica leve:** "Pare de postar todo dia" (contraintuitivo no nicho)
- **Dor nomeada:** a frase exata que o cliente fala quando reclama do problema
- **Antes/depois:** transformação visual ou numérica
- Oferecer as 3 opções de título de capa com mecanismos DIFERENTES, não 3 variações da mesma frase

**Retenção (o algoritmo mede se a pessoa chega no final):**
- Slide 2 é o segundo hook: recompensar o clique imediatamente com o primeiro insight, não com introdução
- Open loop entre slides: terminar slide com gancho pro próximo ("e o terceiro erro é o mais caro...")
- Slide de virada no meio (NÚMERO ou CITAÇÃO) pra quebrar a monotonia visual

**Salvamento e compartilhamento (sinais mais fortes que like):**
- Conteúdo "salvável": checklist, passo a passo, tabela de referência, erro/solução — coisa que a pessoa quer voltar
- Penúltimo slide pode pedir o save de forma natural ("salva esse post pra quando for fazer X")

**Conversão (views viram cliente no último slide + legenda):**
- CTA específico e de baixa fricção: "manda um oi no WhatsApp" > "entre em contato"
- Legenda: hook próprio na primeira linha (o Instagram corta depois de ~125 chars), não repetir o título da capa
- 1 CTA por post. Post com 3 pedidos não converte nenhum

**Calibração criativa:** antes de fechar o conceito, se perguntar — "eu pararia o scroll nisso?" Se a resposta é morna, trocar o ângulo, não o adjetivo.

---

## Padrão do carrossel

**Estrutura base (5 a 10 slides):**
- **Slide 1:** layout `CAPA`
- **Slides internos:** usar 2-3 layouts diferentes entre `SOLO` / `DUO` / `NÚMERO` / `CITAÇÃO`
- **Slide final:** layout `CTA FINAL`

Antes de criar HTML: ler `identidade/design-guide.md`. Se estiver em branco, usar o "Estilo visual base" acima como default.

### Sequência de capas no feed (planejamento de grade)

Antes de definir a capa, considerar a **última capa publicada** pra alternar:
- claro → próxima é foto/escuro
- foto/escuro → próxima é cor da marca
- cor da marca → próxima é claro
- nunca duas capas iguais em sequência

Se o usuário não souber qual foi a última, perguntar.

### Linguagem (regra crítica)

Seguir `_memoria/preferencias.md`. Em geral: frases naturais, sem jargão de marketing, sem corporativês. O público real raramente fala "ticket médio", "performance", "B2B". Falar como ele fala.

### Legenda — sempre gerar junto

Ao terminar de renderizar os PNGs, gerar **automaticamente** a legenda do post e salvar em `legenda.md` na mesma pasta. **Não esperar o usuário pedir.** Estrutura padrão:

1. Hook (pergunta ou afirmação)
2. Contexto (1-2 frases sobre o conteúdo)
3. CTA pra arrastar ("Arraste pro lado e confere")
4. Bloco de oferta (diferenciais da empresa, contato)
5. Hashtags (10-15 — público + nicho + local se aplicável)

---

## Workflow

### Passo 1 — Entender e planejar

1. Ler `_memoria/preferencias.md` e `_memoria/empresa.md`
2. Ler `identidade/design-guide.md` pra cores, fontes e logo
3. Identificar o tipo de conteúdo (1, 2 ou 3)
4. Definir o tema e o ângulo

### Passo 2 — Texto

Escrever o conteúdo seguindo as regras de tom:

**Pra carrossel (5-10 slides):**
- Slide 1 (Capa): título impactante, máx 8 palavras. Oferecer 3 opções
- Slides internos: um insight por slide, frases naturais, sem bullet points
- Slide final: CTA + logo

**Pra post único:**
- Frase principal em destaque
- Contexto de apoio (se necessário)
- CTA sutil

**CHECKPOINT:** Mostrar o texto completo. Esperar aprovação antes do visual.

### Passo 3 — Gerar fotos (se tipo 2)

Só se o usuário pediu carrossel com foto IA.

1. Montar prompt em inglês (a API funciona melhor em inglês)
2. Padrão genérico de prompt:

```
Professional [TIPO] photography of [ASSUNTO],
[DETALHES], [AMBIENTE/CONTEXTO],
[ESTILO DE LUZ] lighting, shallow depth of field,
shot from [ÂNGULO], [ESTILO/ESTÉTICA],
editorial quality
```

3. **Pensar a foto JUNTO com o layout, não depois.** Antes de gerar, decidir onde o texto vai ficar no slide e incluir isso no prompt (`negative space at the top for text overlay`, `subject positioned on the right side`). A foto é parte da composição, não fundo aleatório.

4. Gerar via script (já configurado em `scripts/gerar-imagem.js`):
```bash
node --env-file=.env scripts/gerar-imagem.js "PROMPT" "marketing/conteudo/<pasta>/foto-<nome>.png" 1024x1536
```
(`1024x1536` retrato pra capa 4:5; `1024x1024` pra fotos de slides SOLO/DUO)

5. Avaliar a foto ANTES de usar: tem área calma pro texto? A luz combina com a paleta do design-guide? Tem artefato estranho de IA (mão errada, texto ilegível na imagem)? Se falhou em qualquer um, regenerar com prompt ajustado — não empurrar foto ruim pro slide.

6. Mostrar a foto pro usuário antes de continuar.

**CHECKPOINT:** Foto aprovada → seguir. Se não, ajustar prompt e regenerar.

### Passo 4 — Criar visuais (modelo.json + PNG)

**Mudou (rev. 27/07/2026): não escrever mais HTML solto.** O CentralPlus tem
um editor visual de camadas (arrastar, redimensionar, girar) que só
funciona em posts com um `modelo.json` estruturado — o mesmo formato que os
templates importados do Canva usam. Pra "toda arte gerada pela IA também
ficar editável visualmente" no Hub, o `/carrossel` escreve DIRETO nesse
formato em vez de montar um `carrossel.html` livre. Cada slide é uma
`PaginaModelo` (array `paginas`, uma por slide, na ordem); cada elemento do
slide é uma `Camada` (`tipo: "texto" | "imagem" | "forma"`, sempre
posicionada em px absolutos 0-1080 / 0-1350, não porcentagem):

```json
{
  "paginas": [
    {
      "largura": 1080,
      "altura": 1350,
      "corFundo": "0E1116",
      "camadas": [
        { "id": "eyebrow", "tipo": "texto", "x": 90, "y": 90, "largura": 900, "altura": 40,
          "texto": "GUIA RÁPIDO", "tamanhoFonte": 16, "cor": "FF6600", "negrito": true },
        { "id": "titulo", "tipo": "texto", "x": 90, "y": 420, "largura": 900, "altura": 320,
          "texto": "O erro que 9 em 10 dentistas cometem", "tamanhoFonte": 92, "cor": "FAFAF7", "negrito": true },
        { "id": "regua", "tipo": "forma", "x": 90, "y": 380, "largura": 70, "altura": 4, "corFundo": "FF6600" }
      ]
    }
  ]
}
```

Vocabulário de campo por efeito visual (todos os campos de `Camada`, ver
`app/api/tenants/[slug]/chat/route.ts` → `MODULE_PREFIX.instagram` no repo
`clienthub` pra lista completa e atualizada):

- **Régua fina / divisor:** camada `forma` retangular fina (`largura` grande, `altura` 3-4px), `corFundo` na cor de destaque.
- **Stamp circular translúcido:** camada `forma`, `formaTipo:"circulo"`, `corBorda`+`larguraBorda` (borda), sem `corFundo` (ou com opacidade baixa via `opacidade`), `rotacao:-10`.
- **Tag/pill:** camada `forma` com `raioBorda` alto (metade da altura) + uma camada `texto` uppercase por cima, mesma posição.
- **NÚMERO gigante:** camada `texto` só com o numeral, `tamanhoFonte` 200-320, `negrito:true`, `cor` na cor de destaque.
- **CITAÇÃO com aspas watermark:** camada `texto` com o caractere de aspas, `tamanhoFonte` bem grande, `opacidade` baixa (0.08-0.15), atrás da camada de texto da frase (ordem no array = z-index, watermark vem ANTES no array).
- **Foto com gradient overlay (CAPA sobre foto):** camada `imagem` (a foto) seguida de uma camada `forma` do MESMO tamanho/posição com `gradiente: {de: "00000000", para: "000000CC", angulo: 180}` (hex de 8 dígitos = RRGGBBAA, alpha no fim — CSS aceita) por cima, e a(s) camada(s) de `texto` por cima de tudo (todas depois no array).
- **Texto sobre foto (legibilidade obrigatória):** além do overlay acima, aplicar `sombra: {cor:"000000B3", blur:24, x:0, y:2}` na própria camada de texto — vira `text-shadow` nas letras (reforço de contraste, regra já existente da seção "Legibilidade").
- **SOLO (foto 50% + texto 50%):** uma camada `imagem` ocupando a metade esquerda/direita (`largura: 540`) + camadas de texto na outra metade.
- **DUO (2 fotos lado a lado):** duas camadas `imagem` lado a lado (`largura: ~510` cada, com um respiro entre elas) + camadas de texto acima ou abaixo.
- **Logo top-left / page counter top-right:** camada `imagem` (logo, se houver arquivo) ou `texto` (nome da marca) + camada `texto` com o número da página, mesmo em todo slide.

1. Montar cada slide como uma `PaginaModelo` seguindo o vocabulário acima, com cores/tipografia de `identidade/design-guide.md`. Mínimo 2 layouts diferentes entre os slides (não repetir o mesmo em todos).
2. Salvar o JSON completo (`{ "paginas": [...] }`) em `modelo.json` na raiz da pasta do post.
3. Fotos geradas por IA (Passo 3) vão dentro de uma subpasta `img/` (não mais solta na raiz) — o campo `arquivo` da camada tipo `imagem` é só o NOME do arquivo dentro de `img/` (ex `"arquivo": "foto-capa.png"`, referenciando `img/foto-capa.png`).
4. Renderizar os PNGs finais rodando (a partir da pasta do cliente, isso já resolve os caminhos certos):
```bash
BOS_ROOT="$(cd ../.. && pwd)" node ../../../clienthub/node_modules/.bin/tsx ../../../clienthub/scripts/render-modelo.mjs "$(basename "$PWD")" <nome-da-pasta-do-post>
```
Isso gera `instagram/slide-01.png` → `slide-NN.png` a partir do `modelo.json` (Playwright, mesmo motor de sempre — só a origem do layout que mudou de HTML livre pra camadas estruturadas).
5. Mostrar slide 1, 2 e o CTA final renderizados. Se aprovado, mostrar os intermediários.
6. **Não criar mais `carrossel.html` nem `render.js` por post** — esses dois arquivos ficaram obsoletos com essa mudança; um post sem `modelo.json` não abre no editor visual do Hub.

### Passo 5 — Salvar e organizar

```
marketing/conteudo/<tipo>-<tema>-<YYYY-MM-DD>/
  texto.md              ← texto aprovado + legenda
  modelo.json            ← camadas estruturadas de cada slide (ver Passo 4)
  img/
    foto-<nome>.png       ← fotos geradas por IA (se houver)
  instagram/
    slide-01.png → slide-NN.png    ← gerado pelo render-modelo.mjs, não editar na mão
  legenda.md            ← legenda Insta+FB
  legenda-linkedin.md   ← (se pedido, mais formal)
```

Se o usuário pedir também uma versão TikTok/Reels (9:16), é um POST
SEPARADO (`criarPastaDePost` com seu próprio `modelo.json`, páginas
`largura:1080, altura:1920`) — não uma subpasta do post do Instagram, pra
cada um continuar sendo editável e aprovável independentemente no Hub.

### Passo 6 — Conexão com blog (opcional)

Depois de criar o conteúdo visual, perguntar:

> "Esse conteúdo dá pra virar artigo no blog também. Quer que eu crie a versão blog pra SEO?"

Se sim, chamar `/publicar-tema` com o mesmo tema.

---

## Regras

- Sempre ler `identidade/design-guide.md` antes de criar qualquer visual
- Carrossel: 1080x1350 (4:5 retrato) — sempre. TikTok/Reels: 1080x1920 (9:16) — só quando pedido explicitamente
- Linguagem segue `_memoria/preferencias.md` estritamente
- Sempre considerar a sequência de capa no feed antes de definir capa nova
- Sempre gerar legenda automaticamente ao final, salvando em `legenda.md`
- Fotos IA: sempre pedir aprovação antes de usar no carrossel
- Fotos IA: prompts em inglês
- Fotos IA: nunca gerar fotos de pessoas/rostos identificáveis
- Visuais: sempre `modelo.json` estruturado (camadas), nunca HTML solto — é o que torna o post editável no editor visual do Hub (ver Passo 4)
- Render: sempre via `scripts/render-modelo.mjs` do CentralPlus (comando no Passo 4) — nunca escrever um `render.js` próprio por post
- Não repetir layout entre slides — usar variação visual
- Respeitar os tamanhos mínimos de texto da seção "Legibilidade" — corpo do slide nunca abaixo de 30px
- Texto sobre foto: sempre com overlay e na área calma da imagem; foto sem área calma → regenerar
- Capa sempre construída com um mecanismo de hook explícito (seção "Criatividade pra views e clientes")
- Verificar os PNGs renderizados contra a checklist de legibilidade antes de mostrar ao usuário
