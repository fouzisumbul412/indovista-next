"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge, SLABadge } from "@/components/ui/Badge";
import { Search, Ship, Plane, Truck, ArrowRight, Plus, RefreshCw, X } from "lucide-react";
import { NewShipmentModal } from "@/components/NewShipmentModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatIST } from "@/lib/datetime";

type Mode = "SEA" | "AIR" | "ROAD";
type Direction = "IMPORT" | "EXPORT";

type DriverMini = { id: string; name: string; contactNumber?: string | null };
type VehicleMini = {
  id: string;
  name: string;
  number: string;
  transportMode: Mode;
  assignedDrivers: DriverMini[];
};

type ShipmentRow = {
  id: string;
  reference: string;
  masterDoc?: string | null;
  customer: string;
  origin: { code: string; city: string; country: string };
  destination: { code: string; city: string; country: string };
  mode: Mode;
  direction: Direction;
  commodity: string;
  status: string;
  slaStatus: "ON_TIME" | "AT_RISK" | "BREACHED";
  eta: string | null;
  vehicle?: VehicleMini | null;
};

type ViewTab = "LIST" | "VEHICLE_DRIVER";

const modeIcon = (m: Mode) =>
  m === "SEA" ? <Ship className="w-4 h-4 text-blue-600" /> : m === "AIR" ? <Plane className="w-4 h-4 text-purple-600" /> : <Truck className="w-4 h-4 text-orange-600" />;

const getCommodityLabel = (type: string) => {
  switch (type) {
    case "FROZEN":
      return "Frozen Foods";
    case "SPICE":
      return "Spices";
    case "BOTH":
      return "Frozen + Spices";
    default:
      return "General Cargo";
  }
};

const VehicleChip = ({ vehicle }: { vehicle?: VehicleMini | null }) => {
  if (!vehicle) return <span className="text-gray-400">Unassigned</span>;
  const drivers = (vehicle.assignedDrivers || []).map((d) => d.name).filter(Boolean);
  return (
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 truncate">
        {vehicle.name} <span className="text-gray-500 font-medium">({vehicle.number})</span>
      </div>
      <div className="text-xs text-gray-500 truncate">
        Driver: {drivers.length ? drivers.join(", ") : "Not assigned"}
      </div>
    </div>
  );
};

export default function ShipmentList() {
  const qc = useQueryClient();

  const [viewTab, setViewTab] = useState<ViewTab>("LIST");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<Mode | "ALL">("ALL");
  const [filterDirection, setFilterDirection] = useState<Direction | "ALL">("ALL");
  const [filterReference, setFilterReference] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: shipments = [], isLoading } = useQuery<ShipmentRow[]>({
    queryKey: ["shipments"],
    queryFn: async () => {
      const res = await fetch("/api/shipments");
      if (!res.ok) throw new Error("Failed to load shipments");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return shipments.filter((s) => {
      const matchesSearch =
        s.reference.toLowerCase().includes(term) ||
        s.customer.toLowerCase().includes(term) ||
        (s.masterDoc || "").toLowerCase().includes(term) ||
        (s.vehicle?.name || "").toLowerCase().includes(term) ||
        (s.vehicle?.number || "").toLowerCase().includes(term) ||
        (s.vehicle?.assignedDrivers || []).some((d) => (d.name || "").toLowerCase().includes(term));

      const matchesMode = filterMode === "ALL" || s.mode === filterMode;
      const matchesDirection = filterDirection === "ALL" || s.direction === filterDirection;
      //const matchesReference = s.reference.toLowerCase().includes(filterReference.toLowerCase());
      const ref = filterReference.toLowerCase().trim();
const matchesReference =
  !ref ||
  s.reference.toLowerCase().includes(ref) ||
  (s.masterDoc || "").toLowerCase().includes(ref);


      return matchesSearch && matchesMode && matchesDirection && matchesReference;
    });
  }, [shipments, searchTerm, filterMode, filterDirection, filterReference]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(filtered.map((s) => s.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAction = (action: string) => {
    alert(`${action} triggered for ${selectedIds.size} shipments.`);
    setSelectedIds(new Set());
  };

  const groupedByMode = useMemo(() => {
    const groups: Record<Mode, ShipmentRow[]> = { SEA: [], AIR: [], ROAD: [] };
    filtered.forEach((s) => groups[s.mode].push(s));
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 mt-1">Manage and track all import/export shipments</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Shipment
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {([
          { key: "LIST", label: "Shipments" },
          { key: "VEHICLE_DRIVER", label: "Vehicle • Driver • Mode" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setViewTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              viewTab === t.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200 shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Reference, Customer, BL, Vehicle, Driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <input
              type="text"
              placeholder="Filter Ref ID"
              value={filterReference}
              onChange={(e) => setFilterReference(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40"
            />

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Mode:</span>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {(["ALL", "SEA", "AIR", "ROAD"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMode(m)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      filterMode === m
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {m === "ALL" ? "All" : m.charAt(0) + m.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-200"></div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Direction:</span>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {(["ALL", "EXPORT", "IMPORT"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilterDirection(d)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      filterDirection === d
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {d === "ALL" ? "All" : d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 flex items-center justify-between transition-all animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-blue-900 text-sm">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-blue-200"></div>
              <button
                onClick={() => handleBulkAction("Refresh Status")}
                className="text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-2 px-2 py-1 hover:bg-blue-100 rounded"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Status
              </button>
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* CONTENT */}
        {isLoading && (
          <div className="px-6 py-10 text-center text-gray-500">Loading...</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">No shipments found matching your filters.</div>
        )}

        {!isLoading && filtered.length > 0 && (
          <>
            {/* Desktop Table */}
            {viewTab === "LIST" && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                    <tr>
                      {/* <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onChange={handleSelectAll}
                          checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        />
                      </th> */}
                      <th className="px-6 py-4 font-bold">Reference</th>
                      <th className="px-6 py-4 font-bold">Customer</th>
                      <th className="px-6 py-4 font-bold">Route</th>
                      <th className="px-6 py-4 font-bold">Mode</th>
                      <th className="px-6 py-4 font-bold">Direction</th>
                      <th className="px-6 py-4 font-bold">Vehicle / Driver</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">ETA</th>
                      <th className="px-6 py-4 font-bold">SLA</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((shipment) => (
                      <tr
                        key={shipment.id}
                        className={`hover:bg-gray-50 transition-colors group ${
                          selectedIds.has(shipment.id) ? "bg-blue-50/30" : ""
                        }`}
                      >
                        {/* <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedIds.has(shipment.id)}
                            onChange={() => handleSelectRow(shipment.id)}
                          />
                        </td> */}

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <Link
                              href={`/shipments/${shipment.id}`}
                              className="font-bold text-gray-900 group-hover:text-blue-600"
                            >
                              {shipment.reference}
                            </Link>
                            <span className="text-xs text-gray-400 font-mono mt-0.5">
                              {shipment.masterDoc || ""}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-700 font-medium">{shipment.customer}</td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <span>{shipment.origin.code}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span>{shipment.destination.code}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            {modeIcon(shipment.mode)}
                            <span className="text-sm">{shipment.mode}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge type="info" className="bg-sky-50 text-sky-700 border-sky-100">
                            {shipment.direction.charAt(0) + shipment.direction.slice(1).toLowerCase()}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          <VehicleChip vehicle={shipment.vehicle} />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={shipment.status as any} />
                        </td>

                        <td className="px-6 py-4 text-gray-900 font-mono text-xs">
                          {formatIST(shipment.eta)}
                        </td>

                        <td className="px-6 py-4">
                          <SLABadge status={shipment.slaStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Vehicle/Driver/Mode tab (Desktop) */}
            {viewTab === "VEHICLE_DRIVER" && (
              <div className="hidden md:block p-4 space-y-6">
                {(["SEA", "AIR", "ROAD"] as Mode[]).map((m) => (
                  <div key={m} className="space-y-3">
                    <div className="flex items-center gap-2">
                      {modeIcon(m)}
                      <div className="font-bold text-gray-900">{m} Shipments</div>
                      <span className="text-xs text-gray-500">({groupedByMode[m].length})</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {groupedByMode[m].map((s) => (
                        <Card key={s.id} className="border border-gray-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link href={`/shipments/${s.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                                {s.reference}
                              </Link>
                              <div className="text-xs text-gray-500 mt-1">
                                {s.origin.code} → {s.destination.code} • {getCommodityLabel(s.commodity)}
                              </div>
                            </div>
                            <StatusBadge status={s.status as any} />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-gray-500">Vehicle</div>
                              <div className="font-semibold text-gray-900">
                                {s.vehicle ? `${s.vehicle.name} (${s.vehicle.number})` : "Unassigned"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Driver</div>
                              <div className="font-semibold text-gray-900 truncate">
                                {s.vehicle?.assignedDrivers?.length
                                  ? s.vehicle.assignedDrivers.map((d) => d.name).join(", ")
                                  : "Not assigned"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">ETA</div>
                              <div className="font-semibold text-gray-900">{formatIST(s.eta)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">SLA</div>
                              <div className="font-semibold text-gray-900">
                                <SLABadge status={s.slaStatus} />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile Cards (for both tabs) */}
            <div className="md:hidden p-4 space-y-4">
              {viewTab === "VEHICLE_DRIVER" ? (
                (["SEA", "AIR", "ROAD"] as Mode[]).map((m) => (
                  <div key={m} className="space-y-3">
                    <div className="flex items-center gap-2">
                      {modeIcon(m)}
                      <div className="font-bold text-gray-900">{m}</div>
                      <span className="text-xs text-gray-500">({groupedByMode[m].length})</span>
                    </div>

                    {groupedByMode[m].map((s) => (
                      <Card key={s.id} className="border border-gray-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/shipments/${s.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                              {s.reference}
                            </Link>
                            <div className="text-xs text-gray-500 mt-1">
                              {s.origin.code} → {s.destination.code}
                            </div>
                          </div>
                          <StatusBadge status={s.status as any} />
                        </div>

                        <div className="mt-3 text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Mode</span>
                            <span className="font-semibold text-gray-900 inline-flex items-center gap-2">
                              {modeIcon(s.mode)} {s.mode}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <span className="text-gray-500">Vehicle/Driver</span>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {s.vehicle ? `${s.vehicle.name} (${s.vehicle.number})` : "Unassigned"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {s.vehicle?.assignedDrivers?.length
                                  ? `Driver: ${s.vehicle.assignedDrivers.map((d) => d.name).join(", ")}`
                                  : "Driver: Not assigned"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">ETA</span>
                            <span className="font-semibold text-gray-900">{formatIST(s.eta)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">SLA</span>
                            <SLABadge status={s.slaStatus} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ))
              ) : (
                filtered.map((s) => (
                  <Card key={s.id} className="border border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/shipments/${s.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                          {s.reference}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1">{s.customer}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {s.origin.code} → {s.destination.code}
                        </div>
                      </div>
                      <StatusBadge status={s.status as any} />
                    </div>

                    <div className="mt-3 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Mode</span>
                        <span className="font-semibold text-gray-900 inline-flex items-center gap-2">
                          {modeIcon(s.mode)} {s.mode}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Direction</span>
                        <span className="font-semibold text-gray-900">{s.direction}</span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">Vehicle/Driver</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {s.vehicle ? `${s.vehicle.name} (${s.vehicle.number})` : "Unassigned"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.vehicle?.assignedDrivers?.length
                              ? `Driver: ${s.vehicle.assignedDrivers.map((d) => d.name).join(", ")}`
                              : "Driver: Not assigned"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">ETA</span>
                        <span className="font-semibold text-gray-900">{formatIST(s.eta)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">SLA</span>
                        <SLABadge status={s.slaStatus} />
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </Card>

      <NewShipmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["shipments"] })}
      />
    </div>
  );
}
