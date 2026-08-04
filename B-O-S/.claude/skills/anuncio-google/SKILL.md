---
name: anuncio-google
description: >
  Cria estrutura completa de campanha do Google Ads a partir de um briefing ou da pesquisa SEO.
  Gera CSV pronto pra importar no Google Ads Editor com campanhas Search organizadas por cluster
  de palavras-chave, grupos de anúncios, RSAs (Responsive Search Ads), extensões e palavras-chave
  negativas. Lê o briefing de _memoria/empresa.md e da pesquisa SEO se existir.
  Use quando o usuário pedir "criar campanha google ads", "anúncio google", "google ads",
  "csv pro google ads", ou /anuncio-google.
---

# /anuncio-google — Estrutura de campanha Google Ads

Skill que monta a campanha inteira em CSV pronto pra importar no Google Ads Editor. Sai do briefing direto pro CSV — sem montar grupo por grupo na mão na interface do Google.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` (produto/serviço, público, região, diferenciais)
- **Tom de voz:** `_memoria/preferencias.md`
- **Pesquisa SEO (se existir):** `marketing/seo/01-pesquisa-demanda.md`, `06-google-ads.md` — usar como insumo
- **Outputs vão em:** `marketing/campanhas/google-ads-<YYYY-MM-DD>/`

---

## Workflow

### Passo 1 — Briefing

Se o usuário não passou briefing, perguntar:

1. **Produto/serviço a anunciar?** (1-3 linhas)
2. **Quem é o público?** (perfil, dor que resolve)
3. **Região:** raio em km a partir de qual cidade?
4. **Orçamento diário?** (R$/dia)
5. **Objetivo:** ligações / WhatsApp / formulário / visita?
6. **Site/landing page** existe? URL?

Se já existe `marketing/seo/06-google-ads.md` (criado pelo `/seo`), usar como base — pular as perguntas que já foram respondidas lá.

### Passo 2 — Pesquisa de palavras-chave

Se já existe `marketing/seo/01-pesquisa-demanda.md`, usar o top 10-20 de termos prioritários (intenção transacional + comercial).

Se não existe, gerar:
- 30-50 termos-semente baseados no briefing
- WebSearch pra cada grupo: ver concorrência, sazonalidade
- Filtrar pelos de **intenção comercial/transacional** (descartar informacionais)
- Agrupar em **clusters** (ex: "feijoada-buffet", "feijoada-restaurante", "feijoada-evento")

### Passo 3 — Estrutura de campanha

**Padrão recomendado pra B2B local:**

```
Campanha 1: <Negócio> — Search Geral
├── Grupo: <Cluster 1>
│   ├── 10-15 keywords (mix de exata, frase, ampla modificada)
│   ├── 3 RSAs (15 headlines + 4 descriptions cada)
│   └── 10-15 keywords negativas no grupo
├── Grupo: <Cluster 2>
│   └── ...
└── ... (1 grupo por cluster do Passo 2)

Campanha 2: <Negócio> — Local (opcional)
├── Anúncios pra Google Maps
└── Segmentação por proximidade

Lista de negativas globais: termos genéricos descartados, marcas concorrentes
```

### Passo 4 — Copies (RSAs)

Pra cada grupo, gerar 3 RSAs (Responsive Search Ads):

**15 headlines** por anúncio:
- 5 com keyword principal
- 3 com diferenciais concretos (certificações, prazo, garantia)
- 3 com CTA ("Solicite cotação", "Peça pelo WhatsApp", "Fale agora")
- 2 com prova social (anos no mercado, número de clientes)
- 2 com proposta de valor genérica

**4 descriptions** (90 caracteres cada):
- 1 institucional + CTA
- 1 com diferencial técnico + CTA
- 1 com urgência/escassez (se aplicável)
- 1 com prova social + CTA

**Restrições do Google:**
- Headline: 30 caracteres
- Description: 90 caracteres
- Sem emojis, sem caps lock, sem repetição de palavras
- Sem afirmações superlativas não-comprovadas ("o melhor", "número 1") sem fonte

Seguir `_memoria/preferencias.md` pra tom.

### Passo 5 — Extensões

Gerar CSVs separados pra cada tipo de extensão:

- **Sitelinks** (4-6): "Sobre nós", "Catálogo", "Cases", "WhatsApp", "Localização"
- **Chamadas** (telefone): puxar de `_memoria/empresa.md`
- **Snippets estruturados:** lista de serviços, categorias de produto
- **Preço** (se aplicável): faixas de preço dos serviços principais
- **Promoção** (se aplicável): desconto, condição especial

### Passo 6 — Configurações da campanha

Gerar arquivo `configuracoes.md` com:

- **Estratégia de lance:** "Maximizar conversões" pra começar (depois migrar pra "Maximizar conversões com tCPA" quando tiver 30+ conversões)
- **Orçamento diário:** conforme briefing
- **Segmentação geográfica:** raio em km a partir do endereço
- **Idioma:** Português
- **Dispositivos:** ajustes de lance recomendados (mobile +0%, desktop +0%, tablet -20%)
- **Programação:** dias e horários conforme negócio
- **Conversões a configurar:** clique no WhatsApp, envio de formulário, ligação telefônica, tempo no site

### Passo 7 — Gerar os CSVs

Estrutura de pastas final:

```
marketing/campanhas/google-ads-<YYYY-MM-DD>/
  campanhas.csv          ← linha por campanha
  grupos.csv             ← linha por grupo de anúncio
  keywords.csv           ← keywords + match type
  keywords-negativas.csv ← negativas por grupo + lista global
  anuncios.csv           ← RSAs (headlines + descriptions)
  extensoes-sitelinks.csv
  extensoes-chamadas.csv
  extensoes-snippets.csv
  extensoes-preco.csv (se aplicável)
  configuracoes.md       ← config + checklist de import
  README.md              ← passo a passo pra importar no Google Ads Editor
```

**Formato dos CSVs:** seguir o padrão de importação do Google Ads Editor (colunas: Campaign, Ad group, Keyword, Match type, Status, Max CPC, etc.).

### Passo 7.5 — Fundamentos de campanha de sucesso (aplicar em TODA campanha)

Esses princípios separam campanha que dá lucro de campanha que queima verba. Aplicar sempre, sem exceção:

**Coerência keyword → anúncio → landing page (Quality Score):**
- A keyword do grupo DEVE aparecer nas headlines e na landing page. Google premia relevância com CPC menor e posição melhor
- Se a landing page não fala do termo anunciado, avisar o usuário: ou cria página específica (oferecer `/criar-site`), ou remove o cluster
- 1 grupo = 1 intenção. Se as keywords do grupo pedem anúncios diferentes, dividir o grupo

**RSA com Ad Strength alto:**
- Headlines DIVERSAS de verdade — 15 variações da mesma frase = Ad Strength "Poor". Variar ângulo: keyword, benefício, prova, CTA, urgência
- Fixar (pin) no máximo 1-2 headlines (marca na posição 1 quando obrigatório). Pin demais mata o aprendizado do Google
- Incluir o nome da cidade/região em 2-3 headlines pra campanhas locais — CTR local sobe

**Rastreamento de conversão (pré-requisito, não detalhe):**
- Definir a conversão PRIMÁRIA (a que vale dinheiro: lead, ligação 60s+, compra) e separar das secundárias (scroll, tempo no site)
- Conversão de WhatsApp: usar clique no botão + parâmetro UTM na mensagem pré-preenchida pra rastrear origem
- Sem conversão primária configurada, NÃO ativar campanha de lance automático — vira queima de dinheiro. Começar em CPC manual/maximizar cliques até o tracking estar validado

**Progressão de maturidade da campanha:**
1. **Semanas 1-2:** Maximizar cliques com teto de CPC — coletar dado, validar tracking
2. **15-30 conversões:** migrar pra Maximizar conversões
3. **30+ conversões/mês estáveis:** tCPA com alvo 10-15% acima do custo/conversão real, e apertar gradualmente
- Nunca mudar estratégia de lance mais de 1x a cada 2 semanas — cada mudança reseta o aprendizado

**Mineração de negativas (rotina, não setup):**
- No `configuracoes.md`, incluir a rotina: 2x/semana nas primeiras 2 semanas, revisar o relatório de termos de pesquisa e negativar tudo que não tem intenção de compra
- Negativas universais pra B2B/serviço local: "grátis", "curso", "como fazer", "vaga", "emprego", "usado", "aluguel" (adaptar ao nicho)

**Benchmarks pra avaliar (incluir no configuracoes.md):**
- CTR Search: < 3% = anúncio fraco ou keyword ampla demais; bom = 5%+
- Taxa de conversão de landing: < 2% = problema na página, não na campanha
- Índice de qualidade < 5 = revisar coerência keyword/anúncio/página antes de subir lance

### Passo 8 — Resumo + próximos passos

Mostrar pro usuário:

```
✓ Campanha pronta: marketing/campanhas/google-ads-<YYYY-MM-DD>/

Estrutura:
- <N> campanhas
- <N> grupos de anúncio
- <N> palavras-chave (positivas)
- <N> palavras-chave negativas
- <N> RSAs

Pra subir:
1. Abrir Google Ads Editor (desktop)
2. Conta → Importar → CSV
3. Subir campanhas.csv primeiro, depois grupos, keywords, anúncios, extensões
4. Revisar status (tudo "pausado" inicialmente — ativar manualmente)
5. Conferir conversões configuradas no Google Tag Manager
6. Ativar campanha quando estiver tudo OK

Sugestão de orçamento inicial: R$<X>/dia por <Y> dias antes de avaliar.
```

---

## Regras

- **Nunca inventar dados de CPC.** Se o cliente perguntar quanto vai custar, falar que depende da concorrência real e dar uma faixa baseada em WebSearch.
- **Sempre começar pausado.** Cliente revisa, ativa quando aprovar.
- **Não anunciar pra termos informacionais.** "Como fazer X" raramente converte — deixar pra SEO orgânico.
- **Match type:** começar com Phrase Match na maioria. Exact pra termos premium. Broad só com dados consistentes.
- **Lista de negativas global** é obrigatória — sem ela, queima dinheiro em buscas irrelevantes.
- **Conversões antes de tudo.** Sem conversão configurada, o Google não otimiza — relatar isso e pedir setup antes de ativar.
- Copies seguem `_memoria/preferencias.md` estritamente. Sem jargão de marketing se o público não usa.
- **Coerência keyword → anúncio → landing page é inegociável** (ver Passo 7.5). Se a landing não sustenta o termo, resolver isso antes de gerar o CSV.
- **Passo 7.5 se aplica a toda campanha**, inclusive quando o usuário pedir "só o CSV rápido".
