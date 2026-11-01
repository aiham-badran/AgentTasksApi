// tests/unit/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta } from '../../src/utils/pagination.js';

describe('parsePagination', () => {
  it('returns defaults when query is empty', () => {
    const p = parsePagination({});
    expect(p).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('parses provided page and limit', () => {
    const p = parsePagination({ page: '3', limit: '10' });
    expect(p).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('clamps limit to max 100', () => {
    const p = parsePagination({ limit: '500' });
    expect(p.limit).toBe(100);
  });

  it('floors page at 1 when given 0 or negative', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1);
    expect(parsePagination({ page: '-5' }).page).toBe(1);
  });

  it('floors limit at 20 when given 0 or negative', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(20);
  });

  it('falls back to defaults on non-numeric input', () => {
    const p = parsePagination({ page: 'abc', limit: 'xyz' });
    expect(p).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('computes offset correctly', () => {
    expect(parsePagination({ page: '5', limit: '10' }).offset).toBe(40);
  });
});

describe('buildPaginationMeta', () => {
  const params = { page: 1, limit: 20, offset: 0 };

  it('returns correct meta for a single full page', () => {
    const meta = buildPaginationMeta(params, 15);
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 15,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    });
  });

  it('computes total_pages and has_next for multi-page', () => {
    const meta = buildPaginationMeta({ page: 1, limit: 10, offset: 0 }, 45);
    expect(meta.total_pages).toBe(5);
    expect(meta.has_next).toBe(true);
    expect(meta.has_prev).toBe(false);
  });

  it('has_prev=true on middle page', () => {
    const meta = buildPaginationMeta({ page: 3, limit: 10, offset: 20 }, 45);
    expect(meta.has_prev).toBe(true);
    expect(meta.has_next).toBe(true);
  });

  it('has_next=false on last page', () => {
    const meta = buildPaginationMeta({ page: 5, limit: 10, offset: 40 }, 45);
    expect(meta.has_next).toBe(false);
  });

  it('handles total=0', () => {
    const meta = buildPaginationMeta(params, 0);
    expect(meta.total).toBe(0);
    expect(meta.total_pages).toBe(0);
    expect(meta.has_next).toBe(false);
    expect(meta.has_prev).toBe(false);
  });
});
