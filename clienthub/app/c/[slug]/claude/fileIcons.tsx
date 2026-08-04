import {
  Folder,
  File,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  FileTerminal,
  FileType,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

/** Mapa de extensão → ícone + cor, só pra dar identidade visual por tipo de
 * arquivo (estilo Explorer/Finder) — não tem relação com o que o arquivo faz. */
const EXT_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  ".js": { icon: FileCode, color: "#eab308" },
  ".jsx": { icon: FileCode, color: "#eab308" },
  ".mjs": { icon: FileCode, color: "#eab308" },
  ".cjs": { icon: FileCode, color: "#eab308" },
  ".ts": { icon: FileCode, color: "#3b82f6" },
  ".tsx": { icon: FileCode, color: "#3b82f6" },
  ".py": { icon: FileCode, color: "#22c55e" },
  ".html": { icon: FileCode, color: "#f97316" },
  ".htm": { icon: FileCode, color: "#f97316" },
  ".css": { icon: FileCode, color: "#0ea5e9" },
  ".json": { icon: FileJson, color: "#eab308" },
  ".yml": { icon: FileJson, color: "#a3a3a3" },
  ".yaml": { icon: FileJson, color: "#a3a3a3" },
  ".md": { icon: FileText, color: "#94a3b8" },
  ".txt": { icon: FileText, color: "#94a3b8" },
  ".csv": { icon: FileSpreadsheet, color: "#22c55e" },
  ".xlsx": { icon: FileSpreadsheet, color: "#22c55e" },
  ".xls": { icon: FileSpreadsheet, color: "#22c55e" },
  ".pdf": { icon: FileText, color: "#ef4444" },
  ".png": { icon: FileImage, color: "#ec4899" },
  ".jpg": { icon: FileImage, color: "#ec4899" },
  ".jpeg": { icon: FileImage, color: "#ec4899" },
  ".gif": { icon: FileImage, color: "#ec4899" },
  ".webp": { icon: FileImage, color: "#ec4899" },
  ".svg": { icon: FileImage, color: "#ec4899" },
  ".mp4": { icon: FileVideo, color: "#a855f7" },
  ".mov": { icon: FileVideo, color: "#a855f7" },
  ".mp3": { icon: FileAudio, color: "#a855f7" },
  ".wav": { icon: FileAudio, color: "#a855f7" },
  ".zip": { icon: FileArchive, color: "#78716c" },
  ".rar": { icon: FileArchive, color: "#78716c" },
  ".sh": { icon: FileTerminal, color: "#78716c" },
  ".command": { icon: FileTerminal, color: "#78716c" },
  ".bat": { icon: FileTerminal, color: "#78716c" },
  ".env": { icon: KeyRound, color: "#f59e0b" },
  ".font": { icon: FileType, color: "#94a3b8" },
};

export const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i).toLowerCase();
}

export function iconFor(name: string, type: "dir" | "file"): { icon: LucideIcon; color: string } {
  if (type === "dir") return { icon: Folder, color: "#eab308" };
  return EXT_ICON[extOf(name)] || { icon: File, color: "#a3a3a3" };
}

export function isImage(name: string): boolean {
  return IMAGE_EXT.has(extOf(name));
}

export function EntryIcon({ name, type, size = 22 }: { name: string; type: "dir" | "file"; size?: number }) {
  const { icon: Icon, color } = iconFor(name, type);
  return <Icon size={size} color={color} fill={type === "dir" ? color : "none"} fillOpacity={type === "dir" ? 0.18 : 0} strokeWidth={1.6} />;
}
