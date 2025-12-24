import jsPDF from "jspdf";
import type { Invoice, InvoiceLineItem } from "@/types";

/**
 * Update these placeholders for your real company details.
 * Kept as constants so PDF output looks professional.
 */
const COMPANY = {
  name: "INDO Logistics",
  addressLine1: "Company Address Line 1",
  addressLine2: "City, State, PIN",
  gstin: "27AAAAA0000A1Z5",
  state: "Maharashtra",
};

function safeDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * India Financial Year: Apr -> Mar
 * Example: Dec 2025 => 25/26
 */
export function getIndiaFinancialYearLabel(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const fyStartYear = m >= 3 ? y : y - 1; // Apr(3) is FY start
  const fyEndYear = fyStartYear + 1;
  return `${String(fyStartYear).slice(-2)}/${String(fyEndYear).slice(-2)}`;
}

function getInvoiceSeqStorageKey(fyLabel: string): string {
  return `invoice_seq_${fyLabel.replace("/", "_")}`;
}

function extractSequence(invoiceNumber: string, fyLabel: string): number | null {
  // INDO-25/26-001
  const re = new RegExp(`^INDO-${fyLabel.replace("/", "\\/")}-(\\d+)$`);
  const match = invoiceNumber.match(re);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function getMaxSequenceFromInvoices(existing: Invoice[], fyLabel: string): number {
  let max = 0;
  for (const inv of existing) {
    const seq = extractSequence(inv.invoiceNumber, fyLabel);
    if (seq && seq > max) max = seq;
  }
  return max;
}

/**
 * Generates next invoice number like INDO-25/26-001.
 * Uses BOTH:
 *  - max in existing invoices (state)
 *  - localStorage counter (browser persistence)
 * Picks the safest next number, then persists it.
 */
export function generateNextInvoiceNumber(params: {
  issueDate: string;
  existingInvoices?: Invoice[];
}): string {
  const issue = safeDate(params.issueDate);
  const fy = getIndiaFinancialYearLabel(issue);

  const existing = params.existingInvoices ?? [];
  const maxFromList = getMaxSequenceFromInvoices(existing, fy);

  let stored = 0;
  if (typeof window !== "undefined") {
    const key = getInvoiceSeqStorageKey(fy);
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? Number(raw) : 0;
    stored = Number.isFinite(parsed) ? parsed : 0;
  }

  const next = Math.max(maxFromList, stored) + 1;

  if (typeof window !== "undefined") {
    const key = getInvoiceSeqStorageKey(fy);
    window.localStorage.setItem(key, String(next));
  }

  const seq = String(next).padStart(3, "0");
  return `INDO-${fy}-${seq}`;
}

/**
 * IMPORTANT:
 * jsPDF built-in fonts (helvetica/times/courier) do NOT support ₹ reliably.
 * That’s why you see a strange "¹" in your PDF.
 * Fix: use "Rs. " for INR (safe ASCII).
 */
function currencyPrefix(currency: string): string {
  const c = String(currency || "INR").toUpperCase().trim();
  if (c === "INR") return "Rs. ";
  if (c === "USD") return "$";
  if (c === "GBP") return "£";
  if (c === "EUR") return "EUR "; // safest (avoid unicode € issues in some viewers)
  if (c === "AED") return "AED ";
  return `${c} `;
}

/**
 * Format number in en-IN and remove any hidden spaces/NBSP that can cause bad spacing in PDF.
 */
function fmtNumber(n: number): string {
  const raw = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

  // remove normal spaces + NBSP + narrow NBSP if any
  return raw.replace(/[\u00A0\u202F\s]/g, "");
}

function money(n: number, currency: string): string {
  return `${currencyPrefix(currency)}${fmtNumber(n)}`;
}

function calcItem(item: InvoiceLineItem) {
  const qty = Number(item.quantity || 0);
  const rate = Number(item.rate || 0);
  const taxRate = Number(item.taxRate || 0);

  const taxable = Number(item.taxableValue ?? qty * rate);

  // If amount exists, treat it as (taxable + GST)
  const gstAmt =
    typeof item.amount === "number"
      ? Number(item.amount - taxable)
      : Number(taxable * (taxRate / 100));

  const total = taxable + gstAmt;

  return { taxable, gstAmt, total, taxRate };
}

/**
 * Builds a clean, printable PDF for an invoice (client-side).
 */
export function buildInvoicePdf(invoice: Invoice): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  const currency = invoice.currency || "INR";
  const isInterState =
    !!invoice.placeOfSupply &&
    invoice.placeOfSupply.toLowerCase() !== COMPANY.state.toLowerCase();

  // Header
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TAX INVOICE", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, pageW - margin, y, { align: "right" });

  y += 18;
  doc.setFontSize(10);
  doc.text(`Invoice Date: ${invoice.issueDate}`, margin, y);
  doc.text(`Due Date: ${invoice.dueDate}`, pageW - margin, y, { align: "right" });

  y += 14;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);

  // Company & Customer blocks
  y += 18;

  const leftX = margin;
  const rightX = pageW / 2 + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("From (Supplier)", leftX, y);
  doc.text("To (Customer)", rightX, y);

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Supplier + Customer
  doc.text(COMPANY.name, leftX, y);
  doc.text(invoice.customerName || "-", rightX, y);

  y += 14;
  doc.text(COMPANY.addressLine1, leftX, y);
  doc.text(`GSTIN: ${invoice.customerGstin || "-"}`, rightX, y);

  y += 14;
  doc.text(COMPANY.addressLine2, leftX, y);
  doc.text(`Place of Supply: ${invoice.placeOfSupply || "-"}`, rightX, y);

  y += 14;
  doc.text(`GSTIN: ${COMPANY.gstin}`, leftX, y);
  doc.text(`Shipment Ref: ${invoice.shipmentRef || "-"}`, rightX, y);

  y += 14;
  doc.text(`State: ${COMPANY.state}`, leftX, y);

  y += 18;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);

  // Table
  y += 16;

  const tableX = margin;
  const tableW = pageW - margin * 2;

  /**
   * FIXED COLUMN WIDTHS:
   * Previous GST Amt / Total were too narrow (45pt) causing overlap.
   * New widths keep numbers readable and aligned.
   * Sum = 515pt (exactly tableW on A4 with 40pt margins).
   */
  const cols = [
    { key: "desc", label: "Description", w: 150, align: "left" as const },
    { key: "hsn", label: "HSN/SAC", w: 55, align: "left" as const },
    { key: "qty", label: "Qty", w: 30, align: "right" as const },
    { key: "rate", label: "Rate", w: 65, align: "right" as const },
    { key: "taxable", label: "Taxable", w: 65, align: "right" as const },
    { key: "gstp", label: "GST%", w: 30, align: "right" as const },
    { key: "gsta", label: "GST Amt", w: 60, align: "right" as const },
    { key: "total", label: "Total", w: 60, align: "right" as const },
  ];

  // If tableW differs (custom), scale to fit
  const sumW = cols.reduce((s, c) => s + c.w, 0);
  if (sumW !== tableW) {
    const scale = tableW / sumW;
    cols.forEach((c) => (c.w = Math.floor(c.w * scale)));
    const drift = tableW - cols.reduce((s, c) => s + c.w, 0);
    cols[0].w += drift;
  }

  const rowPadY = 6;
  const lineH = 12;

  function drawRow(cells: string[], yTop: number, isHeader = false): number {
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(9);

    // wrap only description
    const desc = cells[0] ?? "";
    const descLines = doc.splitTextToSize(desc, cols[0].w - 8);

    const maxLines = Math.max(descLines.length, 1);
    const rowH = rowPadY * 2 + maxLines * lineH;

    // page break check
    if (yTop + rowH > pageH - margin - 140) {
      doc.addPage();
      yTop = margin;
      // re-draw header row on new page
      yTop = drawRow(cols.map((c) => c.label), yTop, true);
    }

    let x = tableX;

    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      doc.setDrawColor(235);
      doc.rect(x, yTop, col.w, rowH);

      const textX = col.align === "right" ? x + col.w - 4 : x + 4;

      if (i === 0) {
        doc.text(descLines, x + 4, yTop + rowPadY + lineH - 2);
      } else {
        const v = (cells[i] ?? "").replace(/[\u00A0\u202F]/g, " ");
        doc.text(v, textX, yTop + rowPadY + lineH - 2, { align: col.align });
      }

      x += col.w;
    }

    return yTop + rowH;
  }

  // Header row
  y = drawRow(cols.map((c) => c.label), y, true);

  // Data rows
  for (const it of invoice.items || []) {
    const { taxable, gstAmt, total, taxRate } = calcItem(it);
    y = drawRow(
      [
        it.description || "-",
        it.hsnCode || "-",
        String(it.quantity ?? 0),
        fmtNumber(Number(it.rate ?? 0)),
        fmtNumber(taxable),
        String(taxRate),
        fmtNumber(gstAmt),
        fmtNumber(total),
      ],
      y,
      false
    );
  }

  y += 14;

  // Totals block (right aligned)
  const subtotal = Number(invoice.subtotal || 0);
  const totalTax = Number(invoice.totalTax || 0);
  const invoiceTotal = subtotal + totalTax;
  const tdsRate = Number(invoice.tdsRate || 0);
  const tdsAmount = Number(invoice.tdsAmount || 0);
  const netPayable =
    typeof invoice.amount === "number" ? Number(invoice.amount) : invoiceTotal - tdsAmount;

  // FIX: consistent columns for totals
  const totalsRightX = pageW - margin;
  const totalsLabelX = totalsRightX - 240;

  function totalsLine(label: string, value: string, yLine: number, bold = false) {
    // label
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(label, totalsLabelX, yLine, { align: "left" });

    // value (use courier mono so digits align cleanly)
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(value, totalsRightX, yLine, { align: "right" });
  }

  totalsLine("Subtotal (Taxable)", money(subtotal, currency), y);
  y += 14;

  if (isInterState) {
    totalsLine("IGST (Output)", money(totalTax, currency), y);
    y += 14;
  } else {
    totalsLine("CGST (Output)", money(totalTax / 2, currency), y);
    y += 14;
    totalsLine("SGST (Output)", money(totalTax / 2, currency), y);
    y += 14;
  }

  doc.setDrawColor(220);
  doc.line(totalsLabelX, y + 4, totalsRightX, y + 4);
  y += 18;

  totalsLine("Invoice Total", money(invoiceTotal, currency), y, true);
  y += 16;

  if (tdsRate > 0) {
    totalsLine(`Less: TDS @ ${tdsRate}%`, `- ${money(tdsAmount, currency)}`, y);
    y += 14;
  }

  doc.setDrawColor(220);
  doc.line(totalsLabelX, y + 4, totalsRightX, y + 4);
  y += 18;

  totalsLine("Net Payable", money(netPayable, currency), y, true);
  y += 24;

  // Footer note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("This is a computer-generated invoice.", margin, pageH - margin);

  // reset color
  doc.setTextColor(0);

  return doc;
}

export function openInvoicePdfInNewTab(invoice: Invoice): void {
  if (typeof window === "undefined") return;

  const doc = buildInvoicePdf(invoice);
  const blob = doc.output("blob") as Blob;

  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");

  // cleanup later
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
