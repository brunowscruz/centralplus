#!/usr/bin/env node
// Chama um modelo "executor" pra gerar código/texto a partir de uma
// instrução já definida pelo Claude principal — texto entra, texto sai. O
// Claude principal sempre revisa e aplica o resultado com as PRÓPRIAS
// ferramentas (Write/Edit); o executor nunca recebe acesso a arquivo. Mais
// simples e mais seguro que rodar um segundo agente autônomo (ver
// scripts/kimi-agent.sh e docs/KIMI-EXECUTOR.md pra esse outro caminho, só
// pra tarefa grande o bastante pra precisar de acesso a arquivo de verdade).
//
// Uso:
//   node scripts/executor-call.mjs "prompt curto"
//   echo "prompt longo, com contexto de arquivo colado dentro" | node scripts/executor-call.mjs
//
// Provedor padrão: OmniRoute (gateway local, ver docs/EXECUTOR-IA.md) — já
// tem Anthropic/Groq/OpenAI cadastrados e cai pra opção gratuita sozinho se
// alguma travar. Precisa do `omniroute` rodando (`omniroute` no terminal,
// ou como serviço — ver doc). Sem ele rodando, cai pro Groq direto.
// Troca via EXECUTOR_PROVIDER=omniroute|groq|kimi|xai e opcionalmente
// EXECUTOR_MODEL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.executor");
if (fs.existsSync(envPath)) {
  for (const linha of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PROVEDORES = {
  omniroute: {
    url: process.env.OMNIROUTE_URL || "http://localhost:20128/v1/chat/completions",
    key: process.env.OMNIROUTE_API_KEY || "local", // instalação local não exige chave
    keyEnv: "OMNIROUTE_API_KEY",
    modeloPadrao: "auto/coding",
    opcional: true, // não é erro fatal se não tiver rodando — só avisa e o chamador decide o fallback
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY,
    keyEnv: "GROQ_API_KEY",
    modeloPadrao: "openai/gpt-oss-120b",
  },
  kimi: {
    url: "https://api.moonshot.ai/v1/chat/completions",
    key: process.env.MOONSHOT_API_KEY,
    keyEnv: "MOONSHOT_API_KEY",
    modeloPadrao: "kimi-k3",
  },
  xai: {
    url: "https://api.x.ai/v1/chat/completions",
    key: process.env.XAI_API_KEY,
    keyEnv: "XAI_API_KEY",
    modeloPadrao: "grok-code-fast-1",
  },
};

const provedor = process.env.EXECUTOR_PROVIDER || "omniroute";
const cfg = PROVEDORES[provedor];
if (!cfg) {
  console.error(`provedor desconhecido: "${provedor}" (use omniroute, groq, kimi ou xai)`);
  process.exit(1);
}
if (!cfg.key) {
  console.error(`${cfg.keyEnv} não configurado em .env.executor`);
  process.exit(1);
}

let prompt = process.argv[2];
if (!prompt && !process.stdin.isTTY) {
  prompt = fs.readFileSync(0, "utf8");
}
if (!prompt || !prompt.trim()) {
  console.error('uso: node scripts/executor-call.mjs "<prompt>"  (ou via stdin)');
  process.exit(1);
}

const modelo = process.env.EXECUTOR_MODEL || cfg.modeloPadrao;
let res;
try {
  res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      stream: false, // sem isso o OmniRoute responde em SSE (streaming) por padrão
    }),
  });
} catch (e) {
  if (cfg.opcional) {
    console.error(
      `não consegui conectar em ${provedor} (${e.message}) — provavelmente o \`omniroute\` não está rodando. ` +
        `Rode \`omniroute\` num terminal, ou use EXECUTOR_PROVIDER=groq pra ir direto sem o gateway.`,
    );
  } else {
    console.error(`não consegui conectar em ${provedor}: ${e.message}`);
  }
  process.exit(1);
}

const data = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`erro ${res.status} (provedor=${provedor}, modelo=${modelo}):`, JSON.stringify(data));
  process.exit(1);
}
const texto = data?.choices?.[0]?.message?.content;
if (!texto) {
  console.error("resposta sem conteúdo:", JSON.stringify(data));
  process.exit(1);
}
process.stdout.write(texto);
