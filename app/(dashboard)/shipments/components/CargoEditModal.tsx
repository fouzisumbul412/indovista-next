"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, Loader2, Save, AlertTriangle } from "lucide-react";
import type { CargoItem } from "../types";

type ProductRow = {
  id: string;
  name: string;
  hsCode?: string | null;
  temperature?: string | null;
};

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

export const CargoEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shipmentId,
  cargo,
  onSaved,
}) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);

  /* ---------------- INIT ---------------- */
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
        setProducts(await res.json());
      } catch (e: any) {
        alert(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, cargo]);

  /* ---------------- DUPLICATE LOGIC ---------------- */

  const productCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((i) => {
      if (!i.productId) return;
      map.set(i.productId, (map.get(i.productId) || 0) + 1);
    });
    return map;
  }, [items]);

  const hasDuplicates = useMemo(
    () => Array.from(productCounts.values()).some((v) => v > 1),
    [productCounts]
  );

  const isDuplicate = (productId: string) =>
    productId && (productCounts.get(productId) || 0) > 1;

  /* ---------------- CRUD ---------------- */

  const addRow = () => {
    setItems((p) => [
      ...p,
      { productId: "", quantity: 1, unit: "Cartons", packaging: "" },
    ]);
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

  /* ---------------- SAVE ---------------- */

  const save = async () => {
    if (hasDuplicates) return;

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

  if (!isOpen) return null;

  /* ---------------- UI ---------------- */

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Edit Cargo & Pack
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Each product can be added only once.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading && (
          <div className="p-6 text-sm text-gray-600">Loading products…</div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={addRow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          {items.map((it, idx) => {
            const duplicate = isDuplicate(it.productId);

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  duplicate
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">
                      Product
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={it.productId}
                      onChange={(e) =>
                        updateRow(idx, { productId: e.target.value })
                      }
                    >
                      <option value="">Select product</option>
                      {products.map((p) => {
                        const disabled =
                          p.id !== it.productId && productCounts.has(p.id);
                        return (
                          <option key={p.id} value={p.id} disabled={disabled}>
                            {p.name} {disabled ? "• Already added" : ""}
                          </option>
                        );
                      })}
                    </select>

                    {duplicate && (
                      <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        This product is already added
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Qty
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={it.quantity}
                      onChange={(e) =>
                        updateRow(idx, {
                          quantity: Number(e.target.value || 0),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Unit
                    </label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg"
                      value={it.unit}
                      onChange={(e) => updateRow(idx, { unit: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={it.weightKg ?? ""}
                      onChange={(e) =>
                        updateRow(idx, {
                          weightKg: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => removeRow(idx)}
                      className="w-full px-3 py-2 border rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-600">
                    Packaging
                  </label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    value={it.packaging || ""}
                    onChange={(e) =>
                      updateRow(idx, { packaging: e.target.value })
                    }
                  />
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              No cargo items added.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between items-center">
          {hasDuplicates && (
            <div className="text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Duplicate products detected
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border rounded-lg font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={save}
              disabled={saving || hasDuplicates}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Cargo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
