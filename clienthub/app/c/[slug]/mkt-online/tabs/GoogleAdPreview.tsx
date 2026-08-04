/**
 * Prévia visual de como o anúncio aparece de verdade nos resultados de
 * busca do Google (Rede de Pesquisa — só texto, sem imagem). Não é uma
 * simulação exata do algoritmo de combinação de headlines do Google (isso
 * é decidido pelo próprio Google em tempo real), é uma prévia honesta de
 * COMO os dados que a IA escreveu vão se parecer no formato real.
 */
export default function GoogleAdPreview({
  titulo,
  descricao,
  urlDestino,
}: {
  titulo: string;
  descricao: string;
  urlDestino?: string;
}) {
  const dominio = extrairDominio(urlDestino);

  return (
    <div className="rounded-xl border border-app bg-white p-4" style={{ colorScheme: "light" }}>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: "#e8eaed", color: "#4d5156" }}
        >
          Anúncio
        </span>
        <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "#202124" }}>
          <span className="h-4 w-4 rounded-full bg-gray-300 inline-block shrink-0" />
          <span>{dominio || "seusite.com.br"}</span>
        </div>
      </div>
      <div className="text-[20px] leading-tight" style={{ color: "#1a0dab" }}>
        {titulo || "Título do anúncio"}
      </div>
      <p className="text-[14px] mt-0.5" style={{ color: "#4d5156" }}>
        {descricao || "Descrição do anúncio aparece aqui."}
      </p>
    </div>
  );
}

function extrairDominio(url?: string): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//.test(url) ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
