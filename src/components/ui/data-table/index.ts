export { DataTableRoot } from "./data-table-root";
export {
  DataTableToolbar,
  DataTablePageSize,
  DataTableSearch,
} from "./data-table-toolbar";
export { DataTableGrid } from "./data-table-grid";
export { DataTablePagination } from "./data-table-pagination";
export { useClientTableState } from "./use-client-table-state";
export { useServerTableState } from "./use-server-table-state";
export type {
  ServerTableParams,
  ServerTableResponse,
} from "./use-server-table-state";
export type { ColumnDef, SortEntry, DataTableContextValue } from "./types";
export { MAX_SORT_COLUMNS } from "./types";
export { encodeSortsForApi } from "./sort-params";
export { createListAdapter } from "./create-list-adapter";

import { DataTableRoot } from "./data-table-root";
import {
  DataTableToolbar,
  DataTablePageSize,
  DataTableSearch,
} from "./data-table-toolbar";
import { DataTableGrid } from "./data-table-grid";
import { DataTablePagination } from "./data-table-pagination";

export const DataTable = {
  Root: DataTableRoot,
  Toolbar: DataTableToolbar,
  PageSize: DataTablePageSize,
  Search: DataTableSearch,
  Grid: DataTableGrid,
  Pagination: DataTablePagination,
};
