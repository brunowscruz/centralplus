# Google Ads API — aplicação real de campanha (módulo MKT Online)

Contexto: o módulo MKT Online sempre gerou campanhas de anúncio como
conteúdo (`campanha.json` + CSV pra importar no Google Ads Editor) —
autoatendimento puro, o cliente sobe ele mesmo. Em 2026-07-30 a Exacta Labs
foi aprovada pela Google pro **Google Ads API Basic Access** (Developer
Token vinculado à Manager Account — MCC — da agência, tipo de empresa
"Agency", tipo de ferramenta "external creation/management and reporting").
Isso abriu a possibilidade de criar a campanha DE VERDADE na conta do
cliente via API, sem passar pelo CSV — o que este documento cobre.

O CSV continua existindo como alternativa (nunca foi removido): Meta Ads
não tem API oficial de bulk import estável, e qualquer cliente cuja conta
de Ads ainda não esteja vinculada à MCC continua 100% manual.

## Arquitetura

```
Chat do MKT Online (agente)                Operador (owner-only, botão)
        │                                            │
        ▼                                            ▼
  grava campanha.json                    POST /ads/[campanha]/aplicar
  (status: "rascunho")                            │
                                                    ▼
                                    lib/googleAds.ts::aplicarCampanhaGoogleAds
                                                    │
                                    customer.mutateResources([...])
                                    (campaign_budget → campaign PAUSED →
                                     ad_group → ad_group_criterion (keywords)
                                     → ad_group_ad PAUSED)
                                                    │
                                                    ▼
                                    grava resultado em campanha.aplicacao
                                    status vira "aplicada" ou "falhou"
```

O agente NUNCA chama a API — só escreve o `campanha.json` (mesmo princípio
de sempre: conteúdo é IA, ação real é código determinístico atrás de um
botão do operador). A campanha sobe **sempre pausada** — mesma decisão de
risco já usada no CSV ("campanha sempre sobe PAUSADA, ativação é sempre
manual"): um erro aqui custa no máximo "gastou tempo criando algo pausado",
nunca dinheiro do cliente sozinho.

## Onde mora a credencial

Duas camadas, mesmo raciocínio de `META_APP_ID`/`EVOLUTION_API_KEY`
(`lib/integrations.ts`):

- **Global da instalação** (`.env.local`, nunca por-tenant — um único
  Developer Token/OAuth Client/Refresh Token servem a MCC inteira):
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`,
  `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`,
  `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (a MCC, sem hífen). `googleAdsConfigurado()`
  confirma se as 5 estão presentes.
- **Por-tenant, não secreto** (`B-O-S/_integracoes/<slug>.json`, campo
  `googleAds.customerId`): só o número da conta de Ads do cliente (10
  dígitos, sem hífen). Configurado em Configurações → aba do Hub → Google
  Ads.

## Passo a passo — gerar as credenciais e o refresh token

1. **Google Cloud Console**: criar (ou reaproveitar) um projeto, ativar a
   "Google Ads API" (APIs & Services → Library), criar uma credencial OAuth
   2.0 do tipo **"Desktop app"** (Credentials → Create Credentials → OAuth
   client ID) — gera Client ID + Client Secret.
2. Colar `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET` e
   `GOOGLE_ADS_DEVELOPER_TOKEN` (o token do e-mail de aprovação da Google,
   também visível em Manager Account → Tools & Settings → API Center) e
   `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (a MCC, sem hífen) no `.env.local`.
3. Rodar `node --env-file=.env.local scripts/gerar-refresh-token-google-ads.mjs`
   — abre um fluxo de consentimento OAuth (fazer login com a conta que é
   **admin da MCC**), captura o código via um servidor local, troca por um
   refresh token e imprime no terminal.
4. Colar o `GOOGLE_ADS_REFRESH_TOKEN` impresso no `.env.local`.
5. Pra cada cliente: em Configurações → aba do Hub → Google Ads, colar o
   Customer ID da conta de Ads dele (precisa já estar vinculada — convite
   aceito — à MCC) e clicar em "Testar conexão" antes de aplicar qualquer
   campanha de verdade.

## Formato de `campanha.json` (campos novos)

```json
{
  "urlDestino": "https://site-do-cliente.com.br/pagina",
  "status": "rascunho",
  "aplicacao": {
    "tentadoEm": "2026-07-30T12:00:00.000Z",
    "ok": true,
    "mensagem": "Campanha criada com sucesso (pausada) na conta 1234567890.",
    "googleCampaignId": "22222222",
    "googleAdGroupId": "33333333"
  }
}
```

`status` só é `"rascunho"` quando o agente escreve; `"aplicada"`/`"falhou"`
só são gravados por `lib/googleAds.ts::registrarResultadoAplicacaoCampanha`
(via `lib/mktOnline.ts::registrarResultadoAplicacaoCampanha`), nunca pelo
agente. `urlDestino` é obrigatório pra aplicar (a Google Ads API exige
`final_url` em todo anúncio) — sem ele, o botão de aplicar fica desabilitado
na UI com aviso claro.

## O que continua manual de propósito

- **Meta Ads**: sem mudança nenhuma — API de bulk import oficial não é
  estável o bastante pra fixar (mesmo motivo já documentado em
  `gerarResumoMetaAds`), continua CSV/resumo pra colar na mão.
- **Cliente sem conta vinculada à MCC**: continua CSV — aplicar de verdade
  exige a conta já estar sob a Manager Account da agência.
- **Ativação da campanha**: depois de aplicada, o operador pode pausar/ativar
  direto no painel (`POST /ads/[campanha]/pausar`, via `mutateResources`) —
  nunca acontece sozinho, é sempre um clique manual do operador na tela.
- **Segmentação/lances avançados** (públicos customizados, estratégia de
  lance além de CPC manual, extensões de anúncio): fora do escopo desta
  rodada — a campanha criada é o essencial (busca, palavras-chave,
  responsive search ad), o operador refina na própria interface do Google
  Ads depois se quiser.
