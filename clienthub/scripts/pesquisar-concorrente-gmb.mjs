// Lê o Google Maps PÚBLICO (sem login — é o mesmo resultado que qualquer
// pessoa vê buscando no navegador) pra extrair um retrato dos concorrentes
// orgânicos de um termo de busca numa localização. Chamado pelo agente via
// Bash (ver MODULE_PREFIX["mkt-online"], seção "Auditoria de concorrência",
// em app/api/tenants/[slug]/chat/route.ts) — o agente cruza esse resultado
// com WebSearch (volume/intenção de palavra-chave) pra gravar
// marketing/mkt-online/seo-local/concorrencia.json.
//
// Uso: node --import tsx scripts/pesquisar-concorrente-gmb.mjs --termo "<termo>" --local "<cidade, UF>" [--max 8]
//
// Saída: UMA linha de JSON no stdout, shape { termoBuscado, localizacaoBuscada,
// concorrentes: ConcorrenteGmb[] } (mesmo tipo de lib/seoLocal.ts). Log/erro
// SEMPRE no stderr — o agente faz JSON.parse(stdout), qualquer coisa extra
// ali quebra a leitura.
//
// IMPORTANTE (validado testando ao vivo contra o Maps real, não é suposição):
// sem estar logado, o Google mostra uma "visualização limitada" — clicar num
// resultado pra abrir a página de detalhe completa NÃO navega de verdade
// (fica preso na lista). Por isso este script extrai só o que a PRÓPRIA
// lista de resultados já mostra (nome, categoria, nota, endereço, uma linha
// de descrição, status de horário) — nunca finge ter nº de avaliações, nº de
// fotos, atributos, serviços listados ou posts recentes, porque essa
// informação não é alcançável sem login nesse fluxo. Esses campos ficam
// undefined/vazios de propósito (nunca inventar dado que não foi observado).

import { chromium } from "playwright";

function log(...args) {
  console.error(...args);
}

function parseArgs(argv) {
  const out = { termo: "", local: "", max: 5 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--termo") out.termo = argv[++i] || "";
    else if (argv[i] === "--local") out.local = argv[++i] || "";
    else if (argv[i] === "--max") out.max = Number(argv[++i]) || 5;
  }
  return out;
}

const { termo, local, max } = parseArgs(process.argv.slice(2));
if (!termo || !local) {
  log('uso: pesquisar-concorrente-gmb.mjs --termo "<termo>" --local "<cidade, UF>" [--max 8]');
  process.exit(1);
}

const maxResultados = Math.min(Math.max(max, 1), 10);
const consulta = `${termo} em ${local}`;

/** Um card de resultado do Maps vira várias linhas de texto (nome repetido
 * 2x, nota, "categoria · [acessibilidade] · endereço", descrição opcional,
 * status de horário opcional, depois botões de ação tipo "Pedir on-line").
 * Faz mais sentido parsear por PADRÃO DE CONTEÚDO de cada linha do que por
 * seletor CSS profundo (as classes do Maps são ofuscadas de propósito e
 * mudam com frequência — um seletor de conteúdo é mais resistente). */
function parseCard(textoCard, nomeDoLink) {
  const linhas = textoCard
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const concorrente = {
    nome: nomeDoLink,
    categoriasSecundarias: [],
    nomeContemPalavraChave: false,
    cidadeCorrespondeAlvo: false,
    horarioPublicado: false,
    enderecoVisivel: false,
    temDescricao: false,
    servicosListados: [],
    atributos: [],
  };

  // remove as 1-2 linhas iniciais que só repetem o nome
  let resto = linhas.filter((l) => l !== nomeDoLink);

  for (const linha of resto) {
    // linha de nota: só dígito(s), vírgula, dígito — ex "4,7"
    if (/^\d(?:,\d)?$/.test(linha) && concorrente.nota === undefined) {
      concorrente.nota = Number(linha.replace(",", "."));
      continue;
    }
    // linha de status de horário: contém "Abre às" / "Fecha às" / "Aberto" /
    // "Fechado" — checada ANTES da linha de categoria de propósito, porque
    // esse status TAMBÉM usa "·" como separador ("Aberto · Fecha às 20:00"),
    // então se checasse categoria primeiro esse texto virava categoria
    // errada quando o card não tinha uma linha de categoria/endereço antes
    // dele (bug real observado em produção).
    if (/abre às|fecha às|^aberto\b|^fechado\b|24 horas/i.test(linha)) {
      concorrente.horarioPublicado = true;
      continue;
    }
    // linha "Categoria · [algo] · Endereço" (o separador "·" pode aparecer
    // sozinho se houver um ícone de acessibilidade no meio, sem texto)
    if (linha.includes("·") && !concorrente.categoriaPrincipal) {
      const partes = linha.split("·").map((p) => p.trim()).filter(Boolean);
      if (partes.length > 0) concorrente.categoriaPrincipal = partes[0];
      if (partes.length > 1) {
        concorrente.enderecoVisivel = true;
      }
      continue;
    }
    // linhas de ação conhecidas — ignorar
    if (/^(reservar uma mesa|pedir on-line|website|rota|ligar)$/i.test(linha)) continue;
    // qualquer outra linha de texto curto restante = tagline/descrição
    if (!concorrente.temDescricao && linha.length > 3) {
      concorrente.temDescricao = true;
    }
  }

  const termoLower = termo.toLowerCase().split(" ")[0] || "";
  concorrente.nomeContemPalavraChave = termoLower ? concorrente.nome.toLowerCase().includes(termoLower) : false;
  concorrente.cidadeCorrespondeAlvo = concorrente.enderecoVisivel;

  return concorrente;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const concorrentes = [];

  try {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(consulta)}`;
    log(`abrindo: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      const aceitar = page.getByRole("button", { name: /aceitar tudo|accept all/i });
      await aceitar.click({ timeout: 3000 });
    } catch {
      /* banner de cookies não apareceu, segue normalmente */
    }

    await page.waitForTimeout(2500); // resultados carregam via JS, sem evento de "pronto" confiável

    const cards = page.locator(".Nv2PK");
    const total = Math.min(await cards.count().catch(() => 0), maxResultados);
    log(`cards encontrados: ${total}`);

    for (let i = 0; i < total; i++) {
      try {
        const card = cards.nth(i);
        const link = card.locator('a[href*="/maps/place/"]').first();
        const nome = (await link.getAttribute("aria-label")) || `resultado-${i + 1}`;
        const texto = await card.innerText({ timeout: 3000 });
        const concorrente = parseCard(texto, nome);
        concorrente.posicaoNoMapa = i + 1;
        concorrentes.push(concorrente);
        log(`ok (${i + 1}/${total}): ${nome}`);
      } catch (e) {
        log(`falhou item ${i + 1}: ${e.message}`);
      }
    }
  } catch (e) {
    log(`erro geral na navegação: ${e.message}`);
  } finally {
    await browser.close();
  }

  const saida = { termoBuscado: termo, localizacaoBuscada: local, concorrentes };
  process.stdout.write(JSON.stringify(saida));
}

main().catch((e) => {
  log(`falha fatal: ${e.message}`);
  process.stdout.write(JSON.stringify({ termoBuscado: termo, localizacaoBuscada: local, concorrentes: [] }));
  process.exit(1);
});
