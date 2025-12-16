"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddEntryModalProps {
  open: boolean;
  onClose: () => void;
  fields: { key: string; label: string }[];
  onSave: (values: any) => void;
}

const buildEmpty = (fields: { key: string; label: string }[]) => {
  const empty: any = {};
  fields.forEach((f) => (empty[f.key] = ""));
  return empty;
};

function AddEntryModalInner({
  onClose,
  fields,
  onSave,
}: Omit<AddEntryModalProps, "open">) {
  const [form, setForm] = useState<any>(() => buildEmpty(fields));

  const handleChange = (key: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // ✅ Validation only when fields exist
    if ("transportMode" in form && !form.transportMode) {
      alert("Please select Transport Mode");
      return;
    }

    if ("type" in form && !form.type) {
      alert("Please enter Container Type");
      return;
    }

    if ("maxWeight" in form && form.maxWeight === "") {
      alert("Please enter Max Weight");
      return;
    }

    if ("weightUnit" in form && !form.weightUnit) {
      alert("Please select Weight Unit");
      return;
    }

    onSave(form);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                {f.label}
              </label>

              {/* Transport Mode */}
              {f.key === "transportMode" ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Mode</option>
                  <option value="AIR">Air</option>
                  <option value="SEA">Sea</option>
                  <option value="ROAD">Road</option>
                </select>

              /* Max Weight (NUMBER ONLY) */
              ) : f.key === "maxWeight" ? (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter weight value"
                  value={form[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />

              /* Weight Unit */
              ) : f.key === "weightUnit" ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Unit</option>
                  <option value="MANN">Mann / Maund</option>
                  <option value="KG">Kilogram (kg)</option>
                  <option value="QUINTAL">Quintal (q)</option>
                  <option value="TON">Metric Ton (t)</option>
                  <option value="LB">Pounds (lb)</option>
                </select>

              /* Default Text Input */
              ) : (
                <input
                  type="text"
                  value={form[f.key] ?? ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Add
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AddEntryModal(props: AddEntryModalProps) {
  if (!props.open) return null;

  // Reset form when fields change
  const key = props.fields.map((f) => f.key).join("|") || "add";
  return <AddEntryModalInner key={key} {...props} />;
}
