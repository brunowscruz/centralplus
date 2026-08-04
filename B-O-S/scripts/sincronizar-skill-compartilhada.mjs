// Copia uma skill de .claude/skills/<nome>/ (fonte de verdade, editável por
// qualquer operador) pra _skills-compartilhadas/.claude/skills/<nome>/ — a
// única pasta fora de clientes/ que sessões de chat do CentralPlus recebem
// acesso extra pra usar skills do B-O-S (ver docs/AGENTE-CAMPANHA-GOOGLE-ADS.md
// no clienthub). Nunca aponte a sessão do cliente pra .claude/skills/ direto:
// isso é irmão de clientes/ na raiz do B-O-S e exporia a pasta de outros
// clientes junto.
//
// Uso: node scripts/sincronizar-skill-compartilhada.mjs <nome-da-skill> [outro-nome...]

import { cp, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const bosRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const origemDir = path.join(bosRoot, ".claude", "skills");
const destinoDir = path.join(bosRoot, "_skills-compartilhadas", ".claude", "skills");

const nomes = process.argv.slice(2);
if (nomes.length === 0) {
  console.error("Uso: node scripts/sincronizar-skill-compartilhada.mjs <nome-da-skill> [outro-nome...]");
  console.error(`Skills disponíveis em ${origemDir}:`);
  for (const n of await readdir(origemDir)) console.error(`  ${n}`);
  process.exit(1);
}

for (const nome of nomes) {
  const origem = path.join(origemDir, nome);
  const destino = path.join(destinoDir, nome);
  if (!existsSync(origem)) {
    console.error(`✗ ${nome}: não existe em ${origem}`);
    continue;
  }
  await rm(destino, { recursive: true, force: true });
  await cp(origem, destino, { recursive: true });
  console.log(`✓ ${nome} sincronizada em ${destino}`);
}
