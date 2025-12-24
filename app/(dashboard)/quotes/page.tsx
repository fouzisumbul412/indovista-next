"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Search, Plus, Ship, Plane, Truck, ArrowRight, FileText, Pencil, Trash2, Download } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AddQuoteModal } from "@/components/AddQuoteModal";
import type { QuoteDetail, QuoteListRow } from "@/types/quote";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "SEA" | "AIR" | "ROAD";

const modeIcon = (m: Mode) =>
  m === "SEA" ? <Ship className="w-4 h-4 text-blue-500" /> : m === "AIR" ? <Plane className="w-4 h-4 text-purple-500" /> : <Truck className="w-4 h-4 text-orange-500" />;

const getCommodityLabel = (type: string) => {
  switch (type) {
    case "FROZEN":
      return "Frozen";
    case "SPICE":
      return "Spice";
    case "BOTH":
      return "Frozen + Spice";
    default:
      return "Other";
  }
};

export default function QuoteList() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteDetail | null>(null);

  const { data: quotes = [], isLoading } = useQuery<QuoteListRow[]>({
    queryKey: ["quotes"],
    queryFn: async () => {
      const res = await fetch("/api/quotes", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load quotes");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return quotes.filter(
      (q) =>
        q.reference.toLowerCase().includes(term) ||
        q.customer.toLowerCase().includes(term) ||
        `${q.origin.city} ${q.origin.country}`.toLowerCase().includes(term) ||
        `${q.destination.city} ${q.destination.country}`.toLowerCase().includes(term)
    );
  }, [quotes, searchTerm]);

  const formatCurrency = (val: number, curr: string) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(val);
    } catch {
      return `${curr} ${Number(val || 0).toFixed(0)}`;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuote(null);
    // clean query string open param
    const open = searchParams.get("open");
    if (open) router.replace("/quotes");
  };

  const handleAddNew = () => {
    setEditingQuote(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (id: string) => {
    const res = await fetch(`/api/quotes/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setEditingQuote(await res.json());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete quote ${id}?`)) return;
    const res = await fetch(`/api/quotes/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await qc.invalidateQueries({ queryKey: ["quotes"] });
  };

  const handleSave = async (payload: any) => {
    const isEdit = Boolean(editingQuote?.id);

    const res = await fetch(isEdit ? `/api/quotes/${encodeURIComponent(editingQuote!.id)}` : "/api/quotes", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    closeModal();
    await qc.invalidateQueries({ queryKey: ["quotes"] });
  };

  // ✅ Auto-open modal from ?open=QT-2025-001
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    handleEdit(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-500 mt-1">Create and manage shipping quotations</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Quote
        </button>
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Quote ID, customer, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Commodity</th>
                <th className="px-6 py-4">Est. Value</th>
                <th className="px-6 py-4">Valid Till</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No quotes found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                filtered.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {quote.reference}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">{quote.customer}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>
                          {quote.origin.city}, {quote.origin.country}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span>
                          {quote.destination.city}, {quote.destination.country}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        {modeIcon(quote.mode as any)}
                        {quote.mode}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">{getCommodityLabel(quote.commodity)}</td>

                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(quote.estValue, quote.currency)}
                    </td>

                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{quote.validTill || "-"}</td>

                    <td className="px-6 py-4">
                      <StatusBadge status={quote.status as any} />
                    </td>

                  <td className="px-6 py-4 text-right">
  <div className="flex items-center justify-end gap-2">
    {/* PDF */}
    <a
      href={`/api/quotes/${encodeURIComponent(quote.id)}/pdf`}
      target="_blank"
      className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900"
      title="Download PDF"
      rel="noreferrer"
    >
      <Download className="w-4 h-4" />
    </a>

    {/* Edit */}
    <button
      onClick={() => handleEdit(quote.id)}
      className="p-1.5 hover:bg-gray-200 rounded hover:text-gray-500 text-blue-600"
      title="Edit"
    >
      <Pencil className="w-4 h-4" />
    </button>

    {/* Delete */}
    <button
      onClick={() => handleDelete(quote.id)}
      className="p-1.5 hover:bg-red-100 rounded hover:text-gray-500 text-red-600"
      title="Delete"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</td>

                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddQuoteModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} initialData={editingQuote} />
    </div>
  );
}
