"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Search, FileText, Wand2, Calendar, MessageSquare, MapPinned, Loader2 } from "lucide-react";
import AjudaBotao from "../AjudaBotao";
import PerfilNegocioSeoTab, { type PerfilNegocioSeo } from "./PerfilNegocioSeoTab";
import ConcorrenciaTab from "./ConcorrenciaTab";
import DiagnosticoTab from "./DiagnosticoTab";
import OtimizacaoGmbTab, { type PropostaOtimizacaoGmb } from "./OtimizacaoGmbTab";
import CalendarioPostsTab from "./CalendarioPostsTab";
import ReviewsTab from "./ReviewsTab";
import PaginasLocaisTab from "./PaginasLocaisTab";

type Aba = "perfil" | "concorrencia" | "diagnostico" | "otimizacao" | "calendario" | "reviews" | "paginas-locais";

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
interface DiagnosticoResumo {
  nome: string;
  atualizadoEm: string;
}
interface PostGmb {
  id: string;
  dataPrevista: string;
  objetivo: string;
  palavraChave: string;
  tipo: "evento" | "chamada-para-acao" | "oferta";
  titulo: string;
  texto: string;
  status: "rascunho" | "aprovado" | "aplicado" | "falhou";
}
interface RespostaReview {
  id: string;
  avaliacaoTexto: string;
  avaliacaoAutor?: string;
  notaEstrelas: number;
  sentimento: "positiva" | "neutra" | "negativa";
  respostaSugerida: string;
  exigeAprovacao: boolean;
  status: "rascunho" | "aprovada" | "aplicada";
}
interface PaginaLocal {
  id: string;
  servicoSlug: string;
  localizacaoSlug: string;
  palavraChaveAlvo: string;
  pastaRascunho: string;
  destino: "site" | "wordpress";
  status: "rascunho" | "aprovada" | "publicada";
  urlPublicada?: string;
}

export default function SeoLocalTab({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  const [aba, setAba] = useState<Aba>("perfil");
  const [perfil, setPerfil] = useState<PerfilNegocioSeo | null>(null);
  const [execucoes, setExecucoes] = useState<ConcorrenciaExecucao[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoResumo[]>([]);
  const [proposta, setProposta] = useState<PropostaOtimizacaoGmb | null>(null);
  const [posts, setPosts] = useState<PostGmb[]>([]);
  const [reviews, setReviews] = useState<RespostaReview[]>([]);
  const [paginas, setPaginas] = useState<PaginaLocal[]>([]);
  const [wordpressConfigurado, setWordpressConfigurado] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [rPerfil, rConc, rDiag, rProp, rCal, rRev, rPag] = await Promise.all([
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil`),
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/concorrencia`),
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/diagnostico`),
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/proposta-gmb`),
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/calendario`),
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/reviews`),
        fetch(`/api/tenants/${slug}/mkt-online/seo-local/paginas-locais`),
      ]);
      const [dPerfil, dConc, dDiag, dProp, dCal, dRev, dPag] = await Promise.all([
        rPerfil.json(), rConc.json(), rDiag.json(), rProp.json(), rCal.json(), rRev.json(), rPag.json(),
      ]);
      setPerfil(dPerfil.perfil ?? null);
      setExecucoes(dConc.execucoes ?? []);
      setDiagnosticos(dDiag.diagnosticos ?? []);
      setProposta(dProp.proposta ?? null);
      setPosts(dCal.posts ?? []);
      setReviews(dRev.reviews ?? []);
      setPaginas(dPag.paginas ?? []);

      if (isOwner) {
        const rInt = await fetch(`/api/tenants/${slug}/integrations`);
        if (rInt.ok) {
          const dInt = await rInt.json();
          setWordpressConfigurado(!!(dInt.wordpress?.baseUrl && dInt.wordpress?.usuario && dInt.wordpress?.temSenha));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [slug, isOwner]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const precisaAtencao = {
    otimizacao: !!proposta && Object.values(proposta).some((c) => c && typeof c === "object" && "status" in c && c.status === "proposta"),
    calendario: posts.some((p) => p.status === "rascunho"),
    reviews: reviews.some((r) => r.status === "rascunho"),
    "paginas-locais": paginas.some((p) => p.status === "rascunho"),
  };

  const ABAS: { id: Aba; label: string; icon: typeof Building2 }[] = [
    { id: "perfil", label: "Perfil", icon: Building2 },
    { id: "concorrencia", label: "Concorrência", icon: Search },
    { id: "diagnostico", label: "Diagnóstico", icon: FileText },
    { id: "otimizacao", label: "Otimização", icon: Wand2 },
    { id: "calendario", label: "Calendário", icon: Calendar },
    { id: "reviews", label: "Reviews", icon: MessageSquare },
    { id: "paginas-locais", label: "Páginas", icon: MapPinned },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Google Meu Negócio — manual</h2>
          <p className="text-xs text-muted mt-1 mb-4 max-w-md">
            Apareça na frente dos concorrentes no Google Meu Negócio e nas buscas locais.
          </p>
        </div>
        <AjudaBotao
          titulo="Modo manual — como funciona cada aba"
          passos={[
            "Perfil: conte pra IA sobre o negócio (o que vende, público, diferenciais) — ela guarda isso e usa em todas as outras abas.",
            "Concorrência e Diagnóstico: a IA analisa como o negócio está posicionado no Google comparado a outros da região.",
            "Otimização, Calendário e Reviews: a IA sugere melhorias, posts e respostas — sempre em rascunho, você aprova antes de valer.",
            "Páginas Locais: gera páginas extras de SEO pro site, uma por serviço+região — nunca precisa de senha ou token do Google pra nada disso.",
            "Na aba Reviews, o único passo é achar o negócio certo pelo nome/endereço pra puxar as avaliações reais — sem login.",
          ]}
        />
      </div>

      <div className="flex gap-0.5 border-b border-app mb-5 overflow-x-auto">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              aba === id ? "text-accent border-accent" : "text-muted border-transparent hover:text-app"
            }`}
          >
            <Icon size={13} /> {label}
            {precisaAtencao[id as keyof typeof precisaAtencao] && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted py-8 justify-center">
          <Loader2 size={14} className="animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          {aba === "perfil" && <PerfilNegocioSeoTab slug={slug} perfil={perfil} onAtualizado={carregar} />}
          {aba === "concorrencia" && <ConcorrenciaTab slug={slug} execucoes={execucoes} onAtualizado={carregar} />}
          {aba === "diagnostico" && <DiagnosticoTab slug={slug} diagnosticos={diagnosticos} onAtualizado={carregar} />}
          {aba === "otimizacao" && <OtimizacaoGmbTab slug={slug} proposta={proposta} onAtualizado={carregar} isOwner={isOwner} />}
          {aba === "calendario" && <CalendarioPostsTab slug={slug} posts={posts} onAtualizado={carregar} isOwner={isOwner} />}
          {aba === "reviews" && <ReviewsTab slug={slug} reviews={reviews} onAtualizado={carregar} isOwner={isOwner} />}
          {aba === "paginas-locais" && (
            <PaginasLocaisTab slug={slug} perfil={perfil} paginas={paginas} onAtualizado={carregar} isOwner={isOwner} wordpressConfigurado={wordpressConfigurado} />
          )}
        </>
      )}
    </div>
  );
}
