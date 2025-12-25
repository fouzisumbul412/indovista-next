import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "asc" },
    });

    const rows = categories.map((c) => ({
      ID: c.id,
      Name: c.name,
      "HS Code": c.hsCode || "",
      Temperature: c.temperatureId || "",
      "Storage Type": c.storageType,
      Documents: c.documents || "",
      Notes: c.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categories");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="categories.xlsx"',
      },
    });
  } catch (error) {
    console.error("[GET /api/categories/export] Error:", error);
    return NextResponse.json({ message: "Failed to export categories" }, { status: 500 });
  }
}
