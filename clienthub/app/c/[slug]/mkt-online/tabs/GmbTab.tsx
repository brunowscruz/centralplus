"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Download, Loader2, Star } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import AjudaBotao from "./AjudaBotao";

interface PerfilGMB {
  titulo: string;
  categoria: string;
  descricao: string;
  endereco?: string;
  horario: string;
  atualizadoEm: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(value);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }
  return (
    <div className="field-row">
      <span className="field-row__label">{label}</span>
      <span className="field-row__value">{value}</span>
      <button onClick={copiar} className={`copy-btn ${copiado ? "copied" : ""}`}>
        {copiado ? <Check size={12} /> : <Copy size={12} />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export default function GmbTab({
  slug,
  perfil,
  onAtualizado,
  title,
}: {
  slug: string;
  perfil: PerfilGMB | null;
  onAtualizado: () => void;
  title: string;
}) {
  const { busy, send } = useAgentChat(slug, "mkt-online", "mkt-online-gmb");

  async function gerar() {
    const contexto =
      "[Contexto: o usuário clicou em gerar/atualizar o perfil do Google Meu Negócio. Gere marketing/mkt-online/gmb.json seguindo o schema documentado, usando o contexto real do negócio.]";
    await send("Gera (ou atualiza) o perfil do Google Meu Negócio.", onAtualizado, undefined, contexto);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted mt-1 max-w-md">
            A IA já escreve tudo olhando pro seu negócio. Revise, copie o que quiser mudar direto no Google, ou baixe o arquivo pronto.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={gerar} disabled={busy} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy ? "Gerando…" : perfil ? "Gerar de novo" : "Gerar perfil"}
          </button>
          <AjudaBotao
            titulo="Gerar automaticamente — como funciona"
            passos={[
              "Clique em \"Gerar perfil\" — a IA escreve tudo sozinha olhando pros dados do negócio, não precisa digitar nada.",
              "Revise o resultado: se algo estiver errado, é só clicar em \"Gerar de novo\".",
              "Copie cada campo (ou baixe o arquivo pronto) e cole no perfil do Google Meu Negócio do cliente.",
              "Não precisa de senha, token ou login do Google pra essa parte — é só texto pra copiar.",
            ]}
          />
        </div>
      </div>

      {!perfil && !busy && (
        <div className="card p-10 text-center text-muted text-sm">
          Ainda não geramos o perfil do seu Google Meu Negócio. Clique em &quot;Gerar perfil&quot; acima.
        </div>
      )}

      {busy && !perfil && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está escrevendo seu perfil</strong>
            <p className="text-xs text-muted mt-1">Isso leva só um instante — não feche esta tela.</p>
          </div>
        </div>
      )}

      {perfil && (
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-4 items-start">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-app flex items-center justify-between">
              <h3 className="text-sm font-medium">Prévia do seu perfil</h3>
              <span className="badge-pill badge-pill--ai"><Sparkles size={11} /> gerado pela IA</span>
            </div>
            <div className="p-4">
              <div className="rounded-xl border border-app overflow-hidden mb-4" style={{ background: "color-mix(in srgb, var(--text) 3%, var(--card))" }}>
                <div
                  className="h-24"
                  style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ai) 22%, transparent), transparent 60%)" }}
                />
                <div className="p-4 space-y-2">
                  <div className="text-lg font-bold">{perfil.titulo}</div>
                  <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-0.5 text-accent">
                      <Star size={11} fill="currentColor" /><Star size={11} fill="currentColor" /><Star size={11} fill="currentColor" /><Star size={11} fill="currentColor" /><Star size={11} fill="currentColor" />
                    </span>
                    {perfil.categoria}
                    {perfil.endereco ? ` · ${perfil.endereco}` : ""}
                  </div>
                  <p className="text-sm leading-relaxed">{perfil.descricao}</p>
                </div>
              </div>

              <CopyField label="Título" value={perfil.titulo} />
              <CopyField label="Categoria" value={perfil.categoria} />
              <CopyField label="Descrição" value={perfil.descricao} />
              <CopyField label="Horário" value={perfil.horario} />
              {perfil.endereco && <CopyField label="Endereço" value={perfil.endereco} />}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-app">
              <h3 className="text-sm font-medium">Como subir no Google</h3>
            </div>
            <div className="p-4">
              <ol className="steps-list">
                <li><strong>Baixe o arquivo</strong> com tudo já preenchido, pronto pra usar.</li>
                <li><strong>Abra o Google Meu Negócio</strong> no navegador ou no app, no perfil do seu negócio.</li>
                <li><strong>Cole cada informação</strong> no campo correspondente — o arquivo já vem organizado na mesma ordem.</li>
                <li><strong>Salve</strong> — pronto, seu perfil está atualizado.</li>
              </ol>
              <a
                href={`/api/tenants/${slug}/mkt-online/gmb/download`}
                className="btn-accent text-xs px-3.5 py-2.5 w-full flex items-center justify-center gap-1.5 mt-2"
              >
                <Download size={14} /> Baixar arquivo pronto
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
