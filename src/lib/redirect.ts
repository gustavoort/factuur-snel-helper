/**
 * Returns `value` only when it is a same-origin, in-app path that is safe to
 * navigate to after login. Anything else (absolute URLs, protocol-relative
 * `//host`, backslash tricks, auth pages) is rejected.
 */
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  if (value.includes("\\") || [...value].some((char) => char.charCodeAt(0) < 0x20))
    return undefined;
  const pathname = value.split(/[?#]/, 1)[0] ?? "";
  if (["/login", "/register"].includes(pathname)) return undefined;
  return value;
}

/** True when the user was sent to login on the way back from Stripe Checkout. */
export function isPaymentReturn(redirect: string | undefined): boolean {
  return Boolean(redirect && redirect.split(/[?#]/, 1)[0] === "/payment-success");
}
