import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerDiagnostico } from "@/lib/seoLocal";

/** Baixa o diagnóstico já pronto (markdown) — sem geração, é conteúdo
 * estático que o Agente 3 já escreveu. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; nome: string }> }) {
  const { slug: raw, nome: rawNome } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const nome = decodeURIComponent(rawNome);
  const conteudo = lerDiagnostico(auth.slug, nome);
  if (conteudo === null) {
    return NextResponse.json({ error: "diagnóstico não encontrado" }, { status: 404 });
  }
  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}.md"`,
    },
  });
}
