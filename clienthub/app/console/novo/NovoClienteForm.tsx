"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { HubPreset } from "@/lib/hubs";
import type { ClaudeAccount } from "@/lib/claude-accounts";
import TemaPicker, { type TemaId } from "@/components/console/TemaPicker";

interface ModuleOption {
  id: string;
  label: string;
  description: string;
  status: "pronto" | "parcial" | "stub";
}

interface Provisioned {
  slug: string;
  nome: string;
  login: string;
  senha: string;
}

const SEGMENTOS = [
  "Clínica & Estética",
  "Varejo & Comércio",
  "Serviços & Autônomos",
  "Imobiliária / Corretor",
  "Igreja",
  "Outro",
];

const CRM_PRESETS = [
  { id: "geral", nome: "Geral (Completo)", descricao: "Todos os campos ativos. Pra quem vende empresa pra pessoas." },
  { id: "clinica", nome: "Clínica & Estética", descricao: "Atende pessoas (pacientes). Some campos de empresa, faturamento, setor... e a área de Organizações." },
  { id: "varejo", nome: "Varejo & Comércio", descricao: "Funil orientado a produto e ticket." },
  { id: "servicos", nome: "Serviços & Autônomos", descricao: "Funil enxuto, sem estrutura de organização." },
];

function slugify(nome: string): string {
  return nome
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return chars.join("");
}

const HEX6 = /^#?[0-9a-fA-F]{6}$/;
const validHex = (v: string) => HEX6.test(v.trim());
const asHex = (v: string) => (v.trim().startsWith("#") ? v.trim() : `#${v.trim()}`);

interface FormState {
  hub: string;
  experimental: boolean;
  tema: TemaId;
  logoDataUrl: string | null;
  logoFilename: string | null;
  nome: string;
  nomeComercial: string;
  segmento: string;
  corPrincipal: string;
  respNome: string;
  respCargo: string;
  respEmail: string;
  respWhatsapp: string;
  dominio: string;
  site: string;
  instagram: string;
  whatsappComercial: string;
  slug: string;
  slugTouched: boolean;
  modulos: string[];
  crmPreset: string;
  tipoCliente: "recorrente" | "nao_recorrente" | "nao_definido";
  status: "ativo" | "em_configuracao" | "experimental";
  healthScore: number;
  observacoesInternas: string;
  claudeModo: "sem" | "compartilhado" | "dedicado";
  claudeContaId: string;
  claudeDedicadoNome: string;
  claudeDedicadoToken: string;
  login: string;
  senha: string;
  // contexto extra (melhoria CentralPlus) — alimenta _memoria/ do B-O-S
  contextoAberto: boolean;
  entrega: string;
  quemPaga: string;
  equipe: string;
  exemploEscrita: string;
  evitar: string;
  gargalo: string;
  tarefaRepetida: string;
}

export default function NovoClienteForm({
  modules,
  hubs,
  accounts,
  hubPreselecionado,
}: {
  modules: ModuleOption[];
  hubs: HubPreset[];
  accounts: ClaudeAccount[];
  hubPreselecionado?: string;
}) {
  const contasCompartilhadas = accounts.filter((a) => a.compartilhada);
  const [f, setF] = useState<FormState>({
    hub: hubPreselecionado || hubs[0]?.id || "",
    experimental: false,
    tema: "preto",
    logoDataUrl: null,
    logoFilename: null,
    nome: "",
    nomeComercial: "",
    segmento: SEGMENTOS[0],
    corPrincipal: "#E0A94A",
    respNome: "",
    respCargo: "",
    respEmail: "",
    respWhatsapp: "",
    dominio: "",
    site: "",
    instagram: "",
    whatsappComercial: "",
    slug: "",
    slugTouched: false,
    modulos: ["site", "instagram", "financeiro"].filter((id) => modules.some((m) => m.id === id)),
    crmPreset: "geral",
    tipoCliente: "nao_definido",
    status: "ativo",
    healthScore: 100,
    observacoesInternas: "",
    claudeModo: "compartilhado",
    claudeContaId: contasCompartilhadas[0]?.id || accounts[0]?.id || "",
    claudeDedicadoNome: "",
    claudeDedicadoToken: "",
    login: "",
    senha: generatePassword(),
    contextoAberto: false,
    entrega: "",
    quemPaga: "",
    equipe: "",
    exemploEscrita: "",
    evitar: "",
    gargalo: "",
    tarefaRepetida: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Provisioned | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const slug = f.slugTouched ? f.slug : slugify(f.nome);

  function toggleModulo(id: string) {
    set("modulos", f.modulos.includes(id) ? f.modulos.filter((m) => m !== id) : [...f.modulos, id]);
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
    set("logoFilename", file.name);
  }

  const podeSubmeter =
    f.nome.trim().length > 0 &&
    slug.length > 0 &&
    (f.experimental || (f.login.trim().length > 0 && f.senha.length >= 8)) &&
    (f.claudeModo !== "dedicado" || (f.claudeDedicadoNome.trim() && f.claudeDedicadoToken.trim()));

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: f.nome,
          slug,
          tipo: f.segmento,
          segmento: f.segmento,
          entrega: f.entrega,
          quemPaga: f.quemPaga,
          equipe: f.equipe,
          exemploEscrita: f.exemploEscrita,
          evitar: f.evitar,
          gargalo: f.gargalo,
          tarefaRepetida: f.tarefaRepetida,
          identidade: {
            corDestaque: validHex(f.corPrincipal) ? asHex(f.corPrincipal) : undefined,
          },
          hub: f.hub,
          tema: f.tema,
          experimental: f.experimental,
          nomeComercial: f.nomeComercial,
          corPrincipal: f.corPrincipal,
          logo: f.logoDataUrl ? { dataUrl: f.logoDataUrl, filename: f.logoFilename } : undefined,
          responsavel: { nome: f.respNome, cargo: f.respCargo, email: f.respEmail, whatsapp: f.respWhatsapp },
          presencaDigital: {
            dominio: f.dominio,
            site: f.site,
            instagram: f.instagram,
            whatsapp: f.whatsappComercial,
          },
          modulos: f.modulos,
          crmPreset: f.modulos.includes("crm") ? f.crmPreset : null,
          tipoCliente: f.tipoCliente,
          status: f.experimental ? "experimental" : f.status,
          healthScore: f.healthScore,
          observacoesInternas: f.observacoesInternas,
          claude: {
            modo: f.claudeModo,
            contaId: f.claudeModo === "compartilhado" ? f.claudeContaId : undefined,
            dedicado:
              f.claudeModo === "dedicado"
                ? { nome: f.claudeDedicadoNome, token: f.claudeDedicadoToken }
                : undefined,
          },
          acesso: f.experimental
            ? undefined
            : { login: f.login || slug, senha: f.senha },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao provisionar.");
        return;
      }
      if (f.experimental) {
        window.location.href = "/console/clientes";
        return;
      }
      setDone(data);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <CredentialCard result={done} />;

  return (
    <div className="card p-6 mt-6 space-y-6">
      {/* Plataforma */}
      <Section title="Plataforma" hint="Em qual hub este cliente vive?">
        <div className="grid sm:grid-cols-2 gap-3">
          {hubs.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => set("hub", h.id)}
              className={`text-left p-3 rounded-xl border ${
                f.hub === h.id ? "border-accent bg-app" : "border-app hover:bg-app"
              }`}
            >
              <p className="text-sm font-medium">{h.nome}</p>
              <p className="text-[11px] text-muted mt-0.5">{h.dominio || `${h.id}.seudominio.com.br`}</p>
            </button>
          ))}
        </div>
      </Section>

      <label className="flex items-start gap-3 p-3 rounded-xl border border-app cursor-pointer hover:bg-app">
        <input
          type="checkbox"
          className="mt-1 accent-[var(--accent)]"
          checked={f.experimental}
          onChange={(e) => set("experimental", e.target.checked)}
        />
        <span>
          <span className="text-sm font-medium">Cliente Experimental</span>
          <span className="block text-xs text-muted mt-0.5">
            Sem login — criado só pra testar o fluxo. Só você acessa, abrindo o workspace pelo
            painel (MODO OWNER).
          </span>
        </span>
      </label>

      {/* Identidade do cliente */}
      <Section title="Identidade do cliente" hint="Marca, nome e o que aparecem no hub.">
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start">
          <div>
            <label className="input flex flex-col items-center justify-center h-24 w-24 rounded-xl border-dashed cursor-pointer text-center text-[10px] text-muted gap-1 overflow-hidden">
              {f.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <>
                  <span>↑</span>
                  <span>LOGO DO CLIENTE</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            </label>
          </div>
          <div className="grid gap-3">
            <Field label="Nome da empresa *" hint="Razão social.">
              <input
                className="input w-full px-3 py-2 text-sm"
                value={f.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Razão Social"
                autoFocus
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome comercial/apelido" hint="Nome fantasia.">
                <input
                  className="input w-full px-3 py-2 text-sm"
                  value={f.nomeComercial}
                  onChange={(e) => set("nomeComercial", e.target.value)}
                  placeholder="Nome Fantasia"
                />
              </Field>
              <Field label="Segmento/nicho">
                <select
                  className="input w-full px-3 py-2 text-sm"
                  value={f.segmento}
                  onChange={(e) => set("segmento", e.target.value)}
                >
                  {SEGMENTOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-2">Tema do painel do cliente</p>
          <TemaPicker value={f.tema} onChange={(t) => set("tema", t)} />
        </div>
        <ColorField label="Cor de destaque da marca" value={f.corPrincipal} onChange={(v) => set("corPrincipal", v)} placeholder="#E0A94A" />
        <Field label="Slug" hint={<>Vira <code className="text-app">clientes/{slug || "…"}/</code> no B-O-S.</>}>
          <input
            className="input w-full px-3 py-2 text-sm font-mono"
            value={slug}
            onChange={(e) => {
              set("slugTouched", true);
              set("slug", slugify(e.target.value) || e.target.value);
            }}
          />
        </Field>
      </Section>

      {/* Responsável principal */}
      <Section title="Responsável principal" hint="Quem fala pela empresa no dia a dia.">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome do responsável *">
            <input className="input w-full px-3 py-2 text-sm" value={f.respNome} onChange={(e) => set("respNome", e.target.value)} />
          </Field>
          <Field label="Cargo/função">
            <input className="input w-full px-3 py-2 text-sm" value={f.respCargo} onChange={(e) => set("respCargo", e.target.value)} />
          </Field>
          <Field label="E-mail de contato">
            <input type="email" className="input w-full px-3 py-2 text-sm" value={f.respEmail} onChange={(e) => set("respEmail", e.target.value)} />
          </Field>
          <Field label="WhatsApp/telefone">
            <input className="input w-full px-3 py-2 text-sm" value={f.respWhatsapp} onChange={(e) => set("respWhatsapp", e.target.value)} placeholder="+55 11 99999-9999" />
          </Field>
        </div>
      </Section>

      {/* Presença digital */}
      <Section title="Presença digital" hint="Site, redes e contato do cliente.">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Domínio principal">
            <input className="input w-full px-3 py-2 text-sm" value={f.dominio} onChange={(e) => set("dominio", e.target.value)} placeholder="empresa.com.br" />
          </Field>
          <Field label="Site atual (URL)">
            <input className="input w-full px-3 py-2 text-sm" value={f.site} onChange={(e) => set("site", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Instagram (URL)">
            <input className="input w-full px-3 py-2 text-sm" value={f.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="WhatsApp comercial">
            <input className="input w-full px-3 py-2 text-sm" value={f.whatsappComercial} onChange={(e) => set("whatsappComercial", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Módulos do cliente */}
      <Section title="Módulos do cliente" hint="Ligue só o que este cliente usa — as abas desligadas somem do hub dele. Dá pra religar depois em Configurações do Hub.">
        <div className="grid sm:grid-cols-2 gap-3">
          {modules.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-app cursor-pointer hover:bg-app">
              <span>
                <span className="text-sm font-medium">{m.label}</span>
                <span className="block text-[11px] text-muted mt-0.5">{m.description}</span>
              </span>
              <input
                type="checkbox"
                className="accent-[var(--accent)] shrink-0"
                checked={f.modulos.includes(m.id)}
                onChange={() => toggleModulo(m.id)}
              />
            </label>
          ))}
        </div>
      </Section>

      {/* Modelo do CRM (só quando CRM está ligado) */}
      {f.modulos.includes("crm") && (
        <Section title="Modelo do CRM (preset)" hint="Deixa o CRM com a cara do negócio do cliente — some o que não se aplica.">
          <div className="grid sm:grid-cols-2 gap-3">
            {CRM_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("crmPreset", p.id)}
                className={`text-left p-3 rounded-xl border ${
                  f.crmPreset === p.id ? "border-accent bg-app" : "border-app hover:bg-app"
                }`}
              >
                <p className="text-sm font-medium">{p.nome}</p>
                <p className="text-[11px] text-muted mt-0.5">{p.descricao}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Configuração operacional */}
      <Section title="Configuração operacional" hint="Tipo de cliente, status e observações internas.">
        <div>
          <p className="text-xs font-medium mb-2">Tipo de Cliente (Instagram)</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <TipoBtn f={f} set={set} value="recorrente" label="Recorrente" desc="Geração de conteúdo ativa" />
            <TipoBtn f={f} set={set} value="nao_recorrente" label="Não recorrente" desc="Apenas biblioteca de posts" />
            <TipoBtn f={f} set={set} value="nao_definido" label="Não definido" desc="A definir" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Status inicial" hint="Editável depois na tela Clientes.">
            <select
              className="input w-full px-3 py-2 text-sm"
              value={f.experimental ? "experimental" : f.status}
              disabled={f.experimental}
              onChange={(e) => set("status", e.target.value as FormState["status"])}
            >
              <option value="ativo">Ativo</option>
              <option value="em_configuracao">Em configuração</option>
              <option value="experimental">Experimental</option>
            </select>
          </Field>
          <Field label="Health Score (0-100)">
            <input
              type="number"
              min={0}
              max={100}
              className="input w-full px-3 py-2 text-sm"
              value={f.healthScore}
              onChange={(e) => set("healthScore", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            />
          </Field>
        </div>
        <Field label="Observações internas" hint="Só o operador vê.">
          <textarea
            className="input w-full px-3 py-2 text-sm min-h-16"
            value={f.observacoesInternas}
            onChange={(e) => set("observacoesInternas", e.target.value)}
            placeholder="Informações relevantes para o atendimento..."
          />
        </Field>
      </Section>

      {/* Claude — assistente de IA */}
      <Section title="Claude — assistente de IA" hint="Define se este cliente terá o assistente Claude no workspace, e qual assinatura ele usa.">
        <div className="grid sm:grid-cols-3 gap-2">
          <ClaudeModoBtn f={f} set={set} value="sem" label="Sem Claude" desc="O cliente não terá o assistente no Hub." />
          <ClaudeModoBtn f={f} set={set} value="compartilhado" label="Claude compartilhado" desc="Usa a conta Claude já conectada (você escolhe qual)." />
          <ClaudeModoBtn f={f} set={set} value="dedicado" label="Claude dedicado" desc="Cria uma conta Claude só pra este cliente (token + nome)." />
        </div>

        {f.claudeModo === "compartilhado" && (
          <Field label="Conta Claude vinculada">
            <select
              className="input w-full px-3 py-2 text-sm"
              value={f.claudeContaId}
              onChange={(e) => set("claudeContaId", e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} {a.compartilhada ? "· compartilhada" : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {f.claudeModo === "dedicado" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome da conta dedicada *">
              <input
                className="input w-full px-3 py-2 text-sm"
                value={f.claudeDedicadoNome}
                onChange={(e) => set("claudeDedicadoNome", e.target.value)}
                placeholder={`Assento — ${f.nome || "cliente"}`}
              />
            </Field>
            <Field label="Token do assento *" hint="Gerado por `claude setup-token`.">
              <input
                className="input w-full px-3 py-2 text-sm font-mono"
                value={f.claudeDedicadoToken}
                onChange={(e) => set("claudeDedicadoToken", e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      {/* Acesso do cliente */}
      {!f.experimental && (
        <Section title="Acesso do cliente" hint="Será criada uma conta de login para o cliente acessar o workspace dele. O usuário poderá entrar imediatamente após o cadastro.">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="E-mail de login *">
              <input
                className="input w-full px-3 py-2 text-sm"
                value={f.login}
                onChange={(e) => set("login", e.target.value)}
                placeholder="cliente@empresa.com"
              />
            </Field>
            <Field label="Senha inicial *" hint="Mínimo 8 caracteres.">
              <div className="flex gap-2">
                <input
                  className="input w-full px-3 py-2 text-sm font-mono"
                  value={f.senha}
                  onChange={(e) => set("senha", e.target.value)}
                />
                <button type="button" onClick={() => set("senha", generatePassword())} className="btn-ghost px-3 text-sm whitespace-nowrap" title="Gerar outra senha">
                  ↻
                </button>
              </div>
            </Field>
          </div>
        </Section>
      )}

      {/* Contexto extra — melhoria CentralPlus, alimenta a memória do B-O-S */}
      <div className="pt-2 border-t border-app">
        <button
          type="button"
          onClick={() => set("contextoAberto", !f.contextoAberto)}
          className="text-sm text-accent hover:underline underline-offset-2"
        >
          {f.contextoAberto ? "− Ocultar" : "+ Contexto extra pro Claude (opcional)"}
        </button>
        {f.contextoAberto && (
          <div className="space-y-3 mt-3">
            <p className="text-[11px] text-muted">
              Melhoria do CentralPlus sobre o cadastro de referência: alimenta{" "}
              <code className="text-app">_memoria/</code> do B-O-S pra o Claude já nascer sabendo
              do negócio. Tudo opcional — dá pra completar depois.
            </p>
            <Field label="O que a empresa entrega, em uma frase">
              <input className="input w-full px-3 py-2 text-sm" value={f.entrega} onChange={(e) => set("entrega", e.target.value)} />
            </Field>
            <Field label="Quem paga?">
              <input className="input w-full px-3 py-2 text-sm" value={f.quemPaga} onChange={(e) => set("quemPaga", e.target.value)} />
            </Field>
            <Field label="Equipe">
              <input className="input w-full px-3 py-2 text-sm" value={f.equipe} onChange={(e) => set("equipe", e.target.value)} />
            </Field>
            <Field label="Exemplo de escrita real do cliente">
              <textarea className="input w-full px-3 py-2 text-sm min-h-20" value={f.exemploEscrita} onChange={(e) => set("exemploEscrita", e.target.value)} />
            </Field>
            <Field label="O que evitar na comunicação">
              <textarea className="input w-full px-3 py-2 text-sm min-h-16" value={f.evitar} onChange={(e) => set("evitar", e.target.value)} />
            </Field>
            <Field label="Gargalo do negócio hoje">
              <textarea className="input w-full px-3 py-2 text-sm min-h-16" value={f.gargalo} onChange={(e) => set("gargalo", e.target.value)} />
            </Field>
            <Field label="Tarefa repetida toda semana">
              <textarea className="input w-full px-3 py-2 text-sm min-h-16" value={f.tarefaRepetida} onChange={(e) => set("tarefaRepetida", e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-app">
        <a href="/console/clientes" className="btn-ghost px-4 py-2 text-sm">
          Cancelar
        </a>
        <button
          type="button"
          onClick={submit}
          disabled={loading || !podeSubmeter}
          className="btn-accent px-5 py-2 text-sm disabled:opacity-40"
        >
          {loading ? "Criando…" : "Criar Cadastro"}
        </button>
      </div>
    </div>
  );
}

// ---- subcomponentes ----------------------------------------------------------

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-5 border-t border-app first:pt-0 first:border-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ok = validHex(value);
  return (
    <Field label={label}>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          className="h-9 w-10 rounded-lg border border-app bg-transparent cursor-pointer"
          value={ok ? asHex(value) : placeholder}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label={`${label} (seletor)`}
        />
        <input className="input w-full px-3 py-2 text-sm font-mono" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
      {value && !ok && <p className="text-[11px] text-red-400">Use o formato #RRGGBB.</p>}
    </Field>
  );
}

function TipoBtn({
  f,
  set,
  value,
  label,
  desc,
}: {
  f: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  value: FormState["tipoCliente"];
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={() => set("tipoCliente", value)}
      className={`text-left p-3 rounded-xl border ${f.tipoCliente === value ? "border-accent bg-app" : "border-app hover:bg-app"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-[11px] text-muted mt-0.5">{desc}</p>
    </button>
  );
}

function ClaudeModoBtn({
  f,
  set,
  value,
  label,
  desc,
}: {
  f: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  value: FormState["claudeModo"];
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={() => set("claudeModo", value)}
      className={`text-left p-3 rounded-xl border ${f.claudeModo === value ? "border-accent bg-app" : "border-app hover:bg-app"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-[11px] text-muted mt-0.5">{desc}</p>
    </button>
  );
}

// ---- tela de credencial (pós-provisionamento) ---------------------------------

function CredentialCard({ result }: { result: Provisioned }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [entering, setEntering] = useState(false);

  const loginUrl = useMemo(() => (typeof window === "undefined" ? "" : `${window.location.origin}/login`), []);

  useEffect(() => {
    if (!loginUrl) return;
    QRCode.toDataURL(loginUrl, { width: 220, margin: 1, color: { dark: "#EDEDED", light: "#00000000" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [loginUrl]);

  async function copy() {
    await navigator.clipboard.writeText(
      `Acesso ao painel — ${result.nome}\n${loginUrl}\nLogin: ${result.login}\nSenha: ${result.senha}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function enterWorkspace() {
    setEntering(true);
    const res = await fetch("/api/owner/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: result.slug }),
    });
    const data = await res.json();
    if (res.ok) window.location.href = data.redirect;
    else setEntering(false);
  }

  return (
    <div className="card p-6 mt-6">
      <p className="text-sm text-accent font-semibold">✓ Cliente provisionado</p>
      <h2 className="text-xl font-semibold mt-1">{result.nome}</h2>
      <p className="text-xs text-muted font-mono mt-0.5">clientes/{result.slug}/</p>

      <div className="grid sm:grid-cols-[1fr_auto] gap-6 mt-6 items-start">
        <div className="space-y-3">
          <CredRow label="URL de acesso" value={loginUrl} />
          <CredRow label="Login" value={result.login} />
          <CredRow label="Senha" value={result.senha} />
          <p className="text-[11px] text-muted">
            Anote a senha agora — ela fica no config.json do cliente e pode ser trocada em
            Configurações.
          </p>
          <div className="flex gap-2 pt-1">
            <button onClick={copy} className="btn-ghost px-4 py-2 text-sm">
              {copied ? "Copiado ✓" : "Copiar credenciais"}
            </button>
            <button onClick={enterWorkspace} disabled={entering} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
              {entering ? "Entrando…" : "Entrar no workspace"}
            </button>
          </div>
        </div>

        <div className="text-center">
          {qr ? (
            <img src={qr} alt="QR code da URL de acesso" className="rounded-xl border border-app p-2" width={150} height={150} />
          ) : (
            <div className="w-[150px] h-[150px] rounded-xl border border-app" />
          )}
          <p className="text-[11px] text-muted mt-2 max-w-[150px] mx-auto">Aponte a câmera para acessar</p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-app">
        <a href="/console/clientes" className="text-sm text-muted hover:text-app">
          ← Voltar aos Clientes
        </a>
      </div>
    </div>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm font-mono break-all">{value}</p>
    </div>
  );
}
