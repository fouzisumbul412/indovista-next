"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import type { ShipmentDocument } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  doc: ShipmentDocument | null;
  onSaved: () => void;
};

const labelize = (v: string) =>
  v
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

export const EditDocumentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shipmentId,
  doc,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);

  const DOC_TYPES = useMemo(
    () => [
      "INVOICE",
      "PACKING_LIST",
      "BILL_LADING",
      "HEALTH_CERT",
      "ORIGIN_CERT",
      "CUSTOMS_DEC",
      "INSURANCE",
      "OTHER",
    ],
    []
  );

  const DOC_STATUSES = useMemo(
    () => [
      "MISSING",
      "DRAFT",
      "SUBMITTED",
      "APPROVED",
      "REJECTED",
      "FINAL",
      "PENDING",
      "NOT_RECEIVED",
    ],
    []
  );

  const [form, setForm] = useState({
    name: "",
    type: "OTHER",
    status: "DRAFT",
    expiryDate: "",
  });

  useEffect(() => {
    if (!isOpen || !doc) return;

    setForm({
      name: doc.name || "",
      type: String(doc.type || "OTHER"),
      status: String(doc.status || "DRAFT"),
      expiryDate: doc.expiryDate || "",
    });
  }, [isOpen, doc]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const save = async () => {
    if (!form.name.trim()) {
      alert("Document name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/shipments/${shipmentId}/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            type: form.type,
            status: form.status,
            expiryDate: form.expiryDate || null,
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6  border-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Document</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update name, type, status, expiry.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ✅ Form Fields */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Document Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g., Commercial Invoice"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelize(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOC_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {labelize(st)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((s) => ({ ...s, expiryDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave blank if this document doesn’t expire.
              </p>
            </div>

            <div className="sm:text-right">
              {doc.fileUrl ? (
                <a
                  className="inline-block text-sm text-blue-600 hover:underline"
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View current file
                </a>
              ) : (
                <div className="text-sm text-gray-500">No file uploaded</div>
              )}
              {(doc.mimeType || doc.fileSize) && (
                <div className="text-xs text-gray-400 mt-1">
                  {doc.mimeType ? doc.mimeType : ""}
                  {doc.mimeType && doc.fileSize ? " • " : ""}
                  {typeof doc.fileSize === "number"
                    ? `${Math.round(doc.fileSize / 1024)} KB`
                    : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
