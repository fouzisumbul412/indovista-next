// app/api/customers/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Category } from "@/types/category";
import { CategoryModal } from "@/components/CategoryModal";
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      
    });

    // Shape data for Excel rows
    const rows = customers.map((c) => ({
      CustomerCode: c.customerCode,
      CompanyName: c.companyName,
      Type: c.type,
      ContactPerson: c.contactPerson,
      Phone: c.phone ?? "",
      Email: c.email,
      Address: c.address ?? "",
      City: c.city ?? "",
      Country: c.country,
      Currency: c.currency,
      CreditLimit: c.creditLimit,
      UsedCredits: c.usedCredits,
      TotalAmount: c.totalAmount,
      PaymentTerms: c.paymentTerms ?? "",
      KycStatus: c.kycStatus ? "Yes" : "No",
      SanctionsCheck: c.sanctionsCheck ? "Yes" : "No",
      Status: c.status,
      CreatedAt: c.createdAt,
      UpdatedAt: c.updatedAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    // Write to buffer as XLSX
    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="customers-export.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/customers/export] Error:", error);
    return NextResponse.json(
      { message: "Server error while exporting customers" },
      { status: 500 }
    );
  }
}
