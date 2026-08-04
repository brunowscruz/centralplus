---
name: criar-site
description: >
  Orquestra a criação de sites e landing pages premium: briefing, direção estética única
  (frontend-design + ui-ux-pro-max), imagens reais geradas por IA, build com interações
  modernas, SEO on-page de fábrica e checklist de qualidade antes de entregar.
  Use quando o usuário pedir "criar site", "landing page", "página de vendas",
  "site institucional", "página pro meu negócio", ou /criar-site.
---

# /criar-site — Sites e landing pages premium

Skill orquestradora. Não constrói "na mão" — coordena as skills de design pra entregar um site único, moderno, interativo e otimizado, que não pareça template de IA.

## Dependências

- **Identidade visual:** `identidade/design-guide.md` — manda sobre qualquer sugestão de estilo
- **Contexto do negócio:** `_memoria/empresa.md` + `_memoria/preferencias.md`
- **Skills coordenadas:** `frontend-design` (direção estética), `ui-ux-pro-max` (design system), `ui-styling` (componentes), `web-artifacts-builder` (se precisar de state/rotas)
- **`modern-immersive-website`** — aciona quando o pedido especificamente pede site
  "moderno/premium/imersivo/cinematográfico" (hero animada, scroll suave, cursor
  customizado, microinterações). Nesse caso ela SUBSTITUI o stack padrão do Passo 5
  (troca HTML+CSS+JS vanilla por Next.js + TypeScript + GSAP/ScrollTrigger + Lenis) —
  o resto do workflow (briefing, direção estética, copy, imagens, revisão) continua igual.
- **Imagens:** `scripts/gerar-imagem.js` (OpenAI gpt-image-1)
- **Outputs vão em:** `saidas/sites/<nome>-<YYYY-MM-DD>/` (ou pasta do projeto se `/novo-projeto` existir)

---

## Workflow

### Passo 1 — Briefing (rápido, sem burocracia)

Se o contexto de `_memoria/` já responde, não perguntar. Só cobrir o que falta:

1. **Objetivo da página:** vender, captar lead, apresentar, agendar?
2. **Público:** quem chega nessa página e o que precisa entender em 5 segundos?
3. **Conteúdo real:** já tem textos/fotos, ou eu crio? (fotos → gerar via IA)
4. **CTA principal:** WhatsApp, formulário, ligação, compra?
5. **Referências:** algum site que gosta (ou odeia)?
6. **Uma página ou várias?** Landing page única resolve na maioria dos casos.

### Passo 2 — Direção estética (NUNCA pular)

1. Rodar o design system generator do `ui-ux-pro-max`:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<nicho do negócio>" --design-system -p "<Nome>"
```
2. Cruzar com `identidade/design-guide.md` — se a marca tem cores/fontes, elas vencem; o generator entra só com o que faltar (pattern, efeitos, anti-patterns)
3. Aplicar os princípios de `frontend-design`: definir paleta (4-6 hex nomeados), 2+ tipografias com papel claro (display + corpo), conceito de layout (com wireframe ASCII se ajudar), e **um elemento-assinatura** — a coisa única pela qual a página será lembrada
4. Apresentar a direção em 5-8 linhas pro usuário aprovar ANTES de codar

**CHECKPOINT:** direção aprovada → seguir.

### Passo 3 — Conteúdo e copy

- Escrever a copy inteira antes do código: headline da hero (tese, não slogan genérico), seções, provas, CTA
- Voz de `_memoria/preferencias.md` — falar como o cliente real fala
- Estrutura típica de landing que converte: Hero (promessa + CTA) → problema/dor → solução/como funciona → prova (depoimentos, números, cases) → oferta/diferenciais → FAQ → CTA final
- Adaptar ao negócio; não seguir fórmula cegamente

### Passo 4 — Imagens reais

Pra CADA imagem que o layout pede (hero, seções, fundos, avatares):

```bash
node --env-file=.env scripts/gerar-imagem.js "PROMPT em inglês, editorial quality" "saidas/sites/<pasta>/img/<nome>.png" [size]
```

- `1536x1024` pra hero/fundos horizontais, `1024x1024` pra cards/avatares
- Prompt coerente com a direção estética (mesma luz, mesmo mood em todas)
- Nunca Unsplash/placeholder. Nunca `<img>` quebrada
- Otimizar: converter pra WebP se possível (`npx sharp-cli` ou `cwebp`), lazy loading em tudo abaixo da dobra

### Passo 5 — Build

**Stack padrão:** HTML único + CSS inline/embutido + JS vanilla (zero dependência, deploy em qualquer lugar). Subir pra React/`web-artifacts-builder` só se precisar de state, rotas ou dados dinâmicos.

**Exceção — pedido de site moderno/premium/imersivo/cinematográfico:** seguir a skill
`modern-immersive-website` em vez deste passo — stack vira Next.js + TypeScript +
Tailwind + GSAP/ScrollTrigger + Lenis, com hero cinematográfica, scroll suave, cursor
customizado e microinterações coordenadas. Os Passos 1-4 (briefing, direção estética,
copy, imagens) e o Passo 6 (revisão crítica com screenshot) continuam valendo do mesmo
jeito — só a implementação técnica muda.

Obrigatório no código:

- **Interações:** scroll reveal (IntersectionObserver), micro-interações de hover (150-300ms), transições suaves, o elemento-assinatura implementado com capricho
- **Responsivo:** 375 / 768 / 1024 / 1440px testados
- **Acessível:** contraste 4.5:1, focus visível, `prefers-reduced-motion` respeitado, alt text em toda imagem, HTML semântico (header/main/section/footer)
- **SEO on-page de fábrica:** `<title>` (50-60 chars, keyword no início), meta description (150-160 chars com CTA), H1 único, hierarquia de headings, schema JSON-LD (LocalBusiness/Product/FAQ conforme o caso), Open Graph + Twitter Card, canonical
- **Performance:** imagens com width/height declarados (zero CLS), fontes com `font-display: swap`, sem framework se não precisa
- **Formulários (se houver):** validação no front E instrução clara de validar no backend; honeypot anti-spam; nunca expor endpoint com chave no client

### Passo 6 — Revisão crítica (screenshot obrigatório)

1. Renderizar screenshots (Playwright) em desktop e mobile
2. Autocrítica contra a direção do Passo 2: parece template? O elemento-assinatura está lá? A hero comunica em 5 segundos? Tipografia tem personalidade?
3. Checklist de entrega:
   - [ ] Sem cara de template IA (hero centralizado + 3 cards + gradiente roxo = refazer)
   - [ ] Todas as imagens carregam e são reais
   - [ ] Legível e bonito em 375px
   - [ ] CTA visível sem scroll e repetido no final
   - [ ] Schema validado (estrutura JSON-LD correta)
   - [ ] Zero console errors
4. Mostrar screenshots pro usuário com a lógica das decisões

### Passo 7 — Entrega e próximos passos

```
saidas/sites/<nome>-<YYYY-MM-DD>/
  index.html
  img/           ← imagens geradas
  screenshots/   ← desktop + mobile pro usuário ver
  README.md      ← como publicar (Netlify/Vercel/hospedagem)
```

Depois de entregar, oferecer (sem executar sem pedir):
- `/seo` pra estratégia completa de tráfego orgânico
- `/anuncio-google` pra campanha apontando pra essa página
- `/carrossel` pra divulgar o lançamento no Instagram

---

## Regras

- Direção estética SEMPRE antes de código — nunca pular o Passo 2
- `identidade/design-guide.md` vence qualquer sugestão de skill
- Imagem real gerada > placeholder, sempre
- Um elemento-assinatura por página; o resto disciplinado (gastar a ousadia num lugar só)
- Nenhuma chave/segredo no código do site — só em `.env` no servidor
- Copy em português do Brasil como o público fala; sem corporativês
- Screenshots antes de entregar — nunca entregar às cegas
