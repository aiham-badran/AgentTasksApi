// src/utils/pagination.ts
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export function parsePagination(query: { page?: unknown; limit?: unknown }): PaginationParams {
  const rawPage = parseInt(String(query.page ?? '1'), 10);
  const rawLimit = parseInt(String(query.limit ?? '20'), 10);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(100, rawLimit) : 20;

  return { page, limit, offset: (page - 1) * limit };
}

export function buildPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  const total_pages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    total_pages,
    has_next: params.page < total_pages,
    has_prev: params.page > 1,
  };
}
