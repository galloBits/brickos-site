// Minimal CSV parser (handles quoted fields, escaped quotes, CRLF).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushRow = () => {
    row.push(cell);
    cell = "";
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      cell += c;
    }
  }
  pushRow();
  return rows;
}

// Parses CSV into objects keyed by normalized header (lowercase, spaces → _).
export function parseTable(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const raw = parseCsv(text.trim());
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = raw[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = raw.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

export function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
