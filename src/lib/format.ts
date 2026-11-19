export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(2) + "h";
}

export function formatMoney(amount: number, currency = "USD", display: "symbol" | "code" = "symbol"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: display, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // Monday = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - diff);
  return x;
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): number {
  return new Date(v).getTime();
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Amounts keyed by currency code, so totals never add CAD and USD together.
export type CurrencyTotals = Record<string, number>;

export function addToTotals(totals: CurrencyTotals, currency: string, amount: number): CurrencyTotals {
  totals[currency] = (totals[currency] ?? 0) + amount;
  return totals;
}

export function formatTotals(totals: CurrencyTotals, fallbackCurrency = "CAD"): string {
  const entries = Object.entries(totals).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return formatMoney(0, fallbackCurrency);
  // With several currencies, show codes (CAD/USD) so a bare "$" is never ambiguous.
  return entries.map(([c, v]) => formatMoney(v, c, entries.length > 1 ? "code" : "symbol")).join(" · ");
}
