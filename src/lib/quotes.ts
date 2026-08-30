import { queryOptions } from "@tanstack/react-query";
import api from "@/lib/api";
import i18n from "@/i18n";
import { asRecord, collection, downloadBlob, num, text } from "@/lib/normalize";

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
  status?: string | undefined;
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

export const VAT_RATES = [0, 9, 21];

/** Coerces a line item to the exact QuoteItem schema (description, quantity, unit_price, vat_rate). */
export function toItemPayload(item: QuoteItemPayload): QuoteItemPayload {
  return {
    description: String(item.description ?? ""),
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    unit_price: Number(item.unit_price) || 0,
    vat_rate: Number(item.vat_rate) || 0,
  };
}

/** Backend requires 1..365. */
export function clampValidity(days: unknown): number {
  const value = Math.round(Number(days) || 30);
  return Math.min(365, Math.max(1, value));
}

export function normalizeQuoteItem(value: unknown): QuoteItem {
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
    items: Array.isArray(row["items"]) ? row["items"].map(normalizeQuoteItem) : [],
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

function unwrapQuote(data: unknown): Quote {
  const response = asRecord(data);
  const quote = normalizeQuote(response?.["quote"] ?? response?.["data"] ?? data);
  if (!quote) throw new Error(i18n.t("errors.invalidQuoteData"));
  return quote;
}

export async function getQuotes(status?: string): Promise<Quote[]> {
  const { data } = await api.get<unknown>("/quotes", {
    params: status ? { status } : undefined,
  });
  return collection(data, "quotes")
    .map(normalizeQuote)
    .filter((quote): quote is Quote => quote !== null);
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await api.get<unknown>(`/quotes/${encodeURIComponent(id)}`);
  return unwrapQuote(data);
}

/** Serializes only the fields accepted by the QuoteCreate schema. */
export function toQuoteCreatePayload(values: QuoteCreatePayload): QuoteCreatePayload {
  return {
    client_id: values.client_id,
    items: values.items.map(toItemPayload),
    notes: values.notes ?? "",
    validity_days: clampValidity(values.validity_days),
  };
}

/** Serializes only the fields accepted by the QuoteUpdate schema (no client_id). */
export function toQuoteUpdatePayload(values: QuoteUpdatePayload): QuoteUpdatePayload {
  return {
    items: values.items.map(toItemPayload),
    notes: values.notes ?? "",
    validity_days: clampValidity(values.validity_days),
    ...(values.status ? { status: values.status } : {}),
  };
}

export async function createQuote(payload: QuoteCreatePayload): Promise<Quote> {
  const { data } = await api.post<unknown>("/quotes", toQuoteCreatePayload(payload));
  return unwrapQuote(data);
}

export async function updateQuote(id: string, payload: QuoteUpdatePayload): Promise<Quote> {
  const { data } = await api.put<unknown>(
    `/quotes/${encodeURIComponent(id)}`,
    toQuoteUpdatePayload(payload),
  );
  return unwrapQuote(data);
}

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;

/** Sends only `status` — QuoteUpdate accepts partial payloads and never client_id. */
export async function setQuoteStatus(id: string, status: string): Promise<Quote> {
  const { data } = await api.put<unknown>(`/quotes/${encodeURIComponent(id)}`, { status });
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
    throw new Error(i18n.t("errors.noInvoiceId"));
  }
  return { id: String(invoiceId) };
}

export async function downloadQuotePdf(id: string, quoteNumber: string) {
  const { data } = await api.get<Blob>(`/quotes/${encodeURIComponent(id)}/pdf`, {
    responseType: "blob",
  });
  downloadBlob(data, `${i18n.t("quotes.pdfName")}-${quoteNumber || id}.pdf`);
}

export async function sendQuoteEmail(id: string): Promise<string> {
  const { data } = await api.post<unknown>(`/quotes/${encodeURIComponent(id)}/send-email`);
  const response = asRecord(data);
  return text(response?.["message"], i18n.t("quotes.emailSent"));
}

export async function getQuoteWhatsapp(id: string): Promise<{ url: string; message: string }> {
  const { data } = await api.get<unknown>(`/quotes/${encodeURIComponent(id)}/whatsapp`);
  const response = asRecord(data);
  const url = text(response?.["whatsapp_url"]);
  if (!url) throw new Error(i18n.t("errors.noWhatsappUrl"));
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
