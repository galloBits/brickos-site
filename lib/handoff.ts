// Hand-offs between agents: one agent links to another with a few values in
// the URL, and the target pre-fills its form. Everything arriving in a URL is
// untrusted (anyone can craft a link), so values are length-capped, stripped
// of control characters, and numeric/select fields are validated before use.

export type HandoffValue = string | number | null | undefined;

export function handoffUrl(slug: string, params: Record<string, HandoffValue>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const text = String(value);
    if (text !== "") q.set(key, text);
  }
  const query = q.toString();
  return `/workflows/${slug}${query ? `?${query}` : ""}`;
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

function clean(value: string, max: number): string {
  return value.replace(CONTROL_CHARS, "").slice(0, max);
}

export type HandoffSpec = Record<string, { numeric?: boolean; max?: number }>;

export function readHandoff(search: { get(name: string): string | null }, spec: HandoffSpec): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, rule] of Object.entries(spec)) {
    const raw = search.get(key);
    if (raw === null) continue;
    const value = clean(raw, rule.max ?? 200).trim();
    if (!value) continue;
    if (rule.numeric && (!PLAIN_NUMBER.test(value) || value.length > 15)) continue;
    out[key] = value;
  }
  return out;
}

type FieldRule = { key: string; type: "text" | "textarea" | "select"; max: number; options?: string[] };

// For form-based agents: keep only values for fields the form actually has.
export function sanitizeFieldValues(
  fields: FieldRule[],
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const raw = params[field.key];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (typeof first !== "string") continue;
    const value = clean(first, field.max).trim();
    if (!value) continue;
    if (field.type === "select" && !field.options?.includes(value)) continue;
    out[field.key] = value;
  }
  return out;
}
