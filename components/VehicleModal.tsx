"use client";

import React, { useMemo, useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { Vehicle, FuelType, VehicleOwnership, TransportMode } from "@/types/vehicle";
import type { Driver } from "@/types/driver";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  initialData: Vehicle | null;
  drivers: Driver[];
  enabledModes: TransportMode[];
};

const fuelOptions: FuelType[] = ["PETROL", "DIESEL", "CNG", "LPG", "ELECTRIC", "OTHER"];
const ownershipOptions: VehicleOwnership[] = ["OWN", "RENT"];

const isoDate = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

export function VehicleModal({ isOpen, onClose, onSave, initialData, drivers, enabledModes }: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>(() => ({
    id: initialData?.id ?? "",
    name: initialData?.name ?? "",
    number: initialData?.number ?? "",
    ownership: (initialData?.ownership ?? "OWN") as VehicleOwnership,

    transportMode: (initialData?.transportMode ?? enabledModes?.[0] ?? "ROAD") as TransportMode,

    engineType: initialData?.engineType ?? "",
    fuel: (initialData?.fuel ?? "DIESEL") as FuelType,
    fuelOther: initialData?.fuelOther ?? "",
    fuelCapacity: initialData?.fuelCapacity ?? "",
    loadingCapacity: initialData?.loadingCapacity ?? "",

    rcNumber: initialData?.rcNumber ?? "",
    rcExpiry: isoDate(initialData?.rcExpiry),
    pollutionExpiry: isoDate(initialData?.pollutionExpiry),

    isRegistered: initialData?.isRegistered ?? true,
    registeredAt: isoDate(initialData?.registeredAt),

    docs: initialData?.docs ?? "",
    managingVehicle: initialData?.managingVehicle ?? "",
    medicalSupport: initialData?.medicalSupport ?? "",
    notes: initialData?.notes ?? "",

    driverIds: (initialData?.assignedDrivers ?? []).map((d: any) => d.id),
  }));

  // when opening new/editing, re-init
  React.useEffect(() => {
    if (!isOpen) return;
    setForm({
      id: initialData?.id ?? "",
      name: initialData?.name ?? "",
      number: initialData?.number ?? "",
      ownership: (initialData?.ownership ?? "OWN") as VehicleOwnership,

      transportMode: (initialData?.transportMode ?? enabledModes?.[0] ?? "ROAD") as TransportMode,

      engineType: initialData?.engineType ?? "",
      fuel: (initialData?.fuel ?? "DIESEL") as FuelType,
      fuelOther: initialData?.fuelOther ?? "",
      fuelCapacity: initialData?.fuelCapacity ?? "",
      loadingCapacity: initialData?.loadingCapacity ?? "",

      rcNumber: initialData?.rcNumber ?? "",
      rcExpiry: isoDate(initialData?.rcExpiry),
      pollutionExpiry: isoDate(initialData?.pollutionExpiry),

      isRegistered: initialData?.isRegistered ?? true,
      registeredAt: isoDate(initialData?.registeredAt),

      docs: initialData?.docs ?? "",
      managingVehicle: initialData?.managingVehicle ?? "",
      medicalSupport: initialData?.medicalSupport ?? "",
      notes: initialData?.notes ?? "",

      driverIds: (initialData?.assignedDrivers ?? []).map((d: any) => d.id),
    });
  }, [isOpen, initialData, enabledModes]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => d.transportMode === form.transportMode);
  }, [drivers, form.transportMode]);

  if (!isOpen) return null;

  const toggleDriver = (id: string) => {
    setForm((p: any) => {
      const exists = p.driverIds.includes(id);
      return { ...p, driverIds: exists ? p.driverIds.filter((x: string) => x !== id) : [...p.driverIds, id] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        number: form.number,
        ownership: form.ownership,

        transportMode: form.transportMode,

        engineType: form.engineType || null,
        fuel: form.fuel,
        fuelOther: form.fuel === "OTHER" ? (form.fuelOther || null) : null,
        fuelCapacity: form.fuelCapacity === "" ? null : Number(form.fuelCapacity),
        loadingCapacity: form.loadingCapacity === "" ? null : Number(form.loadingCapacity),

        rcNumber: form.rcNumber || null,
        rcExpiry: form.rcExpiry ? new Date(form.rcExpiry).toISOString() : null,
        pollutionExpiry: form.pollutionExpiry ? new Date(form.pollutionExpiry).toISOString() : null,

        isRegistered: !!form.isRegistered,
        registeredAt: form.registeredAt ? new Date(form.registeredAt).toISOString() : null,

        docs: form.docs || null,
        managingVehicle: form.managingVehicle || null,
        medicalSupport: form.medicalSupport || null,
        notes: form.notes || null,

        driverIds: form.driverIds || [],
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
            <h2 className="text-xl font-bold text-gray-900">{form.id ? "Edit Vehicle" : "Add Vehicle"}</h2>
            <p className="text-sm text-gray-500 mt-1">Own/Rent vehicle master with driver assignments</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Transport Mode</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.transportMode}
                onChange={(e) => setForm((p: any) => ({ ...p, transportMode: e.target.value, driverIds: [] }))}
              >
                {enabledModes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ownership</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.ownership}
                onChange={(e) => setForm((p: any) => ({ ...p, ownership: e.target.value }))}
              >
                {ownershipOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Engine Type</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.engineType}
                onChange={(e) => setForm((p: any) => ({ ...p, engineType: e.target.value }))}
                placeholder="e.g., Diesel Engine"
              />
            </div>
          </div>

          {/* Vehicle identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Name</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.name}
                onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Tata 407"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Number</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.number}
                onChange={(e) => setForm((p: any) => ({ ...p, number: e.target.value }))}
                placeholder="e.g., TS09AB1234"
              />
            </div>
          </div>

          {/* Fuel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fuel</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.fuel}
                onChange={(e) => setForm((p: any) => ({ ...p, fuel: e.target.value }))}
              >
                {fuelOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fuel Capacity</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.fuelCapacity}
                onChange={(e) => setForm((p: any) => ({ ...p, fuelCapacity: e.target.value }))}
                placeholder="Liters"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Loading Capacity</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.loadingCapacity}
                onChange={(e) => setForm((p: any) => ({ ...p, loadingCapacity: e.target.value }))}
                placeholder="Kg / Ton"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fuel Other</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.fuelOther}
                onChange={(e) => setForm((p: any) => ({ ...p, fuelOther: e.target.value }))}
                placeholder={form.fuel === "OTHER" ? "Required if OTHER" : "Optional"}
                disabled={form.fuel !== "OTHER"}
              />
            </div>
          </div>

          {/* Docs / Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">RC Number</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.rcNumber}
                onChange={(e) => setForm((p: any) => ({ ...p, rcNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">RC Exp Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.rcExpiry}
                onChange={(e) => setForm((p: any) => ({ ...p, rcExpiry: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pollution Check Exp</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.pollutionExpiry}
                onChange={(e) => setForm((p: any) => ({ ...p, pollutionExpiry: e.target.value }))}
              />
            </div>
          </div>

          {/* Registered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex items-center gap-3">
              <input
                id="reg"
                type="checkbox"
                checked={!!form.isRegistered}
                onChange={(e) => setForm((p: any) => ({ ...p, isRegistered: e.target.checked }))}
              />
              <label htmlFor="reg" className="text-sm font-semibold text-gray-700">Registered?</label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Registered Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.registeredAt}
                onChange={(e) => setForm((p: any) => ({ ...p, registeredAt: e.target.value }))}
              />
            </div>
          </div>

          {/* Managing / medical / docs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Managing Vehicle</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.managingVehicle}
                onChange={(e) => setForm((p: any) => ({ ...p, managingVehicle: e.target.value }))}
                placeholder="Manager / Vendor"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Medical Support</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.medicalSupport}
                onChange={(e) => setForm((p: any) => ({ ...p, medicalSupport: e.target.value }))}
                placeholder="First Aid / Hospital"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Docs</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={form.docs}
                onChange={(e) => setForm((p: any) => ({ ...p, docs: e.target.value }))}
                placeholder="Doc links / notes"
              />
            </div>
          </div>

          {/* Assign drivers */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Drivers (same mode)</label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-[180px] overflow-auto bg-gray-50">
              {filteredDrivers.length === 0 && <div className="text-sm text-gray-500">No drivers for this mode.</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredDrivers.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.driverIds.includes(d.id)}
                      onChange={() => toggleDriver(d.id)}
                    />
                    <span className="font-medium">{d.name}</span>
                    <span className="text-gray-500">({d.role})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
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
