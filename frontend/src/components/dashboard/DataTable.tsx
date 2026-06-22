import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (item: T, i: number) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  maxRows?: number;
  compact?: boolean;
  className?: string;
}

export function DataTable<T>({ columns, data, keyExtractor, onRowClick, maxRows, compact, className = "" }: DataTableProps<T>) {
  const display = maxRows ? data.slice(0, maxRows) : data;

  return (
    <div className={`data-table-wrap ${className}`}>
      <table className={`data-table${compact ? " data-table-sm" : ""}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === "right" ? "num" : ""} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {display.map((item, i) => (
            <tr
              key={keyExtractor(item)}
              className={onRowClick ? "data-table-row-clickable" : ""}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.align === "right" ? "num" : ""}>
                  {col.render(item, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
