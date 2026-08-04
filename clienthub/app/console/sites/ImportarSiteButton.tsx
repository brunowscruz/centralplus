"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import ImportarSiteModal from "./ImportarSiteModal";

export default function ImportarSiteButton({ tenants }: { tenants: { slug: string; nome: string }[] }) {
  const [open, setOpen] = useState(false);
  if (tenants.length === 0) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-accent px-3.5 py-2 text-xs inline-flex items-center gap-1.5">
        <UploadCloud size={14} /> Importar site
      </button>
      {open && <ImportarSiteModal tenants={tenants} onClose={() => setOpen(false)} />}
    </>
  );
}
