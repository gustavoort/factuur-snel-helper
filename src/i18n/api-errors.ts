import i18n from "@/i18n";

/**
 * Maps known backend `detail` strings to translated messages.
 * Unknown messages are returned as-is so real backend feedback is never hidden.
 */
const PATTERNS: Array<{ test: RegExp; key: string }> = [
  { test: /invalid (email or password|credentials)|incorrect (email|password)/i, key: "errors.invalidCredentials" },
  { test: /already (registered|exists|in use)|email.*taken/i, key: "errors.emailInUse" },
  { test: /not authenticated|missing (token|credentials)|unauthorized/i, key: "errors.notAuthenticated" },
  { test: /^not found$|does not exist/i, key: "errors.notFound" },
  { test: /forbidden|not allowed|permission denied/i, key: "errors.forbidden" },
];

export function translateApiDetail(detail: string): string {
  const trimmed = detail.trim();
  if (!trimmed) return trimmed;
  const match = PATTERNS.find((pattern) => pattern.test.test(trimmed));
  return match ? i18n.t(match.key) : trimmed;
}
