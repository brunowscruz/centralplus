"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicacaoSummary } from "../config/types";

/**
 * Aba "Publicação" do módulo Meu Site — pra onde a versão aprovada do site
 * vai automaticamente (FTP/git) e o botão de baixar .zip manual. Fica aqui
 * (dentro de Meu Site), não em Configurações — é sobre o site, não sobre a
 * conta do cliente. Owner-only (ver SiteWorkspace.tsx), mesma regra do
 * resto do módulo: toda ação de publicação é da agência.
 */
export default function PublicacaoTab({ slug, atual }: { slug: string; atual: PublicacaoSummary | null }) {
  const router = useRouter();
  const [metodo, setMetodo] = useState<"nenhum" | "ftp" | "git">(atual?.metodo || "nenhum");
  const [host, setHost] = useState(atual?.ftp?.host || "");
  const [porta, setPorta] = useState(String(atual?.ftp?.porta || 21));
  const [usuario, setUsuario] = useState(atual?.ftp?.usuario || "");
  const [senha, setSenha] = useState("");
  const [diretorio, setDiretorio] = useState(atual?.ftp?.diretorioRemoto || "");
  const [seguro, setSeguro] = useState(!!atual?.ftp?.seguro);
  const [repoUrl, setRepoUrl] = useState(atual?.git?.repoUrl || "");
  const [branch, setBranch] = useState(atual?.git?.branch || "main");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tenants/${slug}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "publicacao",
        publicacao: {
          metodo,
          ftp: metodo === "ftp" ? { host, porta: Number(porta) || 21, usuario, senha: senha || undefined, diretorioRemoto: diretorio, seguro } : undefined,
          git: metodo === "git" ? { repoUrl, branch } : undefined,
        },
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
    <div className="card p-5 space-y-4">
      <div>
        <p className="text-sm font-medium">Publicação</p>
        <p className="text-xs text-muted mt-1">
          A aprovação do rascunho continua sempre manual — isso aqui é só o que acontece DEPOIS de
          aprovar: nada, envio automático por FTP/git, ou baixar o .zip pra subir na mão.
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["nenhum", "ftp", "git"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetodo(m)}
            className={`ws-tab ${metodo === m ? "ws-tab--active" : ""}`}
          >
            {m === "nenhum" ? "Nenhum" : m === "ftp" ? "FTP" : "Git"}
          </button>
        ))}
      </div>

      {metodo === "ftp" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Host"><input className="input w-full px-3 py-2 text-sm" value={host} onChange={(e) => setHost(e.target.value)} placeholder="ftp.seuservidor.com.br" /></Field>
          <Field label="Porta"><input className="input w-full px-3 py-2 text-sm" value={porta} onChange={(e) => setPorta(e.target.value)} /></Field>
          <Field label="Usuário"><input className="input w-full px-3 py-2 text-sm" value={usuario} onChange={(e) => setUsuario(e.target.value)} /></Field>
          <Field label={atual?.ftp?.temSenha ? "Senha (deixe em branco pra manter)" : "Senha"}>
            <input className="input w-full px-3 py-2 text-sm" value={senha} onChange={(e) => setSenha(e.target.value)} type="password" />
          </Field>
          <Field label="Diretório remoto"><input className="input w-full px-3 py-2 text-sm" value={diretorio} onChange={(e) => setDiretorio(e.target.value)} placeholder="/public_html" /></Field>
          <label className="flex items-center gap-2 text-xs text-muted pt-5">
            <input type="checkbox" checked={seguro} onChange={(e) => setSeguro(e.target.checked)} /> FTPS (conexão segura)
          </label>
        </div>
      )}

      {metodo === "git" && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="URL do repositório"><input className="input w-full px-3 py-2 text-sm font-mono" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="git@github.com:agencia/cliente-site.git" /></Field>
            <Field label="Branch"><input className="input w-full px-3 py-2 text-sm" value={branch} onChange={(e) => setBranch(e.target.value)} /></Field>
          </div>
          <p className="text-[11px] text-amber-400/90">
            Em construção nesta instalação: o campo já fica salvo, mas o push automático só entra
            quando houver um servidor real recebendo esse repositório (Coolify, Vercel, VPS com
            deploy por push...). Sem isso configurado do outro lado, aprovar o site não publica
            nada via git ainda — use FTP se precisar de publicação automática funcionando hoje.
          </p>
        </div>
      )}

      {metodo === "nenhum" && (
        <p className="text-xs text-muted">
          Sem publicação automática configurada. Use o botão <strong className="text-app">Gerar ZIP</strong> na
          aba Site pra baixar a versão aprovada e subir manualmente na hospedagem.
        </p>
      )}

      {atual?.ultimaPublicacao && (
        <p className={`text-xs ${atual.ultimaPublicacao.ok ? "text-green-400" : "text-red-400"}`}>
          Última publicação ({new Date(atual.ultimaPublicacao.em).toLocaleString("pt-BR")}): {atual.ultimaPublicacao.mensagem}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button onClick={salvar} disabled={saving} className="btn-accent px-4 py-2 text-xs disabled:opacity-60">
          {saving ? "Salvando…" : "💾 Salvar"}
        </button>
        {msg && <span className="text-xs text-green-400">{msg}</span>}
      </div>
    </div>
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
