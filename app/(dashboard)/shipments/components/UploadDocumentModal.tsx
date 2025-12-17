"use client";

import React, { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  onSaved: () => void;
};

export const UploadDocumentModal: React.FC<Props> = ({ isOpen, onClose, shipmentId, onSaved }) => {
  const [saving, setSaving] = useState(false);

  const [doc, setDoc] = useState({
    name: "",
    type: "BILL_LADING",
    status: "DRAFT",
    expiryDate: "",
    file: null as File | null,
  });

  if (!isOpen) return null;

  const upload = async () => {
    if (!doc.file) return alert("Select a file first.");
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append("file", doc.file);
      fd.append("name", doc.name || doc.file.name);
      fd.append("type", doc.type);
      fd.append("status", doc.status);
      if (doc.expiryDate) fd.append("expiryDate", doc.expiryDate);

      const res = await fetch(`/api/shipments/${shipmentId}/documents`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error(await res.text());

      onSaved();
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
            <p className="text-sm text-gray-500 mt-1">pdf / png / jpg supported</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Document Name</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={doc.name}
              onChange={(e) => setDoc((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Packing List"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={doc.type}
                onChange={(e) => setDoc((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="BILL_LADING">Bill of Lading</option>
                <option value="INVOICE">Invoice</option>
                <option value="PACKING_LIST">Packing List</option>
                <option value="HEALTH_CERT">Health Certificate</option>
                <option value="ORIGIN_CERT">Certificate of Origin</option>
                <option value="CUSTOMS_DEC">Customs Declaration</option>
                <option value="INSURANCE">Insurance</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={doc.status}
                onChange={(e) => setDoc((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="FINAL">Final</option>
                <option value="NOT_RECEIVED">Not Received</option>
                <option value="MISSING">Missing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={doc.expiryDate}
              onChange={(e) => setDoc((p) => ({ ...p, expiryDate: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">File</label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="w-full"
              onChange={(e) => setDoc((p) => ({ ...p, file: e.target.files?.[0] || null }))}
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={upload}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};
