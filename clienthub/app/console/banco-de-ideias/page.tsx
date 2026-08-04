import { listIdeias, IdeiaStatus } from "@/lib/ideias";
import NovaIdeiaForm from "./NovaIdeiaForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<IdeiaStatus, string> = {
  ideia: "Ideia",
  em_avaliacao: "Em avaliação",
  em_construcao: "Em construção",
  disponivel: "Disponível",
};

// Banco de Ideias (seção 18/23 do spec): backlog vivo — toda ideia de módulo
// mencionada numa conversa entra aqui antes de qualquer decisão de construir.
export default async function BancoDeIdeiasPage() {
  const ideias = listIdeias();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Banco de Ideias</h1>
          <p className="text-muted text-sm mt-0.5">
            {ideias.length} ideia{ideias.length === 1 ? "" : "s"} registrada
            {ideias.length === 1 ? "" : "s"} — nada se perde entre conversas.
          </p>
        </div>
        <NovaIdeiaForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ideias.map((i) => (
          <div key={i.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{i.titulo}</h3>
              <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-app whitespace-nowrap">
                {STATUS_LABEL[i.status]}
              </span>
            </div>
            <p className="text-xs text-muted mt-2">{i.descricao}</p>
            <div className="flex items-center justify-between mt-3 text-[11px] text-muted">
              <span>{i.vertical}</span>
              {i.criado_em && <span>{new Date(i.criado_em).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
        ))}
      </div>

      {ideias.length === 0 && (
        <p className="text-sm text-muted">Nenhuma ideia registrada ainda.</p>
      )}
    </div>
  );
}
