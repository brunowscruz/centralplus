"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Send, MapPin, Phone, Building2, MessageCircle, ImagePlus, Trash2 } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { ChatMessages } from "@/components/ChatMessages";
import TagInput from "@/components/TagInput";
import ImageCropModal from "@/components/ImageCropModal";

interface ServicoSeo {
  slug: string;
  nome: string;
  descricaoCurta?: string;
}
interface AreaAtuacaoSeo {
  slug: string;
  cidade: string;
  bairro?: string;
  estado: string;
}
export interface PerfilNegocioSeo {
  nomeLegal: string;
  telefone: string;
  enderecoCompleto: string;
  categoriaGmbPrincipal?: string;
  servicos: ServicoSeo[];
  areasAtuacao: AreaAtuacaoSeo[];
  palavrasChave?: string[];
  diferenciais?: string[];
  atualizadoEm: string;
}

export default function PerfilNegocioSeoTab({
  slug,
  perfil,
  onAtualizado,
}: {
  slug: string;
  perfil: PerfilNegocioSeo | null;
  onAtualizado: () => void;
}) {
  const { messages, busy, send } = useAgentChat(slug, "mkt-online", "seo-local-perfil");
  const [texto, setTexto] = useState("");
  const [salvandoCampo, setSalvandoCampo] = useState<string | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [arquivoParaRecortar, setArquivoParaRecortar] = useState<File | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/tenants/${slug}/mkt-online/seo-local/fotos`)
      .then((r) => r.json())
      .then((d) => setFotos(d.fotos ?? []))
      .catch(() => {});
  }, [slug]);

  async function iniciar() {
    const contexto =
      "[Contexto: o usuário está na aba SEO Local → Perfil de negócio, e acabou de clicar pra começar/continuar a entrevista. Siga a seção 1: uma pergunta por vez, pule o que já souber, resuma e confirme antes de gravar.]";
    await send(
      perfil ? "Quero atualizar o perfil de SEO Local do meu negócio." : "Quero preencher o perfil de SEO Local do meu negócio.",
      onAtualizado,
      undefined,
      contexto,
    );
  }

  async function enviar() {
    const mensagem = texto.trim();
    if (!mensagem || busy) return;
    setTexto("");
    await send(mensagem, onAtualizado);
  }

  async function salvarCampoTag(campo: "servicos" | "areasAtuacao" | "palavrasChave" | "diferenciais", valores: string[]) {
    setSalvandoCampo(campo);
    try {
      await fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil/campo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, valores }),
      });
      onAtualizado();
    } finally {
      setSalvandoCampo(null);
    }
  }

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) setArquivoParaRecortar(arquivo);
    e.target.value = "";
  }

  async function aplicarRecorte(blob: Blob, nomeArquivo: string) {
    const form = new FormData();
    form.append("arquivo", blob, nomeArquivo);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/fotos`, { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setFotos((f) => [data.nome, ...f]);
    }
    setArquivoParaRecortar(null);
  }

  async function removerFoto(nome: string) {
    setFotos((f) => f.filter((n) => n !== nome));
    await fetch(`/api/tenants/${slug}/mkt-online/seo-local/fotos/${encodeURIComponent(nome)}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Perfil de negócio (SEO Local)</h2>
        <p className="text-xs text-muted mt-1 max-w-md">
          Nome, endereço, telefone, serviços e áreas de atuação — a base que os outros agentes de SEO Local usam.
        </p>
      </div>

      {perfil && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium"><Building2 size={15} /> {perfil.nomeLegal}</div>
            <div className="flex items-center gap-2 text-xs text-muted"><Phone size={13} /> {perfil.telefone}</div>
            <div className="flex items-center gap-2 text-xs text-muted"><MapPin size={13} /> {perfil.enderecoCompleto}</div>
            {perfil.categoriaGmbPrincipal && (
              <span className="badge-pill badge-pill--accent">{perfil.categoriaGmbPrincipal}</span>
            )}
          </div>
          <div className="card p-4 space-y-2">
            <h4 className="text-xs font-medium text-muted">Fotos do perfil</h4>
            <p className="text-[11px] text-muted -mt-1.5">Usadas no perfil do Google e nas postagens.</p>
            <div className="flex flex-wrap gap-2">
              {fotos.map((f) => (
                <div key={f} className="relative group h-16 w-16 rounded-lg overflow-hidden border border-app shrink-0">
                  <img src={`/api/tenants/${slug}/mkt-online/seo-local/fotos/${encodeURIComponent(f)}`} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removerFoto(f)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    aria-label="Remover foto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => inputArquivoRef.current?.click()}
                className="h-16 w-16 rounded-lg border-2 border-dashed border-app flex items-center justify-center text-muted hover:text-accent hover:border-accent shrink-0"
                aria-label="Adicionar foto"
              >
                <ImagePlus size={20} />
              </button>
              <input ref={inputArquivoRef} type="file" accept="image/*" className="hidden" onChange={escolherArquivo} />
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted">Serviços</h4>
            <TagInput
              valores={perfil.servicos.map((s) => s.nome)}
              onChange={(v) => salvarCampoTag("servicos", v)}
              placeholder="Adicionar novo serviço..."
              disabled={salvandoCampo === "servicos"}
            />
          </div>
          <div className="card p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted">Áreas de atuação</h4>
            <TagInput
              valores={perfil.areasAtuacao.map((a) => (a.estado ? `${a.cidade}, ${a.estado}` : a.cidade))}
              onChange={(v) => salvarCampoTag("areasAtuacao", v)}
              placeholder="Cidade, UF..."
              disabled={salvandoCampo === "areasAtuacao"}
            />
          </div>
          <div className="card p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted">Palavras-chave</h4>
            <TagInput
              valores={perfil.palavrasChave ?? []}
              onChange={(v) => salvarCampoTag("palavrasChave", v)}
              placeholder="Adicionar palavra..."
              disabled={salvandoCampo === "palavrasChave"}
            />
          </div>
          <div className="card p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted">Diferenciais</h4>
            <TagInput
              valores={perfil.diferenciais ?? []}
              onChange={(v) => salvarCampoTag("diferenciais", v)}
              placeholder="Descreva um diferencial..."
              disabled={salvandoCampo === "diferenciais"}
            />
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm space-y-3">
          <p>
            {perfil
              ? "Prefere conversar em vez de editar direto? A IA pergunta o que faltar, uma coisa de cada vez."
              : "Ainda não temos o perfil de SEO Local preenchido. A IA te entrevista aqui mesmo, uma pergunta por vez."}
          </p>
          <button onClick={iniciar} disabled={busy} className="btn-accent text-xs px-3.5 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            {busy ? "Conectando…" : perfil ? "Conversar pra atualizar" : "Começar entrevista"}
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
          <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
            <Sparkles size={13} className="text-accent" />
            <h3 className="text-xs font-medium">Entrevista de perfil</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ minHeight: 200 }}>
            <ChatMessages messages={messages} busy={busy} />
          </div>
          <div className="border-t border-app p-2.5 flex items-center gap-2">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
              placeholder="Responda aqui…"
              disabled={busy}
              className="input flex-1 px-3 py-2 text-sm"
            />
            <button onClick={enviar} disabled={busy || !texto.trim()} className="btn-accent text-xs px-3 py-2 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}

      {arquivoParaRecortar && (
        <ImageCropModal arquivo={arquivoParaRecortar} onFechar={() => setArquivoParaRecortar(null)} onAplicar={aplicarRecorte} />
      )}
    </div>
  );
}
