# Exacta Labs — Landing page (Exacta Labs 2.0)

Landing page da Exacta Labs, servida por um app **NestJS** (pra ser compatível
com o deploy "Node.js App" da Hostinger). Gerada em 2026-07-14, convertida pra
NestJS em 2026-07-15.

## Estrutura

```
src/
  main.ts          ← bootstrap do NestJS (lê PORT do ambiente)
  app.module.ts    ← módulo raiz, registra o ServeStaticModule
public/
  index.html       ← home do site (HTML+CSS+JS embutidos)
  img/             ← imagens usadas na home
  apareca-no-google/   ← subpágina de vendas (landing page de campanha)
    index.html
    img/
package.json       ← dependências NestJS e scripts de build/start
nest-cli.json      ← configuração do Nest CLI (copia public/ pro dist/)
tsconfig*.json     ← configuração TypeScript
screenshots/       ← capturas desktop e mobile pra conferência
```

O conteúdo visual do site continua sendo HTML/CSS/JS estático — o NestJS
existe só como camada de servidor pra fazer o deploy funcionar no formato que
a Hostinger exige. `ServeStaticModule` serve tudo que está em `public/`
automaticamente, incluindo subpastas: a home fica na raiz do domínio (`/`) e
qualquer subpágina nova vira uma URL só de criar uma pasta dentro de
`public/` com seu próprio `index.html` — não precisa mexer no NestJS.

**Subpáginas ativas:**
- `/apareca-no-google` — landing page de vendas do Combo Iniciante (Site +
  Google Meu Negócio) pra caça vazamento, desentupidora e serviço local.
  Fonte de edição/rascunho em
  `saidas/sites/lp-servicos-locais-2026-07-15/public/index.html` — depois de
  editar lá, copiar pra cá (`public/apareca-no-google/`) e rebuildar.
- `/oferta-grupo` — landing page da oferta relâmpago exclusiva de grupo de
  WhatsApp (Site otimizado pra Google e IA + Relatório do Google Meu Negócio
  por R$547, condição válida só avisando o nome do grupo). Nicho-agnóstica,
  pra qualquer prestador de serviço local. Fonte de edição/rascunho em
  `saidas/sites/lp-promo-grupo-547-2026-07-20/public/index.html` — depois de
  editar lá, copiar pra cá (`public/oferta-grupo/`) e rebuildar. Arte pra
  divulgar no grupo em
  `saidas/artes/promo-grupo-547-2026-07-20/oferta-547.png`.

## Antes de publicar

1. ~~Link do WhatsApp~~ — já atualizado para `https://wa.me/551152170657`
   (+55 11 5217-0657) nos 6 pontos do site (header, hero, seção B-O-S,
   CTA final, botão flutuante e footer).
2. **Domínio:** o `<link rel="canonical">` e as tags Open Graph em
   `public/index.html` estão apontando pra `https://exactalabs.com.br/` —
   ajustar se o domínio final for outro.
3. **Redes sociais:** o array `sameAs` no schema JSON-LD está vazio — preencher
   com os links de Instagram/LinkedIn assim que existirem.

## Publicar na Hostinger (Node.js App / NestJS)

1. Envie o conteúdo do `exacta-labs-2026-07-14.zip` (gerado nesta pasta) pro
   painel de deploy — ou conecte o repositório Git, se for esse o fluxo.
2. Configure:
   - **Comando de build:** `npm install && npm run build`
   - **Comando de start:** `npm run start` (roda `node dist/main`)
   - **Porta:** o app lê `process.env.PORT` automaticamente — não precisa
     fixar porta manualmente, a Hostinger injeta a variável.
3. Depois do deploy, o site abre na raiz do domínio (`/`), a landing page de
   vendas em `/apareca-no-google`, e as imagens nos respectivos `/img/...`.

Testado localmente antes de empacotar: `npm install && npm run build && npm
run start` sobe em `http://localhost:3000` sem erros de console.

## Rodar localmente

```bash
npm install
npm run build
npm run start
# ou, pra desenvolvimento com reload automático:
npm run start:dev
```

## Decisões de design (v2 — direção Lina OpenX)

- Direção de arte inspirada em linaopenx.com.br, adaptada às cores da Exacta:
  hero claro com glows radiais teal, nav em pílula flutuante com blur,
  bloco escuro navy/esmeralda com cards glassmorphism, footer sólido em teal.
- Logo recriado em SVG inline (símbolo E→ + wordmark) no header e footer —
  quando tiver o arquivo oficial, basta trocar o `<svg>` pelo `<img>`.
- Imagens 3D geradas por IA no estilo da referência: esfera orbital de vidro
  (hero, com fundo removido via alpha) e painel de vidro com gráficos (B-O-S).
- Efeitos: float + tilt 3D no mouse (hero), anéis orbitais girando, marquee
  infinito de serviços, scroll reveal com stagger, brilho que varre o botão
  primário, contadores animados, orbs com parallax, anel pulsante no WhatsApp.
- Textos e ícones em teal sobre fundo claro usam variante escura (`--teal-deep`)
  pra manter contraste ≥ 4.5:1 (WCAG AA); `prefers-reduced-motion` desliga tudo.

## Próximos passos sugeridos

- `/seo` — estratégia completa de tráfego orgânico pra essa página
- `/anuncio-google` — campanha apontando pro site
- `/carrossel` — divulgar o lançamento da Exacta Labs 2.0 no Instagram
