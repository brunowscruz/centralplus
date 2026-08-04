"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, Palette, Camera, Globe2, Bot, Package, Sparkles, FileCode2 } from "lucide-react";
import type { TenantSummary, MetaInstagramSummary, OpenAISummary, WordPressSummary, GoogleAdsSummary, ModuleOption, ContaClaudeOption } from "./types";
import ModuleToggles from "./ModuleToggles";
import { useConfirm } from "@/components/ConfirmProvider";

const MODELOS = ["haiku", "sonnet", "opus"] as const;

function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export default function HubConfigTab({
  slug,
  tenant,
  metaInstagram,
  openai,
  wordpress,
  googleAds,
  moduleOptions,
  contasClaude,
}: {
  slug: string;
  tenant: TenantSummary;
  metaInstagram: MetaInstagramSummary | null;
  openai: OpenAISummary | null;
  wordpress: WordPressSummary | null;
  googleAds: GoogleAdsSummary | null;
  moduleOptions: ModuleOption[];
  contasClaude: ContaClaudeOption[];
}) {
  const checks = [
    !!tenant.acessoLogin,
    !!tenant.corPrincipal,
    !!tenant.nomeComercial,
    !!metaInstagram?.tokenMasked,
    tenant.claude?.habilitado === true,
    moduleOptions.some((m) => m.enabled),
    tenant.temSite,
  ];
  const done = checks.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted">Progresso da configuração</span>
          <span className="text-muted">{done}/{checks.length} configurado</span>
        </div>
        <div className="h-1.5 rounded-full bg-app overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(done / checks.length) * 100}%` }}
          />
        </div>
      </div>

      <AcessoSection slug={slug} login={tenant.acessoLogin} />
      <IdentidadeSection slug={slug} corAtual={tenant.corPrincipal} />
      <InstagramSection slug={slug} atual={metaInstagram} />
      <OpenAISection slug={slug} atual={openai} />
      <ClaudeSection slug={slug} claude={tenant.claude} contas={contasClaude} />
      <WordPressSection slug={slug} atual={wordpress} />
      <GoogleAdsSection slug={slug} atual={googleAds} />
      <ModulosSection slug={slug} options={moduleOptions} />
      <SitesSection temSite={tenant.temSite} />
    </div>
  );
}

// ---- shell de seção (accordion) ------------------------------------------

function Section({
  icon: Icon,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-app"
      >
        <span className="icon-badge h-9 w-9 shrink-0">
          <Icon size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium block">{title}</span>
          <span className="text-xs text-muted block">{description}</span>
        </span>
        <ChevronDown size={16} className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-app pt-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Guia numerado (padrão da referência): lista de passos com o número em bolinha. */
function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="rounded-xl border border-app p-3 space-y-2 mb-4">
      {items.map((item, i) => (
        <p key={i} className="text-[11px] text-muted flex gap-2">
          <span className="h-4 w-4 rounded-full bg-app border border-app grid place-items-center text-[9px] text-app shrink-0 mt-px">
            {i + 1}
          </span>
          <span>{item}</span>
        </p>
      ))}
    </div>
  );
}

// ---- Acesso do cliente -----------------------------------------------------

function AcessoSection({ slug, login }: { slug: string; login?: string }) {
  const [novaSenha, setNovaSenha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function gerarSenha() {
    setBusy(true);
    const senha = generatePassword();
    const res = await fetch(`/api/tenants/${slug}/credenciais`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    setBusy(false);
    if (res.ok) setNovaSenha(senha);
  }

  return (
    <Section icon={KeyRound} title="Acesso do cliente" description="Login e senha do cliente no hub." defaultOpen>
      <Steps
        items={[
          <>O cliente entra no hub com o <strong className="text-app">e-mail de login</strong> abaixo (criado no cadastro).</>,
          <>Pra trocar a senha, clique em <strong className="text-app">Gerar nova senha</strong> — anote e envie ao cliente por um canal seguro.</>,
        ]}
      />
      <Field label="E-mail de login do cliente">
        <input className="input w-full px-3 py-2 text-sm font-mono" value={login || ""} readOnly />
      </Field>
      <button onClick={gerarSenha} disabled={busy} className="btn-ghost px-4 py-2 text-xs mt-3 disabled:opacity-60">
        {busy ? "Gerando…" : "🔑 Gerar nova senha"}
      </button>
      {novaSenha && (
        <p className="text-xs mt-2 font-mono bg-app border border-app rounded-lg px-3 py-2">
          Nova senha: <strong className="text-accent">{novaSenha}</strong> — anote agora, não aparece de novo.
        </p>
      )}
    </Section>
  );
}

// ---- Identidade visual ------------------------------------------------------

function IdentidadeSection({ slug, corAtual }: { slug: string; corAtual?: string }) {
  const router = useRouter();
  const [cor, setCor] = useState(corAtual || "#E0A94A");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/identidade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corPrincipal: cor, logoDataUrl: logoDataUrl || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Salvo.");
      router.refresh();
    }
  }

  return (
    <Section icon={Palette} title="Identidade visual" description="Logo e cor da marca do cliente.">
      <p className="text-[11px] text-muted mb-3">
        A cor da marca personaliza os destaques do painel dele. A logo aparece na barra lateral.
        PNG/SVG quadrado, fundo transparente.
      </p>
      <label className="input flex items-center gap-2 px-3 py-2 text-xs cursor-pointer w-fit">
        📤 Enviar logo
        <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
      </label>
      <div className="mt-3 max-w-xs">
        <Field label="Cor principal">
          <div className="flex gap-2 items-center">
            <input type="color" className="h-9 w-10 rounded-lg border border-app bg-transparent cursor-pointer" value={cor} onChange={(e) => setCor(e.target.value)} />
            <input className="input w-full px-3 py-2 text-sm font-mono" value={cor} onChange={(e) => setCor(e.target.value)} />
          </div>
        </Field>
      </div>
      <button onClick={salvar} disabled={saving} className="btn-ghost px-4 py-2 text-xs mt-3 disabled:opacity-60">
        {saving ? "Salvando…" : "Salvar cor"}
      </button>
      {msg && <span className="text-xs text-green-400 ml-2">{msg}</span>}
    </Section>
  );
}

// ---- Instagram (API) ---------------------------------------------------------

function InstagramSection({ slug, atual }: { slug: string; atual: MetaInstagramSummary | null }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [igUserId, setIgUserId] = useState(atual?.igUserId || "");
  const [saving, setSaving] = useState(false);
  const [renovando, setRenovando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageAccessToken: token, igUserId }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Token salvo.");
      setToken("");
      router.refresh();
    }
  }

  async function renovarAgora() {
    setRenovando(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations`, { method: "POST" });
    setRenovando(false);
    if (res.ok) {
      setMsg("Token renovado — novos 60 dias.");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setMsg(body?.error || "Não foi possível renovar agora.");
    }
  }

  const dias = diasParaExpirar(atual?.obtidoEm);
  const autoOk = !!atual?.renovacaoAutomatica;

  return (
    <Section icon={Camera} title="Instagram (API)" description="Token pra puxar perfil, posts e métricas.">
      <div className="text-[11px] text-muted space-y-2 mb-3">
        <p className="font-semibold text-app">
          Parte 0 — criar o App da agência (uma vez só, pra sempre, vale pra TODOS os clientes):
        </p>
        <p>
          A. Crie um App em developers.facebook.com (tipo Empresa) — <strong className="text-app">um único App</strong>,
          nunca o app padrão do Graph API Explorer. Esse App é da agência, não do cliente.
        </p>
        <p>
          B. Em Configurações básicas do App, copie o <strong className="text-app">App ID</strong> e o{" "}
          <strong className="text-app">App Secret</strong> e coloque em <code className="text-app">META_APP_ID</code> /{" "}
          <code className="text-app">META_APP_SECRET</code> no <code className="text-app">.env.local</code> desta
          instalação. A partir daqui, o token de <strong className="text-app">qualquer</strong> cliente que você
          conectar abaixo se renova sozinho antes de vencer — não repete essa parte de novo, nem pra clientes
          futuros.
        </p>
        <p className="font-semibold text-app pt-1">
          Parte 1 — preparar a conta do cliente (repete pra CADA cliente novo):
        </p>
        <p>1. No Instagram do cliente: Configurações → Conta e ferramentas → Mudar para conta profissional (Empresa ou Criador).</p>
        <p>2. Vincule a conta a uma Página do Facebook (Configurações → Central de Contas / Contas vinculadas).</p>
        <p>3. Peça ao cliente acesso à Página no Business Suite (ou adicione seu portfólio como parceiro).</p>
        <p className="font-semibold text-app pt-1">
          Parte 2 — gerar o token deste cliente (repete pra CADA cliente novo, usando o MESMO App da Parte 0):
        </p>
        <p>4. Abra o Graph API Explorer, escolha o App da agência (o mesmo de sempre) e a Página deste cliente.</p>
        <p>
          5. Marque as permissões <code className="text-app">instagram_basic</code>,{" "}
          <code className="text-app">instagram_manage_insights</code>,{" "}
          <code className="text-app">pages_show_list</code>, <code className="text-app">pages_read_engagement</code> →
          Generate Access Token.
        </p>
        <p>6. Cole o token abaixo (curta duração está ok — ao salvar, o sistema já troca pelo de longa duração sozinho).</p>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`badge-pill ${autoOk ? "badge-pill--good" : "badge-pill--warn"}`}>
          {autoOk ? "Renovação automática ligada" : "Renovação automática desligada"}
        </span>
        {!autoOk && (
          <span className="text-[11px] text-muted">configure META_APP_ID/META_APP_SECRET pra ligar (Parte 0, item B acima)</span>
        )}
      </div>

      {atual?.tokenMasked && (
        <div className="text-xs text-muted mb-2 space-y-0.5">
          <p>
            Token atual: <span className="font-mono">{atual.tokenMasked}</span>
          </p>
          {dias !== null && (
            <p className={dias <= 10 ? "text-red-400" : dias <= 20 ? "text-amber-400" : ""}>
              {dias > 0 ? `Expira em ~${dias} dia${dias === 1 ? "" : "s"}.` : "Provavelmente já expirado — gere um novo."}
            </p>
          )}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="ID do usuário Instagram (IG User ID)">
          <input className="input w-full px-3 py-2 text-sm font-mono" value={igUserId} onChange={(e) => setIgUserId(e.target.value)} />
        </Field>
        <Field label="Token de acesso do Instagram">
          <input
            className="input w-full px-3 py-2 text-sm font-mono"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAAG…"
            type="password"
          />
        </Field>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={salvar} disabled={saving || !token} className="btn-ghost px-4 py-2 text-xs disabled:opacity-60">
          {saving ? "Salvando…" : "💾 Salvar token"}
        </button>
        {autoOk && atual?.tokenMasked && (
          <button onClick={renovarAgora} disabled={renovando} className="btn-ghost px-4 py-2 text-xs disabled:opacity-60">
            {renovando ? "Renovando…" : "🔄 Renovar agora"}
          </button>
        )}
        {msg && <span className="text-xs text-green-400">{msg}</span>}
      </div>
    </Section>
  );
}

function diasParaExpirar(obtidoEm?: string): number | null {
  if (!obtidoEm) return null;
  const obtido = new Date(obtidoEm).getTime();
  if (Number.isNaN(obtido)) return null;
  const diasDesde = (Date.now() - obtido) / (1000 * 60 * 60 * 24);
  return Math.round(60 - diasDesde);
}

// ---- OpenAI (geração de imagem) ----------------------------------------------

function OpenAISection({ slug, atual }: { slug: string; atual: OpenAISummary | null }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const confirmar = useConfirm();

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "openai", openai: { apiKey: key } }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Chave salva.");
      setKey("");
      router.refresh();
    } else {
      setMsg("Não foi possível salvar.");
    }
  }

  async function remover() {
    const ok = await confirmar({
      title: "Remover a chave própria deste cliente?",
      message: "Ele volta a usar a chave compartilhada da instalação.",
      variant: "danger",
      confirmText: "Remover",
    });
    if (!ok) return;
    await fetch(`/api/tenants/${slug}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "openai", openai: { apiKey: "" } }),
    });
    router.refresh();
  }

  return (
    <Section icon={Sparkles} title="OpenAI (geração de imagem)" description="Chave usada pelo chat pra gerar imagens reais (hero, seções, fotos) via scripts/gerar-imagem.js.">
      <p className="text-xs text-muted mb-3">
        Opcional — sem uma chave própria aqui, esse cliente já usa a chave compartilhada da
        instalação normalmente. Só configure uma própria se ele tiver conta OpenAI dele (fica
        gravada isolada, nunca dentro da pasta do workspace).
      </p>
      {atual?.apiKeyMasked && (
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-muted">
            Chave própria configurada: <span className="font-mono">{atual.apiKeyMasked}</span>
          </p>
          <button onClick={remover} className="text-[11px] text-red-400 hover:underline">remover</button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="input flex-1 px-3 py-2 text-sm font-mono"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-..."
          type="password"
        />
        <button onClick={salvar} disabled={saving || !key} className="btn-ghost px-4 py-2 text-xs disabled:opacity-60">
          {saving ? "Salvando…" : "💾 Salvar"}
        </button>
      </div>
      {msg && <p className="text-xs text-green-400 mt-2">{msg}</p>}
    </Section>
  );
}

// ---- WordPress (publicação de páginas locais do SEO Local) --------------

function WordPressSection({ slug, atual }: { slug: string; atual: WordPressSummary | null }) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(atual?.baseUrl || "");
  const [usuario, setUsuario] = useState(atual?.usuario || "");
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "wordpress",
        wordpress: { baseUrl, usuario, applicationPassword: senha || undefined },
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Configuração salva.");
      setSenha("");
      router.refresh();
    } else {
      setMsg("Não foi possível salvar.");
    }
  }

  return (
    <Section icon={FileCode2} title="WordPress" description="Pra publicar as páginas locais do SEO Local direto no site do cliente.">
      <p className="text-xs text-muted mb-3">
        Usa Application Password do WordPress (Usuário → Seu Perfil → Senhas de Aplicativo, a partir da
        versão 5.6) — não precisa de plugin nem de acesso ao FTP. Cada página é criada como{" "}
        <strong>rascunho</strong> lá no WordPress; o cliente revisa e publica por lá quando quiser.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="URL do site"><input className="input w-full px-3 py-2 text-sm font-mono" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://sitedocliente.com.br" /></Field>
        <Field label="Usuário"><input className="input w-full px-3 py-2 text-sm" value={usuario} onChange={(e) => setUsuario(e.target.value)} /></Field>
        <Field label={atual?.temSenha ? "Application Password (deixe em branco pra manter)" : "Application Password"}>
          <input className="input w-full px-3 py-2 text-sm font-mono" value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" />
        </Field>
      </div>
      <button onClick={salvar} disabled={saving} className="btn-ghost px-4 py-2 text-xs disabled:opacity-60">
        {saving ? "Salvando…" : "💾 Salvar"}
      </button>
      {msg && <span className="text-xs text-green-400 ml-2">{msg}</span>}
    </Section>
  );
}

// ---- Google Ads (aplicação real de campanha, MKT Online) ------------------

function GoogleAdsSection({ slug, atual }: { slug: string; atual: GoogleAdsSummary | null }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(atual?.customerId || "");
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true);

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "google-ads", googleAds: { customerId } }),
    });
    setSaving(false);
    setMsgOk(res.ok);
    setMsg(res.ok ? "Configuração salva." : "Não foi possível salvar — confira o Customer ID.");
    if (res.ok) router.refresh();
  }

  async function testar() {
    setTestando(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations/google-ads/testar`, { method: "POST" });
    const data = await res.json();
    setMsgOk(res.ok && data.ok);
    setMsg(data.mensagem || (res.ok ? "Conexão confirmada." : "Falha ao testar."));
    setTestando(false);
  }

  return (
    <Section icon={Sparkles} title="Google Ads" description="Pra criar campanhas de verdade (pausadas) direto na conta do cliente via API.">
      {!atual?.instalado && (
        <p className="text-xs text-amber-400/90 mb-3">
          As credenciais globais desta instalação (Developer Token, OAuth, refresh token da Manager
          Account) ainda não estão configuradas no <code className="text-app">.env.local</code> — nenhum
          cliente consegue aplicar campanha de verdade até isso ser resolvido. Ver{" "}
          <code className="text-app">docs/GOOGLE-ADS-API.md</code>.
        </p>
      )}
      <p className="text-xs text-muted mb-3">
        A conta de Google Ads deste cliente precisa estar vinculada (convite aceito) à Manager Account da
        agência antes de funcionar — cole aqui só o número da conta (Customer ID), sem hífen.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Customer ID">
          <input
            className="input w-full px-3 py-2 text-sm font-mono"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="1234567890"
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={salvar} disabled={saving} className="btn-ghost px-4 py-2 text-xs disabled:opacity-60">
          {saving ? "Salvando…" : "💾 Salvar"}
        </button>
        <button
          onClick={testar}
          disabled={testando || !atual?.instalado || !atual?.customerId}
          className="btn-ghost px-4 py-2 text-xs disabled:opacity-60"
        >
          {testando ? "Testando…" : "Testar conexão"}
        </button>
      </div>
      {msg && <p className={`text-xs mt-2 ${msgOk ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
    </Section>
  );
}

// ---- Sites & métricas -----------------------------------------------------------

function SitesSection({ temSite }: { temSite: boolean }) {
  return (
    <Section icon={Globe2} title="Sites & métricas" description="Adicione sites e configure as métricas de cada um.">
      <p className="text-xs text-muted">
        {temSite
          ? "Site publicado — métricas reais por visita (sem depender do Google) ainda não estão nesta instalação."
          : "Nenhum site publicado ainda. Peça no módulo Meu Site pra gerar o primeiro rascunho."}
      </p>
      <div className="text-[11px] text-muted space-y-1 mt-3">
        <p>1. Use “Adicionar site” pra criar quantos sites o cliente tiver — cada um vira uma aba em Meus Sites.</p>
        <p>2. Preencha o nome e a URL do site e salve.</p>
        <p>3. Clique em “Gerar acompanhamento” e copie a tag que aparece.</p>
        <p>4. Cole a tag no <code className="text-app">&lt;head&gt;</code> do site do cliente e publique.</p>
      </div>
    </Section>
  );
}

// ---- Inteligência (Claude) ---------------------------------------------------

function ClaudeSection({
  slug,
  claude,
  contas,
}: {
  slug: string;
  claude: TenantSummary["claude"];
  contas: ContaClaudeOption[];
}) {
  const router = useRouter();
  const [habilitado, setHabilitado] = useState(claude?.habilitado ?? true);
  const [contaId, setContaId] = useState(claude?.contaId || "");
  const [modelosLiberados, setModelosLiberados] = useState<string[]>(claude?.modelosLiberados || ["haiku", "sonnet"]);
  const [modeloChat, setModeloChat] = useState(claude?.modeloChat || "sonnet");
  const [modeloGerador, setModeloGerador] = useState(claude?.modeloGerador || "sonnet");
  const [limite, setLimite] = useState(claude?.limiteTokens ?? 0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggleModelo(m: string) {
    setModelosLiberados((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/claude`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habilitado, contaId: contaId || undefined, modelosLiberados, modeloChat, modeloGerador, limiteTokens: limite }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Salvo.");
      router.refresh();
    }
  }

  return (
    <Section icon={Bot} title="Inteligência (Claude)" description="Chat + gerador de conteúdo.">
      <Steps
        items={[
          <><strong className="text-app">Ative</strong> pra liberar o chat e o gerador de conteúdo.</>,
          <>Escolha a <strong className="text-app">conta Claude</strong> (cada cliente usa a própria assinatura — conecte em <em>Contas Claude</em>, no console do owner).</>,
          <>Marque os <strong className="text-app">modelos liberados</strong> (Opus é caro) e defina o modelo do chat e do gerador.</>,
          <>Defina um <strong className="text-app">limite de tokens</strong> (0 = ilimitado). Acompanhe o consumo na aba Tokens.</>,
        ]}
      />

      <label className="flex items-center gap-2 text-sm cursor-pointer mb-4">
        <input type="checkbox" className="accent-[var(--accent)]" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} />
        IA habilitada para este cliente
      </label>

      <Field label="Conta Claude vinculada">
        <select className="input w-full px-3 py-2 text-sm" value={contaId} onChange={(e) => setContaId(e.target.value)}>
          <option value="">Conta padrão (API)</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} {c.compartilhada ? "· compartilhada" : ""}
            </option>
          ))}
        </select>
      </Field>

      <div className="mt-3">
        <p className="text-xs font-medium mb-2">Modelos liberados</p>
        <div className="flex gap-2">
          {MODELOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleModelo(m)}
              className={`text-xs px-3 py-1.5 rounded-lg border capitalize ${
                modelosLiberados.includes(m) ? "border-accent text-accent" : "border-app text-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <Field label="Modelo do chat">
          <select className="input w-full px-3 py-2 text-sm capitalize" value={modeloChat} onChange={(e) => setModeloChat(e.target.value)}>
            {MODELOS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Modelo do gerador">
          <select className="input w-full px-3 py-2 text-sm capitalize" value={modeloGerador} onChange={(e) => setModeloGerador(e.target.value)}>
            {MODELOS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Limite de tokens (0 = ilimitado)">
          <input
            type="number"
            min={0}
            className="input w-full px-3 py-2 text-sm"
            value={limite}
            onChange={(e) => setLimite(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <div className="flex gap-1.5 mt-2">
          {[
            ["1M", 1_000_000],
            ["5M", 5_000_000],
            ["10M", 10_000_000],
            ["Ilimitado", 0],
          ].map(([label, v]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => setLimite(v as number)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-app text-muted hover:text-app"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={salvar} disabled={saving} className="btn-accent px-4 py-2 text-xs mt-4 disabled:opacity-60">
        {saving ? "Salvando…" : "Salvar"}
      </button>
      {msg && <span className="text-xs text-green-400 ml-2">{msg}</span>}
    </Section>
  );
}

// ---- Módulos do Hub -----------------------------------------------------------

function ModulosSection({ slug, options }: { slug: string; options: ModuleOption[] }) {
  return (
    <Section icon={Package} title="Módulos do Hub" description="Ligue/desligue as abas que o cliente vê.">
      <ModuleToggles slug={slug} options={options} />
    </Section>
  );
}
