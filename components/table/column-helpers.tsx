import { ColumnDef } from "@tanstack/react-table";
import {
  buildSearchableField,
  renderLocalizedField,
} from "@/components/ui/localized-fields";
import type { Translator } from "@/lib/table/types";

// Helper genérico para columna de búsqueda combinada (invisible, solo para filtrado)
export const createSearchColumn = <T extends Record<string, any>>(
  locale: string,
  fields: Array<{ esKey: string; enKey: string }>,
): ColumnDef<T> => ({
  id: "search",
  accessorFn: (row) => {
    return fields
      .map(({ esKey, enKey }) =>
        buildSearchableField(row, esKey, enKey, locale),
      )
      .join(" ")
      .toLowerCase();
  },
  enableHiding: false,
  enableSorting: false,
  enableColumnFilter: true,
  // No definir header ni cell para que la columna sea invisible
  meta: {
    filterOnly: true, // Metadato para indicar que es solo para filtrado
  },
});

// Helper genérico para columna de código localizado
export const createLocalizedCodeColumn = <T extends Record<string, any>>(
  t: Translator,
  locale: string,
  emptyValue: string,
): ColumnDef<T> => ({
  id: "code",
  accessorFn: (row) => buildSearchableField(row, "codeEs", "codeEn", locale),
  header: t("columns.code"),
  cell: ({ row }) => (
    <span className="font-mono text-sm">
      {renderLocalizedField(
        row.original,
        "codeEs",
        "codeEn",
        locale,
        emptyValue,
      )}
    </span>
  ),
});

// Helper genérico para columna de nombre localizado
export const createLocalizedNameColumn = <T extends Record<string, any>>(
  id: string,
  t: Translator,
  locale: string,
  emptyValue: string,
  headerKey: string = "columns.name",
): ColumnDef<T> => ({
  id,
  accessorFn: (row) => buildSearchableField(row, "nameEs", "nameEn", locale),
  header: t(headerKey),
  cell: ({ row }) =>
    renderLocalizedField(row.original, "nameEs", "nameEn", locale, emptyValue),
});

// Helper genérico para columna de estado activo/inactivo
export const createStatusColumn = <T extends { isActive: boolean }>(
  t: Translator,
): ColumnDef<T> => ({
  accessorKey: "isActive",
  header: t("columns.status"),
  cell: ({ row }) => (
    <span className="font-medium">
      {row.original.isActive ? t("status.active") : t("status.inactive")}
    </span>
  ),
});

// Helper genérico para columnas numéricas alineadas a la derecha
export const createNumericColumn = <T extends Record<string, any>>(
  accessorKey: string,
  t: Translator,
  headerKey: string,
  emptyValue: string,
): ColumnDef<T> => ({
  accessorKey,
  header: () => <div className="text-right">{t(headerKey)}</div>,
  cell: ({ row }) => {
    const value = row.getValue(accessorKey) as number | undefined;
    return <div className="text-right font-medium">{value ?? emptyValue}</div>;
  },
});

// Helper para columnas con mapeo de valores (type, language, category, etc)
export const createMappedColumn = <T extends Record<string, any>>(
  accessorKey: string,
  t: Translator,
  headerKey: string,
  labels: Record<string, string>,
  emptyValue: string,
): ColumnDef<T> => ({
  accessorKey,
  header: t(headerKey),
  cell: ({ row }) => {
    const value = row.getValue(accessorKey) as string | undefined;
    return value ? (labels[value] ?? emptyValue) : emptyValue;
  },
});
