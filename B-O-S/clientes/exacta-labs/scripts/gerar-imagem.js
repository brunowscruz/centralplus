#!/usr/bin/env node

/**
 * Script para gerar imagens via DALL-E 3 (OpenAI)
 * Uso: node scripts/gerar-imagem.js "prompt aqui" "caminho/saida.png"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY não configurada.');
  process.exit(1);
}

const prompt = process.argv[2];
const outputPath = process.argv[3];

if (!prompt || !outputPath) {
  console.error('Uso: node gerar-imagem.js "prompt" "saida.png"');
  process.exit(1);
}

console.log('🎨 Gerando imagem...');
console.log('Prompt:', prompt);

const requestData = JSON.stringify({
  model: 'dall-e-3',
  prompt: prompt,
  n: 1,
  size: '1024x1024',
  quality: 'standard'
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/images/generations',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(requestData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('❌ Erro na API:', res.statusCode, data);
      process.exit(1);
    }

    const response = JSON.parse(data);
    const imageUrl = response.data[0].url;

    console.log('✅ Imagem gerada, baixando...');

    // Baixar a imagem
    https.get(imageUrl, (imageRes) => {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileStream = fs.createWriteStream(outputPath);
      imageRes.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log('✅ Imagem salva em:', outputPath);
      });
    }).on('error', (err) => {
      console.error('❌ Erro ao baixar:', err.message);
      process.exit(1);
    });
  });
});

req.on('error', (err) => {
  console.error('❌ Erro na requisição:', err.message);
  process.exit(1);
});

req.write(requestData);
req.end();
