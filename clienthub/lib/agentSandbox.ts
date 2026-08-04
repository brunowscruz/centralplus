import path from "node:path";
import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { bosRoot } from "./bos";

/**
 * Trava real de isolamento entre clientes pras sessões do Agent SDK (chat do
 * workspace, `app/api/tenants/[slug]/chat/route.ts`).
 *
 * Sem isso, nada impede a sessão de um cliente de ler/listar a pasta de
 * OUTRO cliente — testado e confirmado: `permissionMode: "bypassPermissions"`
 * pula o controle de permissão inteiro (inclusive esse `canUseTool`, se
 * existisse um), e o `sandbox` nativo do SDK não restringe caminho de
 * arquivo (testado também). O único jeito real de barrar isso hoje é esta
 * função: usada como `canUseTool`, SEM `bypassPermissions`/
 * `allowDangerouslySkipPermissions`.
 *
 * Regra: nega qualquer caminho fora do `cwd` (a pasta do próprio cliente),
 * exceto uma allowlist pequena e explícita — infraestrutura compartilhada que
 * os prompts dos módulos já usam de propósito (scripts do B-O-S, o próprio
 * app clienthub, e diretórios extras que quem chama passar, ex: pasta de
 * skills compartilhadas). Read/Write/Edit/Glob/Grep são barrados com certeza
 * (parâmetro de caminho estruturado, resolução exata). Bash é melhor esforço
 * — inspeciona o texto do comando à procura de caminho fora da allowlist;
 * cobre o caso real (pedir pro agente ler/copiar arquivo de outro cliente),
 * mas não é um parser de shell de verdade — não trate como garantia absoluta
 * contra alguém deliberadamente tentando burlar com sintaxe exótica.
 */

const CLIENTHUB_ROOT = process.cwd();
const BOS_SCRIPTS_DIR = path.join(bosRoot(), "scripts");

function normalizar(p: string): string {
  return p.replace(/\$\{?CLIENTHUB_ROOT\}?/g, CLIENTHUB_ROOT);
}

function resolverContra(cwd: string, alvo: string): string {
  return path.resolve(cwd, normalizar(alvo));
}

function dentroDe(resolvido: string, base: string): boolean {
  return resolvido === base || resolvido.startsWith(base + path.sep);
}

// Token de caminho começando em "..", "~" ou "/": pega a sequência inteira
// (múltiplos "../" seguidos, resto do caminho) até achar espaço/aspas.
const RE_TOKEN_CAMINHO = /(?:^|[\s"'`(=])((?:\.\.[/\\])+[^\s"'`)]*|~[^\s"'`)]*|\/[^\s"'`)]*)/g;
// ".." isolado (ex: "cd ..") sem barra/sufixo depois.
const RE_DOTDOT_SOLTO = /(^|[\s;&|])\.\.($|[\s;&|])/;

function bashPareceSeguro(comando: string, cwd: string, permitidos: string[]): boolean {
  const permitido = (alvo: string) => {
    const resolvido = resolverContra(cwd, alvo);
    return permitidos.some((base) => dentroDe(resolvido, base));
  };

  if (RE_DOTDOT_SOLTO.test(comando) && !permitido("..")) return false;

  for (const m of comando.matchAll(RE_TOKEN_CAMINHO)) {
    const alvo = m[1];
    if (alvo === "~") continue; // home do processo — não é pasta de cliente
    if (!permitido(alvo)) return false;
  }
  return true;
}

/** `extrasPermitidos` são caminhos ABSOLUTOS adicionais liberados (ex: pasta
 * de skills compartilhadas) — some com o allowlist padrão (cwd, clienthub,
 * B-O-S/scripts). Use sempre junto de `permissionMode` != "bypassPermissions"
 * e sem `allowDangerouslySkipPermissions` — com essas duas ligadas o SDK
 * nunca chama esta função. */
export function criarGuardaSandbox(cwd: string, extrasPermitidos: string[] = []): CanUseTool {
  const permitidos = [cwd, CLIENTHUB_ROOT, BOS_SCRIPTS_DIR, ...extrasPermitidos];

  const caminhoPermitido = (alvo: string) => {
    const resolvido = resolverContra(cwd, alvo);
    return permitidos.some((base) => dentroDe(resolvido, base));
  };

  return async (toolName, input) => {
    if (toolName === "Read" || toolName === "Write" || toolName === "Edit" || toolName === "NotebookEdit") {
      const alvo = (input as { file_path?: string }).file_path;
      if (alvo && !caminhoPermitido(alvo)) {
        return { behavior: "deny", message: "Esse arquivo está fora da pasta deste cliente — bloqueado por isolamento entre clientes." };
      }
    }
    if (toolName === "Glob" || toolName === "Grep") {
      const alvo = (input as { path?: string }).path;
      if (alvo && !caminhoPermitido(alvo)) {
        return { behavior: "deny", message: "Essa pasta está fora da pasta deste cliente — bloqueado por isolamento entre clientes." };
      }
    }
    if (toolName === "Bash") {
      const comando = String((input as { command?: string }).command || "");
      if (!bashPareceSeguro(comando, cwd, permitidos)) {
        return { behavior: "deny", message: "Esse comando tenta acessar algo fora da pasta deste cliente — bloqueado por isolamento entre clientes." };
      }
    }
    return { behavior: "allow", updatedInput: input };
  };
}
