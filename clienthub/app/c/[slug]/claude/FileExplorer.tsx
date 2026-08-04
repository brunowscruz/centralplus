"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderPlus, FilePlus, Upload, Search, Grid3x3, List, Home, ChevronRight, Pencil, Trash2, Download } from "lucide-react";
import RowMenu from "@/components/console/RowMenu";
import { EntryIcon } from "./fileIcons";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";

interface Entry {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileExplorer({
  slug,
  currentPath,
  onNavigate,
  onOpenFile,
  refreshKey,
  onRefresh,
}: {
  slug: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenFile: (path: string) => void;
  refreshKey: number;
  onRefresh: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirmar = useConfirm();

  const load = useCallback(async () => {
    const res = await fetch(`/api/tenants/${slug}/files?path=${encodeURIComponent(currentPath)}`);
    if (res.ok) setEntries((await res.json()).entries);
  }, [slug, currentPath]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function novaPasta() {
    const name = window.prompt("Nome da nova pasta:");
    if (!name) return;
    const res = await fetch(`/api/tenants/${slug}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mkdir", path: currentPath ? `${currentPath}/${name}` : name }),
    });
    if (res.ok) onRefresh();
    else toast.error((await res.json()).error || "falhou");
  }

  async function novoArquivo() {
    const name = window.prompt("Nome do novo arquivo:");
    if (!name) return;
    const rel = currentPath ? `${currentPath}/${name}` : name;
    const res = await fetch(`/api/tenants/${slug}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", path: rel }),
    });
    if (res.ok) {
      onRefresh();
      onOpenFile(rel);
    } else {
      toast.error((await res.json()).error || "falhou");
    }
  }

  async function enviarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("dir", currentPath);
      form.append("file", file);
      await fetch(`/api/tenants/${slug}/files`, { method: "POST", body: form });
    }
    setUploading(false);
    onRefresh();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function renomear(entry: Entry) {
    const name = window.prompt("Novo nome:", entry.name);
    if (!name || name === entry.name) return;
    const dir = entry.path.slice(0, entry.path.length - entry.name.length);
    const res = await fetch(`/api/tenants/${slug}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", path: entry.path, newPath: dir + name }),
    });
    if (res.ok) onRefresh();
    else toast.error((await res.json()).error || "falhou");
  }

  async function excluir(entry: Entry) {
    const ok = await confirmar({
      title: `Excluir "${entry.name}"?`,
      message: entry.type === "dir" ? "Isso apaga tudo dentro da pasta. Essa ação não pode ser desfeita." : "Essa ação não pode ser desfeita.",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/tenants/${slug}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path: entry.path }),
    });
    if (res.ok) onRefresh();
    else toast.error((await res.json()).error || "falhou");
  }

  const crumbs = currentPath ? currentPath.split("/") : [];
  const filtered = search.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    : entries;

  return (
    <div className="flex flex-col h-full">
      {/* breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-app text-sm min-w-0 overflow-x-auto">
        <button onClick={() => onNavigate("")} className="icon-badge h-6 w-6 shrink-0" title="Início">
          <Home size={13} />
        </button>
        {crumbs.map((seg, i) => {
          const path = crumbs.slice(0, i + 1).join("/");
          const last = i === crumbs.length - 1;
          return (
            <span key={path} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={13} className="text-muted" />
              <button
                onClick={() => onNavigate(path)}
                className={`px-1 rounded hover:text-accent whitespace-nowrap ${last ? "text-app font-medium" : "text-muted"}`}
              >
                {seg}
              </button>
            </span>
          );
        })}
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-app flex-wrap">
        <button onClick={novaPasta} className="btn-ghost px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5">
          <FolderPlus size={13} /> Nova pasta
        </button>
        <button onClick={novoArquivo} className="btn-ghost px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5">
          <FilePlus size={13} /> Novo arquivo
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-ghost px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Upload size={13} /> {uploading ? "Enviando…" : "Enviar"}
        </button>
        <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => enviarArquivos(e.target.files)} />

        <div className="flex-1 min-w-[120px] relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aqui…"
            className="input w-full pl-8 pr-2 py-1.5 text-xs"
          />
        </div>

        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={() => setView("grid")}
            className={`icon-badge h-7 w-7 ${view === "grid" ? "text-accent" : ""}`}
            title="Grade"
          >
            <Grid3x3 size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`icon-badge h-7 w-7 ${view === "list" ? "text-accent" : ""}`}
            title="Lista"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* conteúdo */}
      <div className="flex-1 overflow-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted text-center py-10">
            {search ? "Nada encontrado." : "Pasta vazia."}
          </p>
        ) : view === "grid" ? (
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
            {filtered.map((e) => (
              <div key={e.path} className="group relative flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-app cursor-pointer">
                <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100">
                  <RowMenu
                    items={[
                      { icon: Pencil, label: "Renomear", onClick: () => renomear(e) },
                      ...(e.type === "file" ? [{ icon: Download, label: "Abrir/baixar", onClick: () => window.open(`/api/tenants/${slug}/files/raw?path=${encodeURIComponent(e.path)}`, "_blank") }] : []),
                      { icon: Trash2, label: "Excluir", onClick: () => excluir(e), danger: true },
                    ]}
                  />
                </div>
                <button
                  onClick={() => (e.type === "dir" ? onNavigate(e.path) : onOpenFile(e.path))}
                  className="flex flex-col items-center gap-1.5 w-full"
                >
                  <EntryIcon name={e.name} type={e.type} size={36} />
                  <span className="text-[11px] text-app text-center leading-tight line-clamp-2 break-all">{e.name}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm table-clean">
            <thead>
              <tr className="text-left border-b border-app">
                <th className="pb-2">Nome</th>
                <th className="pb-2 w-24">Tipo</th>
                <th className="pb-2 w-20 text-right">Tamanho</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.path} className="border-b border-app last:border-0 group hover:bg-app">
                  <td className="py-1.5">
                    <button
                      onClick={() => (e.type === "dir" ? onNavigate(e.path) : onOpenFile(e.path))}
                      className="flex items-center gap-2 text-left"
                    >
                      <EntryIcon name={e.name} type={e.type} size={16} />
                      <span className="truncate">{e.name}</span>
                    </button>
                  </td>
                  <td className="py-1.5 text-muted text-xs">{e.type === "dir" ? "Pasta" : "Arquivo"}</td>
                  <td className="py-1.5 text-muted text-xs text-right">{e.type === "file" ? formatSize(e.size) : ""}</td>
                  <td className="py-1.5 opacity-0 group-hover:opacity-100">
                    <RowMenu
                      items={[
                        { icon: Pencil, label: "Renomear", onClick: () => renomear(e) },
                        ...(e.type === "file" ? [{ icon: Download, label: "Abrir/baixar", onClick: () => window.open(`/api/tenants/${slug}/files/raw?path=${encodeURIComponent(e.path)}`, "_blank") }] : []),
                        { icon: Trash2, label: "Excluir", onClick: () => excluir(e), danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11px] text-muted px-3 py-1.5 border-t border-app">{entries.length} itens</p>
    </div>
  );
}
