"use client";

import { Sparkles, Wand2, ArrowRight } from "lucide-react";
import AjudaBotao from "./AjudaBotao";

/** Ponto de entrada único do "Google Meu Negócio" — antes eram 2 itens de
 * menu separados (GMB automático + SEO Local) que faziam a mesma coisa por
 * dois caminhos diferentes. Agora é uma escolha visual só: deixar a IA
 * gerar tudo sozinha, ou construir junto com a IA passo a passo (perfil,
 * concorrência, diagnóstico, calendário, reviews, páginas locais). */
export default function GmbHubTab({ onEscolher }: { onEscolher: (modo: "auto" | "manual") => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Google Meu Negócio</h2>
          <p className="text-xs text-muted mt-1 max-w-md">
            Escolha como quer deixar o perfil do negócio pronto pra aparecer bem no Google.
          </p>
        </div>
        <AjudaBotao
          titulo="Google Meu Negócio — como funciona"
          passos={[
            "Não precisa de senha nem token pra nada aqui — é só conteúdo pra você revisar e colar no Google Meu Negócio (ou deixar a IA guiar você).",
            "\"Gerar automaticamente com IA\": a IA escreve tudo sozinha (título, categoria, descrição, horário) olhando pros dados do negócio. Você revisa, copia ou baixa o arquivo pronto.",
            "\"Gerar manualmente com auxílio da IA\": você mesmo decide cada etapa (perfil, concorrência, diagnóstico, otimização, calendário de posts, respostas de avaliação, páginas locais), sempre com a IA ajudando a escrever.",
            "As avaliações reais do Google só aparecem depois que o negócio for encontrado certinho pelo nome — isso é feito dentro da aba Reviews do modo manual.",
          ]}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => onEscolher("auto")}
          className="tool-card text-left"
          style={{ ["--tool-color" as string]: "#4ade80" }}
        >
          <div className="tool-card__icon"><Sparkles size={22} /></div>
          <h3 className="text-base">Gerar automaticamente com IA</h3>
          <p>Mais rápido: a IA já escreve o perfil inteiro pronto pra copiar — título, categoria, descrição, horário.</p>
          <div className="tool-card__foot">
            <span className="badge-pill badge-pill--ai">rápido</span>
            <span className="tool-card__cta">Abrir <ArrowRight size={13} /></span>
          </div>
        </button>

        <button
          onClick={() => onEscolher("manual")}
          className="tool-card text-left"
          style={{ ["--tool-color" as string]: "var(--accent)" }}
        >
          <div className="tool-card__icon"><Wand2 size={22} /></div>
          <h3 className="text-base">Gerar manualmente com auxílio da IA</h3>
          <p>Mais completo: analisa concorrência, monta diagnóstico, calendário de posts, respostas de avaliação e páginas locais — você no controle, com ajuda da IA em cada etapa.</p>
          <div className="tool-card__foot">
            <span className="badge-pill badge-pill--accent">completo</span>
            <span className="tool-card__cta">Abrir <ArrowRight size={13} /></span>
          </div>
        </button>
      </div>
    </div>
  );
}
