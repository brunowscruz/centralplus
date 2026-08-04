"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import PropostaAprovacaoField from "./PropostaAprovacaoField";
import SessaoAssistidaCTA from "./SessaoAssistidaCTA";

type StatusCampo = "proposta" | "aprovada" | "rejeitada" | "aplicada";
interface CampoProposta<T> {
  valor: T;
  status: StatusCampo;
}
interface FaqItem {
  pergunta: string;
  resposta: string;
}
interface FotoPlanejada {
  nomeArquivoSugerido: string;
  descricao: string;
  categoria: string;
}
interface DescricaoServicoProposta {
  servicoSlug: string;
  descricao: string;
}
export interface PropostaOtimizacaoGmb {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  categoriaPrincipal: CampoProposta<string>;
  categoriasSecundarias: CampoProposta<string[]>;
  descricaoGeral: CampoProposta<string>;
  descricaoPorServico: CampoProposta<DescricaoServicoProposta[]>;
  atributos: CampoProposta<string[]>;
  faq: CampoProposta<FaqItem[]>;
  planoFotos: CampoProposta<FotoPlanejada[]>;
}

const CAMPOS: { chave: keyof Omit<PropostaOtimizacaoGmb, "id" | "criadoEm" | "atualizadoEm">; label: string }[] = [
  { chave: "categoriaPrincipal", label: "Categoria principal" },
  { chave: "categoriasSecundarias", label: "Categorias secundárias" },
  { chave: "descricaoGeral", label: "Descrição geral do perfil" },
  { chave: "descricaoPorServico", label: "Descrição por serviço" },
  { chave: "atributos", label: "Atributos" },
  { chave: "faq", label: "Perguntas frequentes (FAQ)" },
  { chave: "planoFotos", label: "Plano de upload de fotos" },
];

function ValorCampo({ chave, valor }: { chave: string; valor: unknown }) {
  if (chave === "categoriaPrincipal" || chave === "descricaoGeral") return <p>{String(valor)}</p>;
  if (chave === "categoriasSecundarias" || chave === "atributos") {
    const lista = valor as string[];
    return (
      <div className="flex flex-wrap gap-1.5">
        {lista.map((v, i) => <span key={i} className="kw-tag">{v}</span>)}
        {lista.length === 0 && <span>nenhuma sugestão</span>}
      </div>
    );
  }
  if (chave === "descricaoPorServico") {
    const lista = valor as DescricaoServicoProposta[];
    return (
      <div className="space-y-1.5">
        {lista.map((v, i) => (
          <div key={i}><strong className="text-app">{v.servicoSlug}:</strong> {v.descricao}</div>
        ))}
      </div>
    );
  }
  if (chave === "faq") {
    const lista = valor as FaqItem[];
    return (
      <div className="space-y-2">
        {lista.map((v, i) => (
          <div key={i}><strong className="text-app">P: {v.pergunta}</strong><br />R: {v.resposta}</div>
        ))}
      </div>
    );
  }
  if (chave === "planoFotos") {
    const lista = valor as FotoPlanejada[];
    return (
      <ul className="space-y-1 list-disc ml-4">
        {lista.map((v, i) => (
          <li key={i}><span className="font-mono text-[11px]">{v.nomeArquivoSugerido}</span> — {v.descricao}</li>
        ))}
      </ul>
    );
  }
  return null;
}

export default function OtimizacaoGmbTab({
  slug,
  proposta,
  onAtualizado,
  isOwner,
}: {
  slug: string;
  proposta: PropostaOtimizacaoGmb | null;
  onAtualizado: () => void;
  isOwner: boolean;
}) {
  const [processando, setProcessando] = useState<string | null>(null);
  const { busy, send } = useAgentChat(slug, "mkt-online", "seo-local-otimizacao-gmb");

  async function gerar() {
    const contexto =
      "[Contexto: o usuário está na aba SEO Local → Otimização de perfil. Gere a proposta seguindo a seção 4 (marketing/mkt-online/seo-local/proposta-otimizacao-gmb.json) — use o perfil de negócio e a análise de concorrência mais recente, se existirem.]";
    await send("Gera a proposta de otimização do meu perfil GMB.", onAtualizado, undefined, contexto);
  }

  async function mudarStatus(campo: string, status: "aprovada" | "rejeitada" | "aplicada") {
    setProcessando(campo);
    try {
      await fetch(`/api/tenants/${slug}/mkt-online/seo-local/proposta-gmb/campo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, status }),
      });
      onAtualizado();
    } finally {
      setProcessando(null);
    }
  }

  const camposAprovados = proposta
    ? CAMPOS.filter(({ chave }) => (proposta[chave] as CampoProposta<unknown>).status === "aprovada")
    : [];

  async function marcarTodosAplicados() {
    for (const { chave } of camposAprovados) {
      await mudarStatus(chave, "aplicada");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Otimização de perfil GMB</h2>
          <p className="text-xs text-muted mt-1 max-w-md">
            A IA propõe mudanças pro seu perfil do Google — você aprova ou rejeita cada uma, uma por uma. Nada é aplicado sozinho.
          </p>
        </div>
        <button onClick={gerar} disabled={busy} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "Gerando…" : proposta ? "Gerar nova proposta" : "Gerar proposta"}
        </button>
      </div>

      {busy && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está montando a proposta</strong>
            <p className="text-xs text-muted mt-1">Só um instante — não feche esta tela.</p>
          </div>
        </div>
      )}

      {!busy && !proposta && (
        <div className="card p-10 text-center text-muted text-sm">
          Nenhuma proposta ainda. Clique em &quot;Gerar proposta&quot; acima.
        </div>
      )}

      {!busy && proposta && (
        <div className="space-y-3">
          {CAMPOS.map(({ chave, label }) => {
            const campo = proposta[chave] as CampoProposta<unknown>;
            return (
              <PropostaAprovacaoField
                key={chave}
                label={label}
                status={campo.status}
                busy={processando === chave}
                onAprovar={() => mudarStatus(chave, "aprovada")}
                onRejeitar={() => mudarStatus(chave, "rejeitada")}
              >
                <ValorCampo chave={chave} valor={campo.valor} />
              </PropostaAprovacaoField>
            );
          })}
        </div>
      )}

      {!busy && isOwner && camposAprovados.length > 0 && (
        <SessaoAssistidaCTA slug={slug} tipo="proposta-gmb" onMarcarAplicado={marcarTodosAplicados} />
      )}
    </div>
  );
}
