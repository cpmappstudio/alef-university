import type { ColumnDef, SortingState } from "@tanstack/react-table";

export type Language = "es" | "en" | "both";

export type Translator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export type LocalizedRow = {
  language?: Language;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterConfig = {
  id: string; // ID of the column to filter
  label: string; // Label for the filter group (e.g., "Program Type")
  type: "multi" | "single"; // Multiple checkbox or single radio
  options: FilterOption[]; // Available options
};

export type CustomTableProps<TData> = {
  data: TData[] | undefined;
  columns: ColumnDef<TData, unknown>[];
  filterColumn?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  columnsMenuLabel?: string;
  exportButtonLabel?: string;
  filterConfigs?: FilterConfig[]; // New prop for filter configurations
  filtersMenuLabel?: string; // Label for filters button
  initialSorting?: SortingState; // Initial sorting state
  onExport?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
};
