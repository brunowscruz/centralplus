"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, FileText, Download } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { MarkdownLeve } from "@/components/MarkdownLeve";

interface DiagnosticoResumo {
  nome: string;
  atualizadoEm: string;
}

export default function DiagnosticoTab({
  slug,
  diagnosticos,
  onAtualizado,
}: {
  slug: string;
  diagnosticos: DiagnosticoResumo[];
  onAtualizado: () => void;
}) {
  const [conteudo, setConteudo] = useState<string | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(false);
  const { busy, send } = useAgentChat(slug, "mkt-online", "seo-local-diagnostico");

  const maisRecente = diagnosticos[0] ?? null;

  useEffect(() => {
    if (!maisRecente) {
      setConteudo(null);
      return;
    }
    setCarregandoConteudo(true);
    fetch(`/api/tenants/${slug}/mkt-online/seo-local/diagnostico/${encodeURIComponent(maisRecente.nome)}`)
      .then((r) => r.json())
      .then((d) => setConteudo(d.conteudo ?? null))
      .finally(() => setCarregandoConteudo(false));
  }, [slug, maisRecente]);

  async function gerar() {
    const contexto =
      "[Contexto: o usuário está na aba SEO Local → Diagnóstico. Gere o relatório seguindo a seção 3 (a partir da execução mais recente de concorrencia.json) — se não houver nenhuma análise de concorrência ainda, avise que precisa rodar isso primeiro.]";
    await send("Gera o relatório de diagnóstico.", onAtualizado, undefined, contexto);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Diagnóstico</h2>
          <p className="text-xs text-muted mt-1 max-w-md">
            Um relatório simples pra mostrar pro cliente onde ele está perdendo espaço pros concorrentes — pronto pra apresentar.
          </p>
        </div>
        <button onClick={gerar} disabled={busy} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "Gerando…" : maisRecente ? "Gerar de novo" : "Gerar relatório"}
        </button>
      </div>

      {busy && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está escrevendo o diagnóstico</strong>
            <p className="text-xs text-muted mt-1">Só um instante — não feche esta tela.</p>
          </div>
        </div>
      )}

      {!busy && !maisRecente && (
        <div className="card p-10 text-center text-muted text-sm">
          Nenhum diagnóstico ainda. Analise a concorrência primeiro, depois clique em &quot;Gerar relatório&quot;.
        </div>
      )}

      {!busy && maisRecente && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-app flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium flex items-center gap-1.5"><FileText size={14} /> {maisRecente.nome}</h3>
            <a
              href={`/api/tenants/${slug}/mkt-online/seo-local/diagnostico/${encodeURIComponent(maisRecente.nome)}/download`}
              className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            >
              <Download size={13} /> Baixar
            </a>
          </div>
          <div className="p-5">
            {carregandoConteudo ? (
              <Loader2 size={14} className="animate-spin text-muted" />
            ) : conteudo ? (
              <MarkdownLeve texto={conteudo} />
            ) : (
              <p className="text-xs text-muted">Não consegui carregar o conteúdo.</p>
            )}
          </div>
          {diagnosticos.length > 1 && (
            <div className="px-4 py-2.5 border-t border-app text-[11px] text-muted">
              + {diagnosticos.length - 1} diagnóstico{diagnosticos.length - 1 === 1 ? "" : "s"} anterior{diagnosticos.length - 1 === 1 ? "" : "es"} no histórico.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
