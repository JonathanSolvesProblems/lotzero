// All money is stored and moved as integer cents. No floats touch the ledger.

export function formatUSD(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n / 100);
}

export function formatUSDPrecise(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n / 100);
}

export const toCents = (dollars: number): number => Math.round(dollars * 100);
export const toDollars = (cents: number): number => cents / 100;
