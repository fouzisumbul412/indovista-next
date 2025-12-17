"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, Save } from "lucide-react";

type CurrencyRow = { id: number; currencyCode: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  financials: {
    currency: string;
    revenue: number;
    cost: number;
    margin: number;
    invoiceStatus: string;
  };
  onSaved: () => void;
};

export const FinancialEditModal: React.FC<Props> = ({ isOpen, onClose, shipmentId, financials, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);

  const [form, setForm] = useState({
    currency: financials.currency || "INR",
    revenue: String(financials.revenue ?? 0),
    cost: String(financials.cost ?? 0),
    invoiceStatus: String(financials.invoiceStatus || "DRAFT"),
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      currency: financials.currency || "INR",
      revenue: String(financials.revenue ?? 0),
      cost: String(financials.cost ?? 0),
      invoiceStatus: String(financials.invoiceStatus || "DRAFT"),
    });

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/master-data/currencies");
        if (!res.ok) throw new Error(await res.text());
        setCurrencies(await res.json());
      } catch {
        // fallback ok
        setCurrencies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, financials]);

  if (!isOpen) return null;

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        financials: {
          currency: form.currency || "INR",
          revenue: Number(form.revenue || 0),
          cost: Number(form.cost || 0),
          invoiceStatus: form.invoiceStatus,
        },
      };

      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      onSaved();
    } catch (e: any) {
      alert(e?.message || "Financial update failed");
    } finally {
      setSaving(false);
    }
  };

  const marginPreview = Number(form.revenue || 0) - Number(form.cost || 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Financials</h2>
            <p className="text-sm text-gray-500 mt-1">Currency comes from master-data.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            >
              {loading && <option value={form.currency}>{form.currency}</option>}
              {!loading && currencies.length === 0 && <option value="INR">INR</option>}
              {!loading &&
                currencies.map((c) => (
                  <option key={c.id} value={c.currencyCode}>
                    {c.currencyCode} - {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Revenue</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.revenue}
                onChange={(e) => setForm((p) => ({ ...p, revenue: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cost</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.cost}
                onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Status</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.invoiceStatus}
              onChange={(e) => setForm((p) => ({ ...p, invoiceStatus: e.target.value }))}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <div className="font-semibold text-gray-900 mb-1">Preview</div>
            <div>
              Margin (auto): <span className="font-mono">{marginPreview.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">
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
