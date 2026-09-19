/**
 * Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), commas and newlines inside
 * quotes, CRLF or LF, and a leading BOM (Excel adds one). Returns rows of strings.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully blank lines.
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Rows keyed by the (trimmed, lower-cased) header row. */
export function parseCsvRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const [head, ...rest] = parseCsv(text);
  if (!head) return { headers: [], records: [] };
  const headers = head.map((h) => h.trim().toLowerCase());
  const records = rest.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, records };
}

/** Quote a value for CSV output. */
export const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
