interface ComparisonTableProps {
  headers: string[];
  rows: string[][];
  highlight?: number; // 1-indexed column to highlight
}

export function ComparisonTable({
  headers,
  rows,
  highlight,
}: ComparisonTableProps) {
  return (
    <div className="my-6 overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className={`text-left py-3 px-4 font-semibold text-stone-900 border-b-2 border-stone-200 ${
                  highlight && i + 1 === highlight
                    ? "bg-orange-50 text-orange-800"
                    : ""
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-stone-100">
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={`py-3 px-4 text-stone-600 ${
                    cellIdx === 0 ? "font-medium text-stone-800" : ""
                  } ${
                    highlight && cellIdx + 1 === highlight
                      ? "bg-orange-50/50 text-orange-800 font-medium"
                      : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
