/** UTC today as YYYY-MM-DD — the journal's day bucket. */
export const todayUtc = (): string =>
  new Date().toISOString().slice(0, 10);
