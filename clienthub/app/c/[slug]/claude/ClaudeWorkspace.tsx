"use client";

import { useState } from "react";
import FileTree from "./FileTree";
import FileExplorer from "./FileExplorer";
import FileEditor from "./FileEditor";
import ChatPanel from "./ChatPanel";

export default function ClaudeWorkspace({
  slug,
  chatEnabled,
}: {
  slug: string;
  chatEnabled: boolean;
}) {
  const [currentPath, setCurrentPath] = useState("");
  const [openFile, setOpenFile] = useState<string | null>(null);
  // Bump para forçar árvore/explorer/editor a recarregar após o agente ou uma mutação.
  const [fsVersion, setFsVersion] = useState(0);

  function refreshFs() {
    setFsVersion((v) => v + 1);
  }

  function navigate(path: string) {
    setCurrentPath(path);
    setOpenFile(null);
  }

  function openFileAt(path: string) {
    setOpenFile(path);
  }

  function backToFolder() {
    setOpenFile(null);
  }

  const treePath = openFile
    ? openFile.includes("/")
      ? openFile.slice(0, openFile.lastIndexOf("/"))
      : ""
    : currentPath;

  return (
    <div className="flex gap-0 -mx-6 -my-6" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* árvore de pastas */}
      <aside className="w-[220px] shrink-0 border-r border-app overflow-hidden">
        <FileTree slug={slug} currentPath={treePath} onNavigate={navigate} refreshKey={fsVersion} />
      </aside>

      {/* explorer ou editor */}
      <div className="flex-1 min-w-0 border-r border-app overflow-hidden">
        {openFile ? (
          <FileEditor key={`${openFile}-${fsVersion}`} slug={slug} path={openFile} onSaved={refreshFs} onBack={backToFolder} />
        ) : (
          <FileExplorer
            key={fsVersion}
            slug={slug}
            currentPath={currentPath}
            onNavigate={navigate}
            onOpenFile={openFileAt}
            refreshKey={fsVersion}
            onRefresh={refreshFs}
          />
        )}
      </div>

      {/* chat lateral */}
      <div className="w-[380px] shrink-0 overflow-hidden">
        <ChatPanel slug={slug} enabled={chatEnabled} onActivity={refreshFs} />
      </div>
    </div>
  );
}
