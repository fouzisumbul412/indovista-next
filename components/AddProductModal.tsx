"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Package, Snowflake, Leaf, Thermometer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types/product";
import { Category } from "@/types/category";
import type { TemperaturePreset } from "@/types/temperature";

type ProductPayload = {
  id?: string;
  name: string;
  categoryId: string;
  type: "FROZEN" | "SPICE";

  hsCode?: string | null;
  temperatureId?: number | null;

  packSize?: string | null;
  shelfLife?: string | null;

  unitsPerCarton?: number | null;
  cartonsPerPallet?: number | null;

  notes?: string | null;
};

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductPayload) => void;
  initialData?: Product | null;
}

const fetchCategories = async (): Promise<Category[]> => {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
};

const fetchTemperatures = async (): Promise<TemperaturePreset[]> => {
  const res = await fetch("/api/master-data/temp-presets", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch temperature presets");
  return res.json();
};

const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TEMPS: TemperaturePreset[] = [];

const EMPTY_FORM: ProductPayload = {
  id: undefined,
  name: "",
  categoryId: "",
  type: "FROZEN",
  hsCode: "",
  temperatureId: null,
  packSize: "",
  shelfLife: "",
  unitsPerCarton: null,
  cartonsPerPallet: null,
  notes: "",
};

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { data: categories = EMPTY_CATEGORIES } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: temps = EMPTY_TEMPS, isLoading: tempsLoading } = useQuery<TemperaturePreset[]>({
    queryKey: ["temperature-presets"],
    queryFn: fetchTemperatures,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const defaultCategoryId = useMemo(() => categories?.[0]?.id ?? "", [categories]);

  const [formData, setFormData] = useState<ProductPayload>(EMPTY_FORM);

  // ✅ true only when user chooses a specific preset (not "Use category default")
  const [customTemp, setCustomTemp] = useState(false);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === formData.categoryId) ?? null;
  }, [categories, formData.categoryId]);

  const selectedCategoryDefaultTemp = useMemo(() => {
    if (!selectedCategory?.temperatureId) return null;
    return temps.find((t) => t.id === selectedCategory.temperatureId) ?? null;
  }, [selectedCategory, temps]);

  // ✅ Initialize form when modal opens / switching edit vs add
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        categoryId: initialData.categoryId,
        type: initialData.type,
        hsCode: initialData.hsCode ?? "",
        temperatureId: initialData.temperatureId ?? null,
        packSize: initialData.packSize ?? "",
        shelfLife: initialData.shelfLife ?? "",
        unitsPerCarton: initialData.unitsPerCarton ?? null,
        cartonsPerPallet: initialData.cartonsPerPallet ?? null,
        notes: initialData.notes ?? "",
      });
      setCustomTemp(true); // editing = explicit temperatureId stored on product
      return;
    }

    setFormData((prev) => ({
      ...EMPTY_FORM,
      categoryId: prev.categoryId || defaultCategoryId || "",
      temperatureId: null, // "Use category default"
    }));
    setCustomTemp(false);
  }, [isOpen, initialData, defaultCategoryId]);

  // ✅ When categories finish loading, set default category only if empty (add mode)
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) return;
    if (!defaultCategoryId) return;

    setFormData((prev) => {
      if (prev.categoryId) return prev;
      return { ...prev, categoryId: defaultCategoryId };
    });
  }, [isOpen, initialData, defaultCategoryId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const tempSelectValue = formData.temperatureId == null ? "" : String(formData.temperatureId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm min-h-9/12 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{initialData ? "Edit Product" : "Add Product"}</h2>
              <p className="text-sm text-gray-500">{initialData ? "Update product details" : "Add new item to master list"}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[calc(80vh-72px)]">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
            <input
              required
              type="text"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "FROZEN" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                    formData.type === "FROZEN" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Snowflake className="w-3 h-3" /> Frozen
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "SPICE" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                    formData.type === "SPICE" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Leaf className="w-3 h-3" /> Spice
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => {
                  const newCategoryId = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: newCategoryId,
                    // If user didn't choose a custom temp, keep "Use category default"
                    temperatureId: customTemp ? prev.temperatureId : null,
                  }));
                }}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">HS Code</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                value={formData.hsCode ?? ""}
                onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
              />
            </div>

            {/* ✅ Temperature dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Temperature Preset</label>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-gray-400" />
                <select
                  value={tempSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setCustomTemp(false);
                      setFormData((prev) => ({ ...prev, temperatureId: null })); // inherit from category in backend
                      return;
                    }
                    setCustomTemp(true);
                    setFormData((prev) => ({ ...prev, temperatureId: Number(v) }));
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">{tempsLoading ? "Loading..." : "Use category default"}</option>
                  {temps.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.range} (±{t.tolerance})
                    </option>
                  ))}
                </select>
              </div>

              {!customTemp && selectedCategoryDefaultTemp && (
                <p className="text-xs text-gray-400 mt-1">
                  Category default: {selectedCategoryDefaultTemp.name} — {selectedCategoryDefaultTemp.range}
                </p>
              )}

              {!customTemp && !selectedCategoryDefaultTemp && (
                <p className="text-xs text-gray-400 mt-1">No default temperature set on selected category</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pack Size</label>
              <input
                type="text"
                placeholder="e.g. 1kg"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.packSize ?? ""}
                onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Shelf Life</label>
              <input
                type="text"
                placeholder="e.g. 12 months"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.shelfLife ?? ""}
                onChange={(e) => setFormData({ ...formData, shelfLife: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Units / Carton</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.unitsPerCarton ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitsPerCarton: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cartons / Pallet</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.cartonsPerPallet ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cartonsPerPallet: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              rows={1}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.notes ?? ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {initialData ? "Update Product" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
