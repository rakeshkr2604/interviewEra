import { z } from 'zod';

/**
 * Shared pagination primitives for list-returning endpoints and server
 * components. Always clamp values, never trust raw query input.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

const pageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);
const pageSizeSchema = z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE);
const limitSchema = z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE);
const cursorSchema = z.string().min(1).max(256).catch('');

export interface OffsetParams {
  page: number;
  pageSize: number;
  /** Inclusive lower bound for Supabase `.range(from, to)` */
  offset: number;
  /** Inclusive upper bound for Supabase `.range(from, to)` */
  rangeTo: number;
}

export interface CursorParams {
  cursor: string | null;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page?: number;
  pageSize: number;
  total?: number;
  nextCursor?: string | null;
  hasMore: boolean;
}

type ParamsInput = URL | URLSearchParams | Request;

function toSearchParams(input: ParamsInput): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (input instanceof URL) return input.searchParams;
  return new URL(input.url).searchParams;
}

/**
 * Parse `page` + `pageSize` query params with strict clamping.
 * Defaults: `page=1`, `pageSize=20`. Hard cap: `pageSize=100`.
 */
export function parsePaginationParams(input: ParamsInput): OffsetParams {
  const sp = toSearchParams(input);
  const page = pageSchema.parse(sp.get('page') ?? undefined);
  const pageSize = pageSizeSchema.parse(sp.get('pageSize') ?? undefined);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset, rangeTo: offset + pageSize - 1 };
}

/**
 * Parse `cursor` + `limit` query params for cursor-based feeds.
 * Defaults: `cursor=null`, `limit=20`. Hard cap: `limit=100`.
 */
export function parseCursorParams(input: ParamsInput): CursorParams {
  const sp = toSearchParams(input);
  const rawCursor = sp.get('cursor');
  const cursor = rawCursor ? cursorSchema.parse(rawCursor) || null : null;
  const limit = limitSchema.parse(sp.get('limit') ?? undefined);
  return { cursor, limit };
}

/** Build the response envelope for an offset-paginated list. */
export function buildOffsetResponse<T>(args: {
  rows: T[];
  page: number;
  pageSize: number;
  total?: number;
}): PaginatedResponse<T> {
  const { rows, page, pageSize, total } = args;
  const hasMore =
    typeof total === 'number'
      ? page * pageSize < total
      : rows.length === pageSize;
  return {
    data: rows,
    page,
    pageSize,
    total,
    hasMore,
  };
}

/**
 * Build the response envelope for a cursor-paginated list.
 * Pass an extra row beyond `limit` to detect `hasMore` deterministically.
 */
export function buildCursorResponse<T>(args: {
  rows: T[];
  limit: number;
  getCursor: (row: T) => string;
}): PaginatedResponse<T> {
  const { rows, limit, getCursor } = args;
  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const last = trimmed[trimmed.length - 1];
  return {
    data: trimmed,
    pageSize: limit,
    nextCursor: hasMore && last ? getCursor(last) : null,
    hasMore,
  };
}
