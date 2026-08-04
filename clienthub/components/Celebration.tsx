"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

interface CelebrationPayload {
  title: string;
  message: string;
}
interface CelebrationCtx {
  celebrate: (payload: CelebrationPayload) => void;
  payload: CelebrationPayload | null;
  close: () => void;
}

const Ctx = createContext<CelebrationCtx | null>(null);

/** Provider único no layout raiz — só estado (mesmo padrão do
 * Toast/Confirm). Dispara em marcos reais e raros (primeira campanha
 * aplicada no Google Ads, primeiro site aprovado), nunca em ação repetitiva
 * — celebração toda hora vira ruído (decisão registrada em
 * docs/DESIGN-GUIDE.md). */
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const celebrate = useCallback((p: CelebrationPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);
  return <Ctx.Provider value={{ celebrate, payload, close }}>{children}</Ctx.Provider>;
}

export function useCelebration() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCelebration precisa estar dentro de <CelebrationProvider>");
  return ctx.celebrate;
}

/** Monta uma vez dentro de cada <ThemeScope> — mesmo padrão do
 * ConfirmViewport/ToastViewport. */
export function CelebrationViewport() {
  const ctx = useContext(Ctx);
  if (!ctx || !ctx.payload) return null;
  return <CelebrationOverlay payload={ctx.payload} onClose={ctx.close} />;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
}

function CelebrationOverlay({ payload, onClose }: { payload: CelebrationPayload; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // abre num frame seguinte pra animação de entrada do card disparar de verdade.
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || reduceMotion) return;

    const accent = getComputedStyle(canvas).getPropertyValue("--accent").trim() || "#3b82f6";
    const colors = [accent, "#4ade80", "#f59e0b", "#8d7cf6", "#f87171"];
    const particles: Particle[] = [];
    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 6,
        color: colors[i % colors.length],
        vy: 2 + Math.random() * 2.5,
        vx: -1 + Math.random() * 2,
        rot: Math.random() * Math.PI,
        vr: -0.15 + Math.random() * 0.3,
      });
    }

    let animId: number;
    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < canvas.height + 30) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={`celebration-overlay ${open ? "open" : ""}`}>
      <canvas ref={canvasRef} />
      <div className="celeb-card">
        <div className="celeb-check">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <h3>{payload.title}</h3>
        <p>{payload.message}</p>
        <button className="celeb-close" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
