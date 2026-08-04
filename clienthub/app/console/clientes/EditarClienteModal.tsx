"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Tenant, TenantStatus } from "@/lib/tenants";
import TemaPicker, { type TemaId } from "@/components/console/TemaPicker";

interface HubOption {
  id: string;
  nome: string;
}
interface ModuleOption {
  id: string;
  label: string;
  description: string;
}
interface AccountOption {
  id: string;
  nome: string;
  compartilhada: boolean;
}

const MODELOS = ["haiku", "sonnet", "opus"] as const;
const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: "em_configuracao", label: "Em configuração" },
  { value: "ativo", label: "Ativo" },
  { value: "experimental", label: "Experimental" },
  { value: "arquivado", label: "Arquivado" },
];

/**
 * "Editar cliente" (painel admin — Console → Clientes): ajusta os dados,
 * módulos e integrações do cliente num único formulário. Espelha o
 * "Cadastrar novo cliente", mas pré-preenchido e num PATCH só
 * (/api/tenants/[slug]/info).
 */
export default function EditarClienteModal({
  tenant,
  hubs,
  modules,
  accounts,
  onClose,
}: {
  tenant: Tenant;
  hubs: HubOption[];
  modules: ModuleOption[];
  accounts: AccountOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(tenant.nome);
  const [nomeComercial, setNomeComercial] = useState(tenant.nomeComercial || "");
  const [tipo, setTipo] = useState(tenant.tipo || "");
  const [hub, setHub] = useState(tenant.hub || "");
  const [tema, setTema] = useState<TemaId>(tenant.tema || "preto");
  const [corPrincipal, setCorPrincipal] = useState(tenant.corPrincipal || "#E0A94A");
  const [modulosAtivos, setModulosAtivos] = useState<string[]>(tenant.modulos_ativos);
  const [status, setStatus] = useState<TenantStatus>((tenant.status as TenantStatus) || "em_configuracao");
  const [healthScore, setHealthScore] = useState(tenant.healthScore ?? 100);
  const [observacoes, setObservacoes] = useState(tenant.observacoes_internas || "");

  const [respNome, setRespNome] = useState(tenant.responsavel?.nome || "");
  const [respCargo, setRespCargo] = useState(tenant.responsavel?.cargo || "");
  const [respEmail, setRespEmail] = useState(tenant.responsavel?.email || "");
  const [respWhatsapp, setRespWhatsapp] = useState(tenant.responsavel?.whatsapp || "");
  const [dominio, setDominio] = useState(tenant.presencaDigital?.dominio || "");
  const [site, setSite] = useState(tenant.presencaDigital?.site || "");
  const [instagram, setInstagram] = useState(tenant.presencaDigital?.instagram || "");
  const [whatsappComercial, setWhatsappComercial] = useState(tenant.presencaDigital?.whatsapp || "");

  const c = tenant.claude;
  const [claudeHabilitado, setClaudeHabilitado] = useState(c?.habilitado ?? true);
  const [contaId, setContaId] = useState(c?.contaId || "");
  const [importar, setImportar] = useState(c?.importarArquivos ?? false);
  const [exportar, setExportar] = useState(c?.exportarArquivos ?? false);
  const [internet, setInternet] = useState(c?.acessoInternet ?? false);
  const [modelosLiberados, setModelosLiberados] = useState<string[]>(c?.modelosLiberados || ["haiku", "sonnet"]);
  const [modeloChat, setModeloChat] = useState(c?.modeloChat || "sonnet");
  const [modeloGerador, setModeloGerador] = useState(c?.modeloGerador || "sonnet");
  const [limiteTokens, setLimiteTokens] = useState(c?.limiteTokens ?? 0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleModulo(id: string) {
    setModulosAtivos((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }
  function toggleModelo(m: string) {
    setModelosLiberados((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function salvar() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenant.slug}/info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          nomeComercial,
          tipo,
          hub,
          tema,
          corPrincipal,
          status,
          healthScore,
          observacoesInternas: observacoes,
          responsavel: { nome: respNome, cargo: respCargo, email: respEmail, whatsapp: respWhatsapp },
          presencaDigital: { dominio, site, instagram, whatsapp: whatsappComercial },
          modulos_ativos: modulosAtivos,
          claude: {
            habilitado: claudeHabilitado,
            contaId: contaId || undefined,
            modelosLiberados,
            modeloChat,
            modeloGerador,
            limiteTokens,
            importarArquivos: importar,
            exportarArquivos: exportar,
            acessoInternet: internet,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Falha ao salvar.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Editar cliente</h2>
            <p className="text-xs text-muted mt-0.5">Ajuste os dados, módulos e integrações deste cliente.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <Section title="Identidade">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome da empresa">
                <input className="input w-full px-3 py-2 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="Nome comercial">
                <input className="input w-full px-3 py-2 text-sm" value={nomeComercial} onChange={(e) => setNomeComercial(e.target.value)} />
              </Field>
              <Field label="Segmento/nicho">
                <input className="input w-full px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)} />
              </Field>
              <Field label="Hub">
                <select className="input w-full px-3 py-2 text-sm" value={hub} onChange={(e) => setHub(e.target.value)}>
                  <option value="">— nenhum —</option>
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>{h.nome}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium mb-2">Tema do painel do cliente</p>
              <TemaPicker value={tema} onChange={setTema} />
            </div>
            <div className="mt-3 max-w-xs">
              <Field label="Cor de destaque da marca">
                <div className="flex gap-2 items-center">
                  <input type="color" className="h-9 w-10 rounded-lg border border-app bg-transparent cursor-pointer" value={corPrincipal} onChange={(e) => setCorPrincipal(e.target.value)} />
                  <input className="input w-full px-3 py-2 text-sm font-mono" value={corPrincipal} onChange={(e) => setCorPrincipal(e.target.value)} />
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Responsável principal" hint="Quem fala pela empresa no dia a dia.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome do responsável">
                <input className="input w-full px-3 py-2 text-sm" value={respNome} onChange={(e) => setRespNome(e.target.value)} />
              </Field>
              <Field label="Cargo/função">
                <input className="input w-full px-3 py-2 text-sm" value={respCargo} onChange={(e) => setRespCargo(e.target.value)} />
              </Field>
              <Field label="E-mail de contato">
                <input type="email" className="input w-full px-3 py-2 text-sm" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} />
              </Field>
              <Field label="WhatsApp/telefone">
                <input className="input w-full px-3 py-2 text-sm" value={respWhatsapp} onChange={(e) => setRespWhatsapp(e.target.value)} placeholder="+55 11 99999-9999" />
              </Field>
            </div>
          </Section>

          <Section title="Presença digital" hint="Site, redes e contato do cliente — o site cadastrado aqui aparece na aba Meu Site e na Visão Geral do hub dele.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Domínio principal">
                <input className="input w-full px-3 py-2 text-sm" value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="empresa.com.br" />
              </Field>
              <Field label="Site atual (URL)">
                <input className="input w-full px-3 py-2 text-sm" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Instagram (URL ou @)">
                <input className="input w-full px-3 py-2 text-sm" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
              </Field>
              <Field label="WhatsApp comercial">
                <input className="input w-full px-3 py-2 text-sm" value={whatsappComercial} onChange={(e) => setWhatsappComercial(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Módulos do cliente" hint="Ligue só o que este cliente usa — as abas desligadas somem do hub dele.">
            <div className="grid sm:grid-cols-2 gap-2">
              {modules.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-app cursor-pointer hover:bg-app">
                  <span className="text-sm">{m.label}</span>
                  <input type="checkbox" className="accent-[var(--accent)]" checked={modulosAtivos.includes(m.id)} onChange={() => toggleModulo(m.id)} />
                </label>
              ))}
            </div>
          </Section>

          <Section title="Configuração operacional">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Status">
                <select className="input w-full px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as TenantStatus)}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Health Score (0-100)">
                <input type="number" min={0} max={100} className="input w-full px-3 py-2 text-sm" value={healthScore} onChange={(e) => setHealthScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Observações internas">
                <textarea className="input w-full px-3 py-2 text-sm min-h-16" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Claude — assistente de IA">
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input type="checkbox" className="accent-[var(--accent)]" checked={claudeHabilitado} onChange={(e) => setClaudeHabilitado(e.target.checked)} />
              IA habilitada para este cliente
            </label>

            <Field label="Qual conta Claude este cliente vai usar?">
              <select className="input w-full px-3 py-2 text-sm" value={contaId} onChange={(e) => setContaId(e.target.value)}>
                <option value="">Conta padrão (API)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} {a.compartilhada ? "· compartilhada" : ""}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted mt-1">Conecte contas em Contas Claude — várias podem usar a mesma (compartilham o limite).</p>
            </Field>

            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              <ToggleCard label="Importar arquivos" desc="O cliente pode subir arquivos e pastas no storage." checked={importar} onChange={setImportar} />
              <ToggleCard label="Exportar arquivos" desc="O cliente pode baixar e abrir arquivos do storage." checked={exportar} onChange={setExportar} />
              <ToggleCard label="Acesso à internet" desc="Claude pode pesquisar e ler páginas da web ao gerar conteúdo." checked={internet} onChange={setInternet} />
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium mb-2">Modelos de IA liberados</p>
              <p className="text-[11px] text-muted mb-2">O cliente só consegue usar os modelos marcados. Opus vem desligado — ligue só se quiser pagar mais.</p>
              <div className="flex gap-2">
                {MODELOS.map((m) => (
                  <button key={m} type="button" onClick={() => toggleModelo(m)} className={`text-xs px-3 py-1.5 rounded-lg border uppercase ${modelosLiberados.includes(m) ? "border-accent text-accent" : "border-app text-muted"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Modelo no chat">
                <select className="input w-full px-3 py-2 text-sm" value={modeloChat} onChange={(e) => setModeloChat(e.target.value)}>
                  {MODELOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Modelo no gerador de conteúdo">
                <select className="input w-full px-3 py-2 text-sm" value={modeloGerador} onChange={(e) => setModeloGerador(e.target.value)}>
                  {MODELOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Limite de tokens do cliente">
                <input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={limiteTokens} onChange={(e) => setLimiteTokens(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <div className="flex gap-1.5 mt-2">
                {[["1M", 1_000_000], ["5M", 5_000_000], ["10M", 10_000_000], ["Ilimitado", 0]].map(([label, v]) => (
                  <button key={label as string} type="button" onClick={() => setLimiteTokens(v as number)} className="text-[11px] px-2.5 py-1 rounded-lg border border-app text-muted hover:text-app">
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-1">Sem limite. Defina um teto ou gerencie depois na aba Tokens.</p>
            </div>
          </Section>
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-app">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button onClick={salvar} disabled={saving} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 pt-4 border-t border-app first:pt-0 first:border-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function ToggleCard({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex flex-col gap-1 p-2.5 rounded-lg border border-app cursor-pointer hover:bg-app">
      <span className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <input type="checkbox" className="accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </span>
      <span className="text-[10px] text-muted">{desc}</span>
    </label>
  );
}
