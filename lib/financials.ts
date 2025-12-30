import { prisma } from "@/lib/prisma";

const EPS = 0.000001;

// shipmentInvoice.status is String in your schema, but we enforce these values
export type InvoiceStatusString = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

function safeStatus(v: any, fallback: InvoiceStatusString): InvoiceStatusString {
  const s = String(v || "").toUpperCase().trim();
  if (s === "DRAFT" || s === "SENT" || s === "PAID" || s === "OVERDUE") return s;
  return fallback;
}

export async function recalcInvoicePaidStatus(invoiceId: string) {
  const invoice = await prisma.shipmentInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      shipmentId: true,
      amount: true,
      status: true,
      issueDate: true,
      dueDate: true,
    },
  });

  if (!invoice) return null;

  const paidAgg = await prisma.payment.aggregate({
    where: { invoiceId, status: "COMPLETED" },
    _sum: { amount: true },
  });

  const totalPaid = paidAgg._sum.amount ?? 0;
  const invoiceAmount = Number(invoice.amount || 0);
  const outstanding = Math.max(0, invoiceAmount - totalPaid);

  const current = safeStatus(invoice.status, "DRAFT");

  // If paid fully -> PAID
  if (invoiceAmount > 0 && totalPaid + EPS >= invoiceAmount) {
    if (current !== "PAID") {
      await prisma.shipmentInvoice.update({
        where: { id: invoiceId },
        data: { status: "PAID" },
      });
    }
  } else {
    // If not fully paid and invoice was PAID -> revert to SENT (unless it was DRAFT)
    if (current === "PAID") {
      await prisma.shipmentInvoice.update({
        where: { id: invoiceId },
        data: { status: "SENT" },
      });
    }
  }

  return { invoiceId, shipmentId: invoice.shipmentId, totalPaid, outstanding };
}

export async function recalcShipmentInvoiceStatus(shipmentId: string) {
  const invoices = await prisma.shipmentInvoice.findMany({
    where: { shipmentId },
    select: { status: true, dueDate: true, amount: true },
  });

  if (!invoices.length) {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { invoiceStatus: "DRAFT" },
    });
    return { shipmentId, invoiceStatus: "DRAFT" as const };
  }

  // Normalize + compute OVERDUE if needed
  const now = new Date();
  const statuses = invoices.map((i: any) => {
    const st = safeStatus(i.status, "DRAFT");
    const amt = Number(i.amount || 0);
    if (st !== "PAID" && amt > 0 && i.dueDate && new Date(i.dueDate) < now) return "OVERDUE";
    return st;
  });

  // Priority: OVERDUE > SENT > DRAFT > PAID (but PAID only if all PAID)
  let finalStatus: InvoiceStatusString = "DRAFT";

  const allPaid = statuses.every((s: InvoiceStatusString) => s === "PAID");
  if (allPaid) finalStatus = "PAID";
  else if (statuses.some((s: InvoiceStatusString) => s === "OVERDUE")) finalStatus = "OVERDUE";
  else if (statuses.some((s: InvoiceStatusString) => s === "SENT" || s === "PAID")) finalStatus = "SENT";
  else finalStatus = "DRAFT";

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { invoiceStatus: finalStatus as any }, // Shipment.invoiceStatus is enum InvoiceStatus
  });

  return { shipmentId, invoiceStatus: finalStatus };
}
