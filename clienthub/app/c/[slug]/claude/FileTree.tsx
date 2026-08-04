"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home } from "lucide-react";

interface Entry {
  name: string;
  path: string;
  type: "dir" | "file";
}

function TreeNode({
  slug,
  entry,
  depth,
  currentPath,
  onNavigate,
  refreshKey,
}: {
  slug: string;
  entry: Entry;
  depth: number;
  currentPath: string;
  onNavigate: (path: string) => void;
  refreshKey: number;
}) {
  const isAncestorOrSelf = currentPath === entry.path || currentPath.startsWith(entry.path + "/");
  const [open, setOpen] = useState(isAncestorOrSelf);
  const [children, setChildren] = useState<Entry[] | null>(null);
  const active = currentPath === entry.path;

  const load = useCallback(async () => {
    const res = await fetch(`/api/tenants/${slug}/files?path=${encodeURIComponent(entry.path)}`);
    if (res.ok) {
      const data = (await res.json()) as { entries: Entry[] };
      setChildren(data.entries.filter((e) => e.type === "dir"));
    }
  }, [slug, entry.path]);

  useEffect(() => {
    if (open) load();
  }, [open, load, refreshKey]);

  useEffect(() => {
    if (isAncestorOrSelf) setOpen(true);
  }, [isAncestorOrSelf]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md pr-2 cursor-pointer group ${active ? "bg-accent/10 text-accent" : "text-app hover:bg-app"}`}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="text-muted shrink-0 p-0.5"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button onClick={() => onNavigate(entry.path)} className="flex items-center gap-1.5 py-1.5 flex-1 min-w-0 text-left">
          {active || open ? (
            <FolderOpen size={15} color="#eab308" fill="#eab308" fillOpacity={0.18} strokeWidth={1.6} className="shrink-0" />
          ) : (
            <Folder size={15} color="#eab308" fill="#eab308" fillOpacity={0.18} strokeWidth={1.6} className="shrink-0" />
          )}
          <span className="truncate text-[13px]">{entry.name}</span>
        </button>
      </div>
      {open &&
        children?.map((c) => (
          <TreeNode key={c.path} slug={slug} entry={c} depth={depth + 1} currentPath={currentPath} onNavigate={onNavigate} refreshKey={refreshKey} />
        ))}
    </div>
  );
}

export default function FileTree({
  slug,
  currentPath,
  onNavigate,
  refreshKey,
}: {
  slug: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  refreshKey: number;
}) {
  const [root, setRoot] = useState<Entry[]>([]);

  const loadRoot = useCallback(async () => {
    const res = await fetch(`/api/tenants/${slug}/files?path=`);
    if (res.ok) {
      const data = (await res.json()) as { entries: Entry[] };
      setRoot(data.entries.filter((e) => e.type === "dir"));
    }
  }, [slug]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot, refreshKey]);

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-3 pt-3 pb-2">Pastas</p>
      <div className="flex-1 overflow-auto px-2 pb-2">
        <button
          onClick={() => onNavigate("")}
          className={`w-full flex items-center gap-1.5 py-1.5 pl-1.5 pr-2 rounded-md text-[13px] mb-0.5 ${
            currentPath === "" ? "bg-accent/10 text-accent" : "text-app hover:bg-app"
          }`}
        >
          <Home size={14} className="shrink-0" />
          Início
        </button>
        {root.map((e) => (
          <TreeNode key={e.path} slug={slug} entry={e} depth={0} currentPath={currentPath} onNavigate={onNavigate} refreshKey={refreshKey} />
        ))}
      </div>
    </div>
  );
}
