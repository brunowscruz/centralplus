const PALETTE = [
  "#6366f1", // índigo
  "#2563eb", // azul
  "#0d9488", // teal
  "#16a34a", // verde
  "#ca8a04", // âmbar
  "#dc2626", // vermelho
  "#c026d3", // magenta
  "#7c3aed", // roxo
  "#0891b2", // ciano
  "#db2777", // rosa
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar circular com iniciais e cor determinística — mesmo nome sempre gera a mesma cor. */
export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      className="avatar"
      style={{
        height: size,
        width: size,
        background: color,
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </span>
  );
}
