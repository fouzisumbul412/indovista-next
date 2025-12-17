"use client";

import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, Loader2, Save } from "lucide-react";
import type { CargoItem } from "../types";

type ProductRow = { id: string; name: string; hsCode?: string | null; temperature?: string | null };

type DraftItem = {
  id?: string;
  productId: string;
  quantity: number;
  unit: string;
  weightKg?: number;
  packaging?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  cargo: CargoItem[];
  onSaved: () => void;
};

export const CargoEditModal: React.FC<Props> = ({ isOpen, onClose, shipmentId, cargo, onSaved }) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setItems(
      (cargo || []).map((c) => ({
        id: c.id,
        productId: c.productId || "",
        quantity: c.quantity || 1,
        unit: c.unit || "Cartons",
        weightKg: c.weightKg ?? undefined,
        packaging: c.packaging || "",
      }))
    );

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProducts(data);
      } catch (e: any) {
        alert(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, cargo]);

  if (!isOpen) return null;

  const addRow = () => {
    setItems((p) => [...p, { productId: "", quantity: 1, unit: "Cartons", packaging: "" }]);
  };

  const updateRow = (idx: number, patch: Partial<DraftItem>) => {
    setItems((p) => {
      const next = [...p];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const removeRow = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        items: items
          .filter((it) => it.productId)
          .map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity || 0),
            unit: it.unit || "Unit",
            weightKg: it.weightKg != null ? Number(it.weightKg) : null,
            packaging: it.packaging || null,
          })),
      };

      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      onSaved();
    } catch (e: any) {
      alert(e?.message || "Cargo update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Cargo & Pack</h2>
            <p className="text-sm text-gray-500 mt-1">Add, edit, remove cargo items.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading && <div className="p-6 text-sm text-gray-600">Loading products...</div>}

        <div className="p-6">
          <div className="flex justify-end mb-4">
            <button onClick={addRow} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Product</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={it.productId}
                      onChange={(e) => updateRow(idx, { productId: e.target.value })}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qty</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={it.quantity}
                      onChange={(e) => updateRow(idx, { quantity: Number(e.target.value || 0) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                    <input
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={it.unit}
                      onChange={(e) => updateRow(idx, { unit: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={it.weightKg ?? ""}
                      onChange={(e) => updateRow(idx, { weightKg: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center gap-2"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Packaging</label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={it.packaging || ""}
                    onChange={(e) => updateRow(idx, { packaging: e.target.value })}
                    placeholder="e.g., Master Carton"
                  />
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-sm text-gray-500 italic">No cargo items. Click "Add Product".</div>
            )}
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
            Save Cargo
          </button>
        </div>
      </div>
    </div>
  );
};
