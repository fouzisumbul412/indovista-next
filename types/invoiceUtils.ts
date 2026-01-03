import jsPDF from "jspdf";
import type { Invoice, InvoiceLineItem } from "@/types";

/* ======================================================
   INDO VISTA – MASTER DATA
====================================================== */
const COMPANY = {
  name: "INDO VISTA",
  address: "NCPL, Near 7hills hotel, Madhapur, Hyderabad, Telangana - 500081",
  phone: "9000000000",
  email: "indovista@gmail.com",
  gstin: "36ABCDE1234F1Z5",
  state: "Telangana",
  stateCode: "36",
  logo: "/logo.png",
  signature: "/signature.png",

  // QR / UPI DETAILS
  upi: {
    vpa: "indovista@icici",
    payeeName: "INDO VISTA",
    notePrefix: "Invoice",
  },

  bank: {
    name: "ICICI BANK LIMITED, JUBILEE HILLS ROAD",
    account: "123456789012",
    ifsc: "ICIC0007541",
    holder: "INDO VISTA",
  },
};

/* ======================================================
   HELPERS
====================================================== */
function fmt(n: number): string {
  const raw = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
  return raw.replace(/[\u00A0\u202F\s]/g, "");
}

// NOTE: jsPDF default fonts can break ₹ in some viewers.
// If you face weird symbol issues, switch to "Rs. " everywhere.
function rs(n: number): string {
  return `Rs. ${fmt(n)}`;
}

function safeItems(invoice: Invoice): InvoiceLineItem[] {
  return (invoice.items ?? []) as InvoiceLineItem[];
}

function parseStateCode(place?: string | null): string | null {
  const s = String(place || "").trim();
  // matches "36-Telangana", "36 - Telangana", "State: 36-Telangana"
  const m = s.match(/(^|\b)(\d{2})\s*[-–]\s*/);
  return m ? m[2] : null;
}

function isInterState(invoice: Invoice): boolean {
  const posCode = parseStateCode(invoice.placeOfSupply);
  if (posCode) return posCode !== COMPANY.stateCode;

  // fallback: compare state name string (STRICT BOOLEAN RETURN)
  const pos = String(invoice.placeOfSupply || "").toLowerCase().trim();
  return pos.length > 0 && !pos.includes(COMPANY.state.toLowerCase());
}

/* ======================================================
   INR AMOUNT IN WORDS (NO EXTERNAL LIB)
   Supports up to 99,99,99,999 (crores range)
====================================================== */
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`.trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = "";
  if (h) out += `${ONES[h]} Hundred`;
  if (r) out += `${out ? " " : ""}${twoDigits(r)}`;
  return out.trim();
}

function toWordsINR(amount: number): string {
  const rupees = Math.floor(Number(amount || 0));
  const paise = Math.round((Number(amount || 0) - rupees) * 100);

  if (rupees === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(`${threeDigits(rest)}`);

  let words = parts.join(" ").trim() + " Rupees";
  if (paise > 0) words += ` And ${twoDigits(paise)} Paise`;
  words += " Only";
  return words.replace(/\s+/g, " ").trim();
}

/* ======================================================
   IMAGE / QR LOADERS
====================================================== */
async function loadImageDataURL(pathOrDataUrl: string): Promise<string | null> {
  try {
    if (!pathOrDataUrl) return null;
    if (pathOrDataUrl.startsWith("data:")) return pathOrDataUrl;
    if (typeof window === "undefined") return null; // avoid SSR fetch issues
    const blob = await fetch(pathOrDataUrl).then((r) => r.blob());
    return await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    // dependency: npm i qrcode
    const QR = (await import("qrcode")).default;
    const dataUrl = await QR.toDataURL(text, { margin: 1, width: 220 });
    return dataUrl;
  } catch {
    return null;
  }
}

function buildUpiQrString(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  const { vpa, payeeName, amount, note } = params;
  const a = Number(amount || 0).toFixed(2);
  const pn = encodeURIComponent(payeeName || "");
  const tn = encodeURIComponent(note || "");
  const pa = encodeURIComponent(vpa || "");
  return `upi://pay?pa=${pa}&pn=${pn}&am=${a}&cu=INR&tn=${tn}`;
}

/* ======================================================
   TOTALS
====================================================== */
function calcLine(it: InvoiceLineItem) {
  const qty = Number(it.quantity || 0);
  const rate = Number(it.rate || 0);
  const taxRate = Number(it.taxRate || 0);
  const taxable =
    typeof (it as any).taxableValue === "number"
      ? Number((it as any).taxableValue)
      : qty * rate;
  const tax = taxable * (taxRate / 100);
  const total = taxable + tax;
  return { taxable, tax, total, taxRate };
}

function sumTotals(items: InvoiceLineItem[]) {
  let taxableTotal = 0;
  let taxTotal = 0;
  let grossTotal = 0;

  for (const it of items) {
    const { taxable, tax, total } = calcLine(it);
    taxableTotal += taxable;
    taxTotal += tax;
    grossTotal += total;
  }

  return { taxableTotal, taxTotal, grossTotal };
}

/* ======================================================
   MAIN PDF BUILDER (EXACT BOXED STYLE + LOCKED 1 PAGE)
====================================================== */
export async function buildInvoicePdf(invoice: Invoice): Promise<jsPDF> {
  const doc = new jsPDF("p", "pt", "a4");
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 26;

  const items = safeItems(invoice);
  const inter = isInterState(invoice);

  const { taxableTotal, taxTotal, grossTotal } = sumTotals(items);

  const paidAmount = Number((invoice as any).paidAmount || 0);
  const balanceAmount =
    typeof (invoice as any).balanceAmount === "number"
      ? Number((invoice as any).balanceAmount)
      : Math.max(0, grossTotal - paidAmount);

  const logoData = await loadImageDataURL(COMPANY.logo);
  const signData = await loadImageDataURL(COMPANY.signature);

  const upiNote = `${COMPANY.upi.notePrefix} ${invoice.invoiceNumber}`;
  const upiText = buildUpiQrString({
    vpa: COMPANY.upi.vpa,
    payeeName: COMPANY.upi.payeeName,
    amount: balanceAmount > 0 ? balanceAmount : grossTotal,
    note: upiNote,
  });
  const qrData = await makeQrDataUrl(upiText);

  /* ===================== HEADER ===================== */
  doc.setDrawColor(0);
  doc.setLineWidth(0.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Tax Invoice", W / 2, 22, { align: "center" });

  if (logoData) doc.addImage(logoData, "PNG", M, 30, 58, 58);

  doc.setFontSize(15);
  doc.text(COMPANY.name, W / 2, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Reg. Ofc: ${COMPANY.address}`, W / 2, 66, { align: "center" });
  doc.text(`Phone: ${COMPANY.phone}`, W / 2 - 120, 80);
  doc.text(`Email: ${COMPANY.email}`, W / 2 + 40, 80);
  doc.text(`GSTIN: ${COMPANY.gstin}`, W / 2 - 120, 93);
  doc.text(`State: ${COMPANY.state}-${COMPANY.stateCode}`, W / 2 + 40, 93);

  doc.rect(M, 28, W - M * 2, 78);

  /* ===================== BILL TO + INVOICE DETAILS ===================== */
  let y = 112;
  const boxH = 76;
  doc.rect(M, y, W - M * 2, boxH);
  doc.line(W / 2, y, W / 2, y + boxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bill To:", M + 6, y + 14);
  doc.text("Invoice Details:", W / 2 + 6, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);

  doc.text(invoice.customerName || "-", M + 6, y + 30);
  doc.text(
    String((invoice as any).customerAddress || "NO 03 A B INDUSTRIAL ESTATE, VILLAGE"),
    M + 6,
    y + 42
  );
  doc.text(`Contact No: ${(invoice as any).customerPhone || "9999999999"}`, M + 6, y + 54);
  doc.text(`State: ${invoice.placeOfSupply || "-"}`, M + 6, y + 66);

  doc.text(`No: ${invoice.invoiceNumber}`, W / 2 + 6, y + 30);
  doc.text(`Date: ${invoice.issueDate}`, W / 2 + 6, y + 42);
  doc.text(`Place Of Supply: ${invoice.placeOfSupply || "-"}`, W / 2 + 6, y + 54);
  doc.text(`GSTIN: ${invoice.customerGstin || "-"}`, W / 2 + 6, y + 66);

  /* ===================== ITEMS TABLE ===================== */
  y += boxH + 10;

  const cols = [
    { t: "#", w: 24 },
    { t: "Item name", w: 172 },
    { t: "HSN/ SAC", w: 66 },
    { t: "Quantity", w: 52 },
    { t: "Price/ Unit", w: 88 },
    { t: "GST", w: 82 },
    { t: "Amount", w: 85 },
  ];

  const rowH = 24;
  const tableX = M;
  const tableW = W - M * 2;

  const sumW = cols.reduce((a, c) => a + c.w, 0);
  if (sumW !== tableW) {
    const scale = tableW / sumW;
    cols.forEach((c) => (c.w = Math.floor(c.w * scale)));
    cols[1].w += tableW - cols.reduce((a, c) => a + c.w, 0);
  }

  let x = tableX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  cols.forEach((c) => {
    doc.rect(x, y, c.w, rowH);
    doc.text(c.t, x + 4, y + 16);
    x += c.w;
  });
  y += rowH;

  const taxSummaryBlockHeight = 110;
  const bottomBlocksHeight = 160;
  const safeBottomY = H - M - bottomBlocksHeight;
  const maxRowsFit = Math.max(1, Math.floor((safeBottomY - y - taxSummaryBlockHeight) / rowH));

  const showItems = items.slice(0, maxRowsFit);
  const hiddenCount = Math.max(0, items.length - showItems.length);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);

  showItems.forEach((it, i) => {
    const { tax, total, taxRate } = calcLine(it);

    const row = [
      String(i + 1),
      it.description || "-",
      it.hsnCode || "",
      String(it.quantity ?? 0),
      rs(Number(it.rate ?? 0)).replace("Rs. ", ""),
      `${rs(tax).replace("Rs. ", "")} (${taxRate}%)`,
      rs(total).replace("Rs. ", ""),
    ];

    x = tableX;
    row.forEach((v, idx) => {
      doc.rect(x, y, cols[idx].w, rowH);
      doc.text(String(v), x + 4, y + 16);
      x += cols[idx].w;
    });

    y += rowH;
  });

  if (hiddenCount > 0) {
    x = tableX;
    const msg = `+ ${hiddenCount} more item(s) not shown (locked to 1-page print)`;
    cols.forEach((c, idx) => {
      doc.rect(x, y, c.w, rowH);
      if (idx === 1) doc.text(msg, x + 4, y + 16);
      x += c.w;
    });
    y += rowH;
  }

  x = tableX;
  doc.setFont("helvetica", "bold");
  const totalRow = ["", "Total", "", "", "", rs(taxTotal).replace("Rs. ", ""), rs(grossTotal).replace("Rs. ", "")];
  cols.forEach((c, idx) => {
    doc.rect(x, y, c.w, rowH);
    const val = totalRow[idx] || "";
    if (val) doc.text(val, x + 4, y + 16);
    x += c.w;
  });
  doc.setFont("helvetica", "normal");
  y += rowH + 8;

  /* ===================== TAX SUMMARY (LEFT) + TOTALS (RIGHT) ===================== */
  const leftW = (W - M * 2) * 0.62;
  const rightW = (W - M * 2) - leftW;
  const blockH = 108;

  doc.rect(M, y, leftW, blockH);
  doc.rect(M + leftW, y, rightW, blockH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Tax Summary:", M + 6, y + 14);

  const ty = y + 22;
  const innerCols = inter
    ? [
        { t: "HSN/ SAC", w: 70 },
        { t: "Taxable amount", w: 120 },
        { t: "IGST Rate(%)", w: 70 },
        { t: "IGST Amt", w: 80 },
        { t: "Total Tax", w: 80 },
      ]
    : [
        { t: "HSN/ SAC", w: 70 },
        { t: "Taxable amount", w: 120 },
        { t: "CGST Amt", w: 80 },
        { t: "SGST Amt", w: 80 },
        { t: "Total Tax", w: 80 },
      ];

  const innerSum = innerCols.reduce((a, c) => a + c.w, 0);
  const scale2 = (leftW - 2) / innerSum;
  innerCols.forEach((c) => (c.w = Math.floor(c.w * scale2)));
  innerCols[1].w += (leftW - 2) - innerCols.reduce((a, c) => a + c.w, 0);

  const innerRowH = 22;
  let ix = M;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  innerCols.forEach((c) => {
    doc.rect(ix, ty, c.w, innerRowH);
    doc.text(c.t, ix + 4, ty + 15);
    ix += c.w;
  });

  doc.setFont("helvetica", "normal");
  const cgst = taxTotal / 2;
  const sgst = taxTotal / 2;

  const values = inter
    ? ["", rs(taxableTotal), "18", rs(taxTotal), rs(taxTotal)]
    : ["", rs(taxableTotal), rs(cgst), rs(sgst), rs(taxTotal)];

  ix = M;
  innerCols.forEach((c, idx) => {
    doc.rect(ix, ty + innerRowH, c.w, innerRowH);
    const v = values[idx] || "";
    if (v) doc.text(v, ix + 4, ty + innerRowH + 15);
    ix += c.w;
  });

  doc.setFont("helvetica", "bold");
  const tvals = inter
    ? ["TOTAL", rs(taxableTotal), "", rs(taxTotal), rs(taxTotal)]
    : ["TOTAL", rs(taxableTotal), rs(cgst), rs(sgst), rs(taxTotal)];

  ix = M;
  innerCols.forEach((c, idx) => {
    doc.rect(ix, ty + innerRowH * 2, c.w, innerRowH);
    const v = tvals[idx] || "";
    if (v) doc.text(v, ix + 4, ty + innerRowH * 2 + 15);
    ix += c.w;
  });

  const rx = M + leftW;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);

  const rLine = (label: string, value: string, yLine: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, rx + 8, yLine);
    doc.text(value, rx + rightW - 8, yLine, { align: "right" });
  };

  rLine("Sub Total", rs(grossTotal), y + 28);
  rLine("Round Off", rs(0), y + 46);
  rLine("Total", rs(grossTotal), y + 64, true);

  y += blockH + 6;

  doc.rect(M + leftW, y, rightW, 54);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Amount in Words:", M + leftW + 8, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  const words = doc.splitTextToSize(toWordsINR(grossTotal), rightW - 16);
  doc.text(words, M + leftW + 8, y + 30);

  doc.rect(M + leftW, y + 54, rightW, 44);
  doc.setFontSize(8.6);
  rLine("Received", rs(paidAmount), y + 72);
  rLine("Balance", rs(balanceAmount), y + 88);

  doc.rect(M, y, leftW, 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Payment Mode:", M + 6, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.text(String((invoice as any).paymentMode || "Credit"), M + 6, y + 34);

  y += 104;

  doc.rect(M, y, W - M * 2, 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Terms & Conditions:", M + 6, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.text("Thanks for doing business with us!", M + 6, y + 34);

  y += 52;

  const footerH = 88;
  doc.rect(M, y, W - M * 2, footerH);
  doc.line(W / 2, y, W / 2, y + footerH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bank Details:", M + 6, y + 14);

  const qrX = M + 6;
  const qrY = y + 22;
  const qrSize = 62;
  doc.rect(qrX, qrY, qrSize, qrSize);

  if (qrData) {
    doc.addImage(qrData, "PNG", qrX + 2, qrY + 2, qrSize - 4, qrSize - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("SCAN TO PAY", qrX + 8, qrY + qrSize + 10);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("QR not available", qrX + 6, qrY + 35);
  }

  const bx = qrX + qrSize + 10;
  doc.setFontSize(8.2);
  doc.text(`Name : ${COMPANY.bank.name}`, bx, y + 34);
  doc.text(`Account No. : ${COMPANY.bank.account}`, bx, y + 48);
  doc.text(`IFSC code : ${COMPANY.bank.ifsc}`, bx, y + 62);
  doc.text(`Account holder's name : ${COMPANY.bank.holder}`, bx, y + 76);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`For ${COMPANY.name}:`, W / 2 + 6, y + 14);

  const sigBoxX = W / 2 + 10;
  const sigBoxY = y + 24;
  const sigBoxW = W - M - sigBoxX - 10;
  const sigBoxH = 44;

  doc.rect(sigBoxX, sigBoxY, sigBoxW, sigBoxH);
  if (signData) {
    doc.addImage(signData, "PNG", sigBoxX + 6, sigBoxY + 6, sigBoxW - 12, sigBoxH - 12);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text("Authorized Signatory", W - M - 10, y + 78, { align: "right" });

  doc.setTextColor(120);
  doc.setFontSize(8);
  doc.text("This is a computer-generated invoice.", M, H - 14);
  doc.setTextColor(0);

  return doc;
}

export function openInvoicePdfInNewTab(invoice: Invoice): void {
  if (typeof window === "undefined") return;
  buildInvoicePdf(invoice).then((doc) => {
    const blob = doc.output("blob") as Blob;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });
}
