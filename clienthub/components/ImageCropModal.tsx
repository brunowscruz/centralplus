"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type FormatoRecorte = "4:3" | "1:1" | "original";

const DIM: Record<Exclude<FormatoRecorte, "original">, { w: number; h: number }> = {
  "4:3": { w: 400, h: 300 },
  "1:1": { w: 340, h: 340 },
};

/**
 * Modal de ajustar imagem — escolher formato (4:3, quadrado ou usar
 * inteira), dar zoom, arrastar pra reposicionar, e aplicar o recorte de
 * verdade (canvas, não é só visual) antes de salvar. Inspirado no
 * concorrente Geolocal (validado com o usuário via mockup) — pensado pra
 * ser reutilizável em QUALQUER upload de imagem do produto, não só fotos
 * de perfil do SEO Local.
 */
export default function ImageCropModal({
  arquivo,
  onFechar,
  onAplicar,
}: {
  arquivo: File;
  onFechar: () => void;
  onAplicar: (blob: Blob, nomeArquivo: string) => void;
}) {
  const [formato, setFormato] = useState<FormatoRecorte>("4:3");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrastando = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  // trocar de formato reseta o enquadramento — evita herdar um offset que
  // não faz sentido na nova proporção.
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [formato]);

  const dim = formato === "original" ? null : DIM[formato];

  useEffect(() => {
    if (!imgEl || !canvasRef.current || !dim) return;
    const canvas = canvasRef.current;
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dim.w, dim.h);
    // escala base cobre o quadro inteiro (mesma ideia de object-fit: cover), zoom multiplica em cima disso
    const escalaBase = Math.max(dim.w / imgEl.width, dim.h / imgEl.height);
    const escala = escalaBase * zoom;
    const w = imgEl.width * escala;
    const h = imgEl.height * escala;
    ctx.drawImage(imgEl, (dim.w - w) / 2 + offset.x, (dim.h - h) / 2 + offset.y, w, h);
  }, [imgEl, dim, zoom, offset]);

  function onPointerDown(e: React.PointerEvent) {
    arrastando.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!arrastando.current) return;
    setOffset({ x: e.clientX - arrastando.current.x, y: e.clientY - arrastando.current.y });
  }
  function pararArraste() {
    arrastando.current = null;
  }

  function aplicar() {
    setAplicando(true);
    if (formato === "original" || !canvasRef.current) {
      onAplicar(arquivo, arquivo.name);
      return;
    }
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onAplicar(blob, arquivo.name.replace(/\.\w+$/, ".jpg"));
        setAplicando(false);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-semibold">Ajustar imagem</h2>
          <button onClick={onFechar} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1.5 mb-4">
          {(["4:3", "1:1", "original"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormato(f)}
              className={`ws-tab flex-1 text-center justify-center ${formato === f ? "ws-tab--active" : ""}`}
            >
              {f === "4:3" ? "4:3 horizontal" : f === "1:1" ? "1:1 quadrado" : "Usar inteira"}
            </button>
          ))}
        </div>

        {formato === "original" ? (
          <div className="rounded-xl overflow-hidden border border-app mb-4 flex items-center justify-center" style={{ aspectRatio: "16/10", background: "color-mix(in srgb, var(--text) 4%, var(--card))" }}>
            {imgEl && <img src={imgEl.src} alt="" className="max-w-full max-h-full object-contain" />}
          </div>
        ) : (
          <div className="mb-4">
            <canvas
              ref={canvasRef}
              className="rounded-xl border border-app w-full cursor-move touch-none"
              style={{ aspectRatio: dim ? `${dim.w}/${dim.h}` : undefined }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={pararArraste}
              onPointerLeave={pararArraste}
            />
            <p className="text-[11px] text-muted mt-1.5">Arraste a imagem pra reposicionar.</p>
          </div>
        )}

        {formato !== "original" && (
          <div className="flex items-center gap-3 mb-5 text-xs text-muted">
            <span>Zoom</span>
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-accent" />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onFechar} className="btn-ghost text-sm px-4 py-2">Cancelar</button>
          <button onClick={aplicar} disabled={aplicando} className="btn-accent text-sm px-4 py-2 disabled:opacity-60">
            {aplicando ? "Aplicando…" : "Aplicar recorte"}
          </button>
        </div>
      </div>
    </div>
  );
}
