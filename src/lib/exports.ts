export function neutraliseCsvFormula(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  return [
    headers.map((header) => neutraliseCsvFormula(header)).join(","),
    ...rows.map((row) => row.map((cell) => neutraliseCsvFormula(cell)).join(",")),
  ].join("\r\n");
}
