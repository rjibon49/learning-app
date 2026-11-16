export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
export function toPageQuery(page: number, limit: number, extras?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(extras ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
}
