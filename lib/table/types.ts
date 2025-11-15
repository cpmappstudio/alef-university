import type { ColumnDef } from "@tanstack/react-table";

export type Language = "es" | "en" | "both";

export type Translator = (
  key: string,
  values?: Record<string, unknown>,
) => string;

export type LocalizedRow = {
  language?: Language;
};

export type CustomTableProps<TData> = {
  data: TData[] | undefined;
  columns: ColumnDef<TData, unknown>[];
  filterColumn?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  columnsMenuLabel?: string;
  exportButtonLabel?: string;
  onExport?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
};
