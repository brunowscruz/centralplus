# Publicação real no Instagram — arquitetura, App Review e agendamento

Até 27/07/2026 o módulo Instagram tinha conexão real com a Meta Graph API
só pra LEITURA de perfil (`app/api/tenants/[slug]/instagram/profile/route.ts`).
"Aprovar post" só gravava um marcador local; o botão de publicar de verdade
não existia — o código apontava pra uma skill `aprovar-post` que chamava
`scripts/postar-instagram.js`/`postar-facebook.js`, dois arquivos que nunca
existiram no filesystem. Esta doc é o contrato do que substituiu isso:
publicação e agendamento de verdade, via `lib/instagramPublish.ts`.

## Arquitetura

```
Hub aprova post → "Publicar agora" (ou cron do agendamento)
  → lib/instagramPublish.ts::publicarPost(slug, post)
    1 slide:  POST /{ig-user-id}/media (image_url + caption)
    N slides: POST /{ig-user-id}/media (is_carousel_item=true) × N slides
              → POST /{ig-user-id}/media (media_type=CAROUSEL, children=[...])
    → aguarda status_code=FINISHED (poll)
    → POST /{ig-user-id}/media_publish (creation_id)
  → grava resultado em publicacao.json na pasta do post (nunca finge sucesso)
```

A Graph API busca a imagem por **URL pública** (`image_url`) — não aceita
upload binário nem header de sessão. Como a rota normal de mídia do post
(`.../instagram/media/...`) exige login do Hub, existe uma rota SEM
autenticação só pra isso:
`app/api/public/instagram-slides/[slug]/[post]/[arquivo]/route.ts`
(`lib/instagram.ts::resolveSlidePublico`) — deliberadamente restrita: só
serve um arquivo direto dentro de `<post>/instagram/` (nunca outra pasta do
tenant) e só quando o post já tem o marker `.aprovado`. Mesmo padrão de
rota pública já usado no projeto (`app/api/whatsapp/webhook/[slug]`,
`app/api/crm/lead-capture/[slug]`).

## Duas exigências externas — o código está pronto, mas só funciona com isso

### 1. `HUB_URL` precisa ser um domínio público de verdade

Em desenvolvimento local (`HUB_URL=http://127.0.0.1:4300`), a Meta não
consegue baixar a imagem — `publicarPost` detecta isso e recusa com um erro
claro em vez de tentar e falhar misterioso. Resolve sozinho assim que a
instalação estiver numa VPS com domínio real e `HUB_URL` apontando pra lá.

### 2. Scope `instagram_content_publish` precisa de App Review da Meta

O tutorial já existente em Configurações → Instagram (API) (Parte 2, Graph
API Explorer) pede os scopes `instagram_basic`, `instagram_manage_insights`,
`pages_show_list`, `pages_read_engagement` — **isso basta pra leitura de
perfil/métricas, mas NÃO pra publicar**. Publicar de verdade exige o scope
`instagram_content_publish`, e esse scope só fica disponível em produção
depois que o App passa pelo **App Review** da Meta:

1. No [Meta for Developers](https://developers.facebook.com/apps/) → o App
   da agência (o mesmo já usado pra `META_APP_ID`/`META_APP_SECRET`) →
   **App Review** → **Permissions and Features**.
2. Solicitar `instagram_content_publish` (e confirmar que
   `instagram_basic`/`pages_show_list` também estão aprovados — geralmente
   já estão, são permissões padrão).
3. A Meta pede: descrição de como o app usa a permissão, um vídeo de tela
   mostrando o fluxo (operador aprova um post → publica), e passar por
   **verificação de negócio** (Business Verification — CNPJ da agência,
   documento).
4. Isso é um processo deles, pode levar de alguns dias a poucas semanas —
   não é algo que o código resolve, é aprovação humana da Meta.
5. Enquanto não aprovado, o Token de teste do Graph API Explorer só publica
   pra contas Instagram cadastradas como **testador** do próprio App (em
   Funções do App → Testadores) — dá pra validar o fluxo tecnicamente numa
   conta de teste antes da aprovação valer pra clientes de verdade.

**Enquanto o App Review não sai**: o botão "Publicar agora"/agendamento
continua no Hub, mas toda tentativa vai devolver o erro real que a Graph
API mandar (ex "This request requires the instagram_content_publish
permission") — nunca finge sucesso.

## Formato de `publicacao.json` (resultado da última tentativa)

Gravado por `lib/instagram.ts::salvarPublicacao`, na pasta do post:

```json
{ "status": "publicado", "em": "2026-07-27T21:40:00.000Z", "mediaId": "17..." }
```
ou
```json
{ "status": "falhou", "em": "2026-07-27T21:40:00.000Z", "erro": "mensagem real da Graph API" }
```

## Formato de `agendamento.json` (agendamento de publicação)

Gravado por `lib/instagram.ts::salvarAgendamento`, via
`app/api/tenants/[slug]/instagram/schedule/route.ts` (POST agenda/atualiza,
DELETE cancela — sempre owner-only, sempre exige o post já `.aprovado`):

```json
{ "dataHoraISO": "2026-07-28T12:00:00.000Z", "status": "pendente", "tentativas": 0 }
```

`status` vira `"publicado"` ou `"falhou"` depois que o cron tenta (ver
abaixo) — o registro fica (não é apagado sozinho), só some se o operador
cancelar. A sub-aba "Agendados" (`AgendadosTab.tsx`) lista todo post com
`agendamento.json`, ordenado por data — lista simples, não calendário
mensal (mais rápido de fazer bem e mais claro pra quem não tem experiência
técnica; dá pra evoluir pra calendário depois se fizer falta).

## Cron do agendamento — não roda sozinho

`POST /api/cron/instagram-publicacoes` (header `x-cron-secret: $CRON_SECRET`,
mesmo padrão de `docs/WHATSAPP-EVOLUTION-API.md`): itera todo tenant com
Instagram conectado, busca posts com `agendamento.status === "pendente"` e
`dataHoraISO` já vencido, chama `publicarPost` e atualiza o `agendamento.json`
(publicado/falhou + contagem de tentativas). Configurar na VPS:

```cron
*/10 * * * * curl -s -X POST https://seuhub.com/api/cron/instagram-publicacoes -H "x-cron-secret: SEU_SECRET" > /dev/null
```

(10 min é granularidade razoável pra agendamento de post — menos crítico
que segundos, mais preciso que a janela de 15-30 min usada pro WhatsApp).
Se a VPS usa Dokploy/Coolify, usar o "Scheduled Task" deles apontando pro
mesmo `curl`.

## Limite de taxa da Meta

Contas Instagram Business/Creator têm um limite de **100 posts publicados
via API por janela de 24h** (soma de imagem, carrossel, reels — carrossel
conta como 1 post). Não implementado nenhum controle adicional disso no
Hub — se a conta bater no limite, a Graph API recusa e o erro real dela
aparece pro operador (nunca um número inventado de "posts restantes").
