"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, Loader2, Save } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  currentStatus: string;
  onSaved: () => void;
};

function getNowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // datetime-local expects: YYYY-MM-DDTHH:mm
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const UpdateStatusModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shipmentId,
  currentStatus,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    status: currentStatus,
    timestamp: getNowLocal(), // datetime-local
    location: "",
    description: "",
    user: "Operator",
  });

  // ✅ Reset form every time modal opens so timestamp is always "now"
  useEffect(() => {
    if (!isOpen) return;

    setForm({
      status: currentStatus || "BOOKED",
      timestamp: getNowLocal(),
      location: "",
      description: "",
      user: "Operator",
    });
  }, [isOpen, currentStatus]);

  const save = useCallback(async () => {
    if (saving) return;

    setSaving(true);
    try {
      const isoTimestamp = form.timestamp
        ? new Date(form.timestamp).toISOString()
        : new Date().toISOString();

      const payload = {
        status: form.status,
        timestamp: isoTimestamp,
        location: form.location?.trim() || "",
        description: form.description?.trim() || "",
        user: form.user?.trim() || "Operator",
      };

      const res = await fetch(`/api/shipments/${shipmentId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      // Refresh parent + close modal
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Status update failed");
    } finally {
      setSaving(false);
    }
  }, [form, shipmentId, onSaved, onClose, saving]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Update Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              Adds a timeline event and updates shipment status.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              {[
                "BOOKED",
                "PICKED_UP",
                "IN_TRANSIT_ORIGIN",
                "AT_PORT_ORIGIN",
                "CUSTOMS_EXPORT",
                "ON_VESSEL",
                "AT_PORT_DEST",
                "CUSTOMS_IMPORT",
                "DELIVERED",
                "EXCEPTION",
              ].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Timestamp</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.timestamp}
              onChange={(e) => setForm((p) => ({ ...p, timestamp: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
              <input
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g., Chennai Port"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">User</label>
              <input
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.user}
                onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
                placeholder="e.g., Sunny"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short update note..."
            />
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
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
