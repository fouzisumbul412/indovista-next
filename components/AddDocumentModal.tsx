"use client";
import React, { useState } from "react";
import { X, FileText } from "lucide-react";
import { ShipmentDocument, DocType, DocStatus } from "../app/(dashboard)/shipments/types";

interface ShipmentMini {
  id: string;
  reference: string;
  customer: string;
}

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (doc: ShipmentDocument) => void;
  shipments: ShipmentMini[];
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  shipments,
}) => {
  const [formData, setFormData] = useState({
    type: "BILL_LADING" as DocType,
    shipmentId: "",
    status: "DRAFT" as DocStatus,
    expiryDate: "",
  });

  if (!isOpen) return null;

  const formatDocType = (type: string) =>
    type
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDoc: ShipmentDocument = {
      id: `DOC-${Math.floor(Math.random() * 100000)}`,
      name: formatDocType(formData.type),
      type: formData.type,
      status: formData.status,
      expiryDate: formData.expiryDate || null,
      uploadDate: new Date().toISOString().slice(0, 10),
    };

    onAdd(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add Document</h2>
              <p className="text-sm text-gray-500">Track shipment document</p>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Document Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as DocType })
              }
              className="w-full border px-3 py-2 rounded"
            >
              <option value="BILL_LADING">Bill of Lading</option>
              <option value="INVOICE">Invoice</option>
              <option value="PACKING_LIST">Packing List</option>
              <option value="HEALTH_CERT">Health Certificate</option>
              <option value="ORIGIN_CERT">Certificate of Origin</option>
              <option value="INSURANCE">Insurance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Shipment</label>
            <select
              required
              value={formData.shipmentId}
              onChange={(e) =>
                setFormData({ ...formData, shipmentId: e.target.value })
              }
              className="w-full border px-3 py-2 rounded"
            >
              <option value="" disabled>
                Select shipment
              </option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.reference} — {s.customer}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as DocStatus })
                }
                className="w-full border px-3 py-2 rounded"
              >
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="FINAL">Final</option>
                <option value="PENDING">Pending</option>
                <option value="NOT_RECEIVED">Not Received</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Add Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
