// Provisiona um cliente de demonstração dentro do B-O-S para testar o ClientHub
// ponta a ponta (Console -> workspace -> módulo Claude Code) antes da Fase 3.
//
// Uso: node scripts/seed-cliente.mjs
//
// NÃO substitui o provisionamento real (Fase 3) — é só um seed para dev.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOS_ROOT = path.resolve(__dirname, "..", process.env.BOS_ROOT || "../B-O-S");
const slug = "escritorio-demo";
const root = path.join(BOS_ROOT, "clientes", slug);

function write(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
  console.log("  +", path.relative(BOS_ROOT, p));
}

if (fs.existsSync(root)) {
  console.log(`Cliente '${slug}' já existe em ${root}. Nada a fazer.`);
  process.exit(0);
}

console.log(`Provisionando cliente de demo em clientes/${slug}/ ...`);

write(
  "config.json",
  JSON.stringify(
    {
      slug,
      nome: "Escritório Demo Advocacia",
      tipo: "Escritório de advocacia",
      modulos_ativos: ["site", "instagram", "financeiro"],
      acesso: { login: slug, senha: "demo123" },
      criado_em: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);

write(
  "CLAUDE.md",
  `# Escritório Demo Advocacia — workspace do cliente

Instruções específicas deste cliente. Sobrescrevem as regras da raiz do
B-O-S quando relevantes. O contexto de \`_memoria/\` e \`identidade/\`
abaixo é lido no início de toda conversa.

## Regras deste cliente
- Tom institucional, sóbrio e acessível — evitar juridiquês.
- Toda peça pública passa por aprovação do operador antes de publicar.
`,
);

write(
  "_memoria/empresa.md",
  `# Empresa

Escritório de advocacia full-service focado em direito do consumidor,
previdenciário e trabalhista. Atende pessoas físicas e pequenas empresas
na região metropolitana. Diferencial: atendimento humano e transparência
sobre prazos e custos. Equipe de 6 advogados. Principais serviços:
revisão de benefícios do INSS, ações trabalhistas, defesa do consumidor.
`,
);

write(
  "_memoria/preferencias.md",
  `# Preferências

- Tom: institucional, sóbrio, acessível. Explicar direito sem juridiquês.
- Evitar: promessas de resultado, sensacionalismo, termos técnicos sem explicação.
- Sempre incluir CTA de agendamento de consulta.
`,
);

write(
  "_memoria/estrategia.md",
  `# Estratégia

Foco atual (trimestre): captação de casos previdenciários via conteúdo
educativo no Instagram e presença local no Google. Meta: 20 consultas
qualificadas por mês.
`,
);

write(
  "identidade/design-guide.md",
  `# Identidade visual

## Cores

- **Fundo principal:** #0E1526
- **Cor de destaque / CTA:** #C7A15A
- **Texto principal:** #F2F4F8
- **Fundo alternativo / cards:** #16203A
- **Cor proibida:** vermelho vibrante

## Tipografia

- **Títulos e destaques:** Playfair Display (weight 700)
- **Corpo, subtítulos e botões:** Inter (weight 400-500)
- **Peso do título:** bold

## Estilo geral

Sóbrio e confiável, com um toque de sofisticação (dourado discreto em
CTAs). Nada de cores berrantes — transmite seriedade e tradição.
`,
);

console.log(`\nPronto. Login do cliente: '${slug}' / senha 'demo123'.`);
