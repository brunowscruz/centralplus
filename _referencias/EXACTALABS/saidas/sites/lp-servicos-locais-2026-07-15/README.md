# Landing page de vendas — Caça vazamento, desentupidora e serviço local

Landing page de alta conversão pra vender o **Combo Iniciante** (Site + ajuste
de Google Meu Negócio) e, na sequência, o restante do pacote da Exacta Labs
(Google Ads, sistema administrativo, marketing com B-O-S) pra prestadores de
serviço local — caça vazamento e desentupidora como foco principal, mas
reaproveitável pra qualquer nicho parecido (encanador, dedetizadora,
chaveiro, eletricista etc.).

Gerada em 2026-07-15.

> **Importante:** essa página não é mais publicada como app separado — ela
> vive dentro do site institucional, em `exactalabs.com.br/apareca-no-google`.
> O deploy de verdade acontece a partir de
> `saidas/sites/exacta-labs-2026-07-14/public/apareca-no-google/`. Esta pasta
> aqui (`lp-servicos-locais-2026-07-15/`) continua sendo a **fonte de
> edição/rascunho**: depois de qualquer ajuste no `public/index.html` daqui,
> copiar o arquivo (e imagens novas, se houver) pra
> `exacta-labs-2026-07-14/public/apareca-no-google/` e rodar `npm run build`
> lá pra publicar.

## Estrutura

```
src/
  main.ts          ← bootstrap do NestJS
  app.module.ts     ← ServeStaticModule servindo public/
public/
  index.html        ← a landing page (HTML+CSS+JS embutidos)
  img/               ← imagens geradas (técnicos + dashboard do sistema)
package.json, nest-cli.json, tsconfig*.json
screenshots/         ← capturas desktop e mobile pra conferência
```

## O que essa página vende

**Oferta de entrada (a que empurra a conversão):** Combo Iniciante — site
profissional + ajuste completo do Google Meu Negócio — R$ 1.800, pagamento
em Pix, débito ou crédito em até 2x. Contador regressivo de 48h no topo e na
seção de oferta.

**Backend da oferta (mencionado, não é o CTA principal):** Google Ads de
pesquisa, sistema administrativo e marketing automatizado com o B-O-S —
aparecem como "próximos passos" depois do combo de entrada, não competem com
ele na hora de fechar.

**CTA em toda a página:** WhatsApp (`wa.me/551152170657`), com mensagem
pré-preenchida diferente por seção — nunca formulário, nunca chatbot.

## Dados usados na copy (nada inventado)

- Volume de buscas "perto de mim" e distribuição de cliques por posição
  (1º lugar ~39,6%, 3º lugar ~10%) e ganho de perfis com fotos (+42% em
  pedidos de rota): pesquisado via WebSearch em 2026-07-15, dado de mercado
  sobre comportamento de busca local.
- Ticket médio de caça vazamento (~R$517, faixa R$300–R$1.500) e de
  desentupimento (R$150–R$400 comum): pesquisado via WebSearch na mesma data,
  usado pra sustentar o cálculo de ROI ("1 a 2 atendimentos pagam o combo").
- **Não há depoimentos, avaliações ou logos de clientes fabricados** — a
  Exacta Labs ainda não tem cases fechados nesse nicho (ver
  `_memoria/estrategia.md` do projeto principal). Os "60 avaliações" e
  "4.9★" no mockup de SERP/GMB são exemplos ilustrativos de UI, claramente
  apresentados como simulação de como o negócio do cliente *pode* aparecer —
  não são alegações reais sobre a Exacta Labs.

## Contador de 48h — como funciona

O prazo é persistido em `localStorage` por navegador (`exacta_promo_deadline`)
na primeira visita, então atualizar a página não reinicia o contador pro
mesmo visitante. Isso é a técnica padrão de landing page — mas **não é um
prazo global real**: cada visitante novo começa sua própria janela de 48h.
Se quiser um prazo de verdade, fixo pro público inteiro (ex: só até
sexta-feira 23h59), troque a lógica em `public/index.html` (bloco
`<script>`, seção do contador) por uma data fixa (`new Date('2026-07-17
23:59:59')`) em vez de `Date.now() + 48h`.

## Antes de publicar / adaptar pra outro nicho

1. **Trocar o nicho:** a copy de hero, problema, ROI e FAQ menciona "caça
   vazamento" e "desentupidora" explicitamente — pra outro nicho (ex.
   chaveiro, eletricista), trocar esses termos e a faixa de preço do ROI
   pela pesquisada pro novo nicho (não reaproveitar os números de vazamento
   pra outro serviço).
2. **Imagens:** `img/tecnico-vazamento.png` e `img/tecnico-desentupidora.png`
   são específicas do nicho atual — gerar novas via
   `scripts/gerar-imagem.js` pro nicho novo.
3. **WhatsApp:** número já configurado (`551152170657`, o mesmo da Exacta
   Labs) em 6 pontos da página.
4. **Preço do combo:** R$2.500 está hardcoded no HTML (badge do topo, seção
   de oferta, ROI e no schema JSON-LD) — atualizar nos pontos se mudar.

## Publicar

Não publicar direto a partir daqui — ver o aviso no topo deste README. O
deploy acontece via `saidas/sites/exacta-labs-2026-07-14/` (Hostinger,
Node.js App / NestJS). Os comandos abaixo servem só pra testar localmente
antes de copiar pro site principal.

## Rodar localmente (só pra testar antes de copiar pro site principal)

```bash
npm install
npm run build
npm run start
# ou pra desenvolvimento com reload automático:
npm run start:dev
```

## Próximos passos sugeridos

- `/anuncio-google` — campanha de Google Ads apontando pra essa página,
  usando as mesmas palavras-chave da copy ("caça vazamento perto de mim" etc.)
- Replicar a página pra outros nichos de serviço local assim que a Exacta
  Labs tiver o primeiro caso de sucesso fechado (aí sim dá pra trocar os
  números ilustrativos do mockup por prova social real)
