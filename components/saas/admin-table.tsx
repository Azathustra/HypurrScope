export function AdminTable({
  title,
  rows
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
}) {
  const keys = Object.keys(rows[0] ?? {});

  return (
    <section className="premium-card overflow-x-auto rounded-[20px] p-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <table className="mt-5 min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            {keys.map((key) => (
              <th key={key} className="border-b border-line px-3 py-3">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line last:border-0">
              {keys.map((key) => (
                <td key={key} className="px-3 py-3 text-white">{row[key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
