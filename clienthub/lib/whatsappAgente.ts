import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { z } from "zod";
import { readIntegrations } from "./integrations";
import { readCrm, updateLead, addTarefa, type CrmLead } from "./crm";
import { listarConversa, enviarERegistrar } from "./whatsapp";

/**
 * Agente de IA que responde sozinho no WhatsApp por etapa do funil —
 * inspirado no design do wa-agent (`_referencias/wa-agent-main`): system
 * prompt = personalidade + histórico recente, loop de tool-calling via
 * `generateText`/`stopWhen: stepCountIs(N)` do Vercel AI SDK, handoff pra
 * humano como tool + flag persistida no lead. Mas plugado no webhook do
 * Evolution API que já temos — não abre conexão WhatsApp própria (o
 * wa-agent conecta direto no Baileys, o que duplicaria a conexão que já
 * existe). Usa a ANTHROPIC_API_KEY global (mesma do módulo Claude Code),
 * sem segredo novo por cliente. Ver docs/WHATSAPP-EVOLUTION-API.md.
 */

const MODELO = "claude-sonnet-4-5-20250929";

// evita responder duas vezes se o Evolution API reenviar o mesmo webhook
// (retry) enquanto a primeira chamada ainda está em andamento
const emProcessamento = new Set<string>();

function montarSystemPrompt(personalidade: string, lead: CrmLead, fases: { id: string; nome: string }[]): string {
  const faseAtual = fases.find((f) => f.id === lead.faseId);
  return [
    personalidade.trim(),
    "",
    `Você está conversando com "${lead.nome}" pelo WhatsApp do CRM. Etapa atual do funil: ${faseAtual?.nome || "desconhecida"}.`,
    "Responda de forma curta e direta — é WhatsApp, não e-mail.",
    "Se o lead pedir pra falar com uma pessoa de verdade, ou você não conseguir ajudar, use a ferramenta pedir_atendimento_humano.",
    "Se perceber que o lead avançou de etapa no funil (ex.: fechou negócio, perdeu interesse), use mover_lead_fase.",
  ].join("\n");
}

function montarFerramentas(slug: string, lead: CrmLead, fases: { id: string; nome: string }[]) {
  const ferramentas: ToolSet = {
    pedir_atendimento_humano: tool({
      description: "Escala a conversa pra um atendente humano — o agente de IA para de responder esse lead até alguém reverter manualmente.",
      inputSchema: z.object({ motivo: z.string().describe("por que precisa de um humano") }),
      execute: async ({ motivo }: { motivo: string }) => {
        updateLead(slug, lead.id, { atendimentoHumano: true });
        addTarefa(slug, { titulo: `Lead pediu atendimento humano: ${motivo}`, leadId: lead.id });
        return { ok: true };
      },
    }),
  };

  if (fases.length > 0) {
    ferramentas.mover_lead_fase = tool({
      description: "Move o lead pra outra etapa do funil de vendas.",
      inputSchema: z.object({
        faseId: z.enum(fases.map((f) => f.id) as [string, ...string[]]).describe("id da nova etapa"),
      }),
      execute: async ({ faseId }: { faseId: string }) => {
        updateLead(slug, lead.id, { faseId });
        return { ok: true };
      },
    });
  }

  return ferramentas;
}

/** Responde uma mensagem recebida no WhatsApp usando o agente de IA
 * configurado para esse cliente — chamado pelo webhook depois de já ter
 * registrado a mensagem recebida e atualizado/criado o lead. */
export async function responderComAgente(slug: string, lead: CrmLead, textoRecebido: string): Promise<void> {
  if (!lead.whatsapp) return;
  if (!process.env.ANTHROPIC_API_KEY) return;

  const chave = `${slug}:${lead.whatsapp.replace(/\D/g, "")}`;
  if (emProcessamento.has(chave)) return;
  emProcessamento.add(chave);

  try {
    const integracoes = readIntegrations(slug);
    const agenteIA = integracoes.whatsapp?.agenteIA;
    if (!agenteIA?.ativo || !agenteIA.personalidade.trim()) return;
    if (agenteIA.faseIds?.length && !agenteIA.faseIds.includes(lead.faseId)) return;

    const crm = readCrm(slug);
    const leadAtual = crm.leads.find((l) => l.id === lead.id) || lead;
    if (leadAtual.atendimentoHumano) return;

    const historico = listarConversa(slug, lead.whatsapp).slice(-20);
    const mensagens = historico.map((m) => ({
      role: (m.direcao === "enviada" ? "assistant" : "user") as "assistant" | "user",
      content: m.texto,
    }));
    // garante que a mensagem que acabou de chegar está no fim, mesmo que o
    // registro em dados/whatsapp.json ainda não tenha sido lido de volta
    if (mensagens[mensagens.length - 1]?.content !== textoRecebido) {
      mensagens.push({ role: "user", content: textoRecebido });
    }

    const resultado = await generateText({
      model: anthropic(MODELO),
      system: montarSystemPrompt(agenteIA.personalidade, leadAtual, crm.fases),
      messages: mensagens,
      tools: montarFerramentas(slug, leadAtual, crm.fases),
      stopWhen: stepCountIs(6),
    });

    if (resultado.text?.trim()) {
      await enviarERegistrar(slug, lead.whatsapp, resultado.text.trim(), true);
    }
  } catch (e) {
    console.error(`[whatsappAgente] falha ao responder ${slug}/${lead.whatsapp}:`, e);
  } finally {
    emProcessamento.delete(chave);
  }
}
