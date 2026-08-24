import { queryOptions } from "@tanstack/react-query";
import api from "@/lib/api";

export interface QuoteItemPayload {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface QuoteCreatePayload {
  client_id: string;
  items: QuoteItemPayload[];
  notes: string;
  validity_days: number;
}

export interface QuoteUpdatePayload {
  items: QuoteItemPayload[];
  notes: string;
  validity_days: number;
  status?: string;
}

export interface QuoteItem extends QuoteItemPayload {
  total: number | null;
}

export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  client_company: string;
  client: Record<string, unknown> | null;
  items: QuoteItem[];
  notes: string;
  validity_days: number;
  valid_until: string;
  status: string;
  subtotal: number | null;
  vat_total: number | null;
  total: number | null;
  created_at: string;
  updated_at: string;
  sent_at: string;
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  accepted: "Geaccepteerd",
};

export const VAT_RATES = [0, 9, 21];

export function statusLabel(status: string) {
  if (!status) return "Onbekend";
  return QUOTE_STATUS_LABELS[status] ?? status.replace(/[_-]+/g, " ");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeItem(value: unknown): QuoteItem {
  const row = asRecord(value) ?? {};
  return {
    description: text(row["description"]),
    quantity: num(row["quantity"]) ?? 1,
    unit_price: num(row["unit_price"]) ?? 0,
    vat_rate: num(row["vat_rate"]) ?? 21,
    total: num(row["total"]),
  };
}

function normalizeQuote(value: unknown): Quote | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = row["id"] ?? row["quote_id"] ?? row["_id"];
  if (typeof id !== "string" && typeof id !== "number") return null;

  const client = asRecord(row["client"]);

  return {
    id: String(id),
    quote_number: text(row["quote_number"]),
    client_id: text(row["client_id"] ?? client?.["id"]),
    client_name: text(row["client_name"] ?? client?.["name"]),
    client_company: text(row["client_company"] ?? client?.["company_name"]),
    client,
    items: Array.isArray(row["items"]) ? row["items"].map(normalizeItem) : [],
    notes: text(row["notes"]),
    validity_days: num(row["validity_days"]) ?? 30,
    valid_until: text(row["valid_until"]),
    status: text(row["status"]),
    subtotal: num(row["subtotal"]),
    vat_total: num(row["vat_total"]),
    total: num(row["total"]),
    created_at: text(row["created_at"]),
    updated_at: text(row["updated_at"]),
    sent_at: text(row["sent_at"]),
  };
}

function collection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const response = asRecord(value);
  if (!response) return [];
  for (const key of ["quotes", "items", "results", "data"] as const) {
    if (Array.isArray(response[key])) return response[key];
  }
  return [];
}

function unwrapQuote(data: unknown): Quote {
  const response = asRecord(data);
  const quote = normalizeQuote(response?.["quote"] ?? response?.["data"] ?? data);
  if (!quote) throw new Error("De server gaf ongeldige offertegegevens terug.");
  return quote;
}

export async function getQuotes(status?: string): Promise<Quote[]> {
  const { data } = await api.get<unknown>("/quotes", {
    params: status ? { status } : undefined,
  });
  return collection(data)
    .map(normalizeQuote)
    .filter((quote): quote is Quote => quote !== null);
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await api.get<unknown>(`/quotes/${encodeURIComponent(id)}`);
  return unwrapQuote(data);
}

export async function createQuote(payload: QuoteCreatePayload): Promise<Quote> {
  const { data } = await api.post<unknown>("/quotes", payload);
  return unwrapQuote(data);
}

export async function updateQuote(id: string, payload: QuoteUpdatePayload): Promise<Quote> {
  const { data } = await api.put<unknown>(`/quotes/${encodeURIComponent(id)}`, payload);
  return unwrapQuote(data);
}

export async function deleteQuote(id: string) {
  await api.delete(`/quotes/${encodeURIComponent(id)}`);
}

export async function duplicateQuote(id: string): Promise<Quote> {
  const { data } = await api.post<unknown>(`/quotes/${encodeURIComponent(id)}/duplicate`);
  return unwrapQuote(data);
}

export async function convertQuote(id: string): Promise<{ id: string }> {
  const { data } = await api.post<unknown>(`/quotes/${encodeURIComponent(id)}/convert`);
  const response = asRecord(data);
  const invoice = asRecord(response?.["invoice"]) ?? response;
  const invoiceId = invoice?.["id"] ?? invoice?.["invoice_id"] ?? response?.["invoice_id"];
  if (typeof invoiceId !== "string" && typeof invoiceId !== "number") {
    throw new Error("De server gaf geen factuur-id terug.");
  }
  return { id: String(invoiceId) };
}

export async function downloadQuotePdf(id: string, quoteNumber: string) {
  const { data } = await api.get<Blob>(`/quotes/${encodeURIComponent(id)}/pdf`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `offerte-${quoteNumber || id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function sendQuoteEmail(id: string): Promise<string> {
  const { data } = await api.post<unknown>(`/quotes/${encodeURIComponent(id)}/send-email`);
  const response = asRecord(data);
  return text(response?.["message"], "Offerte per e-mail verzonden");
}

export async function getQuoteWhatsapp(id: string): Promise<{ url: string; message: string }> {
  const { data } = await api.get<unknown>(`/quotes/${encodeURIComponent(id)}/whatsapp`);
  const response = asRecord(data);
  const url = text(response?.["whatsapp_url"]);
  if (!url) throw new Error("De server gaf geen WhatsApp-link terug.");
  return { url, message: text(response?.["message"]) };
}

export function computeTotals(items: QuoteItemPayload[]) {
  let subtotal = 0;
  let vat = 0;
  for (const item of items) {
    const line = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    subtotal += line;
    vat += (line * (Number(item.vat_rate) || 0)) / 100;
  }
  return { subtotal, vat, total: subtotal + vat };
}

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function formatCurrency(value: number | null | undefined) {
  return euro.format(typeof value === "number" && Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(date);
}

export const quotesQueryOptions = (status?: string) =>
  queryOptions({
    queryKey: ["quotes", { status: status ?? "" }],
    queryFn: () => getQuotes(status),
  });

export const quoteQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["quote", id],
    queryFn: () => getQuote(id),
  });
