"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Search, Plus, FileText, AlertTriangle, Clock } from "lucide-react";
import { AddShipmentDocumentModal } from "@/app/(dashboard)/documents/components/AddShipmentDocumentModal";

type DocRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  uploadedAt: string;
  expiryDate: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number | null;
  shipmentId: string;
  shipmentRef: string;
  customerName: string;
};

function isExpiringWithinDays(dateStr: string, days: number) {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const diffDays = (d.getTime() - now.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= days;
}

export default function DocumentList() {
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: documents = [], isLoading } = useQuery<DocRow[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(t) ||
        d.type.toLowerCase().includes(t) ||
        d.shipmentRef.toLowerCase().includes(t) ||
        d.customerName.toLowerCase().includes(t)
    );
  }, [documents, searchTerm]);

  const pendingCount = useMemo(
    () =>
      documents.filter((d) =>
        ["PENDING", "MISSING", "NOT_RECEIVED"].includes(String(d.status).toUpperCase())
      ).length,
    [documents]
  );

  const expiringCount = useMemo(
    () => documents.filter((d) => isExpiringWithinDays(d.expiryDate, 30)).length,
    [documents]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">Central repository for all trade documentation</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center p-6 border-l-4 border-blue-500">
          <div className="p-3 bg-blue-50 rounded-full mr-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
          </div>
        </Card>

        <Card className="flex items-center p-6 border-l-4 border-orange-500">
          <div className="p-3 bg-orange-50 rounded-full mr-4">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending/Missing</p>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          </div>
        </Card>

        <Card className="flex items-center p-6 border-l-4 border-red-500">
          <div className="p-3 bg-red-50 rounded-full mr-4">
            <Clock className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Expiring Soon (30d)</p>
            <p className="text-2xl font-bold text-gray-900">{expiringCount}</p>
          </div>
        </Card>
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, type, shipment ref, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Expiry</th>
                  <th className="px-6 py-4">File</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No documents found.
                    </td>
                  </tr>
                )}

                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{doc.name}</div>
                          <div className="text-xs text-gray-500">{doc.type}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/shipments/${doc.shipmentId}`}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono hover:bg-gray-200"
                      >
                        {doc.shipmentRef || doc.shipmentId}
                      </Link>
                    </td>

                    <td className="px-6 py-4 text-gray-600">{doc.customerName || "—"}</td>

                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status as any} />
                    </td>

                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {doc.expiryDate || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {doc.fileUrl ? (
                        <a
                          className="text-xs text-blue-600 hover:underline"
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddShipmentDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          setIsModalOpen(false);
          await qc.invalidateQueries({ queryKey: ["documents"] });
          await qc.invalidateQueries({ queryKey: ["shipments"] });
        }}
      />
    </div>
  );
}
