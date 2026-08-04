"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, UploadCloud, FolderUp, FileArchive } from "lucide-react";

interface TenantOption {
  slug: string;
  nome: string;
}

/** Importa um site pronto (zip ou pasta inteira do computador) pra dentro
 * de um cliente, sem precisar mexer na pasta do servidor na mão. Vira um
 * rascunho novo — passa pela aprovação normal depois, como qualquer outro
 * (regra de ouro: nada é publicado sozinho). */
export default function ImportarSiteModal({ tenants, onClose }: { tenants: TenantOption[]; onClose: () => void }) {
  const router = useRouter();
  const [slug, setSlug] = useState(tenants[0]?.slug ?? "");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"site" | "lp">("site");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [modoOrigem, setModoOrigem] = useState<"zip" | "pasta" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const pastaInputRef = useRef<HTMLInputElement>(null);

  function escolherZip(files: FileList | null) {
    if (!files?.length) return;
    setArquivos([files[0]]);
    setModoOrigem("zip");
    setErro(null);
  }

  function escolherPasta(files: FileList | null) {
    if (!files?.length) return;
    setArquivos(Array.from(files));
    setModoOrigem("pasta");
    setErro(null);
  }

  async function enviar() {
    if (!slug || arquivos.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      const form = new FormData();
      form.set("slug", slug);
      form.set("nome", nome.trim());
      form.set("tipo", tipo);
      for (const f of arquivos) form.append("arquivos", f);

      const res = await fetch("/api/console/sites/importar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao importar.");
        return;
      }
      router.push(`/c/${slug}/site`);
      router.refresh();
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Importar site pronto</h2>
            <p className="text-xs text-muted mt-0.5">Sobe um site gerado fora do Hub direto pra um cliente, sem mexer na pasta do servidor.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Cliente</label>
            <select className="input w-full px-3 py-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)}>
              {tenants.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">É o site principal ou uma landing page avulsa?</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setTipo("site")}
                className={`flex-1 text-xs px-3 py-2 rounded-lg border ${tipo === "site" ? "border-accent text-accent bg-accent/10" : "border-app text-app hover:bg-app"}`}
              >
                Site principal
              </button>
              <button
                onClick={() => setTipo("lp")}
                className={`flex-1 text-xs px-3 py-2 rounded-lg border ${tipo === "lp" ? "border-accent text-accent bg-accent/10" : "border-app text-app hover:bg-app"}`}
              >
                Landing page avulsa
              </button>
            </div>
            <p className="text-[11px] text-muted">
              {tipo === "site"
                ? "Ao aprovar, substitui a home inteira do cliente."
                : "Ao aprovar, vira só mais uma página — não mexe no resto do site."}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Nome (opcional, ajuda a identificar o rascunho)</label>
            <input className="input w-full px-3 py-2 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: site institucional novo" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Arquivos</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => zipInputRef.current?.click()}
                className={`flex-1 text-xs px-3 py-3 rounded-lg border flex flex-col items-center gap-1.5 ${modoOrigem === "zip" ? "border-accent text-accent bg-accent/10" : "border-dashed border-app text-muted hover:text-app hover:border-app"}`}
              >
                <FileArchive size={18} />
                Selecionar .zip
              </button>
              <button
                onClick={() => pastaInputRef.current?.click()}
                className={`flex-1 text-xs px-3 py-3 rounded-lg border flex flex-col items-center gap-1.5 ${modoOrigem === "pasta" ? "border-accent text-accent bg-accent/10" : "border-dashed border-app text-muted hover:text-app hover:border-app"}`}
              >
                <FolderUp size={18} />
                Selecionar pasta
              </button>
            </div>
            <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => escolherZip(e.target.files)} />
            {/* webkitdirectory: input não-padrão, mas suportado por todos os navegadores relevantes (Chrome/Edge/Firefox/Safari) pra selecionar pasta inteira */}
            <input
              ref={pastaInputRef}
              type="file"
              // @ts-expect-error atributo não tipado pelo React, mas funcional
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => escolherPasta(e.target.files)}
            />
            {arquivos.length > 0 && (
              <p className="text-[11px] text-muted">
                {modoOrigem === "zip" ? arquivos[0].name : `${arquivos.length} arquivo${arquivos.length === 1 ? "" : "s"} selecionado${arquivos.length === 1 ? "" : "s"}`}
              </p>
            )}
          </div>

          {erro && <p className="text-xs text-red-400">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-app">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando || !slug || arquivos.length === 0}
            className="btn-accent px-4 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <UploadCloud size={14} />
            {enviando ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}
