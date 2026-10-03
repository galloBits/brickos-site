// Stripe metadata values are capped at 500 characters (and 50 keys). A
// selection of many agents as one comma-joined string overflows that and
// makes checkout fail, so lists are split across numbered keys.
const CHUNK = 450;

export function packList(prefix: string, items: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let current = "";
  let index = 0;
  for (const item of items) {
    if (current && current.length + 1 + item.length > CHUNK) {
      out[`${prefix}_${index++}`] = current;
      current = "";
    }
    current = current ? `${current},${item}` : item;
  }
  if (current) out[`${prefix}_${index}`] = current;
  return out;
}

export function unpackList(prefix: string, metadata: Record<string, string> | null | undefined): string[] {
  if (!metadata) return [];
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  return Object.entries(metadata)
    .map(([key, value]) => ({ match: key.match(pattern), value }))
    .filter((e): e is { match: RegExpMatchArray; value: string } => !!e.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .flatMap((e) => e.value.split(",").filter(Boolean));
}
