"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Campo de tags editável — digitar, apertar Enter, vira chip; aceita colar
 * lista separada por vírgula/ponto-e-vírgula de uma vez. Genérico (só lida
 * com string[]) — quem converte pra formato estruturado (ex servicos com
 * slug) é o caller/API, não este componente. Inspirado no padrão do
 * concorrente Geolocal (validado com o usuário via mockup antes de
 * implementar).
 */
export default function TagInput({
  valores,
  onChange,
  placeholder,
  disabled,
}: {
  valores: string[];
  onChange: (proximos: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState("");

  function adicionar() {
    const partes = texto.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
    if (partes.length === 0) return;
    onChange([...valores, ...partes]);
    setTexto("");
  }

  function remover(i: number) {
    onChange(valores.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2" style={{ minHeight: valores.length ? undefined : 0 }}>
        {valores.map((v, i) => (
          <span key={`${v}-${i}`} className="kw-tag flex items-center gap-1.5">
            {v}
            <button onClick={() => remover(i)} disabled={disabled} className="text-muted hover:text-app" aria-label={`Remover ${v}`}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="input flex-1 px-3 py-2 text-sm"
        />
        <span className="text-[10px] text-muted border border-app rounded px-1.5 py-1 self-center font-mono">ENTER</span>
      </div>
    </div>
  );
}
