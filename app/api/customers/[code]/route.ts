// app/api/customers/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { AuditAction, AuditEntityType } from "@/lib/generated/prisma/browser";

// In Next 16, params can be a Promise -> we must await it
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

// GET /api/customers/:code (includes shipments)
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

// PUT /api/customers/:code (returns updated customer + shipments)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params;

    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (!code) {
      return NextResponse.json({ message: "Customer code is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // optional: capture "before" snapshot for audit meta
    const before = await prisma.customer.findUnique({
      where: { customerCode: code },
      select: {
        id: true,
        customerCode: true,
        companyName: true,
        email: true,
        phone: true,
        status: true,
        creditLimit: true,
        usedCredits: true,
        totalAmount: true,
      },
    });

    const updatedCustomer = await prisma.customer.update({
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

    if (!refreshed) {
      return NextResponse.json({ message: "Customer not found after update" }, { status: 404 });
    }

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CUSTOMER,
      entityId: refreshed.id, // Customer.id is String in your schema
      entityRef: refreshed.customerCode,
      description: `Customer updated: ${refreshed.companyName} (${refreshed.customerCode})`,
      meta: { before, after: updatedCustomer },
    });

    return NextResponse.json(shapeCustomerWithShipments(refreshed));
  } catch (error) {
    console.error("[PUT /api/customers/[code]] Error:", error);
    return NextResponse.json({ message: "Server error while updating customer" }, { status: 500 });
  }
}

// DELETE /api/customers/:code
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params;

    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (!code) {
      return NextResponse.json({ message: "Customer code is required" }, { status: 400 });
    }

    // capture record before delete for audit
    const before = await prisma.customer.findUnique({
      where: { customerCode: code },
      select: { id: true, customerCode: true, companyName: true },
    });

    if (!before) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    await prisma.customer.delete({ where: { customerCode: code } });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.CUSTOMER,
      entityId: before.id,
      entityRef: before.customerCode,
      description: `Customer deleted: ${before.companyName} (${before.customerCode})`,
      meta: { deleted: before },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/customers/[code]] Error:", error);
    return NextResponse.json({ message: "Server error while deleting customer" }, { status: 500 });
  }
}
