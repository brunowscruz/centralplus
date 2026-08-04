import fs from "node:fs";
import path from "node:path";
import { Client } from "basic-ftp";
import { tenantRoot } from "./bos";
import { SITE_DIR } from "./site";
import { readIntegrations, registrarResultadoPublicacao, PublicacaoFtpConfig } from "./integrations";

/**
 * Publicação do site aprovado (seção "Meu Site") pro destino configurado por
 * cliente — hoje só FTP é publicação de verdade (upload real via
 * `basic-ftp`). Git fica registrado como configuração pronta, mas marcado
 * "em construção": sem um servidor real recebendo o push (Coolify, Vercel
 * etc.) configurado, publicar via git não teria efeito nenhum — não faz
 * sentido fingir que funciona. Ver docs/PUBLICACAO-DE-SITE.md.
 */

export interface ResultadoPublicacao {
  ok: boolean;
  mensagem: string;
}

// Sobe o conteúdo de localDir pro diretório ATUAL do FTP (cwd da conexão) —
// entra/sai de subpastas só por nome relativo (ensureDir/cdup), nunca monta
// caminho absoluto reconstruído, pra não depender de o servidor resolver
// "diretorioRemoto" como absoluto ou relativo.
async function uploadDirFtp(client: Client, localDir: string): Promise<number> {
  let enviados = 0;
  for (const entry of fs.readdirSync(localDir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const localPath = path.join(localDir, entry.name);
    if (entry.isDirectory()) {
      await client.ensureDir(entry.name);
      enviados += await uploadDirFtp(client, localPath);
      await client.cdup();
    } else {
      await client.uploadFrom(localPath, entry.name);
      enviados++;
    }
  }
  return enviados;
}

async function publicarViaFtp(slug: string, ftp: PublicacaoFtpConfig): Promise<ResultadoPublicacao> {
  if (!ftp.host || !ftp.usuario || !ftp.senha) {
    return { ok: false, mensagem: "FTP não está totalmente configurado (host/usuário/senha) — confira em Configurações → Publicação." };
  }
  const siteAbs = path.join(tenantRoot(slug), SITE_DIR);
  if (!fs.existsSync(siteAbs)) {
    return { ok: false, mensagem: "não há site aprovado pra publicar ainda." };
  }

  const client = new Client(15000);
  try {
    await client.access({
      host: ftp.host,
      port: ftp.porta || 21,
      user: ftp.usuario,
      password: ftp.senha,
      secure: !!ftp.seguro,
    });
    if (ftp.diretorioRemoto) await client.ensureDir(ftp.diretorioRemoto);
    const enviados = await uploadDirFtp(client, siteAbs);
    return { ok: true, mensagem: `${enviados} arquivo${enviados === 1 ? "" : "s"} enviado${enviados === 1 ? "" : "s"} por FTP com sucesso.` };
  } catch (e) {
    return { ok: false, mensagem: `falha no FTP: ${(e as Error).message}` };
  } finally {
    client.close();
  }
}

/** Chamado depois que o operador aprova uma versão (site/ atualizado) —
 * publica no destino configurado, se houver. Nunca lança erro: falha de
 * publicação não pode derrubar a aprovação em si (que já aconteceu local). */
export async function publicarSeConfigurado(slug: string): Promise<ResultadoPublicacao | null> {
  const { publicacao } = readIntegrations(slug);
  if (!publicacao || publicacao.metodo === "nenhum") return null;

  let resultado: ResultadoPublicacao;
  if (publicacao.metodo === "ftp") {
    resultado = await publicarViaFtp(slug, publicacao.ftp || {});
  } else {
    resultado = {
      ok: false,
      mensagem: "publicação via git ainda não está ligada nesta instalação — depende de um servidor com deploy automático (Coolify, Vercel...) configurado pra esse repositório.",
    };
  }
  registrarResultadoPublicacao(slug, resultado.ok, resultado.mensagem);
  return resultado;
}
