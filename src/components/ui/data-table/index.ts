export { DataTableRoot } from "./data-table-root";
export { DataTableToolbar } from "./data-table-toolbar";
export { DataTableGrid } from "./data-table-grid";
export { DataTablePagination } from "./data-table-pagination";
export { useClientTableState } from "./use-client-table-state";
export { useServerTableState } from "./use-server-table-state";
export type {
  ServerTableParams,
  ServerTableResponse,
} from "./use-server-table-state";
export type { ColumnDef } from "./types";

import { DataTableRoot } from "./data-table-root";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableGrid } from "./data-table-grid";
import { DataTablePagination } from "./data-table-pagination";

export const DataTable = {
  Root: DataTableRoot,
  Toolbar: DataTableToolbar,
  Grid: DataTableGrid,
  Pagination: DataTablePagination,
};
