// lib/invoice.ts
export const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// India FY: Apr 1 -> Mar 31  (e.g., Aug 2025 => 25/26, Feb 2025 => 24/25)
export function indianFiscalYearLabel(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endYear = startYear + 1;
  const yy = (n: number) => String(n).slice(-2);
  return `${yy(startYear)}/${yy(endYear)}`;
}

export function extractSeqFromShipmentId(shipmentId: string) {
  // Works great with "SHP-2025-003" => 003
  const m = String(shipmentId || "").match(/(\d+)\s*$/);
  const n = m ? Number(m[1]) : 0;
  return String(Number.isFinite(n) ? n : 0).padStart(3, "0");
}

export function makeIndoInvoiceNumber(issueDate: Date, shipmentId: string) {
  const fy = indianFiscalYearLabel(issueDate);
  const seq = extractSeqFromShipmentId(shipmentId);
  return `INDO-${fy}-${seq}`;
}
