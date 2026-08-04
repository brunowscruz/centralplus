---
name: modern-immersive-website
description: >
  Cria landing pages e sites institucionais modernos, imersivos e performáticos, com
  direção de arte forte, hero cinematográfica, animações de entrada, microinterações,
  cursor personalizado, scroll suave (Lenis + GSAP/ScrollTrigger) e transições coordenadas.
  Use quando o usuário pedir site "moderno", "premium", "cinematográfico", "imersivo",
  hero com elementos animados, efeitos seguindo o mouse, cards interativos, textos
  revelados no scroll, preloader, ou estética de agência/produto/SaaS premium.

---

# Modern Immersive Website Builder

## Objetivo

Criar landing pages e sites institucionais modernos, imersivos e performáticos, com
direção de arte forte, hero cinematográfica, animações de entrada, microinterações,
cursor personalizado, scroll suave, elementos que reagem ao mouse e transições
coordenadas.

Esta skill deve produzir páginas com qualidade visual comparável a sites de estúdios
digitais premium, sem copiar layout, identidade visual, textos, imagens ou código de
terceiros.

## Relação com `/criar-site`

`/criar-site` é a skill orquestradora padrão pra qualquer site/landing page (briefing,
identidade, imagens, SEO on-page, checklist de qualidade). Esta skill (`modern-immersive-website`)
é a especialista técnica que `/criar-site` aciona quando o pedido especificamente pede o
tratamento "moderno/premium/imersivo/cinematográfico" descrito acima — troca a
implementação padrão por essa stack de movimento (GSAP + Lenis) e esse nível de
acabamento. `identidade/design-guide.md` continua mandando sobre cor/tipografia/estilo
quando o cliente já tiver identidade definida — esta skill entra na CAMADA DE MOVIMENTO
E INTERAÇÃO, não substitui a identidade visual do cliente.

---

## Quando usar

Use esta skill quando o usuário pedir:

- site moderno, premium, criativo ou cinematográfico;
- hero impactante com elementos animados;
- efeitos seguindo o mouse;
- animações durante o scroll;
- cards interativos;
- textos revelados por linhas ou palavras;
- preloader ou tela de entrada;
- sensação de profundidade, movimento e parallax;
- landing page com estética de agência, academia, evento, produto, marca ou SaaS premium.

---

## Stack recomendada

### Base principal

- Next.js 15+
- React 19+
- TypeScript
- Tailwind CSS
- CSS Modules ou CSS global para efeitos complexos

### Movimento

- GSAP
- `@gsap/react`
- GSAP ScrollTrigger
- Lenis para smooth scrolling
- Motion / Framer Motion apenas para microinterações simples e estados de componentes

### Elementos visuais opcionais

- Three.js ou React Three Fiber somente quando houver necessidade real de WebGL
- Spline apenas quando o projeto já possuir uma cena 3D pronta
- SVG para elementos gráficos leves e animáveis
- Canvas 2D para partículas simples

### Utilidades

- `next/image`
- `next/font`
- Lucide React
- clsx
- tailwind-merge
- Radix UI apenas para acessibilidade de componentes como dialogs, tabs e accordions

---

## Princípio de escolha das bibliotecas

Não use muitas bibliotecas para fazer o mesmo trabalho.

Escolha:

- GSAP para timelines, hero, parallax, reveal, scroll e animações coordenadas;
- Lenis para suavidade do scroll;
- Framer Motion somente para hover, montagem simples, menus e estados React;
- CSS puro para glow, ruído, máscaras, gradientes, marquee e efeitos decorativos;
- Three.js somente quando CSS, vídeo ou SVG não forem suficientes.

Evite misturar GSAP e Framer Motion no mesmo elemento.

---

## Direção de arte

Antes de implementar, defina:

1. conceito visual da marca;
2. cor dominante;
3. cor de contraste;
4. tipografia de impacto;
5. textura ou linguagem gráfica;
6. ritmo das animações;
7. densidade visual;
8. objetivo principal da página.

O design deve parecer intencional, não apenas "cheio de efeitos".

### Regras visuais

- Use uma paleta pequena: 1 fundo, 1 cor principal, 1 cor de destaque e tons neutros.
- Use tipografia grande na hero.
- Crie contraste forte entre fundo e conteúdo.
- Use grids assimétricos com alinhamento rigoroso.
- Use bordas, linhas técnicas, labels, números e pequenos textos para reforçar a identidade.
- Crie profundidade com camadas, blur, sombra difusa, textura e diferença de velocidade.
- Evite cards genéricos demais com aparência de template SaaS.
- Evite excesso de glassmorphism.
- Evite animações aleatórias sem relação com a narrativa.

---

## Estrutura recomendada da página

1. Preloader opcional
2. Header sobreposto
3. Hero cinematográfica
4. Marquee ou faixa de especialidades
5. Seção de diferenciais
6. Seção interativa ou painel em tempo real
7. Galeria ou showcase
8. Ecossistema de produtos/serviços
9. Programação, processo ou etapas
10. Prova social
11. Planos ou oferta
12. FAQ
13. Localização/contato
14. CTA final forte
15. Footer editorial

Cada seção deve possuir uma função narrativa e uma assinatura visual própria.

---

## Hero cinematográfica

A hero deve combinar de três a cinco camadas:

- fundo visual;
- imagem ou vídeo principal;
- textura/overlay;
- título;
- elementos decorativos;
- CTA;
- indicador de scroll.

### Fundo

Preferir uma destas abordagens:

- vídeo MP4/WebM curto em loop;
- imagem editorial de alta qualidade;
- composição com PNG/WebP recortado;
- gradiente animado;
- WebGL apenas quando indispensável.

### Tratamento visual

Aplicar conforme o conceito:

- `mix-blend-mode`;
- gradiente escuro sobre a imagem;
- máscara radial;
- grain/noise sutil;
- vignette;
- blur seletivo;
- cores em duotone;
- clip-path;
- pseudo-elementos decorativos.

### Entrada da hero

Criar uma única timeline GSAP:

1. preloader desaparece;
2. background aumenta levemente de escala;
3. título entra por linhas;
4. descrição surge com fade e deslocamento;
5. botões aparecem;
6. elementos decorativos se posicionam;
7. animação contínua começa somente após a entrada.

Exemplo de comportamento:

```ts
const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

tl.fromTo(".hero-media", { scale: 1.12 }, { scale: 1, duration: 1.8 })
  .from(".hero-line", { yPercent: 110, opacity: 0, stagger: 0.08, duration: 0.9 }, "-=1.3")
  .from(".hero-copy", { y: 24, opacity: 0, duration: 0.7 }, "-=0.7")
  .from(".hero-action", { y: 18, opacity: 0, stagger: 0.08 }, "-=0.45");
```

---

## Efeito de texto revelado

Para títulos grandes:

- dividir por linhas ou palavras;
- envolver cada linha em container com `overflow: hidden`;
- animar o conteúdo interno de `yPercent: 110` para `0`;
- usar stagger curto;
- manter boa leitura antes da animação.

Não esconder conteúdo permanentemente em caso de JavaScript desativado.

---

## Movimento seguindo o mouse

Usar movimento baseado em posição normalizada do cursor.

```ts
const xTo = gsap.quickTo(element, "x", {
  duration: 0.6,
  ease: "power3.out",
});

const yTo = gsap.quickTo(element, "y", {
  duration: 0.6,
  ease: "power3.out",
});

function onPointerMove(event: PointerEvent) {
  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;

  xTo(x * 30);
  yTo(y * 20);
}
```

### Regras

- usar movimentos pequenos, normalmente entre 8 e 40 px;
- aplicar profundidades diferentes em camadas distintas;
- usar `gsap.quickTo` ou RAF, nunca atualizar React state a cada movimento;
- desativar em dispositivos touch;
- respeitar `prefers-reduced-motion`;
- não deslocar textos essenciais de forma que prejudique a leitura.

---

## Cursor personalizado

O cursor customizado deve complementar a interface, não atrapalhar.

Estrutura:

- ponto interno;
- círculo externo;
- label opcional em áreas clicáveis;
- estados para link, drag, view e play.

Implementação:

- `position: fixed`;
- `pointer-events: none`;
- `transform: translate3d(...)`;
- atualização via GSAP quickTo ou requestAnimationFrame;
- cursor nativo preservado em mobile e em `prefers-reduced-motion`.

Não ocultar o cursor nativo até confirmar que o cursor customizado está funcionando.

---

## Scroll suave

Integrar Lenis com GSAP:

```ts
const lenis = new Lenis({
  duration: 1.1,
  smoothWheel: true,
  syncTouch: false,
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);
```

### Regras

- manter navegação por teclado funcional;
- não usar smooth scroll pesado em mobile fraco;
- preservar âncoras;
- recalcular ScrollTrigger depois do carregamento das imagens;
- nunca bloquear scroll por longos períodos.

---

## Animações de scroll

Usar ScrollTrigger para:

- revelar títulos;
- animar linhas técnicas;
- deslocar imagens em parallax;
- fixar uma seção;
- trocar conteúdo lateral;
- animar números;
- criar progressão narrativa.

### Reveal básico

```ts
gsap.from(elements, {
  scrollTrigger: {
    trigger: section,
    start: "top 78%",
  },
  y: 48,
  opacity: 0,
  duration: 0.9,
  stagger: 0.08,
  ease: "power3.out",
});
```

### Parallax

```ts
gsap.to(media, {
  yPercent: 12,
  ease: "none",
  scrollTrigger: {
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    scrub: true,
  },
});
```

Evitar animar dezenas de elementos individualmente sem necessidade.

---

## Cards interativos

Combinar:

- deslocamento vertical leve;
- borda que reage ao hover;
- imagem com scale entre 1.02 e 1.08;
- ícone ou seta em movimento;
- spotlight baseado na posição do mouse;
- transição entre 250 e 500 ms.

### Spotlight CSS

Atualizar variáveis CSS `--mouse-x` e `--mouse-y` no pointermove e usar:

```css
.card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    420px circle at var(--mouse-x) var(--mouse-y),
    rgba(255, 255, 255, 0.12),
    transparent 42%
  );
  opacity: 0;
  transition: opacity 300ms ease;
  pointer-events: none;
}

.card:hover::before {
  opacity: 1;
}
```

---

## Marquee infinito

Usar CSS quando o conteúdo for simples.

- duplicar o grupo de itens;
- usar transform linear infinito;
- pausar opcionalmente no hover;
- aplicar máscara nas laterais;
- não causar layout shift.

Não usar JavaScript pesado para uma faixa que CSS resolve.

---

## Preloader

O preloader deve durar apenas o necessário.

Pode conter:

- logotipo;
- contador;
- barra de progresso;
- texto conceitual;
- ruído ou elementos industriais.

### Comportamento correto

- limitar duração máxima;
- permitir pular;
- bloquear interação somente durante a entrada;
- remover do DOM após finalizar;
- não repetir em todas as visitas, opcionalmente usar `sessionStorage`;
- considerar o carregamento real dos assets principais.

---

## Galeria imersiva

Possibilidades:

- tabs com transição de imagem;
- cards horizontais;
- lightbox;
- hover preview;
- imagem principal que troca com crossfade;
- grid editorial com tamanhos diferentes.

Usar `next/image` com tamanhos definidos e formatos WebP/AVIF.

---

## Sensação de "site vivo"

Adicionar no máximo quatro comportamentos contínuos:

- glow respirando;
- linha percorrendo uma borda;
- elementos flutuando lentamente;
- ticker/marquee;
- partículas discretas;
- background com drift;
- ponteiro ou indicador pulsando.

Animações contínuas devem usar transform e opacity.

---

## Performance

### Obrigatório

- priorizar transform e opacity;
- evitar animações de width, height, top e left;
- usar `will-change` apenas durante animações relevantes;
- comprimir imagens;
- lazy-load abaixo da dobra;
- preload apenas da mídia principal;
- carregar fontes com `next/font`;
- evitar vídeos enormes;
- usar poster no vídeo;
- pausar animações fora da viewport;
- evitar re-render React durante pointermove e scroll;
- limpar listeners e ScrollTriggers no unmount.

### Metas

- LCP menor que 2,5 s em conexão realista;
- CLS menor que 0,1;
- INP menor que 200 ms;
- animações próximas de 60 FPS em desktop intermediário;
- versão mobile sem efeitos excessivos.

---

## Acessibilidade

Implementar sempre:

- foco visível;
- navegação por teclado;
- contraste adequado;
- textos alternativos;
- semântica correta;
- botões reais para ações;
- links reais para navegação;
- `prefers-reduced-motion`;
- cursor padrão em touch;
- possibilidade de pular o preloader;
- conteúdo legível sem animações.

Exemplo:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Responsividade

Não apenas reduzir o desktop.

No mobile:

- simplificar parallax;
- remover cursor customizado;
- reduzir quantidade de elementos flutuantes;
- adaptar títulos por quebra editorial;
- substituir pinning longo por fluxo natural;
- diminuir ou remover blur pesado;
- manter CTA visível;
- evitar vídeos automáticos pesados quando necessário;
- usar interações por toque claras.

---

## Arquitetura sugerida

```text
src/
  app/
    page.tsx
    layout.tsx
    globals.css
  components/
    layout/
      Header.tsx
      Footer.tsx
    motion/
      SmoothScroll.tsx
      CustomCursor.tsx
      Reveal.tsx
      Parallax.tsx
    sections/
      Hero.tsx
      Marquee.tsx
      Features.tsx
      LivePanel.tsx
      Gallery.tsx
      Ecosystem.tsx
      Schedule.tsx
      Testimonials.tsx
      Pricing.tsx
      FAQ.tsx
      Contact.tsx
  hooks/
    useReducedMotion.ts
    usePointerParallax.ts
  lib/
    gsap.ts
    motion.ts
  styles/
    effects.css
```

---

## Ordem de execução

### Fase 1 — Planejamento

1. analisar marca e público;
2. definir conceito visual;
3. desenhar hierarquia das seções;
4. identificar apenas as animações que agregam narrativa;
5. escolher mídia e tipografia.

### Fase 2 — Design estático

1. implementar layout sem animações;
2. validar desktop e mobile;
3. validar conteúdo e conversão;
4. garantir que o site funciona sem JavaScript avançado.

### Fase 3 — Movimento

1. entrada da hero;
2. reveals de seção;
3. scroll suave;
4. parallax;
5. microinterações;
6. cursor;
7. preloader por último.

### Fase 4 — Otimização

1. testar Lighthouse;
2. verificar layout shift;
3. testar mobile real;
4. testar reduced motion;
5. remover efeitos que prejudicam conversão ou performance.

---

## Checklist de qualidade

Antes de concluir, confirmar:

- [ ] A hero possui um ponto focal claro.
- [ ] O título comunica a proposta em poucos segundos.
- [ ] Há apenas um CTA principal dominante.
- [ ] As animações possuem ritmo consistente.
- [ ] O mouse não interfere no uso.
- [ ] O scroll continua natural.
- [ ] O mobile não parece uma versão quebrada do desktop.
- [ ] O site funciona com reduced motion.
- [ ] Imagens possuem tamanhos reservados.
- [ ] Não há animações causando reflow constante.
- [ ] Não há cópia direta de sites de referência.
- [ ] A identidade visual é específica para o projeto.
- [ ] Todas as timelines são limpas no unmount.
- [ ] O preloader pode ser pulado.
- [ ] A página tem boa pontuação de performance.

---

## Instrução principal para o agente

Ao receber uma solicitação, siga este comportamento:

1. Entenda o negócio, a identidade e o objetivo de conversão.
2. Crie primeiro uma direção visual original.
3. Implemente a versão estática e responsiva.
4. Adicione movimento de forma progressiva.
5. Use GSAP para animações coordenadas e ScrollTrigger.
6. Use Lenis apenas se melhorar a experiência.
7. Use Framer Motion somente em microinterações React simples.
8. Não adicione WebGL sem necessidade.
9. Não copie código, textos, estrutura exata ou identidade de referências.
10. Preserve acessibilidade e performance.
11. Entregue código organizado, tipado e pronto para produção.
12. Explique brevemente quais efeitos foram criados e onde estão implementados.

---

## Prompt rápido para acionar esta skill

```text
Use a skill Modern Immersive Website Builder.

Crie um site moderno, premium e imersivo para [EMPRESA/PROJETO].
Objetivo principal: [OBJETIVO].
Público: [PÚBLICO].
Identidade: [CORES/ESTILO].
Seções necessárias: [SEÇÕES].

Quero uma hero cinematográfica, movimento sutil seguindo o mouse, animações de entrada
coordenadas, reveals no scroll, cards interativos, smooth scroll e microinterações. Use
Next.js, TypeScript, Tailwind, GSAP, ScrollTrigger e Lenis. Priorize performance, mobile
e acessibilidade. Não copie nenhuma referência literalmente; apenas reproduza o nível de
acabamento e sofisticação.
```

---

## Prompt específico para referência visual

```text
Analise a referência fornecida apenas para identificar princípios de direção de arte,
ritmo, profundidade, hierarquia, animação e interação.

Não copie o layout, identidade, textos, imagens ou código. Crie uma solução original
para a marca atual, mantendo:

- hero de alto impacto;
- entrada cinematográfica;
- elementos em camadas;
- reação suave ao cursor;
- parallax controlado;
- reveals durante o scroll;
- microinterações em botões e cards;
- transições de seção consistentes;
- excelente versão mobile;
- acessibilidade e alta performance.
```
