// Gera imagem via OpenAI (gpt-image-1) a partir de um prompt em texto.
// Uso: node --env-file=.env scripts/gerar-imagem.js "PROMPT" "caminho/saida.png" [size]
// size: 1024x1024 | 1024x1536 (retrato) | 1536x1024 (paisagem) | auto (padrão: 1024x1536)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const [, , prompt, outputPath, size = "1024x1536"] = process.argv;

if (!prompt || !outputPath) {
  console.error('Uso: node --env-file=.env scripts/gerar-imagem.js "PROMPT" "caminho/saida.png" [size]');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY não encontrada. Configure no .env (veja .env.example).");
  process.exit(1);
}

const response = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-image-1",
    prompt,
    size,
    quality: "high",
    n: 1,
  }),
});

if (!response.ok) {
  const errText = await response.text();
  console.error(`Erro da API OpenAI (${response.status}): ${errText}`);
  process.exit(1);
}

const data = await response.json();
const base64 = data.data?.[0]?.b64_json;

if (!base64) {
  console.error("Resposta da API não trouxe imagem:", JSON.stringify(data));
  process.exit(1);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(base64, "base64"));

console.log(`Imagem salva em: ${outputPath}`);
