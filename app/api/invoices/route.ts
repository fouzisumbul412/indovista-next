import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

const isOverdue = (dueDate: Date) => {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday().getTime();
};

// India FY: Apr 1 -> Mar 31  (Aug 2025 => 25/26)
function indianFiscalYearLabel(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endYear = startYear + 1;
  const yy = (n: number) => String(n).slice(-2);
  return `${yy(startYear)}/${yy(endYear)}`;
}

function extractSeq3(source: string) {
  const m = String(source || "").match(/(\d+)\s*$/);
  const n = m ? Number(m[1]) : 0;
  return String(Number.isFinite(n) ? n : 0).padStart(3, "0");
}

function makeIndoInvoiceNumber(issueDate: Date, shipmentRefOrId: string) {
  const fy = indianFiscalYearLabel(issueDate);
  const seq = extractSeq3(shipmentRefOrId);
  return `INDO-${fy}-${seq}`;
}

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  shipmentId: string;
  shipmentRef: string;
  customerName: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
};

export async function GET() {
  try {
    // Pull shipments (your schema already has these)
    const shipments = await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        createdAt: true,
        customerId: true,
        currencyId: true,
        revenue: true,
      },
    });

    const shipmentIds = shipments.map((s) => s.id);

    // Pull saved invoices (if any)
    const invoices = shipmentIds.length
      ? await prisma.shipmentInvoice.findMany({
          where: { shipmentId: { in: shipmentIds } },
          select: {
            shipmentId: true,
            invoiceNumber: true,
            customerName: true,
            amount: true,
            currency: true,
            issueDate: true,
            dueDate: true,
            status: true,
          },
        })
      : [];

    const invoiceMap = new Map(invoices.map((i) => [i.shipmentId, i]));

    // Customer + Currency maps
    const customerIds = Array.from(new Set(shipments.map((s) => s.customerId).filter(Boolean)));
    const currencyIds = Array.from(
      new Set(shipments.map((s) => s.currencyId).filter((x): x is number => typeof x === "number"))
    );

    const [customers, currencies] = await Promise.all([
      customerIds.length
        ? prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, companyName: true },
          })
        : Promise.resolve([]),
      currencyIds.length
        ? prisma.currency.findMany({
            where: { id: { in: currencyIds } },
            select: { id: true, currencyCode: true },
          })
        : Promise.resolve([]),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c.companyName]));
    const currencyMap = new Map(currencies.map((c) => [c.id, c.currencyCode]));

    const rows: InvoiceRow[] = shipments.map((s) => {
      const inv = invoiceMap.get(s.id);

      const issueDate = inv?.issueDate ?? s.createdAt;
      const dueDate = inv?.dueDate ?? addDays(issueDate, 30);

      const baseStatus = (String(inv?.status || "DRAFT").toUpperCase() as InvoiceRow["status"]);
      const derivedStatus =
        baseStatus !== "PAID" && isOverdue(dueDate) ? "OVERDUE" : baseStatus;

      const invoiceNumber =
        inv?.invoiceNumber || makeIndoInvoiceNumber(issueDate, s.reference || s.id);

      return {
        id: invoiceNumber,
        invoiceNumber,
        shipmentId: s.id,
        shipmentRef: s.reference || "",
        customerName: inv?.customerName || customerMap.get(s.customerId) || "",
        amount: Number(inv?.amount ?? s.revenue ?? 0) || 0,
        currency: inv?.currency || (s.currencyId ? currencyMap.get(s.currencyId) : undefined) || "INR",
        issueDate: toISODate(issueDate),
        dueDate: toISODate(dueDate),
        status: derivedStatus,
      };
    });

    return NextResponse.json(rows, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("GET /api/invoices failed:", e);
    return NextResponse.json(
      { message: e?.message || "Internal Server Error" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
