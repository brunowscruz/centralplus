"use client";

import { useState } from "react";

export interface PendingAttachment {
  id: string;
  name: string;
  path: string; // caminho relativo dentro do workspace, vazio enquanto sobe
  uploading: boolean;
  error?: string;
}

/** Upload real de anexos de chat (imagem, PDF, planilha...) — sobe pra
 * `_chat-uploads/` no workspace do cliente via a mesma API de arquivos do
 * navegador (Claude Code), reaproveitada aqui. O caminho final vira parte
 * do pedido mandado ao agente, que já sabe ler qualquer arquivo da pasta. */
export function useChatAttachments(slug: string) {
  const [items, setItems] = useState<PendingAttachment[]>([]);

  async function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, name: file.name, path: "", uploading: true }]);

      const form = new FormData();
      form.append("dir", "_chat-uploads");
      form.append("file", file);

      try {
        const res = await fetch(`/api/tenants/${slug}/files`, { method: "POST", body: form });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { path: string };
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, path: data.path, uploading: false } : it)));
      } catch {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, uploading: false, error: "falhou" } : it)));
      }
    }
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function clear() {
    setItems([]);
  }

  const prontos = items.filter((it) => it.path && !it.error);
  const subindo = items.some((it) => it.uploading);

  return { items, addFiles, remove, clear, prontos, subindo };
}
