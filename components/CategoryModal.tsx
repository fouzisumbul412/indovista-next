"use client";

import React, { useEffect, useState } from "react";
import { X, Layers, Thermometer, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@/types/category";
import type { TemperaturePreset } from "@/types/temperature";

type CategoryPayload = {
  id?: string;
  name: string;
  hsCode?: string | null;
  storageType: "AMBIENT" | "CHILLED" | "FROZEN";
  documents?: string | null;
  notes?: string | null;
  temperatureId?: number | null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: CategoryPayload) => void;
  initialData?: Category | null;
}

const fetchTemperatures = async (): Promise<TemperaturePreset[]> => {
  const res = await fetch("/api/master-data/temp-presets", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch temperature presets");
  return res.json();
};

const EMPTY_TEMPS: TemperaturePreset[] = [];

export const CategoryModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const { data: temps = EMPTY_TEMPS, isLoading: tempsLoading } = useQuery<TemperaturePreset[]>({
    queryKey: ["temperature-presets"],
    queryFn: fetchTemperatures,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const [formData, setFormData] = useState<CategoryPayload>({
    id: undefined,
    name: "",
    hsCode: "",
    temperatureId: null,
    storageType: "AMBIENT",
    documents: "",
    notes: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        hsCode: initialData.hsCode ?? "",
        temperatureId: initialData.temperatureId ?? null,
        storageType: initialData.storageType,
        documents: initialData.documents ?? "",
        notes: initialData.notes ?? "",
      });
    } else {
      setFormData({
        id: undefined,
        name: "",
        hsCode: "",
        temperatureId: null,
        storageType: "AMBIENT",
        documents: "",
        notes: "",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const update = <K extends keyof CategoryPayload>(key: K, value: CategoryPayload[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl md:max-w-lg lg:max-w-xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="w-6 h-6 text-purple-600" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {initialData ? "Edit Category" : "Add Category"}
              </h2>
              <p className="text-sm text-gray-500">Category master for import/export</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Category Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">HS Code</label>
              <input
                type="text"
                value={formData.hsCode ?? ""}
                onChange={(e) => update("hsCode", e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 font-mono bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* ✅ Temperature dropdown */}
            <div>
              <label className="block text-sm font-semibold mb-1">Temperature Preset</label>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-gray-400" />
                <select
                  value={formData.temperatureId ?? ""}
                  onChange={(e) =>
                    update("temperatureId", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">{tempsLoading ? "Loading..." : "None"}</option>
                  {temps.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.range} (±{t.tolerance})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">Select a preset from master data</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Storage Type</label>
            <select
              value={formData.storageType}
              onChange={(e) => update("storageType", e.target.value as CategoryPayload["storageType"])}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="AMBIENT">Ambient</option>
              <option value="CHILLED">Chilled</option>
              <option value="FROZEN">Frozen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-1">
              Required Documents <FileText className="w-4 h-4 text-gray-400" />
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Health Certificate, Phytosanitary Certificate"
              value={formData.documents ?? ""}
              onChange={(e) => update("documents", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
              {initialData ? "Update Category" : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
