"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Sparkles,
  Download,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Wrench,
  PenLine,
  Target,
  AtSign,
  Check,
  Rocket,
  Pause,
  Play,
  BarChart3,
  ChevronLeft,
  Bot,
  FolderInput,
  X,
} from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import AjudaBotao from "./AjudaBotao";
import GoogleAdPreview from "./GoogleAdPreview";
import ChatPanel from "@/app/c/[slug]/claude/ChatPanel";
import CampanhaMetricas from "./CampanhaMetricas";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { useCelebration } from "@/components/Celebration";
import EmptyState from "@/components/EmptyState";

interface CampanhaAds {
  plataforma: "google" | "meta";
  titulo: string;
  tipo: "produto" | "servico" | "zero";
  descricaoNegocio: string;
  anuncios: { titulo: string; descricao: string }[];
  headlines?: string[];
  descriptions?: string[];
  callouts?: string[];
  snippetsEstruturados?: { cabecalho: string; valores: string[] }[];
  palavrasNegativas?: string[];
  localizacoes?: string[];
  palavrasChave: string[];
  publico: string;
  orcamentoSugeridoDia?: number;
  tipoOrcamento?: "diario" | "mensal";
  criativo?: string;
  urlDestino?: string;
  status: "rascunho" | "aplicada" | "falhou";
  statusGoogleAds?: "ENABLED" | "PAUSED";
  aplicacao?: { tentadoEm: string; ok: boolean; mensagem: string; googleCampaignId?: string; googleAdGroupId?: string };
  criadoEm: string;
  atualizadoEm: string;
}

function BadgeStatus({ status }: { status: CampanhaAds["status"] }) {
  if (status === "aplicada") return <span className="badge-pill badge-pill--good">criada no Google Ads</span>;
  if (status === "falhou") return <span className="badge-pill badge-pill--bad">falhou ao aplicar</span>;
  return <span className="badge-pill">rascunho</span>;
}
type Item = { nome: string; campanha: CampanhaAds };
type SubView = "list" | "new" | "generating" | "result" | "metricas" | "agente";

// Google Ads aqui é sempre campanha de Rede de Pesquisa (só texto — sem
// imagem no anúncio em si), por isso não tem passo de imagem. Meta Ads é
// formato visual de verdade, mantém o passo.
const PASSOS_GERACAO_GOOGLE = [
  "Lendo as informações do seu negócio…",
  "Pesquisando o que seus clientes procuram…",
  "Escrevendo os anúncios…",
  "Montando tudo pra você baixar…",
];
const PASSOS_GERACAO_META = [
  "Lendo as informações do seu negócio…",
  "Pesquisando o que seus clientes procuram…",
  "Escrevendo os anúncios…",
  "Criando a imagem de divulgação…",
  "Montando tudo pra você baixar…",
];

const TIPOS: { id: CampanhaAds["tipo"]; icon: typeof Package; titulo: string; sub: string }[] = [
  { id: "produto", icon: Package, titulo: "Um produto", sub: "Um carro, um imóvel, um item específico que você quer vender." },
  { id: "servico", icon: Wrench, titulo: "Um serviço", sub: "Financiamento, revisão, assessoria — algo que você presta." },
  { id: "zero", icon: PenLine, titulo: "Começar do zero", sub: "Não sei ainda, quero descrever com minhas palavras." },
];

export default function AdsTab({
  slug,
  plataforma,
  isOwner,
  onAtualizado,
}: {
  slug: string;
  plataforma: "google" | "meta";
  isOwner: boolean;
  campanhas: Item[] | null;
  onAtualizado: () => void;
}) {
  const [sub, setSub] = useState<SubView>("list");
  const [lista, setLista] = useState<Item[] | null>(null);
  const [tipo, setTipo] = useState<CampanhaAds["tipo"]>("produto");
  const [descricao, setDescricao] = useState("");
  const [urlDestinoNova, setUrlDestinoNova] = useState("");
  const [tipoOrcamentoNovo, setTipoOrcamentoNovo] = useState<"diario" | "mensal">("diario");
  const [valorOrcamentoNovo, setValorOrcamentoNovo] = useState("");
  const [selecionada, setSelecionada] = useState<Item | null>(null);
  const [passoAtivo, setPassoAtivo] = useState(0);
  const [imgPrompt, setImgPrompt] = useState("");
  const [urlDestino, setUrlDestino] = useState("");
  const [salvandoUrl, setSalvandoUrl] = useState(false);
  const [tipoOrcamento, setTipoOrcamento] = useState<"diario" | "mensal">("diario");
  const [valorOrcamento, setValorOrcamento] = useState("");
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [localizacoes, setLocalizacoes] = useState("");
  const [salvandoLoc, setSalvandoLoc] = useState(false);
  const [importarAberto, setImportarAberto] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [msgAplicar, setMsgAplicar] = useState<string | null>(null);
  const [pausando, setPausando] = useState(false);
  const [msgPausar, setMsgPausar] = useState<string | null>(null);
  /** Última resposta de texto da IA quando a geração termina SEM nenhuma
   * campanha nova ter aparecido (erro, ou a IA respondeu em vez de gravar o
   * campanha.json) — sem isso, a tela voltava pra "list" em silêncio e
   * parecia que nada tinha acontecido. */
  const [falhaGeracao, setFalhaGeracao] = useState<string | null>(null);
  const toast = useToast();
  const confirmar = useConfirm();
  const celebrate = useCelebration();

  useEffect(() => {
    setUrlDestino(selecionada?.campanha.urlDestino || "");
    setTipoOrcamento(selecionada?.campanha.tipoOrcamento || "diario");
    const dia = selecionada?.campanha.orcamentoSugeridoDia;
    const tipo = selecionada?.campanha.tipoOrcamento || "diario";
    setValorOrcamento(dia ? String(tipo === "mensal" ? Math.round(dia * 30.4) : dia) : "");
    setLocalizacoes((selecionada?.campanha.localizacoes || []).join(", "));
    setMsgAplicar(null);
    setMsgPausar(null);
  }, [selecionada?.nome]);

  const nomePlataforma = plataforma === "google" ? "Google Ads" : "Meta Ads";
  const IconPlataforma = plataforma === "google" ? Target : AtSign;
  const PASSOS_GERACAO = plataforma === "google" ? PASSOS_GERACAO_GOOGLE : PASSOS_GERACAO_META;
  const usaImagem = plataforma === "meta"; // Google aqui é sempre Rede de Pesquisa — só texto

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads?plataforma=${plataforma}`);
    const data = await res.json();
    setLista(data.campanhas ?? []);
  }, [slug, plataforma]);

  useEffect(() => {
    carregar();
    setSub("list");
  }, [carregar]);

  const { busy: gerando, send: enviarGeracao, messages: mensagensGeracao } = useAgentChat(slug, "mkt-online", `mkt-online-ads-${plataforma}-nova`);
  const { busy: editando, send: enviarEdicao } = useAgentChat(
    slug,
    "mkt-online",
    `mkt-online-ads-${plataforma}-${selecionada?.nome || "x"}`,
  );

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function gerarCampanha() {
    if (!descricao.trim()) return;
    setSub("generating");
    setFalhaGeracao(null);
    setPassoAtivo(0);
    stepTimer.current = setInterval(() => {
      setPassoAtivo((p) => Math.min(p + 1, PASSOS_GERACAO.length - 1));
    }, 2600);

    const antes = new Set((lista ?? []).map((i) => i.nome));
    const linhaUrl =
      plataforma === "google"
        ? urlDestinoNova.trim()
          ? `A URL de destino (landing page) é: ${urlDestinoNova.trim()} — use exatamente esse valor em urlDestino.`
          : "O operador não informou URL de destino ainda — grave a campanha sem urlDestino, sem perguntar por ela."
        : "";
    const valorNum = Number(valorOrcamentoNovo.replace(",", "."));
    const linhaOrcamento =
      plataforma === "google" && valorNum > 0
        ? tipoOrcamentoNovo === "mensal"
          ? `O orçamento é MENSAL de R$${valorNum} — grave orcamentoSugeridoDia como o valor diário equivalente (${valorNum}/30.4, arredondado pra 2 casas) e tipoOrcamento: "mensal".`
          : `O orçamento é R$${valorNum} POR DIA — grave orcamentoSugeridoDia: ${valorNum} e tipoOrcamento: "diario".`
        : plataforma === "google"
          ? "O operador não informou orçamento ainda — sugira um valor razoável em orcamentoSugeridoDia (diário) e tipoOrcamento: \"diario\", sem perguntar por ele."
          : "";
    const contexto = `[Contexto: o usuário quer uma campanha nova de ${nomePlataforma} (plataforma: "${plataforma}"), tipo "${tipo}". Crie a pasta em marketing/mkt-online/ads-${plataforma}/ seguindo a convenção documentada e grave campanha.json. ${linhaUrl} ${linhaOrcamento}]`;
    await enviarGeracao(descricao.trim(), async () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      const res = await fetch(`/api/tenants/${slug}/mkt-online/ads?plataforma=${plataforma}`);
      const data = await res.json();
      const itens: Item[] = data.campanhas ?? [];
      setLista(itens);
      const nova = itens.find((i) => !antes.has(i.nome)) ?? null;
      if (nova) {
        setSelecionada(nova);
        setSub("result");
      } else {
        // nada novo apareceu — a IA respondeu com texto (pergunta, dúvida,
        // erro) em vez de gravar o campanha.json. Mostra essa resposta em
        // vez de voltar pra lista em silêncio, senão parece que nada rodou.
        const ultima = [...mensagensGeracao].reverse().find((m) => m.role === "assistant");
        setFalhaGeracao(ultima?.text?.trim() || "A IA não conseguiu gerar a campanha dessa vez — tente descrever de novo, com mais detalhes.");
        setSub("new");
      }
      onAtualizado();
    }, undefined, contexto);
  }

  async function apagar(item: Item) {
    const aplicada = item.campanha.status === "aplicada";
    const ok = await confirmar({
      title: `Remover "${item.campanha.titulo}"?`,
      message: aplicada
        ? "Isso remove a campanha também da conta REAL do Google Ads, não só daqui."
        : "É só um rascunho — nada foi criado na conta de verdade ainda.",
      variant: "danger",
      confirmText: "Remover",
    });
    if (!ok) return;
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(item.nome)}?plataforma=${plataforma}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error || "Não foi possível remover — tente de novo.");
      return;
    }
    toast.success(`"${item.campanha.titulo}" removida.`);
    carregar();
    onAtualizado();
  }

  async function editarImagem() {
    if (!imgPrompt.trim() || !selecionada) return;
    const contexto = `[Contexto: o usuário está editando a imagem de divulgação da campanha "${selecionada.nome}" (marketing/mkt-online/ads-${plataforma}/${selecionada.nome}/campanha.json, imagem em img/${selecionada.campanha.criativo || "criativo.png"}). Regenere só a imagem seguindo o pedido, mantenha o resto do campanha.json igual.]`;
    const texto = imgPrompt.trim();
    setImgPrompt("");
    await enviarEdicao(texto, async () => {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}?plataforma=${plataforma}`);
      const data = await res.json();
      if (data.campanha) setSelecionada({ nome: selecionada.nome, campanha: data.campanha });
    }, undefined, contexto);
  }

  async function salvarUrlDestino() {
    if (!selecionada) return;
    setSalvandoUrl(true);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}?plataforma=${plataforma}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urlDestino }),
    });
    const data = await res.json();
    if (data.campanha) setSelecionada({ nome: selecionada.nome, campanha: data.campanha });
    setSalvandoUrl(false);
  }

  async function salvarOrcamento() {
    if (!selecionada) return;
    const valorNum = Number(valorOrcamento.replace(",", "."));
    if (!valorNum || valorNum <= 0) return;
    setSalvandoOrcamento(true);
    const orcamentoSugeridoDia = tipoOrcamento === "mensal" ? Math.round((valorNum / 30.4) * 100) / 100 : valorNum;
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}?plataforma=${plataforma}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orcamentoSugeridoDia, tipoOrcamento }),
    });
    const data = await res.json();
    if (data.campanha) setSelecionada({ nome: selecionada.nome, campanha: data.campanha });
    setSalvandoOrcamento(false);
  }

  async function salvarLocalizacoes() {
    if (!selecionada) return;
    setSalvandoLoc(true);
    const lista = localizacoes.split(",").map((l) => l.trim()).filter(Boolean);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}?plataforma=${plataforma}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localizacoes: lista }),
    });
    const data = await res.json();
    if (data.campanha) setSelecionada({ nome: selecionada.nome, campanha: data.campanha });
    setSalvandoLoc(false);
  }

  async function pausarOuAtivar() {
    if (!selecionada) return;
    const vaiPausar = selecionada.campanha.statusGoogleAds !== "PAUSED";
    setPausando(true);
    setMsgPausar(null);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}/pausar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pausar: vaiPausar }),
    });
    const data = await res.json();
    if (data.campanha) setSelecionada({ nome: selecionada.nome, campanha: data.campanha });
    setMsgPausar(data.mensagem || (data.ok ? "Feito." : "Falha."));
    setPausando(false);
    onAtualizado();
  }

  async function aplicarCampanha() {
    if (!selecionada) return;
    const ok = await confirmar({
      title: "Criar campanha de verdade no Google Ads?",
      message: `"${selecionada.campanha.titulo}" nasce PAUSADA na conta real do cliente — não gasta nada até você ativar.`,
      confirmText: "Criar campanha",
    });
    if (!ok) return;
    const eraPrimeira = !(lista ?? []).some((i) => i.campanha.status === "aplicada");
    setAplicando(true);
    setMsgAplicar(null);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}/aplicar`, { method: "POST" });
    const data = await res.json();
    if (data.campanha) setSelecionada({ nome: selecionada.nome, campanha: data.campanha });
    setMsgAplicar(data.mensagem || (data.ok ? "Aplicada com sucesso." : "Falha ao aplicar."));
    setAplicando(false);
    onAtualizado();
    if (data.ok && eraPrimeira) {
      celebrate({
        title: "Primeira campanha no ar!",
        message: `"${selecionada.campanha.titulo}" foi criada de verdade na conta de Google Ads. Ela está pausada — ative quando quiser começar a rodar.`,
      });
    }
  }

  const imgUrl = (item: Item) =>
    item.campanha.criativo
      ? `/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(item.nome)}/media/${encodeURIComponent(item.campanha.criativo)}?plataforma=${plataforma}`
      : null;

  return (
    <div className="space-y-4">
      {sub === "list" && (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{nomePlataforma}</h2>
              <p className="text-xs text-muted mt-1 max-w-md">Suas campanhas geradas pela IA. Baixe, edite ou peça uma nova quando quiser.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { setDescricao(""); setSub("new"); }} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5">
                <Plus size={14} /> Nova campanha
              </button>
              {plataforma === "google" && (
                <button onClick={() => setSub("agente")} className="btn-ghost text-xs px-3.5 py-2 flex items-center gap-1.5" title="Briefing completo com pesquisa de palavra-chave, clusters e mais — leva mais tempo, resultado mais robusto">
                  <Bot size={14} /> Criar com agente completo
                </button>
              )}
              {plataforma === "google" && isOwner && (
                <button onClick={() => setImportarAberto(true)} className="btn-ghost text-xs px-3.5 py-2 flex items-center gap-1.5" title="Cliente já tinha campanha na conta antes de usar o Hub? Traga ela pra cá.">
                  <FolderInput size={14} /> Importar da conta
                </button>
              )}
              <AjudaBotao
                titulo={`${nomePlataforma} — como configurar a conta do cliente`}
                passos={
                  plataforma === "google"
                    ? [
                        "Peça pro cliente o \"Customer ID\" da conta de Google Ads dele — é o número de 10 dígitos que aparece no canto superior direito quando ele entra em ads.google.com.",
                        "A conta dele precisa aceitar um convite de vínculo com a nossa Conta Gerenciadora (a agência manda esse convite pelo próprio Google Ads).",
                        "Com o convite aceito, cole o Customer ID em Configurações → aba do Hub → Google Ads, e clique em \"Testar conexão\" (só o operador vê essa tela).",
                        "Depois disso já dá pra criar campanha de verdade por aqui — ela sempre nasce PAUSADA, nunca gasta dinheiro sozinha. Ativar é sempre um clique manual seu.",
                      ]
                    : [
                        "Peça pro cliente o acesso à conta de anúncios dele no Meta Business Suite (Instagram/Facebook).",
                        "Por enquanto essa parte continua manual: a IA monta o conteúdo e você mesmo sobe no Gerenciador de Anúncios da Meta.",
                        "Baixe o resumo/CSV gerado aqui e cole nos campos correspondentes lá dentro.",
                      ]
                }
              />
            </div>
          </div>

          {lista === null ? (
            <div className="flex items-center gap-2 text-xs text-muted py-8 justify-center"><Loader2 size={14} className="animate-spin" /> Carregando…</div>
          ) : lista.length === 0 ? (
            <div className="card">
              <EmptyState
                mood="curious"
                title="Nenhuma campanha ainda"
                subtitle={`Descreva o que quer vender e a IA monta a campanha de ${nomePlataforma} inteira.`}
                actionLabel="Nova campanha"
                onAction={() => { setDescricao(""); setSub("new"); }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lista.map((item) => (
                <div key={item.nome} className="campaign-row">
                  <div className="campaign-row__thumb">
                    {usaImagem && imgUrl(item) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl(item)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <IconPlataforma size={18} />
                    )}
                  </div>
                  <div className="campaign-row__main">
                    <div className="campaign-row__title">{item.campanha.titulo}</div>
                    <div className="campaign-row__sub">
                      {plataforma === "google" ? <BadgeStatus status={item.campanha.status} /> : <span className="badge-pill badge-pill--good">pronta</span>}
                      {item.campanha.palavrasChave.length} palavras-chave
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.campanha.status === "aplicada" && (
                      <button
                        className="icon-btn"
                        title="Ver desempenho (acessos, custo, cliques)"
                        onClick={() => { setSelecionada(item); setSub("metricas"); }}
                      >
                        <BarChart3 size={15} />
                      </button>
                    )}
                    <a
                      href={`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(item.nome)}/download?plataforma=${plataforma}`}
                      className="icon-btn" title="Baixar arquivo"
                    >
                      <Download size={15} />
                    </a>
                    <button className="icon-btn" title="Ver/editar" onClick={() => { setSelecionada(item); setSub("result"); }}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" title="Remover" onClick={() => apagar(item)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {sub === "new" && (
        <>
          <div>
            <h2 className="text-lg font-semibold">Nova campanha</h2>
            <p className="text-xs text-muted mt-1">O que você quer anunciar?</p>
          </div>
          {falhaGeracao && (
            <div className="card p-3.5 text-xs" style={{ borderColor: "var(--danger, #e05555)" }}>
              <p className="font-medium mb-1">A campanha não foi gerada dessa vez</p>
              <p className="text-muted whitespace-pre-wrap">{falhaGeracao}</p>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                className="choice-card"
                style={tipo === t.id ? { borderColor: "var(--ai)", background: "color-mix(in srgb, var(--ai) 10%, var(--card))" } : undefined}
                onClick={() => setTipo(t.id)}
              >
                <t.icon size={17} />
                <strong>{t.titulo}</strong>
                <span>{t.sub}</span>
              </button>
            ))}
          </div>
          <div className="describe-box">
            <textarea
              placeholder="Ex: quero vender os carros seminovos que estão parados há mais tempo no pátio…"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
            {plataforma === "google" && (
              <>
                <input
                  type="text"
                  className="input w-full px-3 py-2 text-xs mt-2"
                  placeholder="URL de destino (opcional) — a página pra onde o anúncio leva"
                  value={urlDestinoNova}
                  onChange={(e) => setUrlDestinoNova(e.target.value)}
                />
                <div className="flex gap-1.5 mt-2">
                  <select className="input px-2 py-2 text-xs" value={tipoOrcamentoNovo} onChange={(e) => setTipoOrcamentoNovo(e.target.value as "diario" | "mensal")}>
                    <option value="diario">Por dia</option>
                    <option value="mensal">Por mês</option>
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input flex-1 px-3 py-2 text-xs"
                    placeholder={`Orçamento ${tipoOrcamentoNovo === "mensal" ? "mensal" : "diário"} (opcional) — ex: 50`}
                    value={valorOrcamentoNovo}
                    onChange={(e) => setValorOrcamentoNovo(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">O Google Ads só aceita orçamento por dia — se escolher "por mês", convertemos automaticamente.</p>
              </>
            )}
            <div className="describe-box__foot">
              <span className="text-[11px] text-muted">Pode escrever como se estivesse explicando pra um amigo — a IA organiza o resto.</span>
              <button onClick={gerarCampanha} disabled={!descricao.trim()} className="btn-ai text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-50">
                <Sparkles size={14} /> Gerar campanha
              </button>
            </div>
          </div>
        </>
      )}

      {sub === "agente" && (
        <div className="flex flex-col h-[70vh]">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Bot size={18} /> Agente completo de campanha</h2>
              <p className="text-xs text-muted mt-1 max-w-lg">
                Um briefing guiado de verdade — pesquisa de palavra-chave, grupos de anúncio por tema, títulos e
                descrições bem trabalhados, palavras negativas. Responda as perguntas conforme forem chegando; no
                final, cada grupo já aparece pronto pra revisar na lista.
              </p>
            </div>
            <button onClick={() => setSub("list")} className="btn-ghost text-xs px-3 py-2">Voltar pra lista</button>
          </div>
          <div className="card flex-1 min-h-0 overflow-hidden">
            <ChatPanel
              slug={slug}
              enabled
              module="mkt-online-agente-ads-google"
              sessionScope="ads-google-agente"
              emptyHint="Me conta rapidinho o que você quer anunciar — produto, serviço, ou só 'vamos começar' que eu pergunto o resto."
              suggestions={["Vamos criar a campanha", "Quero anunciar meus serviços principais"]}
              onActivity={carregar}
            />
          </div>
        </div>
      )}

      {sub === "generating" && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está montando sua campanha</strong>
            <p className="text-xs text-muted mt-1">Isso leva só um instante — não feche esta tela.</p>
          </div>
          <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${((passoAtivo + 1) / PASSOS_GERACAO.length) * 100}%` }} /></div>
          <div className="thinking-steps">
            {PASSOS_GERACAO.map((label, i) => (
              <div key={label} className={`thinking-step ${i === passoAtivo && gerando ? "active" : i < passoAtivo ? "done" : ""}`}>
                <span className="thinking-step__mark">{i < passoAtivo && <Check size={10} />}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "result" && selecionada && (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{selecionada.campanha.titulo}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="badge-pill badge-pill--ai inline-flex"><Sparkles size={11} /> gerado pela IA</span>
                {plataforma === "google" && <BadgeStatus status={selecionada.campanha.status} />}
              </div>
            </div>
            <button onClick={() => setSub("list")} className="btn-ghost text-xs px-3 py-2">Voltar pra lista</button>
          </div>

          {plataforma === "google" && (() => {
            // Campanha nova (headlines/descriptions em pool, não par) — o Google
            // combina sozinho, então a prévia mostra só algumas combinações
            // representativas. Campanha antiga (só `anuncios`, antes dessa
            // mudança) continua mostrando cada par como sempre mostrou.
            const headlines = selecionada.campanha.headlines;
            const descriptions = selecionada.campanha.descriptions;
            const combos =
              headlines?.length && descriptions?.length
                ? headlines.slice(0, 3).map((h, i) => ({ titulo: h, descricao: descriptions[i % descriptions.length] }))
                : selecionada.campanha.anuncios;
            return (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-app">
                  <h3 className="text-sm font-medium">Como vai aparecer na busca do Google</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Prévia de algumas combinações — o Google testa e combina automaticamente qual mostrar entre todos os títulos e descrições.
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {combos.map((ad, i) => (
                    <GoogleAdPreview key={i} titulo={ad.titulo} descricao={ad.descricao} urlDestino={selecionada.campanha.urlDestino} />
                  ))}
                </div>
              </div>
            );
          })()}

          <div className={`grid gap-4 items-start ${usaImagem ? "md:grid-cols-[1fr_1.1fr]" : ""}`}>
            {usaImagem && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-app"><h3 className="text-sm font-medium">Imagem de divulgação</h3></div>
                <div className="p-4">
                  <div className="creative-frame">
                    {imgUrl(selecionada) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl(selecionada)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-white/60 px-6 text-center">Essa campanha não tem imagem gerada.</span>
                    )}
                  </div>
                  <div className="creative-edit-bar">
                    <input
                      type="text"
                      placeholder="Peça uma mudança na imagem… ex: deixa o fundo mais claro"
                      value={imgPrompt}
                      onChange={(e) => setImgPrompt(e.target.value)}
                      disabled={editando}
                    />
                    <button onClick={editarImagem} disabled={editando || !imgPrompt.trim()} className="btn-ai text-xs px-3.5 flex items-center gap-1.5 disabled:opacity-50">
                      {editando ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />} Editar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-app"><h3 className="text-sm font-medium">Detalhes da campanha</h3></div>
              <div className="p-4">
                {plataforma === "google" && (
                  <div className="field-row">
                    <span className="field-row__label">URL de destino</span>
                    <span className="field-row__value">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          className="input flex-1 px-2.5 py-1.5 text-xs"
                          placeholder="https://seusite.com.br/pagina"
                          value={urlDestino}
                          onChange={(e) => setUrlDestino(e.target.value)}
                        />
                        <button
                          onClick={salvarUrlDestino}
                          disabled={salvandoUrl || urlDestino === (selecionada.campanha.urlDestino || "")}
                          className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-50 shrink-0"
                        >
                          {salvandoUrl ? "…" : "Salvar"}
                        </button>
                      </div>
                    </span>
                  </div>
                )}
                {plataforma === "google" && (
                  <div className="field-row">
                    <span className="field-row__label">Localizações</span>
                    <span className="field-row__value">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          className="input flex-1 px-2.5 py-1.5 text-xs"
                          placeholder="ex: Santos, SP, São Vicente, SP"
                          value={localizacoes}
                          onChange={(e) => setLocalizacoes(e.target.value)}
                        />
                        <button
                          onClick={salvarLocalizacoes}
                          disabled={salvandoLoc || localizacoes === (selecionada.campanha.localizacoes || []).join(", ")}
                          className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-50 shrink-0"
                        >
                          {salvandoLoc ? "…" : "Salvar"}
                        </button>
                      </div>
                      {!selecionada.campanha.localizacoes?.length && (
                        <p className="text-[11px] text-amber-400/90 mt-1">
                          Sem localização, o anúncio roda sem segmentação geográfica — separe por vírgula (cidade, UF).
                        </p>
                      )}
                    </span>
                  </div>
                )}
                <div className="field-row"><span className="field-row__label">Público</span><span className="field-row__value">{selecionada.campanha.publico}</span></div>
                {plataforma === "google" && (
                  <div className="field-row">
                    <span className="field-row__label">Orçamento</span>
                    <span className="field-row__value">
                      <div className="flex items-center gap-1.5">
                        <select className="input px-2 py-1.5 text-xs" value={tipoOrcamento} onChange={(e) => setTipoOrcamento(e.target.value as "diario" | "mensal")}>
                          <option value="diario">Por dia</option>
                          <option value="mensal">Por mês</option>
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="input flex-1 px-2.5 py-1.5 text-xs"
                          placeholder="ex: 50"
                          value={valorOrcamento}
                          onChange={(e) => setValorOrcamento(e.target.value)}
                        />
                        <button
                          onClick={salvarOrcamento}
                          disabled={salvandoOrcamento || !Number(valorOrcamento.replace(",", "."))}
                          className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-50 shrink-0"
                        >
                          {salvandoOrcamento ? "…" : "Salvar"}
                        </button>
                      </div>
                      {tipoOrcamento === "mensal" && Number(valorOrcamento.replace(",", ".")) > 0 && (
                        <p className="text-[11px] text-muted mt-1">
                          Equivale a R$ {(Number(valorOrcamento.replace(",", ".")) / 30.4).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia — o Google Ads só aceita orçamento diário.
                        </p>
                      )}
                    </span>
                  </div>
                )}
                <div className="field-row">
                  <span className="field-row__label">Palavras-chave</span>
                  <span className="field-row__value">
                    <div className="flex flex-wrap gap-1.5">
                      {selecionada.campanha.palavrasChave.map((k) => <span key={k} className="kw-tag">{k}</span>)}
                    </div>
                  </span>
                </div>
                {plataforma === "google" && selecionada.campanha.headlines?.length ? (
                  <>
                    <div className="field-row">
                      <span className="field-row__label">Títulos ({selecionada.campanha.headlines.length})</span>
                      <span className="field-row__value">
                        <div className="flex flex-wrap gap-1.5">
                          {selecionada.campanha.headlines.map((h, i) => <span key={i} className="kw-tag">{h}</span>)}
                        </div>
                      </span>
                    </div>
                    <div className="field-row">
                      <span className="field-row__label">Descrições ({selecionada.campanha.descriptions?.length ?? 0})</span>
                      <span className="field-row__value space-y-1">
                        {selecionada.campanha.descriptions?.map((d, i) => <p key={i}>{d}</p>)}
                      </span>
                    </div>
                    {!!selecionada.campanha.callouts?.length && (
                      <div className="field-row">
                        <span className="field-row__label">Callouts</span>
                        <span className="field-row__value">
                          <div className="flex flex-wrap gap-1.5">
                            {selecionada.campanha.callouts.map((c, i) => <span key={i} className="kw-tag">{c}</span>)}
                          </div>
                        </span>
                      </div>
                    )}
                    {!!selecionada.campanha.snippetsEstruturados?.length && (
                      <div className="field-row">
                        <span className="field-row__label">Snippets</span>
                        <span className="field-row__value space-y-1">
                          {selecionada.campanha.snippetsEstruturados.map((s, i) => (
                            <p key={i}><strong>{s.cabecalho}:</strong> {s.valores.join(" · ")}</p>
                          ))}
                        </span>
                      </div>
                    )}
                    {!!selecionada.campanha.palavrasNegativas?.length && (
                      <div className="field-row">
                        <span className="field-row__label">Palavras negativas</span>
                        <span className="field-row__value">
                          <div className="flex flex-wrap gap-1.5">
                            {selecionada.campanha.palavrasNegativas.map((k, i) => <span key={i} className="kw-tag">{k}</span>)}
                          </div>
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  selecionada.campanha.anuncios.map((ad, i) => (
                    <div key={i} className="field-row">
                      <span className="field-row__label">Anúncio {i + 1}</span>
                      <span className="field-row__value">
                        <strong className="block mb-0.5">{ad.titulo}</strong>
                        {ad.descricao}
                      </span>
                    </div>
                  ))
                )}
                <a
                  href={`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(selecionada.nome)}/download?plataforma=${plataforma}`}
                  className="btn-accent text-xs px-3.5 py-2.5 w-full flex items-center justify-center gap-1.5 mt-3"
                >
                  <Download size={14} /> Baixar arquivo pronto
                </a>

                {plataforma === "google" && isOwner && (
                  <>
                    <button
                      onClick={aplicarCampanha}
                      disabled={aplicando || !selecionada.campanha.urlDestino || selecionada.campanha.status === "aplicada"}
                      className="btn-ghost text-xs px-3.5 py-2.5 w-full flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
                      title={!selecionada.campanha.urlDestino ? "Preencha a URL de destino primeiro" : undefined}
                    >
                      {aplicando ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                      {selecionada.campanha.status === "aplicada" ? "Já criada no Google Ads" : "Criar de verdade no Google Ads (pausada)"}
                    </button>
                    {msgAplicar && (
                      <p className={`text-[11px] mt-1.5 ${selecionada.campanha.status === "aplicada" ? "text-green-400" : "text-red-400"}`}>
                        {msgAplicar}
                      </p>
                    )}

                    {selecionada.campanha.status === "aplicada" && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={pausarOuAtivar}
                          disabled={pausando}
                          className="btn-ghost text-xs px-3.5 py-2.5 flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {pausando ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : selecionada.campanha.statusGoogleAds === "PAUSED" ? (
                            <Play size={14} />
                          ) : (
                            <Pause size={14} />
                          )}
                          {selecionada.campanha.statusGoogleAds === "PAUSED" ? "Ativar campanha" : "Pausar campanha"}
                        </button>
                        <button
                          onClick={() => setSub("metricas")}
                          className="btn-ghost text-xs px-3.5 py-2.5 flex-1 flex items-center justify-center gap-1.5"
                        >
                          <BarChart3 size={14} /> Ver desempenho
                        </button>
                      </div>
                    )}
                    {msgPausar && <p className="text-[11px] mt-1.5 text-muted">{msgPausar}</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-app">
              <h3 className="text-sm font-medium">{plataforma === "google" ? "Como importar no Google Ads" : "Como criar no Gerenciador de Anúncios"}</h3>
            </div>
            <div className="p-4">
              {plataforma === "google" ? (
                <ol className="steps-list md:columns-2 md:gap-8">
                  <li><strong>Abra o Google Ads Editor</strong> no computador (gratuito, baixa do site do Google).</li>
                  <li><strong>Clique em Conta → Importar</strong> e escolha o arquivo que você baixou.</li>
                  <li><strong>Confira a prévia</strong> que o próprio Editor mostra antes de publicar.</li>
                  <li><strong>A campanha sobe pausada</strong> — você decide quando ativar.</li>
                </ol>
              ) : (
                <ol className="steps-list md:columns-2 md:gap-8">
                  <li><strong>Abra o Gerenciador de Anúncios</strong> da Meta e crie uma campanha nova.</li>
                  <li><strong>Cole o público e o orçamento</strong> do arquivo que você baixou.</li>
                  <li><strong>Cole o título e o texto</strong> de cada anúncio nos campos Título/Texto principal.</li>
                  <li><strong>Suba a imagem baixada</strong> como imagem do anúncio e revise antes de publicar.</li>
                </ol>
              )}
            </div>
          </div>
        </>
      )}

      {sub === "metricas" && selecionada && (
        <>
          <button onClick={() => setSub("result")} className="btn-ghost text-xs px-2.5 py-1.5 inline-flex items-center gap-1">
            <ChevronLeft size={14} /> Voltar pra campanha
          </button>
          <CampanhaMetricas slug={slug} nome={selecionada.nome} />
        </>
      )}

      {importarAberto && (
        <ImportarCampanhasModal
          slug={slug}
          onClose={() => setImportarAberto(false)}
          onImportou={() => {
            carregar();
            onAtualizado();
          }}
        />
      )}
    </div>
  );
}

interface CampanhaGoogleAdsExistente {
  id: string;
  nome: string;
  status: string;
  orcamentoDiario?: number;
}

/** Lista campanhas que já existem na conta real do Google Ads e ainda não
 * viraram campanha.json local — pra cliente que já anunciava antes de usar
 * o Hub. Importar traz o conteúdo real (títulos, palavras-chave, orçamento,
 * localização) do PRIMEIRO grupo de anúncio ativo dela pra dentro do Hub,
 * editável/pausável/removível dali em diante. */
function ImportarCampanhasModal({ slug, onClose, onImportou }: { slug: string; onClose: () => void; onImportou: () => void }) {
  const [lista, setLista] = useState<CampanhaGoogleAdsExistente[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [importando, setImportando] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/importar-google`);
      const data = await res.json();
      if (!res.ok) setErroLista(data.error || "não foi possível listar as campanhas da conta.");
      else setLista(data.campanhas || []);
    })();
  }, [slug]);

  async function importar(id: string) {
    setImportando(id);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/importar-google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleCampaignId: id }),
    });
    const data = await res.json();
    setResultados((r) => ({ ...r, [id]: data.mensagem || data.error || (data.ok ? "Importada." : "Falha.") }));
    setImportando(null);
    if (data.ok) onImportou();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="card w-full max-w-xl max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold flex items-center gap-2"><FolderInput size={16} /> Importar campanhas da conta</h3>
          <button onClick={onClose} className="btn-ghost h-8 w-8 !p-0 flex items-center justify-center rounded-full"><X size={15} /></button>
        </div>
        <p className="text-xs text-muted mb-4">
          Campanhas de Rede de Pesquisa que já existem na conta de Google Ads e ainda não estão aqui no Hub. Importa o
          primeiro grupo de anúncio ativo de cada uma (títulos, palavras-chave, orçamento, localização) — se a campanha
          tiver mais de um grupo, só o primeiro entra; os outros continuam existindo normalmente na conta.
        </p>

        {!lista && !erroLista && <div className="flex items-center gap-2 text-xs text-muted py-8 justify-center"><Loader2 size={14} className="animate-spin" /> Buscando na conta…</div>}
        {erroLista && <p className="text-xs text-red-400 py-4">{erroLista}</p>}
        {lista && lista.length === 0 && <p className="text-sm text-muted text-center py-8">Nenhuma campanha nova pra importar — tudo que existe na conta já está aqui.</p>}

        {lista && lista.length > 0 && (
          <div className="space-y-2">
            {lista.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 border border-app rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-[11px] text-muted">
                    {c.status === "ENABLED" ? "ativa" : c.status === "PAUSED" ? "pausada" : c.status.toLowerCase()}
                    {c.orcamentoDiario ? ` · R$ ${c.orcamentoDiario.toLocaleString("pt-BR")}/dia` : ""}
                  </p>
                  {resultados[c.id] && <p className="text-[11px] text-accent mt-0.5">{resultados[c.id]}</p>}
                </div>
                <button
                  onClick={() => importar(c.id)}
                  disabled={importando === c.id || !!resultados[c.id]}
                  className="btn-ghost text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
                >
                  {importando === c.id ? <Loader2 size={13} className="animate-spin" /> : resultados[c.id] ? "Importada" : "Importar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
