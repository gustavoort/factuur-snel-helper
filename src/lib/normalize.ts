/** Shared defensive helpers for reading loosely-typed backend JSON. */

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Finds the array inside common list-response envelopes. */
export function collection(value: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const response = asRecord(value);
  if (!response) return [];
  for (const key of [...keys, "items", "results", "data"]) {
    const candidate = response[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/** Triggers a browser download for a binary blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
