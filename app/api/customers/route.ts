// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/lib/customerCode";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { AuditAction, AuditEntityType } from "@/lib/generated/prisma/browser";

// GET /api/customers → list all customers
export async function GET(_req: NextRequest) {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("[GET /api/customers] Error:", error);
    return NextResponse.json(
      { message: "Server error while fetching customers" },
      { status: 500 }
    );
  }
}

// POST /api/customers → create a new customer
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Basic validation for required fields
    if (!data.companyName || !data.email || !data.country) {
      return NextResponse.json(
        { message: "companyName, email and country are required" },
        { status: 400 }
      );
    }

    const customerCode = await generateCustomerCode();

    const created = await prisma.customer.create({
      data: {
        customerCode,
        companyName: data.companyName,
        type: data.type, // must be one of: "Importer" | "Distributor" | "RetailChain" | "RestaurantGroup"
        contactPerson: data.contactPerson ?? "",
        phone: data.phone || null,
        email: data.email,
        address: data.address || null,
        city: data.city || null,
        country: data.country,
        currency: data.currency || "INR",
        creditLimit: Number(data.creditLimit ?? 0),
        usedCredits: Number(data.usedCredits ?? 0),
        totalAmount: Number(data.totalAmount ?? 0),
        paymentTerms: data.paymentTerms || null,
        kycStatus: Boolean(data.kycStatus),
        sanctionsCheck: Boolean(data.sanctionsCheck),
        status: data.status || "ACTIVE",
      },
    });
     await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.CUSTOMER,
      entityId: created.id,
      entityRef: created.id,
      description: `Customer created: ${created.companyName} (${created.id})`,
      meta: { created },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/customers] Error:", error);
    return NextResponse.json(
      { message: "Server error while creating customer" },
      { status: 500 }
    );
  }
}
