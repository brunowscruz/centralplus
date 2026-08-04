"use client";

import { Fragment } from "react";

/**
 * Formatação leve de markdown — negrito, títulos, listas, parágrafos
 * separados. NÃO é uma lib de markdown completa, é o suficiente pro que a
 * IA realmente escreve (relatórios do SEO Local, resumos de chat). Usado
 * tanto no chat (components/ChatMessages.tsx, app/c/[slug]/claude/ChatPanel.tsx)
 * quanto em documentos maiores (DiagnosticoTab.tsx) — extraído aqui pra não
 * duplicar a mesma lógica em cada lugar que precisa disso.
 */
export function MarkdownLeve({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {linhas.map((linha, i) => {
        const negritada = linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
          parte.startsWith("**") && parte.endsWith("**") ? (
            <strong key={j}>{parte.slice(2, -2)}</strong>
          ) : (
            <Fragment key={j}>{parte}</Fragment>
          ),
        );
        // qualquer nível de cabeçalho (#, ##, ### em diante) — a IA às
        // vezes usa ### pra subseção, precisa cair aqui também, nunca
        // sobrar como "###" literal no texto.
        const cabecalho = linha.match(/^(#{1,6})\s+(.*)/);
        if (cabecalho) {
          const nivel = cabecalho[1].length;
          const texto2 = cabecalho[2];
          if (nivel === 1) return <h2 key={i} className="text-lg font-semibold mt-3">{texto2}</h2>;
          if (nivel === 2) return <h3 key={i} className="text-base font-semibold mt-3">{texto2}</h3>;
          return <h4 key={i} className="text-sm font-semibold mt-2">{texto2}</h4>;
        }
        if (linha.startsWith("- ") || linha.startsWith("* ")) return <li key={i} className="ml-4 list-disc">{negritada}</li>;
        if (!linha.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{negritada}</p>;
      })}
    </div>
  );
}
