export function formatPercent(confidence: number): string {
  if (!Number.isFinite(confidence)) return '—';
  const pct = confidence * 100;
  if (pct > 0 && pct < 1) return '<1%';
  return `${Math.round(pct)}%`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export const orDash = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);
