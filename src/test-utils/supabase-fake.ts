/**
 * Minimal in-memory Supabase client fake for unit tests.
 *
 * Supports exactly the chainable surface the completion/retention code uses:
 *   from(table).select(cols).eq/in(...).order(...).limit(n).maybeSingle()/single()
 *   from(table).select(cols, { count: 'exact', head: true }).eq(...)  (awaited directly)
 *   from(table).update(payload).eq(...)            (awaited directly)
 *   from(table).insert(payload)                    (awaited directly)
 *
 * Builders are thenable, so `await qb...` resolves to a Supabase-shaped
 * `{ data, error, count? }`. Not a full re-implementation — just enough to
 * exercise ordering, filtering, mutation, and exact-count semantics
 * deterministically.
 */

type Row = Record<string, unknown>;
export type FakeDb = Record<string, Row[]>;
type SelectOpts = { count?: 'exact'; head?: boolean };
type QueryResult = { data: unknown; error: unknown; count?: number | null };

type Filter =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'neq'; col: string; val: unknown }
  | { type: 'in'; col: string; vals: unknown[] };

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.type === 'eq') return row[f.col] === f.val;
    if (f.type === 'neq') return row[f.col] !== f.val;
    return f.vals.includes(row[f.col]);
  });
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private mode: 'select' | 'update' | 'insert' | 'upsert' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private upsertOpts: { onConflict?: string } | null = null;
  private selectOpts: SelectOpts | null = null;

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
    private readonly onError?: (table: string, mode: string) => { message: string } | null,
  ) {}

  select(_cols?: string, opts?: SelectOpts): this {
    this.selectOpts = opts ?? null;
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ type: 'neq', col, val });
    return this;
  }
  in(col: string, vals: unknown[]): this {
    this.filters.push({ type: 'in', col, vals });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, asc: opts?.ascending ?? true };
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  update(payload: Row): this {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }
  insert(payload: Row | Row[]): this {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.mode = 'upsert';
    this.payload = payload;
    this.upsertOpts = opts ?? null;
    return this;
  }
  delete(): this {
    this.mode = 'delete';
    return this;
  }

  private rows(): Row[] {
    let rows = (this.db[this.table] ?? []).filter((r) => matches(r, this.filters));
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[col] as never;
        const bv = b[col] as never;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return asc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private exec(): QueryResult {
    const injected = this.onError?.(this.table, this.mode) ?? null;
    if (injected) return { data: null, error: injected };

    if (this.mode === 'update') {
      const targets = (this.db[this.table] ?? []).filter((r) => matches(r, this.filters));
      for (const t of targets) Object.assign(t, this.payload);
      return { data: targets, error: null };
    }
    if (this.mode === 'delete') {
      const arr = (this.db[this.table] ?? []);
      const toDelete = arr.filter((r) => matches(r, this.filters));
      this.db[this.table] = arr.filter((r) => !matches(r, this.filters));
      return { data: toDelete, error: null };
    }
    if (this.mode === 'insert') {
      const arr = (this.db[this.table] ??= []);
      const items = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const inserted = items.map((it) => {
        const row = { id: it.id ?? `gen_${arr.length + 1}`, ...it };
        arr.push(row);
        return row;
      });
      return { data: inserted, error: null };
    }
    if (this.mode === 'upsert') {
      const arr = (this.db[this.table] ??= []);
      const items = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const conflictCol = this.upsertOpts?.onConflict;
      const upserted = items.map((it) => {
        if (conflictCol && it[conflictCol] !== undefined) {
          const existing = arr.find((r) => r[conflictCol] === it[conflictCol]);
          if (existing) {
            Object.assign(existing, it);
            return existing;
          }
        }
        const row = { id: it.id ?? `gen_${arr.length + 1}`, ...it };
        arr.push(row);
        return row;
      });
      return { data: upserted.length === 1 ? upserted[0] : upserted, error: null };
    }
    const rows = this.rows();
    const result: QueryResult = { data: this.selectOpts?.head ? null : rows, error: null };
    if (this.selectOpts?.count === 'exact') result.count = rows.length;
    return result;
  }

  /** Terminal read/mutation returning a single row (Supabase `.maybeSingle()`). */
  async maybeSingle(): Promise<QueryResult> {
    const { data, error } = this.exec();
    if (error) return { data: null, error };
    const arr = Array.isArray(data) ? data : data == null ? [] : [data];
    return { data: arr[0] ?? null, error: null };
  }

  async single(): Promise<QueryResult> {
    const { data, error } = this.exec();
    if (error) return { data: null, error };
    const arr = Array.isArray(data) ? data : data == null ? [] : [data];
    return arr[0]
      ? { data: arr[0], error: null }
      : { data: null, error: { message: 'no rows' } };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }
}

/**
 * Build a fake service client over an in-memory db. Mutates `db` in place so
 * tests can assert post-state. `onError(table, mode)` optionally injects an
 * error for a given table/operation to exercise failure branches.
 */
export function makeFakeServiceClient(
  db: FakeDb,
  onError?: (table: string, mode: string) => { message: string } | null,
) {
  return {
    from(table: string) {
      return new QueryBuilder(db, table, onError);
    },
  };
}
