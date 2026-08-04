"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

interface PostSlide {
  rel: string;
  kind: "image" | "html";
}

interface PublicacaoInfo {
  status: "publicado" | "falhou";
}

interface AgendamentoInfo {
  dataHoraISO: string;
  status: "pendente" | "publicado" | "falhou";
  tentativas: number;
  erro?: string;
}

interface Post {
  name: string;
  mtime: number;
  slides: PostSlide[];
  aprovado: string | null;
  publicacao: PublicacaoInfo | null;
  agendamento: AgendamentoInfo | null;
}

type Repeticao = "diario" | "alternado" | "3dias" | "semanal";
const INTERVALO_DIAS: Record<Repeticao, number> = { diario: 1, alternado: 2, "3dias": 3, semanal: 7 };

/** Sub-aba "Agendados" — duas seções: posts APROVADOS aguardando agendamento
 * (com seleção múltipla + agendamento em lote, ex "5 artes, uma a cada 2
 * dias") e os que JÁ têm agendamento.json (lista real, ordenada por data —
 * não calendário mensal, mais rápido de fazer bem e mais claro pra quem não
 * tem experiência técnica). O cron externo
 * (app/api/cron/instagram-publicacoes) é quem de fato publica no horário;
 * esta tela só cria/mostra/cancela. */
export default function AgendadosTab({
  slug,
  isOwner,
  onAbrirPost,
}: {
  slug: string;
  isOwner: boolean;
  onAbrirPost: (postName: string) => void;
}) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loteAberto, setLoteAberto] = useState(false);
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState("18:00");
  const [repeticao, setRepeticao] = useState<Repeticao>("alternado");
  const [agendandoLote, setAgendandoLote] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tenants/${slug}/instagram`);
    if (!res.ok) return;
    const data: { posts: Post[] } = await res.json();
    setPosts(data.posts);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancelar(postName: string) {
    await fetch(`/api/tenants/${slug}/instagram/schedule`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post: postName }),
    });
    await load();
  }

  function alternarSelecao(nome: string) {
    setSelecionados((s) => {
      const novo = new Set(s);
      if (novo.has(nome)) novo.delete(nome);
      else novo.add(nome);
      return novo;
    });
  }

  async function confirmarLote() {
    const nomes = Array.from(selecionados);
    if (nomes.length === 0) return;
    setAgendandoLote(true);
    try {
      const [ano, mes, dia] = dataInicio.split("-").map(Number);
      const [hh, mm] = horario.split(":").map(Number);
      const intervalo = INTERVALO_DIAS[repeticao];
      for (let i = 0; i < nomes.length; i++) {
        const data = new Date(ano, mes - 1, dia + i * intervalo, hh, mm, 0);
        await fetch(`/api/tenants/${slug}/instagram/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post: nomes[i], dataHoraISO: data.toISOString() }),
        });
      }
      setSelecionados(new Set());
      setLoteAberto(false);
      await load();
    } finally {
      setAgendandoLote(false);
    }
  }

  const mediaUrl = (postName: string, rel: string) =>
    `/api/tenants/${slug}/instagram/media/${encodeURIComponent(postName)}/${rel}`;

  const prontos = (posts || [])
    .filter((p) => p.aprovado && !p.agendamento && p.publicacao?.status !== "publicado")
    .sort((a, b) => b.mtime - a.mtime);

  const agendados = (posts || [])
    .filter((p) => p.agendamento)
    .sort((a, b) => a.agendamento!.dataHoraISO.localeCompare(b.agendamento!.dataHoraISO));

  if (posts && prontos.length === 0 && agendados.length === 0) {
    return (
      <div className="card p-10 text-center">
        <CalendarClock size={22} className="mx-auto text-muted" />
        <p className="text-sm font-medium mt-3">Nada agendado ainda</p>
        <p className="text-xs text-muted mt-1.5">
          Aprove um post na aba Post/Carrossel/Story pra poder agendar a publicação dele.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prontos.length > 0 && isOwner && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <p className="text-xs text-muted">
              {prontos.length} post{prontos.length === 1 ? "" : "s"} aprovado{prontos.length === 1 ? "" : "s"}, esperando agendar.
              {selecionados.size > 0 && ` ${selecionados.size} selecionado${selecionados.size === 1 ? "" : "s"}.`}
            </p>
            <button
              onClick={() => setLoteAberto((v) => !v)}
              disabled={selecionados.size === 0}
              className="btn-accent text-xs px-3 py-1.5 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CalendarClock size={13} /> Agendar selecionados
            </button>
          </div>

          {loteAberto && selecionados.size > 0 && (
            <div className="card p-3.5 mb-2.5 border-accent/40" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))" }}>
              <p className="text-xs font-medium mb-2.5">
                Agendar {selecionados.size} post{selecionados.size === 1 ? "" : "s"} selecionado{selecionados.size === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <label className="flex items-center gap-1.5 text-muted">
                  Começar em
                  <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input px-2 py-1 text-xs" />
                </label>
                <label className="flex items-center gap-1.5 text-muted">
                  Repetir
                  <select value={repeticao} onChange={(e) => setRepeticao(e.target.value as Repeticao)} className="input px-2 py-1 text-xs">
                    <option value="diario">Todo dia</option>
                    <option value="alternado">Dia sim, dia não</option>
                    <option value="3dias">A cada 3 dias</option>
                    <option value="semanal">Toda semana</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-muted">
                  Horário
                  <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="input px-2 py-1 text-xs" />
                </label>
                <button onClick={confirmarLote} disabled={agendandoLote} className="btn-accent text-xs px-3 py-1.5 ml-auto disabled:opacity-60 flex items-center gap-1.5">
                  {agendandoLote && <Loader2 size={12} className="animate-spin" />}
                  {agendandoLote ? "Agendando…" : "Confirmar agendamento"}
                </button>
              </div>
            </div>
          )}

          <div className="card divide-y divide-app">
            {prontos.map((p) => {
              const capa = p.slides[0];
              return (
                <div key={p.name} className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selecionados.has(p.name)}
                    onChange={() => alternarSelecao(p.name)}
                    className="w-4 h-4 shrink-0"
                    style={{ accentColor: "var(--ai, var(--accent))" }}
                  />
                  {capa && capa.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(p.name, capa.rel)} alt="" className="w-10 h-12.5 object-cover rounded-lg border border-app shrink-0" />
                  ) : (
                    <div className="w-10 h-12.5 rounded-lg border border-app bg-app shrink-0" />
                  )}
                  <button onClick={() => onAbrirPost(p.name)} className="text-xs font-medium truncate hover:underline flex-1 text-left">
                    {p.name}
                  </button>
                  <span className="badge-pill badge-pill--warn">aguardando agendar</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {agendados.length > 0 && (
        <div>
          {prontos.length > 0 && <p className="text-xs text-muted mb-2">Agendados</p>}
          <div className="card divide-y divide-app">
            {agendados.map((p) => {
              const capa = p.slides[0];
              const a = p.agendamento!;
              return (
                <div key={p.name} className="p-3 flex items-center gap-3">
                  {capa && capa.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(p.name, capa.rel)}
                      alt=""
                      className="w-12 h-15 object-cover rounded-lg border border-app shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-15 rounded-lg border border-app bg-app shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <button onClick={() => onAbrirPost(p.name)} className="text-xs font-medium truncate hover:underline block">
                      {p.name}
                    </button>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted">
                      {a.status === "pendente" && (
                        <>
                          <Clock size={12} className="text-accent" />
                          agendado pra {new Date(a.dataHoraISO).toLocaleString("pt-BR")}
                        </>
                      )}
                      {a.status === "publicado" && (
                        <>
                          <CheckCircle2 size={12} className="text-green-400" />
                          <span className="text-green-400">publicado em {new Date(a.dataHoraISO).toLocaleString("pt-BR")}</span>
                        </>
                      )}
                      {a.status === "falhou" && (
                        <>
                          <XCircle size={12} className="text-red-400" />
                          <span className="text-red-400">falhou ({a.tentativas}x): {a.erro}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isOwner && a.status !== "publicado" && (
                    <button onClick={() => cancelar(p.name)} className="btn-ghost text-[11px] px-2.5 py-1.5 shrink-0">
                      {a.status === "falhou" ? "remover" : "cancelar"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
