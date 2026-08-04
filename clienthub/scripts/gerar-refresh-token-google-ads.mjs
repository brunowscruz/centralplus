// Gera o GOOGLE_ADS_REFRESH_TOKEN — rodado UMA vez pelo OPERADOR na própria
// máquina (nunca no chat do tenant, nunca na VPS). A lib google-ads-api não
// documenta nenhum helper de OAuth (conferido no README oficial) — o
// refresh token só sai de um fluxo de consentimento manual mesmo, então
// este script sobe um servidor local só pra capturar o redirect.
//
// Pré-requisito: já ter criado, no Google Cloud Console, um projeto com a
// "Google Ads API" ativada e uma credencial OAuth do tipo "Desktop app"
// (Client ID + Client Secret). Ver docs/GOOGLE-ADS-API.md pro passo a passo
// completo, incluindo onde colar o resultado deste script.
//
// Uso:
//   GOOGLE_ADS_CLIENT_ID=... GOOGLE_ADS_CLIENT_SECRET=... node scripts/gerar-refresh-token-google-ads.mjs
//   (ou, se já estiverem no .env.local: node --env-file=.env.local scripts/gerar-refresh-token-google-ads.mjs)
//
// Faça login com a conta Google que É ADMIN da Manager Account (MCC) da
// agência — o refresh token gerado herda as permissões dessa conta.

import http from "node:http";

const PORTA = 8722;
const REDIRECT_URI = `http://localhost:${PORTA}/callback`;
const SCOPE = "https://www.googleapis.com/auth/adwords";

const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "faltou GOOGLE_ADS_CLIENT_ID/GOOGLE_ADS_CLIENT_SECRET — passe como variável de ambiente ou rode com --env-file=.env.local (depois de já ter colado os dois lá).",
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent"); // força emitir refresh_token mesmo se já autorizou antes

console.log("\nAbra esta URL no navegador (faça login com a conta ADMIN da Manager Account da agência):\n");
console.log(authUrl.toString());
console.log(`\nAguardando o consentimento em ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  const erro = url.searchParams.get("error");

  if (erro || !code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end("<p>Consentimento cancelado ou com erro. Pode fechar esta aba e rodar o script de novo.</p>");
    console.error(`falha no consentimento: ${erro || "código ausente"}`);
    server.close();
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end("<p>Pronto — pode fechar esta aba e voltar pro terminal.</p>");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.refresh_token) {
      console.error("falha ao trocar o código por token:", JSON.stringify(data, null, 2));
      process.exit(1);
    }
    console.log("Refresh token gerado com sucesso — cole no .env.local:\n");
    console.log(`GOOGLE_ADS_REFRESH_TOKEN=${data.refresh_token}\n`);
  } catch (e) {
    console.error("falha ao trocar o código por token:", e.message);
    process.exit(1);
  } finally {
    server.close();
  }
});

server.listen(PORTA);
