"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EntryIcon, isImage } from "./fileIcons";
import { useToast } from "@/components/ToastProvider";

interface FileRead {
  path: string;
  name: string;
  content: string | null;
  editable: boolean;
  size: number;
  reason?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileEditor({
  slug,
  path,
  onSaved,
  onBack,
}: {
  slug: string;
  path: string | null;
  onSaved: () => void;
  onBack: () => void;
}) {
  const [file, setFile] = useState<FileRead | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!path) {
      setFile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/tenants/${slug}/files?read=1&path=${encodeURIComponent(path)}`,
      );
      if (cancelled) return;
      if (res.ok) {
        const data: FileRead = await res.json();
        setFile(data);
        setDraft(data.content ?? "");
        setDirty(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, path]);

  async function save() {
    if (!file || !file.editable) return;
    setSaving(true);
    const res = await fetch(`/api/tenants/${slug}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write", path: file.path, content: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      toast.success("Arquivo salvo.");
      onSaved();
    } else {
      toast.error((await res.json()).error || "falha ao salvar");
    }
  }

  if (!path) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted p-6 text-center">
        Selecione um arquivo à esquerda para ver e editar.
      </div>
    );
  }

  const nome = file?.name ?? path.split("/").pop() ?? path;
  const imagem = isImage(nome);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-app flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="icon-badge h-7 w-7 shrink-0" title="Voltar pra pasta">
            <ArrowLeft size={14} />
          </button>
          <EntryIcon name={nome} type="file" size={16} />
          <span className="text-sm font-mono truncate">{nome}</span>
          {file && <span className="text-[11px] text-muted shrink-0">{formatSize(file.size)}</span>}
        </div>
        {file?.editable && (
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="btn-accent px-3 py-1 text-xs disabled:opacity-50 shrink-0"
          >
            {saving ? "Salvando…" : dirty ? "Salvar" : "Salvo"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {imagem ? (
          <div className="h-full grid place-items-center p-6 bg-app">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/tenants/${slug}/files/raw?path=${encodeURIComponent(path)}`}
              alt={nome}
              className="max-w-full max-h-full object-contain rounded-lg border border-app"
            />
          </div>
        ) : file && !file.editable ? (
          <div className="p-6 text-sm text-muted flex flex-col items-center gap-3 text-center">
            <p>Não editável ({file.reason ?? "tipo não suportado"}).</p>
            <a
              href={`/api/tenants/${slug}/files/raw?path=${encodeURIComponent(path)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Baixar arquivo
            </a>
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className="w-full h-full min-h-[300px] bg-transparent text-app text-sm font-mono p-3 outline-none resize-none"
          />
        )}
      </div>
    </div>
  );
}
