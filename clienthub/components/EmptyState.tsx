"use client";

import { useEffect, useRef } from "react";

type Mood = "curious" | "speech" | "happy";

/** Desenha um personagem simples (blob orgânico + rosto) via canvas,
 * procedural — nunca ilustração desenhada à mão de verdade (custo de manter
 * uma família inteira consistente não compensa aqui). Mesma técnica
 * validada com o operador na exploração de design antes de entrar no
 * produto. Usa a cor de destaque do cliente (--accent), então já nasce
 * certa em qualquer tema/cor. */
function blobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
  const pts: [number, number][] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.14 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 1.7);
    pts.push([cx + Math.cos(a) * r * wobble, cy + Math.sin(a) * r * wobble]);
  }
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let j = 0; j < n; j++) {
    const mx = (pts[j][0] + pts[j + 1][0]) / 2;
    const my = (pts[j][1] + pts[j + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[j][0], pts[j][1], mx, my);
  }
  ctx.closePath();
}

function shade(hex: string, pct: number): string {
  const clean = hex.trim();
  if (!/^#([0-9a-f]{6})$/i.test(clean)) return clean;
  const n = parseInt(clean.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + Math.round((255 * pct) / 100)));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + Math.round((255 * pct) / 100)));
  const b = Math.min(255, Math.max(0, (n & 255) + Math.round((255 * pct) / 100)));
  return `rgb(${r},${g},${b})`;
}

function drawCharacter(canvas: HTMLCanvasElement, seed: number, accent: string, mood: Mood) {
  const dpr = window.devicePixelRatio || 1;
  const size = 84;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const cx = size / 2;
  const cy = size / 2 + 3;
  const r = 26;

  blobPath(ctx, cx, cy + 23, r * 0.7, seed + 9);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fill();

  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, accent);
  grad.addColorStop(1, shade(accent, -18));
  blobPath(ctx, cx, cy, r, seed);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 2, 2.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7, cy - 2, 2.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20,20,25,0.85)";
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7, cy - 2, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (mood === "happy") ctx.arc(cx, cy + 7, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === "curious") ctx.arc(cx, cy + 10, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
  else {
    ctx.moveTo(cx - 4, cy + 11);
    ctx.lineTo(cx + 4, cy + 11);
  }
  ctx.stroke();

  ctx.strokeStyle = shade(accent, -30);
  ctx.lineWidth = 2;
  if (mood === "curious") {
    ctx.beginPath();
    ctx.arc(cx + 22, cy - 18, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy - 14);
    ctx.lineTo(cx + 31, cy - 9);
    ctx.stroke();
  } else if (mood === "speech") {
    ctx.beginPath();
    ctx.roundRect(cx + 15, cy - 28, 20, 13, 4);
    ctx.stroke();
  }
}

export default function EmptyState({
  mood = "curious",
  seed = 1,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  mood?: Mood;
  /** varia a forma do blob entre instâncias na mesma tela (evita clones idênticos). */
  seed?: number;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3b82f6";
    // --accent normalmente vem de um wrapper (ThemeScope), não do :root —
    // sobe o DOM até achar o valor computado de verdade no elemento certo.
    const scoped = getComputedStyle(canvas).getPropertyValue("--accent").trim() || accent;
    drawCharacter(canvas, seed, scoped || "#3b82f6", mood);
  }, [mood, seed]);

  return (
    <div className="empty-illustrated">
      <canvas ref={canvasRef} />
      <p className="empty-illustrated__title">{title}</p>
      <p className="empty-illustrated__subtitle">{subtitle}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-accent px-4 py-2 text-xs mt-1">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
