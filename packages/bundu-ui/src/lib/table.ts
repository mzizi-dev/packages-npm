/**
 * The URL-driven table query and paging core behind DataTable, FilterBar
 * and Pagination. It lives in `@bundu/server` (`@bundu/server/table`), the
 * server-side companion package, and is re-exported here so a page can
 * import it from either.
 */
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  filterRows,
  fold,
  paginate,
  parseTableQuery,
  withParams,
  type Page,
  type TableQuery,
} from "@bundu/server/table";
