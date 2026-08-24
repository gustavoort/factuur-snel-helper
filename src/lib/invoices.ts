import { queryOptions } from "@tanstack/react-query";
import api from "@/lib/api";
import i18n from "@/i18n";
import { asRecord, collection, downloadBlob, num, text } from "@/lib/normalize";
import { normalizeQuoteItem, type QuoteItem, type QuoteItemPayload } from "@/lib/quotes";

export type InvoiceItemPayload = QuoteItemPayload;
export type InvoiceItem = QuoteItem;

export interface InvoiceCreatePayload {
  client_id: string;
  items: InvoiceItemPayload[];
  notes: string;
  from_quote_id?: string | undefined;
}

export interface InvoiceUpdatePayload {
  items: InvoiceItemPayload[];
  notes: string;
  status?: string | undefined;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  client_company: string;
  client: Record<string, unknown> | null;
  items: InvoiceItem[];
  notes: string;
  status: string;
  subtotal: number | null;
  vat_total: number | null;
  total: number | null;
  created_at: string;
  updated_at: string;
  sent_at: string;
  due_date: string;
  paid_at: string;
  quote_id: string;
}

function normalizeInvoice(value: unknown): Invoice | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = row["id"] ?? row["invoice_id"] ?? row["_id"];
  if (typeof id !== "string" && typeof id !== "number") return null;

  const client = asRecord(row["client"]);

  return {
    id: String(id),
    invoice_number: text(row["invoice_number"]),
    client_id: text(row["client_id"] ?? client?.["id"]),
    client_name: text(row["client_name"] ?? client?.["name"]),
    client_company: text(row["client_company"] ?? client?.["company_name"]),
    client,
    items: Array.isArray(row["items"]) ? row["items"].map(normalizeQuoteItem) : [],
    notes: text(row["notes"]),
    status: text(row["status"]),
    subtotal: num(row["subtotal"]),
    vat_total: num(row["vat_total"]),
    total: num(row["total"]),
    created_at: text(row["created_at"]),
    updated_at: text(row["updated_at"]),
    sent_at: text(row["sent_at"]),
    due_date: text(row["due_date"]),
    paid_at: text(row["paid_at"]),
    quote_id: text(row["quote_id"] ?? row["from_quote_id"]),
  };
}

function unwrapInvoice(data: unknown): Invoice {
  const response = asRecord(data);
  const invoice = normalizeInvoice(response?.["invoice"] ?? response?.["data"] ?? data);
  if (!invoice) throw new Error(i18n.t("errors.invalidInvoiceData"));
  return invoice;
}

export async function getInvoices(status?: string): Promise<Invoice[]> {
  const { data } = await api.get<unknown>("/invoices", {
    params: status ? { status } : undefined,
  });
  return collection(data, "invoices")
    .map(normalizeInvoice)
    .filter((invoice): invoice is Invoice => invoice !== null);
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<unknown>(`/invoices/${encodeURIComponent(id)}`);
  return unwrapInvoice(data);
}

export async function createInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  const { data } = await api.post<unknown>("/invoices", payload);
  return unwrapInvoice(data);
}

export async function updateInvoice(id: string, payload: InvoiceUpdatePayload): Promise<Invoice> {
  const { data } = await api.put<unknown>(`/invoices/${encodeURIComponent(id)}`, payload);
  return unwrapInvoice(data);
}

export async function deleteInvoice(id: string) {
  await api.delete(`/invoices/${encodeURIComponent(id)}`);
}

export async function markInvoicePaid(id: string): Promise<void> {
  await api.post(`/invoices/${encodeURIComponent(id)}/mark-paid`);
}

export async function downloadInvoicePdf(id: string, invoiceNumber: string) {
  const { data } = await api.get<Blob>(`/invoices/${encodeURIComponent(id)}/pdf`, {
    responseType: "blob",
  });
  downloadBlob(data, `${i18n.t("invoices.pdfName")}-${invoiceNumber || id}.pdf`);
}

export async function sendInvoiceEmail(id: string): Promise<string> {
  const { data } = await api.post<unknown>(`/invoices/${encodeURIComponent(id)}/send-email`);
  const response = asRecord(data);
  return text(response?.["message"], i18n.t("invoices.emailSent"));
}

export async function getInvoiceWhatsapp(id: string): Promise<{ url: string; message: string }> {
  const { data } = await api.get<unknown>(`/invoices/${encodeURIComponent(id)}/whatsapp`);
  const response = asRecord(data);
  const url = text(response?.["whatsapp_url"]);
  if (!url) throw new Error(i18n.t("errors.noWhatsappUrl"));
  return { url, message: text(response?.["message"]) };
}

export async function createInvoicePaymentLink(id: string): Promise<string> {
  const { data } = await api.post<unknown>(`/invoices/${encodeURIComponent(id)}/payment-link`);
  const response = asRecord(data);
  const url = text(
    response?.["payment_url"] ??
      response?.["url"] ??
      response?.["checkout_url"] ??
      response?.["link"],
  );
  if (!url) throw new Error(i18n.t("errors.noPaymentUrl"));
  return url;
}

export const invoicesQueryOptions = (status?: string) =>
  queryOptions({
    queryKey: ["invoices", { status: status ?? "" }],
    queryFn: () => getInvoices(status),
  });

export const invoiceQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id),
  });
