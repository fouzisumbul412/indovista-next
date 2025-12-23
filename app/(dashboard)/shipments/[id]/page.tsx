"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Thermometer,
  FileText,
  CheckCircle,
  Clock,
  Box,
  DollarSign,
  Pencil,
  Trash2,
  Plus,
  Truck,
  Ship,
  Plane,
  Phone,
  BadgeInfo,
} from "lucide-react";

import { ShipmentEvent, ShipmentDocument, Shipment } from "../types";
import { formatIST, prettyStatus } from "@/lib/datetime";

import { ShipmentEditModal } from "@/app/(dashboard)/shipments/components/ShipmentEditModal";
import { UpdateStatusModal } from "@/app/(dashboard)/shipments/components/UpdateStatusModal";
import { CargoEditModal } from "@/app/(dashboard)/shipments/components/CargoEditModal";
import { UploadDocumentModal } from "@/app/(dashboard)/shipments/components/UploadDocumentModal";
import { EditDocumentModal } from "@/app/(dashboard)/shipments/components/EditDocumentModal";
import { FinancialEditModal } from "@/app/(dashboard)/shipments/components/FinancialEditModal";
import { VehicleDriverAssignModal } from "@/app/(dashboard)/shipments/components/VehicleDriverAssignModal";



/* -------------------- helpers -------------------- */
const modeIcon = (m: any) =>
  m === "ROAD" ? <Truck className="w-4 h-4" /> : m === "SEA" ? <Ship className="w-4 h-4" /> : <Plane className="w-4 h-4" />;

/* -------------------- Tabs -------------------- */

const OverviewTab = ({ shipment }: { shipment: Shipment }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="md:col-span-2">
      <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Route Information</h3>

      <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
        <div className="hidden md:block absolute top-1/2 left-20 right-20 h-0.5 bg-gray-200 -z-10" />

        <div className="text-center bg-white p-2">
          <div className="text-sm text-gray-500 mb-1">Origin</div>
          <div className="text-xl font-bold text-gray-900">{shipment.origin.code}</div>
          <div className="text-sm text-gray-600">
            {shipment.origin.city}, {shipment.origin.country}
          </div>
        </div>

        <div className="flex flex-col items-center bg-white p-2">
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold mb-2 inline-flex items-center gap-2">
            {modeIcon(shipment.mode)} {shipment.mode} • {shipment.masterDoc || "No BL / Master"}
          </div>
          <div className="text-xs text-gray-500">ETD: {formatIST(shipment.etd)}</div>
          <div className="text-xs text-gray-500">ETA: {formatIST(shipment.eta)}</div>
        </div>

        <div className="text-center bg-white p-2">
          <div className="text-sm text-gray-500 mb-1">Destination</div>
          <div className="text-xl font-bold text-gray-900">{shipment.destination.code}</div>
          <div className="text-sm text-gray-600">
            {shipment.destination.city}, {shipment.destination.country}
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Shipment Specs</h3>
      <div className="space-y-4">
        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-500">Commodity Type</span>
          <span className="text-sm font-medium text-right">{shipment.commodity}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-500">Temperature Req</span>
          <span className="text-sm font-medium flex items-center gap-1 text-blue-600">
            <Thermometer className="w-4 h-4" />
            {/* {shipment.temperature?.setPoint ?? 0} deg{shipment.temperature?.unit ?? "C"}  */}
            {shipment.temperature?.range ?? "Ambient / N/A"}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-500">Incoterms</span>
          <span className="text-sm font-medium text-right">
            {shipment.incoterm?.code ? `${shipment.incoterm.code} (${shipment.incoterm.name})` : "N/A"}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-500">Container</span>
          <span className="text-sm font-medium text-right">
            {shipment.containerType?.code ? `${shipment.containerType.code} - ${shipment.containerType.name}` : "N/A"}
          </span>
        </div>
      </div>
    </Card>

    <Card>
      <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Customer Details</h3>
      <div className="space-y-4">
        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-500">Consignee</span>
          <span className="text-sm font-medium text-right">{shipment.customer}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-sm text-gray-500">Reference</span>
          <span className="text-sm font-medium text-right">{shipment.reference}</span>
        </div>
      </div>
    </Card>
  </div>
);

export const TimelineTab = ({
  shipment,
  events,
  onUpdateClick,
}: {
  shipment: Shipment;
  events: ShipmentEvent[];
  onUpdateClick: () => void;
}) => {
  const sortedEvents = useMemo(() => {
    const list = Array.isArray(events) ? [...events] : [];
    return list.sort((a, b) => {
      const ta = new Date(a.timestamp as any).getTime();
      const tb = new Date(b.timestamp as any).getTime();
      const aBad = Number.isNaN(ta);
      const bBad = Number.isNaN(tb);
      if (aBad && bBad) return 0;
      if (aBad) return 1;
      if (bBad) return -1;
      return tb - ta;
    });
  }, [events]);

  const vehicleLine = shipment.vehicle
    ? `${shipment.vehicle.name} (${shipment.vehicle.number}) • Driver: ${
        shipment.vehicle.assignedDrivers?.length ? shipment.vehicle.assignedDrivers.map((d) => d.name).join(", ") : "Not assigned"
      }`
    : "No vehicle assigned";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Status History</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add a new status with timestamp. It will update Shipment status + timeline.
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Vehicle:</span> {vehicleLine}
          </div>
        </div>

        <button
          onClick={onUpdateClick}
          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Update Status
        </button>
      </div>

      <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
        {sortedEvents.length === 0 && (
          <div className="pl-6 text-gray-500">No events recorded yet.</div>
        )}

        {sortedEvents.map((event) => {
          const safeStatus = prettyStatus(event.status);
          const safeDesc =
            event.description?.trim() ||
            `Status updated to "${safeStatus}". Add notes next time for clarity.`;
          const safeLoc =
            event.location?.trim() ||
            `${shipment.origin.code} → ${shipment.destination.code}`;
          const safeUser = event.user?.trim() || "System / Operator";

          return (
            <div key={event.id} className="relative pl-8">
              <div
                className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                  event.status === "EXCEPTION" ? "bg-red-500" : "bg-blue-600"
                }`}
              />

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-900 block">{safeStatus}</span>
                  <span className="text-sm text-gray-600 block break-words">{safeDesc}</span>

                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Vehicle:</span>{" "}
                    {shipment.vehicle ? `${shipment.vehicle.name} (${shipment.vehicle.number})` : "Unassigned"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500">{formatIST(event.timestamp)}</div>
                  <div className="text-xs text-gray-400 font-medium">
                    {safeLoc} • {safeUser}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const DocumentsTab = ({
  documents,
  onUploadClick,
  onEditClick,
  onDeleteClick,
}: {
  documents: ShipmentDocument[];
  onUploadClick: () => void;
  onEditClick: (doc: ShipmentDocument) => void;
  onDeleteClick: (doc: ShipmentDocument) => void;
}) => (
  <Card>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h3 className="font-semibold text-gray-900">Required Documentation</h3>
        <p className="text-sm text-gray-500 mt-1">Upload, edit metadata, or delete documents.</p>
      </div>

      <button
        onClick={onUploadClick}
        className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Upload New
      </button>
    </div>

    <div className="space-y-4">
      {documents.length === 0 && <div className="text-gray-500 italic">No documents required or uploaded.</div>}

      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white border border-gray-300 rounded">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
              <div className="text-xs text-gray-500">
                {doc.type} • {doc.uploadDate ? `Uploaded: ${formatIST(doc.uploadDate)}` : "Not uploaded"}
              </div>
              {doc.fileUrl && (
                <a className="text-xs text-blue-600 hover:underline" href={doc.fileUrl} target="_blank" rel="noreferrer">
                  View file
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <StatusBadge status={doc.status as any} />

            <button
              onClick={() => onEditClick(doc)}
              className=" text-sm font-semibold text-blue-600 rounded-md hover:text-blue-400 inline-flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDeleteClick(doc)}
              className=" text-sm text-red-600  rounded-md hover:text-red-400  inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const CargoTab = ({ shipment, onEditClick }: { shipment: Shipment; onEditClick: () => void }) => (
  <Card noPadding>
    <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-gray-900">Cargo & Pack</h3>
        <p className="text-sm text-gray-500 mt-1">Add / edit products, qty, weight, packaging.</p>
      </div>

      <button
        onClick={onEditClick}
        className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
      >
        <Pencil className="w-4 h-4" />
        Edit Cargo
      </button>
    </div>

    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
          <tr>
            <th className="px-6 py-3">Product Name</th>
            <th className="px-6 py-3">HS Code</th>
            <th className="px-6 py-3">Quantity</th>
            <th className="px-6 py-3">Weight</th>
            <th className="px-6 py-3">Temp Req</th>
            <th className="px-6 py-3">Packaging</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {shipment.cargo.map((item) => (
            <tr key={item.id}>
              <td className="px-6 py-4 font-medium text-gray-900">{item.productName}</td>
              <td className="px-6 py-4 text-gray-600 font-mono">{item.hsCode}</td>
              <td className="px-6 py-4">
                {item.quantity} {item.unit}
              </td>
              <td className="px-6 py-4">{item.weightKg ?? 0} kg</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                  {item.tempReq || "Ambient"}
                </span>
              </td>
              <td className="px-6 py-4">{item.packaging || "Notes not added"}</td>
            </tr>
          ))}
          {shipment.cargo.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                No cargo items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="md:hidden p-4 space-y-3">
      {shipment.cargo.length === 0 && <div className="text-gray-500">No cargo items found.</div>}
      {shipment.cargo.map((item) => (
        <Card key={item.id} className="border border-gray-200">
          <div className="font-bold text-gray-900">{item.productName}</div>
          <div className="text-xs text-gray-500 mt-1">HS: {item.hsCode || "-"}</div>
          <div className="mt-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Qty</span>
              <span className="font-semibold">
                {item.quantity} {item.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Weight</span>
              <span className="font-semibold">{item.weightKg ?? 0} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Temp</span>
              <span className="font-semibold">{item.tempReq || "Ambient"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Packaging</span>
              <span className="font-semibold text-right">{item.packaging || "Notes not added"}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </Card>
);

const VehicleDriverModeTab = ({
  shipment,
  onEditClick,
}: {
  shipment: Shipment;
  onEditClick: () => void;
}) => {
  const vehicle = shipment.vehicle;
  const shipmentDriver = (shipment as any).driver || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Vehicle • Driver • Mode</h3>
            <p className="text-sm text-gray-500 mt-1">
              Assign a vehicle/driver that matches the shipment mode. (Validation is enforced in the API.)
            </p>
          </div>

          <button
            onClick={onEditClick}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Assign / Change
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-500">Mode</div>
            <div className="mt-1 font-bold text-gray-900 inline-flex items-center gap-2">
              {modeIcon(shipment.mode)} {shipment.mode}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-500">Direction</div>
            <div className="mt-1 font-bold text-gray-900 inline-flex items-center gap-2">
              <BadgeInfo className="w-4 h-4" /> {shipment.direction}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-500">Shipment ID</div>
            <div className="mt-1 font-mono font-bold text-gray-900 break-all">{shipment.id}</div>
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Assigned Vehicle</h3>

        {!vehicle ? (
          <div className="text-sm text-gray-500">
            Vehicle is <span className="font-semibold">Unassigned</span>. Click{" "}
            <span className="font-semibold">Assign / Change</span> to select a vehicle that matches mode ({shipment.mode}).
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500">Vehicle</div>
              <div className="text-lg font-bold text-gray-900">
                {vehicle.name} <span className="text-gray-500 font-semibold">({vehicle.number})</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-2">
                {modeIcon(vehicle.transportMode)} {vehicle.transportMode}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">Drivers on Vehicle</div>
              {vehicle.assignedDrivers?.length ? (
                <div className="space-y-2">
                  {vehicle.assignedDrivers.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{d.name}</div>
                        <div className="text-xs text-gray-500 truncate">{d.role || "Driver"}</div>
                      </div>
                      {d.contactNumber ? (
                        <a href={`tel:${d.contactNumber}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                          <Phone className="w-4 h-4" /> {d.contactNumber}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No contact</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No driver assigned to this vehicle yet.</div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Shipment Driver</h3>

        {!shipmentDriver ? (
          <div className="text-sm text-gray-500">
            Shipment driver is <span className="font-semibold">Not assigned</span>. (Optional)
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">Driver</div>
              <div className="text-lg font-bold text-gray-900">{shipmentDriver.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {shipmentDriver.role || "Driver"} • {shipmentDriver.transportMode}
              </div>
            </div>

            {shipmentDriver.contactNumber ? (
              <a href={`tel:${shipmentDriver.contactNumber}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                <Phone className="w-4 h-4" /> {shipmentDriver.contactNumber}
              </a>
            ) : (
              <div className="text-xs text-gray-400">No contact number</div>
            )}

            {shipmentDriver.licenseNumber ? (
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">License:</span> {shipmentDriver.licenseNumber}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
};

/* -------------------- Page -------------------- */

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  

  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cargoOpen, setCargoOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [editDocOpen, setEditDocOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ShipmentDocument | null>(null);

  // const { data: shipment, isLoading, isError, error } = useQuery<Shipment>({
  //   queryKey: ["shipment", id],
  //   queryFn: async () => {
  //     const res = await fetch(`/api/shipments/${id}`);
  //     if (!res.ok) throw new Error(await res.text());
  //     return res.json();
  //   },
  //   enabled: !!id,
  // });
  const { data: shipment, isLoading, isError, error } = useQuery<Shipment>({
  queryKey: ["shipment", id],
  queryFn: async () => {
    const res = await fetch(`/api/shipments/${id}`, {
      cache: "no-store", // 🔥 FIX: prevents Next.js from reusing old shipment
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  enabled: !!id,
});


  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: CheckCircle },
      { id: "timeline", label: "Timeline & Status", icon: Clock },
      { id: "vehicle_driver", label: "Vehicle • Driver • Mode", icon: Truck },
      { id: "cargo", label: "Cargo & Pack", icon: Box },
      { id: "documents", label: "Documents", icon: FileText },
      { id: "billing", label: "Financials", icon: DollarSign },
    ],
    []
  );

  const refetchShipment = async () => {
    await qc.invalidateQueries({ queryKey: ["shipment", id] });
    await qc.invalidateQueries({ queryKey: ["shipments"] });
  };

  const handleDeleteShipment = async () => {
    if (!shipment?.id) return;
    const ok = confirm(`Delete shipment ${shipment.reference}? This will remove items, docs, and events.`);
    if (!ok) return;

    const res = await fetch(`/api/shipments/${shipment.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }

    await qc.invalidateQueries({ queryKey: ["shipments"] });
    router.push("/shipments");
  };

  const handleDeleteDoc = async (doc: ShipmentDocument) => {
    if (!shipment?.id) return;
    const ok = confirm(`Delete document "${doc.name}"?`);
    if (!ok) return;

    const res = await fetch(`/api/shipments/${shipment.id}/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await refetchShipment();
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (isError || !shipment) {
    return (
      <div className="p-8 text-center text-gray-500 space-y-2">
        <div>Shipment not found</div>
        <div className="text-xs text-gray-400 break-words max-w-2xl mx-auto">
          {(error as any)?.message || ""}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href="/shipments" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Shipments
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 break-words">{shipment.reference}</h1>
            <StatusBadge status={shipment.status as any} />
            <span className="text-xs font-mono px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200">
              {shipment.id}
            </span>
          </div>

          <div className="text-sm text-gray-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" /> {shipment.origin.code} to {shipment.destination.code}
            </span>
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" /> ETA: {formatIST(shipment.eta)}
            </span>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            <span className="font-semibold text-gray-700">Vehicle:</span>{" "}
            {shipment.vehicle ? `${shipment.vehicle.name} (${shipment.vehicle.number})` : "Unassigned"}{" "}
            <span className="text-gray-400">•</span>{" "}
            <span className="font-semibold text-gray-700">Driver(s):</span>{" "}
            {shipment.vehicle?.assignedDrivers?.length ? shipment.vehicle.assignedDrivers.map((d) => d.name).join(", ") : "Not assigned"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="px-4 py-2 border border-gray-300 bg-white rounded-md text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Shipment
          </button>

          <button
            onClick={handleDeleteShipment}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && <OverviewTab shipment={shipment} />}

        {activeTab === "timeline" && (
          <TimelineTab shipment={shipment} events={shipment.events || []} onUpdateClick={() => setStatusOpen(true)} />
        )}

        {activeTab === "vehicle_driver" && (
          <VehicleDriverModeTab shipment={shipment} onEditClick={() => setAssignOpen(true)} />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            documents={shipment.documents || []}
            onUploadClick={() => setUploadDocOpen(true)}
            onEditClick={(doc) => {
              setSelectedDoc(doc);
              setEditDocOpen(true);
            }}
            onDeleteClick={handleDeleteDoc}
          />
        )}

        {activeTab === "cargo" && <CargoTab shipment={shipment} onEditClick={() => setCargoOpen(true)} />}

        {activeTab === "billing" && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900">Financials</h3>
                <p className="text-sm text-gray-500 mt-1">Edit currency, revenue, cost, invoice status.</p>
              </div>

              <button
                onClick={() => setFinancialOpen(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Financials
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  {shipment.financials.currency} {shipment.financials.revenue}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">Cost</div>
                <div className="text-2xl font-bold text-gray-900">
                  {shipment.financials.currency} {shipment.financials.cost}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded border border-green-100">
                <div className="text-sm text-green-700">Margin</div>
                <div className="text-2xl font-bold text-green-800">
                  {shipment.financials.currency} {shipment.financials.margin}
                </div>
                <div className="text-xs text-green-700 mt-2">Invoice: {shipment.financials.invoiceStatus}</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      <ShipmentEditModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        shipment={shipment}
        onSaved={async () => {
          setEditOpen(false);
          await refetchShipment();
        }}
      />

      <UpdateStatusModal
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        shipmentId={shipment.id}
        currentStatus={shipment.status}
        onSaved={async () => {
          setStatusOpen(false);
          await refetchShipment();
        }}
      />
      <VehicleDriverAssignModal
  isOpen={assignOpen}
  onClose={() => setAssignOpen(false)}
  shipmentId={shipment.id}               // use real DB id
  shipmentMode={shipment.mode as any}
  currentVehicleId={shipment.vehicle?.id || null}
  currentDriverId={(shipment as any).driver?.id || null}
  onSaved={async () => {
    setAssignOpen(false);
    await refetchShipment();
  }}
/>


      <CargoEditModal
        isOpen={cargoOpen}
        onClose={() => setCargoOpen(false)}
        shipmentId={shipment.id}
        cargo={shipment.cargo || []}
        onSaved={async () => {
          setCargoOpen(false);
          await refetchShipment();
        }}
      />

      <UploadDocumentModal
        isOpen={uploadDocOpen}
        onClose={() => setUploadDocOpen(false)}
        shipmentId={shipment.id}
        onSaved={async () => {
          setUploadDocOpen(false);
          await refetchShipment();
        }}
      />

      <EditDocumentModal
        isOpen={editDocOpen}
        onClose={() => {
          setEditDocOpen(false);
          setSelectedDoc(null);
        }}
        shipmentId={shipment.id}
        doc={selectedDoc}
        onSaved={async () => {
          setEditDocOpen(false);
          setSelectedDoc(null);
          await refetchShipment();
        }}
      />

      <FinancialEditModal
        isOpen={financialOpen}
        onClose={() => setFinancialOpen(false)}
        shipmentId={shipment.id}
        financials={{
          ...shipment.financials,
          invoiceStatus: shipment.financials.invoiceStatus || "",
        }}
        onSaved={async () => {
          setFinancialOpen(false);
          await refetchShipment();
        }}
      />
    </div>
  );
}
