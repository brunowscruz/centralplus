"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renderiza filhos direto em document.body — necessário pra modais abertos
 * de dentro de linhas de tabela (um <div fixed> como filho de <tr> é HTML
 * inválido e quebra a hidratação). */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
