"use client";

import { useEffect, useState } from "react";

function toTitleCase(s: string): string {
  return s.replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1));
}

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="h-[68px]" />; // evita salto de layout no primeiro paint

  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = toTitleCase(
    now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
  );

  return (
    <div className="text-center py-6">
      <p className="text-4xl font-light tabular-nums tracking-tight">{time}</p>
      <p className="text-sm text-muted mt-1">{date}</p>
    </div>
  );
}
