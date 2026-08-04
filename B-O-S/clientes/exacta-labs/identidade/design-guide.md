# Identidade visual

> Como a marca aparece em tudo que o B-O-S gera.
> As skills de conteúdo, carrossel e post leem esse arquivo antes de criar qualquer visual.
> Edite quando a marca evoluir.

---

## Cores

- **Fundo principal:** Branco (#FFFFFF)

- **Cor de destaque / CTA:** Verde-água / teal — aprox. `#2CA6A3` (o "X" e o ponto do logo)

- **Texto principal:** Azul marinho — aprox. `#1F3A5F` (cor do "Exacta" e do símbolo)

- **Fundo alternativo / cards:** Cinza muito claro (#F5F7FA) ou azul marinho como fundo escuro em seções de destaque

- **Cor proibida:** Roxo/gradiente genérico de IA, cores neon fora da paleta

*(Tons aproximados extraídos do logo enviado — ajustar pro hex exato assim que houver guia de marca fechado.)*

---

## Tipografia

- **Títulos e destaques:** Sans-serif geométrica moderna (estilo do wordmark "Exacta") — ex: Poppins, Sora ou Space Grotesk

- **Corpo, subtítulos e botões:** Sans-serif limpa e legível — ex: Inter ou Manrope

- **Peso do título:** Bold / semibold, letter-spacing levemente aberto no "LABS" (como no logo)

---

## Estilo geral

Moderno, tecnológico e objetivo — sem exagero corporativo. Jovem mas
com propriedade (reflete o tom de voz da marca). Interfaces limpas,
com o teal usado como cor de ação/destaque sobre uma base neutra em
azul marinho e branco. Evitar templates genéricos de "IA" (gradiente
roxo, hero centralizado, 3 cards) — a marca já tem identidade própria
a reforçar.

---

## Elementos-chave

- Bordas: finas, discretas
- Border-radius dos cards: médio (8-12px), sem exagero de arredondamento
- Botões: sólidos em teal para CTA primário, outline em azul marinho para secundário
- Sombras: suaves, uso pontual pra profundidade (não flat total)

---

## O que NUNCA fazer

- Gradiente roxo genérico de "produto de IA"
- Misturar a cor teal com tons de verde diferentes do logo
- Usar o símbolo "E→" fora de proporção ou distorcido

---

## Logo

- **Não é um arquivo de imagem** — é um `<svg>` desenhado à mão, embutido
  direto no header de `site/index.html`. Pra qualquer página/seção/LP nova
  do site, **copie esse mesmo `<svg>` literalmente** (não redesenhe um
  logo novo, nem vire texto genérico):
  ```html
  <a href="#" class="logo" aria-label="Exacta Labs — início">
    <svg viewBox="0 0 66 64" aria-hidden="true">
      <rect x="4" y="8" width="34" height="10" rx="5" fill="#142C4A"/>
      <rect x="4" y="27" width="24" height="10" rx="5" fill="#142C4A"/>
      <rect x="4" y="46" width="34" height="10" rx="5" fill="#142C4A"/>
      <path d="M38 14 L53 32 L38 50" stroke="#2CA6A3" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="60" cy="32" r="5.5" fill="#142C4A"/>
    </svg>
    <span class="word">Exacta<span class="labs">LABS</span></span>
  </a>
  ```
  Cores do SVG: `#142C4A` (navy, as barras/círculo) e `#2CA6A3` (teal, o
  chevron "E→"). Fundo escuro: adicionar classe `logo.on-dark` (ver CSS de
  `.logo.on-dark` em site/index.html) — o wordmark vira branco/teal-glow.
- **Onde usar:** header de toda página do site (é o mesmo em todas), slide
  final do carrossel (CTA), header de propostas, slides de apresentação.
- Fora do site (carrossel, propostas, apresentações) sem esse `<svg>`
  disponível: recriar como wordmark "Exacta LABS" nas mesmas cores acima.

---

## Observações adicionais

- Identidade de marca (cores/logo) já definida — demais elementos de
  design (ilustrações, fotografia, iconografia, padrões visuais do
  site) serão construídos em conjunto usando as skills de design
  disponíveis (`frontend-design`, `ui-ux-pro-max`, `design`) e
  pesquisa online de referência quando fizer sentido.
