"use client";

import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Plus, Search, Pencil, Trash2, Truck, Ship, Plane, CheckCircle2 } from "lucide-react";
import type { Vehicle, TransportMode } from "@/types/vehicle";
import type { Driver } from "@/types/driver";
import { VehicleModal } from "@/components/VehicleModal";
import { DriverModal } from "@/components/DriverModal";

type FreightModeRow = { id: TransportMode; label: string; enabled: boolean };

const modeIcon = (m: TransportMode) =>
  m === "ROAD" ? <Truck className="w-4 h-4" /> : m === "SEA" ? <Ship className="w-4 h-4" /> : <Plane className="w-4 h-4" />;

const fetchModes = async (): Promise<FreightModeRow[]> => {
  const res = await fetch("/api/freight-modes", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch freight modes");
  return res.json();
};

const fetchVehicles = async (): Promise<Vehicle[]> => {
  const res = await fetch("/api/vehicles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch vehicles");
  return res.json();
};

const fetchDrivers = async (): Promise<Driver[]> => {
  const res = await fetch("/api/drivers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
};

type Tab = "MODE" | "VEHICLE" | "DRIVER";

export default function VehiclesPage() {
  const [tab, setTab] = useState<Tab>("VEHICLE");
  const [searchTerm, setSearchTerm] = useState("");

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const queryClient = useQueryClient();

  const modesQ = useQuery({ queryKey: ["freight-modes"], queryFn: fetchModes });
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });

  const modes = modesQ.data ?? [];
  const vehicles = vehiclesQ.data ?? [];
  const drivers = driversQ.data ?? [];

  const enabledModes = useMemo(() => modes.filter((m) => m.enabled).map((m) => m.id), [modes]);

  // MODE update
  const modeUpdateMutation = useMutation({
    mutationFn: async (payload: { id: TransportMode; enabled: boolean; label?: string }) => {
      const res = await fetch(`/api/freight-modes/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to update mode");
      return body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["freight-modes"] }),
    onError: (e: any) => alert(e?.message || "Failed"),
  });

  // VEHICLE upsert
  const vehicleUpsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = !!payload?.id;
      const url = isEdit ? `/api/vehicles/${encodeURIComponent(payload.id)}` : "/api/vehicles";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to save vehicle");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setVehicleModalOpen(false);
      setEditingVehicle(null);
    },
    onError: (e: any) => alert(e?.message || "Failed"),
  });

  const vehicleDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to delete vehicle");
      return body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
    onError: (e: any) => alert(e?.message || "Failed"),
  });

  // DRIVER upsert
  const driverUpsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = !!payload?.id;
      const url = isEdit ? `/api/drivers/${encodeURIComponent(payload.id)}` : "/api/drivers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to save driver");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setDriverModalOpen(false);
      setEditingDriver(null);
    },
    onError: (e: any) => alert(e?.message || "Failed"),
  });

  const driverDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drivers/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to delete driver");
      return body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
    onError: (e: any) => alert(e?.message || "Failed"),
  });

  const anyLoading =
    modesQ.isLoading || vehiclesQ.isLoading || driversQ.isLoading ||
    modeUpdateMutation.isPending || vehicleUpsertMutation.isPending || vehicleDeleteMutation.isPending ||
    driverUpsertMutation.isPending || driverDeleteMutation.isPending;

  const q = searchTerm.trim().toLowerCase();

  const filteredVehicles = useMemo(() => {
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.name} ${v.number} ${v.transportMode}`.toLowerCase().includes(q)
    );
  }, [vehicles, q]);

  const filteredDrivers = useMemo(() => {
    if (!q) return drivers;
    return drivers.filter((d) =>
      `${d.name} ${d.contactNumber ?? ""} ${d.licenseNumber ?? ""} ${d.transportMode}`.toLowerCase().includes(q)
    );
  }, [drivers, q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
          <p className="text-gray-500 mt-1">Manage transport modes, vehicles, and drivers/operators</p>
        </div>

        <div className="flex gap-2">
          {tab === "VEHICLE" && (
            <button
              onClick={() => { setEditingVehicle(null); setVehicleModalOpen(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Vehicle
            </button>
          )}

          {tab === "DRIVER" && (
            <button
              onClick={() => { setEditingDriver(null); setDriverModalOpen(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Driver / Operator
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "MODE", label: "Transport Mode" },
          { key: "VEHICLE", label: "Vehicle" },
          { key: "DRIVER", label: "Driver / Operator" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              tab === t.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full md:max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {anyLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {tab === "MODE" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Enabled</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modes.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        {modeIcon(m.id)}
                        {m.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{m.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      {m.enabled ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-sm font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> Enabled
                        </span>
                      ) : (
                        <span className="text-gray-400 font-semibold">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => modeUpdateMutation.mutate({ id: m.id, enabled: !m.enabled })}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                          m.enabled ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-green-600 text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {m.enabled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "VEHICLE" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Ownership</th>
                  <th className="px-6 py-4">Fuel</th>
                  <th className="px-6 py-4">Assigned Drivers</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!vehiclesQ.isLoading && filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No vehicles found.</td>
                  </tr>
                )}

                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{v.number} • {v.id}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        {modeIcon(v.transportMode as any)}
                        {v.transportMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{v.ownership}</td>
                    <td className="px-6 py-4 text-gray-700">{v.fuel === "OTHER" ? (v.fuelOther || "OTHER") : v.fuel}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {(v.assignedDrivers?.length ?? 0) === 0 ? (
                        <span className="text-gray-400">None</span>
                      ) : (
                        <div className="max-w-[280px] truncate">
                          {v.assignedDrivers?.map((d) => d.name).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => { setEditingVehicle(v); setVehicleModalOpen(true); }}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this vehicle?")) vehicleDeleteMutation.mutate(v.id);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "DRIVER" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Driver / Operator</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">License</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Assigned Vehicle(s)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!driversQ.isLoading && filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No drivers found.</td>
                  </tr>
                )}

                {filteredDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{d.role} • {d.id}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        {modeIcon(d.transportMode as any)}
                        {d.transportMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{d.licenseNumber || "-"}</td>
                    <td className="px-6 py-4 text-gray-700">{d.contactNumber || "-"}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {(d.assignedVehicles?.length ?? 0) === 0 ? (
                        <span className="text-gray-400">None</span>
                      ) : (
                        <div className="max-w-[280px] truncate">
                          {d.assignedVehicles?.map((v) => `${v.name} (${v.number})`).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => { setEditingDriver(d); setDriverModalOpen(true); }}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this driver?")) driverDeleteMutation.mutate(d.id);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modals */}
      <VehicleModal
        isOpen={vehicleModalOpen}
        onClose={() => { setVehicleModalOpen(false); setEditingVehicle(null); }}
        onSave={(payload) => vehicleUpsertMutation.mutate(payload)}
        initialData={editingVehicle}
        drivers={drivers}
        enabledModes={enabledModes}
      />

      <DriverModal
        isOpen={driverModalOpen}
        onClose={() => { setDriverModalOpen(false); setEditingDriver(null); }}
        onSave={(payload) => driverUpsertMutation.mutate(payload)}
        initialData={editingDriver}
        vehicles={vehicles}
        enabledModes={enabledModes}
      />
    </div>
  );
}
