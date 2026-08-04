"use client";

import { useState } from "react";
import { Sparkles, Loader2, Search, Star, Check, Minus } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";

interface ConcorrenteGmb {
  nome: string;
  categoriaPrincipal?: string;
  categoriasSecundarias: string[];
  nomeContemPalavraChave: boolean;
  cidadeCorrespondeAlvo: boolean;
  horarioPublicado: boolean;
  nota?: number;
  numAvaliacoes?: number;
  enderecoVisivel: boolean;
  numFotos?: number;
  temDescricao: boolean;
  servicosListados: string[];
  atributos: string[];
  posicaoNoMapa?: number;
}
interface ConcorrenciaExecucao {
  id: string;
  termoBuscado: string;
  localizacaoBuscada: string;
  executadoEm: string;
  concorrentes: ConcorrenteGmb[];
}

export default function ConcorrenciaTab({
  slug,
  execucoes,
  onAtualizado,
}: {
  slug: string;
  execucoes: ConcorrenciaExecucao[];
  onAtualizado: () => void;
}) {
  const [termo, setTermo] = useState("");
  const [local, setLocal] = useState("");
  const { busy, send } = useAgentChat(slug, "mkt-online", "seo-local-concorrencia");

  const ultima = execucoes[0] ?? null;

  async function analisar() {
    if (!termo.trim() || !local.trim() || busy) return;
    const contexto = `[Contexto: o usuário está na aba SEO Local → Concorrência. Rode a auditoria de concorrência pro termo "${termo.trim()}" na localização "${local.trim()}" seguindo as instruções da seção 2 (script pesquisar-concorrente-gmb.mjs + WebSearch), e grave em concorrencia.json.]`;
    await send(`Analisa a concorrência pra "${termo.trim()}" em ${local.trim()}.`, onAtualizado, undefined, contexto);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Auditoria de concorrência</h2>
        <p className="text-xs text-muted mt-1 max-w-md">
          Veja como os concorrentes que já aparecem no Google estão posicionados — e onde tem espaço pra você aparecer na frente.
        </p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="text-[11px] text-muted block mb-1">O que buscar</label>
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="ex: advogado trabalhista" className="input w-full px-3 py-2 text-sm" disabled={busy} />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-muted block mb-1">Onde (cidade, UF)</label>
          <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="ex: Curitiba, PR" className="input w-full px-3 py-2 text-sm" disabled={busy} />
        </div>
        <button onClick={analisar} disabled={busy || !termo.trim() || !local.trim()} className="btn-accent text-xs px-3.5 py-2.5 flex items-center gap-1.5 disabled:opacity-60 whitespace-nowrap">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {busy ? "Analisando…" : "Analisar concorrência"}
        </button>
      </div>

      {busy && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está pesquisando seus concorrentes no Google</strong>
            <p className="text-xs text-muted mt-1">Isso pode levar um minuto — não feche esta tela.</p>
          </div>
        </div>
      )}

      {!busy && !ultima && (
        <div className="card p-10 text-center text-muted text-sm">
          Nenhuma análise ainda. Preencha o termo e a cidade acima pra começar.
        </div>
      )}

      {!busy && ultima && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-app flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium">
              &quot;{ultima.termoBuscado}&quot; em {ultima.localizacaoBuscada}
            </h3>
            <span className="badge-pill badge-pill--ai"><Sparkles size={11} /> {ultima.concorrentes.length} concorrentes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean w-full">
              <thead>
                <tr className="border-b border-app">
                  <th className="px-3 py-2.5 text-left">#</th>
                  <th className="px-3 py-2.5 text-left">Nome</th>
                  <th className="px-3 py-2.5 text-left">Categoria</th>
                  <th className="px-3 py-2.5 text-left">Nota</th>
                  <th className="px-3 py-2.5 text-center">Endereço</th>
                  <th className="px-3 py-2.5 text-center">Horário</th>
                  <th className="px-3 py-2.5 text-center">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {ultima.concorrentes.map((c, i) => (
                  <tr key={i} className="border-b border-app last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-mono font-semibold" style={{ background: "color-mix(in srgb, var(--text) 8%, transparent)" }}>
                        {c.posicaoNoMapa ?? i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium">{c.nome}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{c.categoriaPrincipal ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {c.nota !== undefined ? (
                        <span className="flex items-center gap-1"><Star size={11} className="text-accent" fill="currentColor" /> {c.nota}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PresencaIcone presente={c.enderecoVisivel} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PresencaIcone presente={c.horarioPublicado} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PresencaIcone presente={c.temDescricao} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {execucoes.length > 1 && (
            <div className="px-4 py-2.5 border-t border-app text-[11px] text-muted">
              + {execucoes.length - 1} análise{execucoes.length - 1 === 1 ? "" : "s"} anterior{execucoes.length - 1 === 1 ? "" : "es"} no histórico.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "Sim/não" mais legível que ícone-solto-ou-travessão: verde quando tem o
 * dado, cinza discreto quando não tem (nunca vermelho — ausência de dado
 * não é um erro, é só informação incompleta do concorrente). */
function PresencaIcone({ presente }: { presente: boolean }) {
  return presente ? (
    <Check size={14} className="text-green-500 inline" />
  ) : (
    <Minus size={12} className="text-muted inline opacity-50" />
  );
}
