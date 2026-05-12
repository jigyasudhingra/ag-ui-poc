'use client';

type Cell = string | number | boolean | null | undefined;

export interface DataTableProps {
  headers: string[];
  rows: Cell[][];
  title?: string;
}

export function DataTable({ headers, rows, title }: DataTableProps) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-zinc-700/40 bg-zinc-950/30">
      {title ? (
        <div className="border-b border-zinc-700/40 px-3 py-2 text-sm font-medium text-zinc-200">
          {title}
        </div>
      ) : null}
      <table className="min-w-full text-left text-sm text-zinc-200">
        <thead className="bg-zinc-900/80">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-zinc-800">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-zinc-300">
                  {String(cell ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
