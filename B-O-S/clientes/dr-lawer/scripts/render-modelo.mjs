#!/usr/bin/env node
/**
 * Script para renderizar modelo.json em HTML
 * Uso: node scripts/render-modelo.mjs <nome-da-pasta-do-post>
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const nomePasta = process.argv[2];
if (!nomePasta) {
  console.error('Uso: node scripts/render-modelo.mjs <nome-da-pasta-do-post>');
  process.exit(1);
}

const pastaPost = join(process.cwd(), 'marketing', 'conteudo', nomePasta);
const arquivoModelo = join(pastaPost, 'modelo.json');

if (!existsSync(arquivoModelo)) {
  console.error(`❌ Arquivo não encontrado: ${arquivoModelo}`);
  process.exit(1);
}

const modelo = JSON.parse(readFileSync(arquivoModelo, 'utf-8'));

console.log(`📄 Renderizando ${modelo.paginas.length} página(s) de ${nomePasta}...`);

// Gera HTML para cada página
const gerarHTML = (pagina, index) => {
  const { largura, altura, camadas } = pagina;

  const camadasHTML = camadas.map(camada => {
    const estilo = `
      position: absolute;
      left: ${camada.x}px;
      top: ${camada.y}px;
      width: ${camada.largura}px;
      height: ${camada.altura}px;
      opacity: ${camada.opacidade ?? 1};
      transform: rotate(${camada.rotacao ?? 0}deg) scaleX(${camada.flipH ? -1 : 1}) scaleY(${camada.flipV ? -1 : 1});
      ${camada.visivel === false ? 'display: none;' : ''}
    `;

    if (camada.tipo === 'texto') {
      return `<div style="${estilo} font-family: ${camada.fonte || 'Inter'}, sans-serif; font-size: ${camada.tamanhoFonte}px; color: #${camada.cor}; font-weight: ${camada.negrito ? 'bold' : 'normal'}; white-space: pre-wrap; line-height: 1.3; display: flex; align-items: flex-start;">${camada.texto || ''}</div>`;
    } else if (camada.tipo === 'imagem') {
      const imgPath = camada.arquivo ? `img/${camada.arquivo}` : '';
      const recorte = camada.recorte || { escala: 1, deslocX: 0, deslocY: 0 };
      return `<div style="${estilo} overflow: hidden;"><img src="${imgPath}" style="width: ${100 * recorte.escala}%; height: ${100 * recorte.escala}%; object-fit: cover; transform: translate(${recorte.deslocX}%, ${recorte.deslocY}%);" /></div>`;
    } else if (camada.tipo === 'forma') {
      const borderRadius = camada.formaTipo === 'circulo' ? '50%' : '0';
      return `<div style="${estilo} background-color: #${camada.corFundo}; border-radius: ${borderRadius};"></div>`;
    }
    return '';
  }).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="position: relative; width: ${largura}px; height: ${altura}px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.15);">
    ${camadasHTML}
  </div>
</body>
</html>
  `;
};

// Gera HTMLs
for (let i = 0; i < modelo.paginas.length; i++) {
  const html = gerarHTML(modelo.paginas[i], i);
  const htmlPath = join(pastaPost, `slide-${i + 1}.html`);
  writeFileSync(htmlPath, html);
  console.log(`✅ Gerado: slide-${i + 1}.html`);
}

console.log(`\n🎉 Renderização completa! ${modelo.paginas.length} slide(s) gerado(s).`);
