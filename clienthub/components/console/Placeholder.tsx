/**
 * Placeholder honesto para telas do Console que dependem de integração
 * externa ainda não configurada nesta instalação (seção 3 do spec). Não
 * fabrica dado — só explica o que vai existir ali e do que depende.
 */
export default function Placeholder({
  title,
  description,
  dependsOn,
}: {
  title: string;
  description: string;
  dependsOn: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted text-sm mt-0.5">{description}</p>
      </div>
      <div className="card p-6">
        <p className="text-sm text-muted">Em construção — depende de:</p>
        <ul className="mt-2 space-y-1">
          {dependsOn.map((d) => (
            <li key={d} className="text-sm flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
