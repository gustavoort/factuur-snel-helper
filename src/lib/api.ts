import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import i18n from "@/i18n";
import { translateApiDetail } from "@/i18n/api-errors";

const rawApiUrl = (import.meta.env['VITE_API_URL'] ?? "").toString().trim();

/** Normalized backend origin, e.g. https://api.example.com (no trailing slash). */
export const apiUrl = rawApiUrl.replace(/\/+$/, "");

/** True when a valid absolute backend URL is configured. */
export const isApiConfigured = /^https?:\/\/[^/]+/i.test(apiUrl);

export const api = axios.create({
  baseURL: `${apiUrl}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Extracts a human, translated message from a FastAPI `detail` payload (string | array | object). */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const err = error as AxiosError<unknown> | undefined;

  if (err && axios.isAxiosError(err) && !err.response) return i18n.t("errors.connection");

  const data = err?.response?.data as { detail?: unknown; message?: unknown } | undefined;
  const detail = data?.detail ?? data?.message;

  if (typeof detail === "string" && detail.trim()) return translateApiDetail(detail);

  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) =>
        typeof d === "string"
          ? d
          : typeof (d as { msg?: unknown })?.msg === "string"
            ? (d as { msg: string }).msg
            : null,
      )
      .filter((m): m is string => Boolean(m));
    if (msgs.length) return msgs.map(translateApiDetail).join(" ");
  }

  if (detail && typeof detail === "object" && typeof (detail as { msg?: unknown }).msg === "string") {
    return translateApiDetail((detail as { msg: string }).msg);
  }

  if (err && axios.isAxiosError(err) && err.response?.status === 422) {
    return i18n.t("errors.validation");
  }

  return fallback ?? i18n.t("errors.generic");
}

type RetryConfig = AxiosRequestConfig & { _retry?: boolean; skipAuthRefresh?: boolean };

/** Called when refresh fails — set by AuthContext to clear state and redirect. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !config || config._retry || config.skipAuthRefresh) {
      return Promise.reject(error);
    }

    config._retry = true;
    try {
      refreshPromise ??= api
        .post("/auth/refresh", undefined, { skipAuthRefresh: true } as RetryConfig)
        .then(() => undefined)
        .finally(() => {
          refreshPromise = null;
        });
      await refreshPromise;
      return await api.request(config);
    } catch {
      onSessionExpired?.();
      return Promise.reject(error);
    }
  },
);

export default api;
