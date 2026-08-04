import { requireWorkspace } from "@/lib/access";
import { getTenant } from "@/lib/tenants";
import { readCrm } from "@/lib/crm";
import CrmWorkspace from "./CrmWorkspace";

export const dynamic = "force-dynamic";

// Módulo CRM (nativo, modelo de dados inspirado no Frappe CRM — ver
// lib/crm.ts e a nota de licença no catálogo de módulos). Abas no padrão da
// referência: Início | Funil | Negócios | WhatsApp | Tarefas, mais
// Leads | Anotações | Ligações.
export default async function CrmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireWorkspace(slug);
  const inicial = readCrm(slug);
  const financeiroAtivo = getTenant(slug).modulos_ativos.includes("financeiro");

  return <CrmWorkspace slug={slug} inicial={inicial} financeiroAtivo={financeiroAtivo} />;
}
