import { Request } from 'express';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Reads ?page and ?pageSize from a request, clamping both to sane bounds so
 * a caller can't request page=0 (negative skip) or an unbounded pageSize
 * (defeats the point of paginating in the first place).
 */
export function parsePagination(req: Request, defaultPageSize = DEFAULT_PAGE_SIZE): { page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize) || defaultPageSize));
  return { page, pageSize };
}
