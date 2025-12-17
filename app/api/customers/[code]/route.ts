// app/api/customers/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// In Next 16, `params` is a Promise -> we must `await` it
type RouteContext = {
  params: Promise<{ code: string }>;
};

function toDateOnly(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

function shapeCustomerWithShipments(customer: any) {
  return {
    ...customer,
    shipments: (customer.shipments || []).map((s: any) => ({
      id: s.id,
      reference: s.reference,
      mode: s.mode,
      status: s.status,
      etd: toDateOnly(s.etd),

      origin: { code: s.originPort?.code || "N/A" },
      destination: { code: s.destPort?.code || "N/A" },

      financials: {
        currency: s.currency?.currencyCode || customer.currency || "INR",
        revenue: s.revenue ?? 0,
      },
    })),
  };
}

// GET /api/customers/:code  (✅ now includes shipments)
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json({ message: "Customer code is required" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { customerCode: code },
      include: {
        shipments: {
          orderBy: { createdAt: "desc" },
          include: {
            originPort: { select: { code: true } },
            destPort: { select: { code: true } },
            currency: { select: { currencyCode: true } },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(shapeCustomerWithShipments(customer));
  } catch (error) {
    console.error("[GET /api/customers/[code]] Error:", error);
    return NextResponse.json({ message: "Server error while fetching customer" }, { status: 500 });
  }
}

// PUT /api/customers/:code  (✅ returns updated customer + shipments too)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json({ message: "Customer code is required" }, { status: 400 });
    }

    const body = await req.json();

    await prisma.customer.update({
      where: { customerCode: code },
      data: {
        companyName: body.companyName,
        type: body.type,
        contactPerson: body.contactPerson,
        phone: body.phone ?? null,
        email: body.email,
        address: body.address ?? null,
        city: body.city ?? null,
        country: body.country,
        currency: body.currency,
        creditLimit: Number(body.creditLimit ?? 0),
        usedCredits: Number(body.usedCredits ?? 0),
        totalAmount: Number(body.totalAmount ?? 0),
        paymentTerms: body.paymentTerms ?? null,
        kycStatus: Boolean(body.kycStatus),
        sanctionsCheck: Boolean(body.sanctionsCheck),
        status: body.status,
      },
    });

    // re-fetch with shipments so UI stays consistent
    const refreshed = await prisma.customer.findUnique({
      where: { customerCode: code },
      include: {
        shipments: {
          orderBy: { createdAt: "desc" },
          include: {
            originPort: { select: { code: true } },
            destPort: { select: { code: true } },
            currency: { select: { currencyCode: true } },
          },
        },
      },
    });

    return NextResponse.json(shapeCustomerWithShipments(refreshed));
  } catch (error) {
    console.error("[PUT /api/customers/[code]] Error:", error);
    return NextResponse.json({ message: "Server error while updating customer" }, { status: 500 });
  }
}

// DELETE /api/customers/:code
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json({ message: "Customer code is required" }, { status: 400 });
    }

    await prisma.customer.delete({
      where: { customerCode: code },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/customers/[code]] Error:", error);
    return NextResponse.json({ message: "Server error while deleting customer" }, { status: 500 });
  }
}
