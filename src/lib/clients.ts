import { queryOptions } from "@tanstack/react-query";
import api from "@/lib/api";

export interface ClientPayload {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  notes: string;
}

export interface Client extends ClientPayload {
  id: string;
}

export const emptyClient: ClientPayload = {
  name: "",
  company_name: "",
  email: "",
  phone: "",
  address: "",
  postal_code: "",
  city: "",
  country: "Nederland",
  notes: "",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeClient(value: unknown): Client | null {
  const row = asRecord(value);
  if (!row || (typeof row["id"] !== "string" && typeof row["id"] !== "number")) return null;

  return {
    id: String(row["id"]),
    name: text(row["name"]),
    company_name: text(row["company_name"]),
    email: text(row["email"]),
    phone: text(row["phone"]),
    address: text(row["address"]),
    postal_code: text(row["postal_code"]),
    city: text(row["city"]),
    country: text(row["country"], "Nederland"),
    notes: text(row["notes"]),
  };
}

function collection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const response = asRecord(value);
  if (!response) return [];

  for (const key of ["clients", "items", "results", "data"] as const) {
    if (Array.isArray(response[key])) return response[key];
  }
  return [];
}

export async function getClients(): Promise<Client[]> {
  const { data } = await api.get<unknown>("/clients");
  return collection(data).map(normalizeClient).filter((client): client is Client => client !== null);
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await api.get<unknown>(`/clients/${encodeURIComponent(id)}`);
  const response = asRecord(data);
  const client = normalizeClient(response?.["client"] ?? response?.["data"] ?? data);
  if (!client) throw new Error("De server gaf ongeldige klantgegevens terug.");
  return client;
}

export async function createClient(payload: ClientPayload) {
  const { data } = await api.post<unknown>("/clients", payload);
  return data;
}

export async function updateClient(id: string, payload: ClientPayload) {
  const { data } = await api.put<unknown>(`/clients/${encodeURIComponent(id)}`, payload);
  return data;
}

export async function deleteClient(id: string) {
  await api.delete(`/clients/${encodeURIComponent(id)}`);
}

export const clientsQueryOptions = () =>
  queryOptions({
    queryKey: ["clients"],
    queryFn: getClients,
  });

export const clientQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["clients", id],
    queryFn: () => getClient(id),
  });