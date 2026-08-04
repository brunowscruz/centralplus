import { requireWorkspace } from "@/lib/access";
import { anthropicApiKey } from "@/lib/agent";
import { readFinanceiro } from "@/lib/financeiro";
import FinanceiroWorkspace from "./FinanceiroWorkspace";

export const dynamic = "force-dynamic";

// Módulo Financeiro (nativo, modelo de dados inspirado no Actual Budget —
// ver lib/financeiro.ts e nota de licença no catálogo). Abas: Visão Geral,
// Entradas, Saídas, Contas a Receber, Contas a Pagar, Assinaturas, Fluxo de
// Caixa — mais um assistente financeiro (estilo AlumBot) no chat.
export default async function FinanceiroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireWorkspace(slug);
  const inicial = readFinanceiro(slug);
  const chatEnabled = !!anthropicApiKey();

  return <FinanceiroWorkspace slug={slug} inicial={inicial} chatEnabled={chatEnabled} />;
}
