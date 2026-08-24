import { currentLocaleTag } from "@/i18n";

/** Formats a value as EUR in the active language's locale. */
export function formatCurrency(value: number | null | undefined) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(currentLocaleTag(), {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Formats an ISO date string in the active language's locale. Returns "" when empty/invalid. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(currentLocaleTag(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Formats a plain number in the active language's locale. */
export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(currentLocaleTag(), { maximumFractionDigits }).format(amount);
}
