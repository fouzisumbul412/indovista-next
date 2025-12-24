// app/(dashboard)/billing/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import {
  Plus,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@/types";
import { openInvoicePdfInNewTab } from "@/types/invoiceUtils";
import { CreateInvoiceModal } from "@/components/CreateInvoiceModal";

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

type ShipmentOption = {
  id: string;
  reference: string;
  customerName: string;
  amount: number;
  currency: string;
  createdAt: string;
};

const BillingPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);

  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices,
  } = useQuery<InvoiceRow[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json();
    },
  });

  const {
    data: shipments = [],
    isLoading: isLoadingShipments,
    refetch: refetchShipments,
  } = useQuery<ShipmentOption[]>({
    queryKey: ["shipments"],
    queryFn: async () => {
      const res = await fetch("/api/shipments", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load shipments");
      return res.json();
    },
  });

  const openCreateModal = () => {
    setModalMode("create");
    setEditingShipmentId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (shipmentId: string) => {
    setModalMode("edit");
    setEditingShipmentId(shipmentId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShipmentId(null);
  };

  const onSaved = async () => {
    await Promise.all([refetchInvoices(), refetchShipments()]);
  };

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(t) ||
        inv.customerName.toLowerCase().includes(t) ||
        inv.shipmentRef.toLowerCase().includes(t)
    );
  }, [invoices, searchTerm]);

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount}`;
    }
  };

  const parseDate = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const today0 = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // KPIs
  const totals = useMemo(() => {
    const outstanding = invoices.filter((i) => i.status !== "PAID");
    const overdue = invoices.filter((i) => i.status === "OVERDUE");
    const paid = invoices.filter((i) => i.status === "PAID");

    const sum = (list: InvoiceRow[]) => list.reduce((a, b) => a + (Number(b.amount) || 0), 0);

    const paidThisMonth = paid.filter((i) => {
      const d = parseDate(i.issueDate);
      if (!d) return false;
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    return {
      totalCount: invoices.length,
      outstandingAmount: sum(outstanding),
      overdueAmount: sum(overdue),
      paidThisMonthAmount: sum(paidThisMonth),
      currency: invoices[0]?.currency || "INR",
      outstanding,
    };
  }, [invoices]);

  // Aging buckets based on days past due (only unpaid)
  const aging = useMemo(() => {
    const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0 };
    totals.outstanding.forEach((inv) => {
      const due = parseDate(inv.dueDate);
      if (!due) {
        buckets.b0_30 += inv.amount;
        return;
      }
      due.setHours(0, 0, 0, 0);
      const days = Math.max(0, Math.floor((today0.getTime() - due.getTime()) / 86400000));

      if (days <= 30) buckets.b0_30 += inv.amount;
      else if (days <= 60) buckets.b31_60 += inv.amount;
      else if (days <= 90) buckets.b61_90 += inv.amount;
      else buckets.b90p += inv.amount;
    });

    const total = buckets.b0_30 + buckets.b31_60 + buckets.b61_90 + buckets.b90p;
    const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

    return { ...buckets, total, pct };
  }, [totals.outstanding, today0]);

  const buildPdfInvoice = (row: InvoiceRow): Invoice => {
    const itemAmount = Number(row.amount || 0);
    return {
      id: row.invoiceNumber,
      invoiceNumber: row.invoiceNumber,
      customerName: row.customerName,
      customerGstin: "",
      placeOfSupply: "",
      shipmentRef: row.shipmentRef,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      subtotal: itemAmount,
      totalTax: 0,
      tdsRate: 0,
      tdsAmount: 0,
      amount: itemAmount,
      currency: row.currency,
      status: row.status,
      items: [
        {
          id: "1",
          description: `Freight charges for shipment ${row.shipmentRef}`,
          hsnCode: "",
          quantity: 1,
          rate: itemAmount,
          taxRate: 0,
          taxableValue: itemAmount,
          amount: itemAmount,
        },
      ],
    };
  };

  const handleDownload = (row: InvoiceRow) => {
    openInvoicePdfInNewTab(buildPdfInvoice(row));
  };

  const handleDelete = async (shipmentId: string) => {
    const ok = confirm("Are you sure you want to delete this invoice?");
    if (!ok) return;

    const res = await fetch(`/api/invoices/${shipmentId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete invoice");
      return;
    }
    await onSaved();
  };

  const modalShipmentsForCreate = useMemo(() => {
    // allow creating invoice for any shipment; if you want ONLY non-invoiced, filter here:
    // const invoiced = new Set(invoices.map(i => i.shipmentId));
    // return shipments.filter(s => !invoiced.has(s.id));
    return shipments.map((s) => ({
      id: s.id,
      reference: s.reference,
      customerName: s.customerName,
      amount: s.amount,
      currency: s.currency,
    }));
  }, [shipments]);

  return (
    <div className="space-y-6">
      <CreateInvoiceModal
        isOpen={isModalOpen}
        mode={modalMode}
        shipmentId={editingShipmentId}
        shipments={modalShipmentsForCreate}
        onClose={closeModal}
        onSaved={onSaved}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-500 mt-1">Invoices are generated from shipments and saved for editing</p>
        </div>

        <button
          onClick={openCreateModal}
          type="button"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          disabled={isLoadingShipments}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="p-6 flex items-center justify-between border-l-4 border-gray-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{totals.totalCount}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <FileText className="w-6 h-6 text-gray-600" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-l-4 border-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totals.outstandingAmount, totals.currency)}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-l-4 border-red-500 relative overflow-hidden">
          <div className="bg-red-50 absolute inset-0 opacity-10 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.overdueAmount, totals.currency)}
            </p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg relative z-10">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-l-4 border-green-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Paid This Month</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.paidThisMonthAmount, totals.currency)}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Aging Report */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-6">Aging Report</h3>

        <div className="relative pt-2 pb-6">
          <div className="flex h-3 rounded-full overflow-hidden w-full bg-gray-100">
            <div style={{ width: `${aging.pct(aging.b0_30)}%` }} className="bg-green-500 h-full"></div>
            <div style={{ width: `${aging.pct(aging.b31_60)}%` }} className="bg-amber-400 h-full"></div>
            <div style={{ width: `${aging.pct(aging.b61_90)}%` }} className="bg-orange-500 h-full"></div>
            <div style={{ width: `${aging.pct(aging.b90p)}%` }} className="bg-red-500 h-full"></div>
          </div>

          <div className="flex justify-between mt-4 text-center">
            <div className="w-1/4">
              <div className="text-xs font-semibold text-gray-500">0-30 days</div>
              <div className="text-sm font-bold text-gray-900">
                {formatCurrency(aging.b0_30, totals.currency)}
              </div>
              <div className="h-1 w-full bg-green-500 mt-1 rounded-full opacity-50"></div>
            </div>
            <div className="w-[15%]">
              <div className="text-xs font-semibold text-gray-500">31-60 days</div>
              <div className="text-sm font-bold text-gray-900">
                {formatCurrency(aging.b31_60, totals.currency)}
              </div>
              <div className="h-1 w-full bg-amber-400 mt-1 rounded-full opacity-50"></div>
            </div>
            <div className="w-[10%]">
              <div className="text-xs font-semibold text-gray-500">61-90 days</div>
              <div className="text-sm font-bold text-gray-900">
                {formatCurrency(aging.b61_90, totals.currency)}
              </div>
              <div className="h-1 w-full bg-orange-500 mt-1 rounded-full opacity-50"></div>
            </div>
            <div className="w-1/2">
              <div className="text-xs font-semibold text-gray-500">90+ days</div>
              <div className="text-sm font-bold text-gray-900">
                {formatCurrency(aging.b90p, totals.currency)}
              </div>
              <div className="h-1 w-full bg-red-500 mt-1 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card noPadding className="overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices by number, shipment, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoadingInvoices ? (
          <div className="px-6 py-10 text-center text-gray-500">Loading invoices…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Invoice No.</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No invoices found.
                    </td>
                  </tr>
                )}

                {filtered.map((row, idx) => {
                  const rowKey = `${row.shipmentId || "noShipment"}-${row.invoiceNumber || "noInv"}-${idx}`;
                  return (
                    <tr key={rowKey} className="hover:bg-gray-50 transition-colors">

                      <td className="px-6 py-4 font-medium text-gray-900">{row.invoiceNumber}</td>
                      <td className="px-6 py-4 text-gray-700">{row.customerName}</td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/shipments/${row.shipmentId}`}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono hover:bg-gray-200 inline-block"
                        >
                          {row.shipmentRef}
                        </Link>
                      </td>

                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatCurrency(row.amount, row.currency)}
                      </td>

                      <td className="px-6 py-4 text-gray-600">{row.issueDate}</td>
                      <td className="px-6 py-4 text-gray-600">{row.dueDate}</td>

                      <td className="px-6 py-4">
                        <StatusBadge status={row.status as any} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => handleDownload(row)}
                            className="text-gray-900 "
                            title="Download Invoice PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(row.shipmentId)}
                            className="text-blue-600 "
                            title="Edit Invoice"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(row.shipmentId)}
                            className="text-red-600"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BillingPage;
