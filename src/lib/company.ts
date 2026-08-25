import { queryOptions } from "@tanstack/react-query";
import api from "@/lib/api";
import { asRecord, num, text } from "@/lib/normalize";

export interface CompanyProfile {
  company_name: string;
  owner_name: string;
  logo_base64: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  kvk_number: string;
  btw_number: string;
  iban: string;
  payment_terms: number;
  default_vat_rate: number;
}

export const emptyCompany: CompanyProfile = {
  company_name: "",
  owner_name: "",
  logo_base64: "",
  address: "",
  postal_code: "",
  city: "",
  country: "Nederland",
  phone: "",
  email: "",
  kvk_number: "",
  btw_number: "",
  iban: "",
  payment_terms: 30,
  default_vat_rate: 21,
};

export type CompanyPayload = Omit<CompanyProfile, "logo_base64">;

function normalizeCompany(value: unknown): CompanyProfile {
  const response = asRecord(value);
  const row = asRecord(response?.["company"]) ?? asRecord(response?.["data"]) ?? response ?? {};

  return {
    company_name: text(row["company_name"]),
    owner_name: text(row["owner_name"]),
    logo_base64: text(row["logo_base64"]),
    address: text(row["address"]),
    postal_code: text(row["postal_code"]),
    city: text(row["city"]),
    country: text(row["country"], "Nederland"),
    phone: text(row["phone"]),
    email: text(row["email"]),
    kvk_number: text(row["kvk_number"]),
    btw_number: text(row["btw_number"]),
    iban: text(row["iban"]),
    payment_terms: num(row["payment_terms"]) ?? 30,
    default_vat_rate: num(row["default_vat_rate"]) ?? 21,
  };
}

export async function getCompany(): Promise<CompanyProfile> {
  const { data } = await api.get<unknown>("/company");
  return normalizeCompany(data);
}

/** Strips logo_base64 so saving text fields never wipes the uploaded logo. */
export function toCompanyUpdatePayload(values: Partial<CompanyProfile>): CompanyPayload {
  return {
    company_name: text(values.company_name),
    owner_name: text(values.owner_name),
    address: text(values.address),
    postal_code: text(values.postal_code),
    city: text(values.city),
    country: text(values.country, "Nederland"),
    phone: text(values.phone),
    email: text(values.email),
    kvk_number: text(values.kvk_number),
    btw_number: text(values.btw_number),
    iban: text(values.iban),
    payment_terms: Math.round(num(values.payment_terms) ?? 30),
    default_vat_rate: num(values.default_vat_rate) ?? 21,
  };
}

export async function updateCompany(payload: Partial<CompanyProfile>): Promise<CompanyProfile> {
  const { data } = await api.put<unknown>("/company", toCompanyUpdatePayload(payload));
  return normalizeCompany(data);
}

export async function uploadCompanyLogo(file: File): Promise<void> {
  const body = new FormData();
  body.append("file", file);
  await api.post("/company/logo", body, { headers: { "Content-Type": "multipart/form-data" } });
}

export const companyQueryOptions = () =>
  queryOptions({
    queryKey: ["company"],
    queryFn: getCompany,
  });
