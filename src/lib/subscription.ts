import { queryOptions } from "@tanstack/react-query";
import api from "@/lib/api";
import i18n from "@/i18n";
import { asRecord, collection, num, text } from "@/lib/normalize";

export interface Plan {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  interval: string;
  features: string[];
  description: string;
}

export interface CurrentSubscription {
  plan: string;
  status: string;
  current_period_end: string;
}

function normalizePlan(value: unknown, index: number): Plan | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = text(row["id"] ?? row["plan"] ?? row["key"] ?? row["slug"] ?? row["name"]);
  if (!id) return null;
  const features = Array.isArray(row["features"])
    ? row["features"].map((feature) => text(feature)).filter(Boolean)
    : [];

  return {
    id,
    name: text(row["name"] ?? row["title"], id),
    price: num(row["price"] ?? row["amount"] ?? row["price_eur"]),
    currency: text(row["currency"], "EUR"),
    interval: text(row["interval"] ?? row["period"]),
    features: features.length ? features : [],
    description: text(row["description"], index >= 0 ? "" : ""),
  };
}

export async function getPlans(): Promise<Plan[]> {
  const { data } = await api.get<unknown>("/subscription/plans");
  const rows = collection(data, "plans");
  if (rows.length) {
    return rows
      .map((row, index) => normalizePlan(row, index))
      .filter((plan): plan is Plan => plan !== null);
  }
  // Some backends return a keyed object: { free: {...}, pro: {...} }
  const record = asRecord(data);
  if (!record) return [];
  return Object.entries(record)
    .map(([key, value], index) => {
      const plan = normalizePlan(value, index);
      if (!plan) return null;
      return { ...plan, id: plan.id || key, name: plan.name || key };
    })
    .filter((plan): plan is Plan => plan !== null);
}

export async function getCurrentSubscription(): Promise<CurrentSubscription> {
  const { data } = await api.get<unknown>("/subscription/current");
  const response = asRecord(data);
  const row = asRecord(response?.["subscription"]) ?? response ?? {};
  return {
    plan: text(row["plan"] ?? row["plan_id"] ?? row["name"]),
    status: text(row["status"]),
    current_period_end: text(row["current_period_end"] ?? row["expires_at"] ?? row["renews_at"]),
  };
}

export interface CheckoutResult {
  url: string;
  message: string;
}

export async function startCheckout(plan: string): Promise<CheckoutResult> {
  const { data } = await api.post<unknown>("/subscription/checkout", { plan });
  const response = asRecord(data);
  const url = text(
    response?.["checkout_url"] ??
      response?.["url"] ??
      response?.["payment_url"] ??
      response?.["link"],
  );
  if (!url) throw new Error(i18n.t("errors.noPaymentUrl"));
  return { url, message: text(response?.["message"]) };
}

export interface PaymentStatus {
  status: string;
  paid: boolean;
  message: string;
}

export async function getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
  const { data } = await api.get<unknown>(`/payments/status/${encodeURIComponent(sessionId)}`);
  const response = asRecord(data) ?? {};
  const transactionStatus = text(response["payment_status"]).toLowerCase();
  const sessionStatus = text(response["status"]).toLowerCase();
  const failedSession = ["failed", "canceled", "cancelled", "expired"].includes(sessionStatus);
  const status =
    transactionStatus === "pending" && failedSession
      ? sessionStatus
      : transactionStatus || sessionStatus;
  // A Checkout Session marked "complete" is not enough: the signed webhook
  // must first mark our user-owned transaction as paid.
  const paid =
    response["paid"] === true || ["paid", "active", "succeeded"].includes(transactionStatus);
  return { status, paid, message: text(response["message"]) };
}

export const plansQueryOptions = () =>
  queryOptions({ queryKey: ["subscription", "plans"], queryFn: getPlans });

export const currentSubscriptionQueryOptions = () =>
  queryOptions({ queryKey: ["subscription", "current"], queryFn: getCurrentSubscription });

export const paymentStatusQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ["payments", "status", sessionId],
    queryFn: () => getPaymentStatus(sessionId),
    retry: false,
  });
