"use client";

import React, { useMemo, useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { Driver, DriverRole, TransportMode } from "@/types/driver";
import type { Vehicle } from "@/types/vehicle";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  initialData: Driver | null;
  vehicles: Vehicle[];
  enabledModes: TransportMode[];
};

const roleOptions: DriverRole[] = ["DRIVER", "OPERATOR"];

export function DriverModal({ isOpen, onClose, onSave, initialData, vehicles, enabledModes }: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>(() => ({
    id: initialData?.id ?? "",
    name: initialData?.name ?? "",
    age: initialData?.age ?? "",
    role: (initialData?.role ?? "DRIVER") as DriverRole,

    profession: initialData?.profession ?? "",
    education: initialData?.education ?? "",
    languages: initialData?.languages ?? "",
    licenseNumber: initialData?.licenseNumber ?? "",
    contactNumber: initialData?.contactNumber ?? "",
    email: initialData?.email ?? "",
    address: initialData?.address ?? "",

    transportMode: (initialData?.transportMode ?? enabledModes?.[0] ?? "ROAD") as TransportMode,
    medicalCondition: initialData?.medicalCondition ?? "",
    notes: initialData?.notes ?? "",

    vehicleIds: (initialData?.assignedVehicles ?? []).map((v: any) => v.id),
  }));

  React.useEffect(() => {
    if (!isOpen) return;
    setForm({
      id: initialData?.id ?? "",
      name: initialData?.name ?? "",
      age: initialData?.age ?? "",
      role: (initialData?.role ?? "DRIVER") as DriverRole,

      profession: initialData?.profession ?? "",
      education: initialData?.education ?? "",
      languages: initialData?.languages ?? "",
      licenseNumber: initialData?.licenseNumber ?? "",
      contactNumber: initialData?.contactNumber ?? "",
      email: initialData?.email ?? "",
      address: initialData?.address ?? "",

      transportMode: (initialData?.transportMode ?? enabledModes?.[0] ?? "ROAD") as TransportMode,
      medicalCondition: initialData?.medicalCondition ?? "",
      notes: initialData?.notes ?? "",

      vehicleIds: (initialData?.assignedVehicles ?? []).map((v: any) => v.id),
    });
  }, [isOpen, initialData, enabledModes]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => v.transportMode === form.transportMode);
  }, [vehicles, form.transportMode]);

  const toggleVehicle = (id: string) => {
    setForm((p: any) => {
      const exists = p.vehicleIds.includes(id);
      return { ...p, vehicleIds: exists ? p.vehicleIds.filter((x: string) => x !== id) : [...p.vehicleIds, id] };
    });
  };

  if (!isOpen) return null;

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        age: form.age === "" ? null : Number(form.age),
        role: form.role,

        profession: form.profession || null,
        education: form.education || null,
        languages: form.languages || null,
        licenseNumber: form.licenseNumber || null,
        contactNumber: form.contactNumber || null,
        email: form.email || null,
        address: form.address || null,

        transportMode: form.transportMode,
        medicalCondition: form.medicalCondition || null,
        notes: form.notes || null,

        vehicleIds: form.vehicleIds || [],
      };

      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm min-h-9/12 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{form.id ? "Edit Driver / Operator" : "Add Driver / Operator"}</h2>
            <p className="text-sm text-gray-500 mt-1">Driver/operator master with vehicle assignments</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.name}
                onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.age}
                onChange={(e) => setForm((p: any) => ({ ...p, age: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.role}
                onChange={(e) => setForm((p: any) => ({ ...p, role: e.target.value }))}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Transport Mode</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.transportMode}
                onChange={(e) => setForm((p: any) => ({ ...p, transportMode: e.target.value, vehicleIds: [] }))}
              >
                {enabledModes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">License</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.licenseNumber}
                onChange={(e) => setForm((p: any) => ({ ...p, licenseNumber: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contact No.</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.contactNumber}
                onChange={(e) => setForm((p: any) => ({ ...p, contactNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Profession</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.profession}
                onChange={(e) => setForm((p: any) => ({ ...p, profession: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Education</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.education}
                onChange={(e) => setForm((p: any) => ({ ...p, education: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Languages</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.languages}
                onChange={(e) => setForm((p: any) => ({ ...p, languages: e.target.value }))}
                placeholder="English, Telugu, Hindi"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.email}
                onChange={(e) => setForm((p: any) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Medical Condition</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.medicalCondition}
                onChange={(e) => setForm((p: any) => ({ ...p, medicalCondition: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[70px]"
              value={form.address}
              onChange={(e) => setForm((p: any) => ({ ...p, address: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Vehicle(s) (same mode)</label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-[180px] overflow-auto bg-gray-50">
              {filteredVehicles.length === 0 && <div className="text-sm text-gray-500">No vehicles for this mode.</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredVehicles.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.vehicleIds.includes(v.id)}
                      onChange={() => toggleVehicle(v.id)}
                    />
                    <span className="font-medium">{v.name}</span>
                    <span className="text-gray-500">({v.number})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[90px]"
              value={form.notes}
              onChange={(e) => setForm((p: any) => ({ ...p, notes: e.target.value }))}
            />
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
}
