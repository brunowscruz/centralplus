// Re-renderiza os PNGs de um post implantado do Canva a partir do
// modelo.json atual em disco — chamado pelo agente (via Bash, ver
// MODULE_PREFIX.instagram em app/api/tenants/[slug]/chat/route.ts) depois
// de editar modelo.json diretamente pelo chat, e também disponível pra uso
// manual em dev.
//
// Uso: node --import tsx scripts/render-modelo.mjs <slug> <pasta-do-post>
//
// Importa lib/canvaRender.ts e lib/instagram.ts direto (mesmo caminho de
// render usado pelo editor visual e pela implantação) — nunca duplicar essa
// lógica aqui, se o jeito de renderizar mudar, muda só lá.

import { lerModelo } from "../lib/instagram.ts";
import { renderizarModelo } from "../lib/canvaRender.ts";

const [, , slug, postName] = process.argv;
if (!slug || !postName) {
  console.error("uso: render-modelo.mjs <slug> <pasta-do-post>");
  process.exit(1);
}

const modelo = lerModelo(slug, postName);
if (!modelo) {
  console.error(`post "${postName}" não tem modelo.json (não foi implantado de um modelo Canva)`);
  process.exit(1);
}

await renderizarModelo(slug, postName, modelo);
console.log(`renderizado: marketing/conteudo/${postName}/instagram/`);
