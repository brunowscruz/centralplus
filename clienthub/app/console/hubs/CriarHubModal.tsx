"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

interface ModuleOption {
  id: string;
  label: string;
}

const STEPS = ["Identidade", "Visual", "Módulos", "Domínio", "Revisão"];
const TIPOGRAFIAS = ["Moderna (padrão)", "Clássica serifada", "Editorial", "Técnica/mono"];

function slugify(nome: string): string {
  return nome
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CriarHubModal({ modules }: { modules: ModuleOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [tema, setTema] = useState<"claro" | "escuro">("claro");
  const [corDestaque, setCorDestaque] = useState("#2456a8");
  const [tipografia, setTipografia] = useState(TIPOGRAFIAS[0]);
  const [modulosPadrao, setModulosPadrao] = useState<string[]>(
    modules.filter((m) => ["site", "instagram", "financeiro"].includes(m.id)).map((m) => m.id),
  );
  const [dominio, setDominio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"visao-geral" | "meu-site" | "instagram">("visao-geral");

  const slug = slugify(nome);

  function toggleModulo(id: string) {
    setModulosPadrao((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function reset() {
    setStep(0);
    setNome("");
    setTema("claro");
    setCorDestaque("#2456a8");
    setTipografia(TIPOGRAFIAS[0]);
    setModulosPadrao(modules.filter((m) => ["site", "instagram", "financeiro"].includes(m.id)).map((m) => m.id));
    setDominio("");
    setError(null);
  }

  async function criar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          modulos_padrao: modulosPadrao,
          crm_preset: modulosPadrao.includes("crm") ? "geral" : null,
          dominio,
          tema,
          cor_destaque: corDestaque,
          tipografia,
          login_texto: "Acesso ao Hub",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao criar o hub.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  const podeAvancar = step > 0 || nome.trim().length > 0;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-accent px-4 py-2 text-sm whitespace-nowrap inline-flex items-center gap-1.5">
        <Plus size={15} /> Criar Hub
      </button>
    );
  }

  const bg = tema === "escuro" ? "#0b0b0d" : "#f5f5f7";
  const cardBg = tema === "escuro" ? "#1a1a1d" : "#ffffff";
  const text = tema === "escuro" ? "#ededed" : "#111111";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold">Criar novo hub</h2>
            <p className="text-xs text-muted mt-0.5">
              Uma marca completa: identidade, tema, módulos e domínio — sem tocar em código.
            </p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="text-muted hover:text-app"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <ol className="flex flex-wrap gap-2 my-5">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                i === step
                  ? "border-transparent bg-accent text-black font-semibold"
                  : i < step
                    ? "border-app text-accent"
                    : "border-app text-muted"
              }`}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        <div className="grid md:grid-cols-[1.1fr_1fr] gap-6">
          <div>
            {step === 0 && (
              <section className="space-y-4">
                <Field label="Nome do hub *" hint="Nome, slug e login — não muda depois de criado.">
                  <input
                    className="input w-full px-3 py-2 text-sm"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="OdontoHub"
                    autoFocus
                  />
                </Field>
                <Field label="Slug">
                  <input className="input w-full px-3 py-2 text-sm font-mono" value={slug} readOnly />
                </Field>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-4">
                <Field label="Tema, cores e tipografia">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTema("claro")}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border ${tema === "claro" ? "border-accent text-accent" : "border-app text-muted"}`}
                    >
                      Tema Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTema("escuro")}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border ${tema === "escuro" ? "border-accent text-accent" : "border-app text-muted"}`}
                    >
                      Tema Escuro
                    </button>
                  </div>
                </Field>
                <Field label="Cor de destaque">
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="h-9 w-10 rounded-lg border border-app bg-transparent cursor-pointer"
                      value={corDestaque}
                      onChange={(e) => setCorDestaque(e.target.value)}
                    />
                    <input
                      className="input w-full px-3 py-2 text-sm font-mono"
                      value={corDestaque}
                      onChange={(e) => setCorDestaque(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Tipografia">
                  <select
                    className="input w-full px-3 py-2 text-sm"
                    value={tipografia}
                    onChange={(e) => setTipografia(e.target.value)}
                  >
                    {TIPOGRAFIAS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-3">
                <p className="text-xs text-muted">
                  Módulos que já vêm ligados por padrão pra todo cliente novo criado nesse hub —
                  dá pra ajustar por cliente depois.
                </p>
                {modules.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-app cursor-pointer hover:bg-app"
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)]"
                      checked={modulosPadrao.includes(m.id)}
                      onChange={() => toggleModulo(m.id)}
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </section>
            )}

            {step === 3 && (
              <section className="space-y-4">
                <Field label="Domínio" hint="Endereço do hub. Pode configurar depois — sem domínio ele fica acessível só via localhost/console.">
                  <input
                    className="input w-full px-3 py-2 text-sm font-mono"
                    value={dominio}
                    onChange={(e) => setDominio(e.target.value)}
                    placeholder={`${slug || "seuhub"}.seudominio.com.br`}
                  />
                </Field>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-1 text-sm">
                <p className="text-xs text-muted mb-2">Confira tudo — depois de criado, só o slug não muda.</p>
                <Row label="Nome" value={nome || "—"} />
                <Row label="Slug" value={slug || "—"} />
                <Row label="Versão" value="1.0.0" />
                <Row label="Domínio" value={dominio || "Configurar depois"} />
                <Row label="Tema" value={tema === "claro" ? "Claro" : "Escuro"} />
                <Row label="Destaque" value={corDestaque} />
                <Row label="Tipografia" value={tipografia} />
                <Row
                  label="Módulos default"
                  value={
                    modules
                      .filter((m) => modulosPadrao.includes(m.id))
                      .map((m) => m.label)
                      .join(", ") || "nenhum"
                  }
                />
                <Row label="Login" value="Acesso ao Hub" />
                <p className="text-[11px] text-muted mt-3 pt-3 border-t border-app">
                  Depois de criado: cadastre clientes escolhendo este hub na seção Plataforma do
                  cadastro — o workspace deles já nasce com essa marca, tema e módulos.
                </p>
              </section>
            )}
          </div>

          {/* prévia ao vivo */}
          <div>
            <p className="text-[11px] text-muted mb-2 uppercase tracking-wide">Prévia ao vivo</p>
            <div className="rounded-xl border border-app overflow-hidden" style={{ background: bg }}>
              <div className="flex gap-1 px-3 py-2 border-b" style={{ borderColor: tema === "escuro" ? "#2a2a2e" : "#e5e5e5" }}>
                {(["visao-geral", "meu-site", "instagram"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPreviewTab(t)}
                    className="text-[11px] px-2 py-1 rounded-full"
                    style={{
                      background: previewTab === t ? corDestaque : "transparent",
                      color: previewTab === t ? "#111" : text,
                      opacity: previewTab === t ? 1 : 0.6,
                    }}
                  >
                    {t === "visao-geral" ? "Visão Geral" : t === "meu-site" ? "Meu Site" : "Instagram"}
                  </button>
                ))}
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold" style={{ color: text }}>
                  Bem-vindo ao {nome || "seu hub"}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: text, opacity: 0.6 }}>
                  Tudo do seu negócio digital em um só lugar.
                </p>
                {previewTab === "instagram" && (
                  <div className="mt-3 rounded-lg p-3" style={{ background: cardBg }}>
                    <p className="text-[11px]" style={{ color: text, opacity: 0.7 }}>
                      Instagram
                    </p>
                    <p className="text-sm font-medium mt-1" style={{ color: text }}>
                      +128 seguidores
                    </p>
                    <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: tema === "escuro" ? "#2a2a2e" : "#e5e5e5" }}>
                      <div className="h-full" style={{ width: "62%", background: corDestaque }} />
                    </div>
                    <span
                      className="inline-block mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: corDestaque, color: "#111" }}
                    >
                      Gerar conteúdo
                    </span>
                  </div>
                )}
                {previewTab !== "instagram" && (
                  <div className="mt-3 rounded-lg p-3" style={{ background: cardBg }}>
                    <p className="text-[11px]" style={{ color: text, opacity: 0.6 }}>
                      Amostra fiel: menu superior, cards e botões seguem o tema escolhido — o
                      login e o app interno seguem a mesma identidade.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-app">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Voltar
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!podeAvancar}
              className="btn-accent px-5 py-2 text-sm disabled:opacity-40"
            >
              Avançar →
            </button>
          ) : (
            <button
              type="button"
              onClick={criar}
              disabled={loading || !nome.trim()}
              className="btn-accent px-5 py-2 text-sm disabled:opacity-60"
            >
              {loading ? "Criando…" : "✓ Criar hub"}
            </button>
          )}
        </div>
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-app last:border-0">
      <span className="text-muted text-xs uppercase tracking-wide">{label}</span>
      <span className="text-app">{value}</span>
    </div>
  );
}
