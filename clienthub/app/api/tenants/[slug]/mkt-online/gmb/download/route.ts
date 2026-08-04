import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerPerfilGMB, gerarArquivoGmb } from "@/lib/mktOnline";

/** Arquivo de texto pronto pra colar campo a campo no Google Meu Negócio —
 * não existe formato de importação em massa pro GMB, então isso é sempre
 * um texto organizado, não um CSV de import automático. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const perfil = lerPerfilGMB(auth.slug);
  if (!perfil) {
    return NextResponse.json({ error: "gere o perfil antes de baixar" }, { status: 400 });
  }
  const conteudo = gerarArquivoGmb(perfil);
  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="google-meu-negocio.txt"',
    },
  });
}
