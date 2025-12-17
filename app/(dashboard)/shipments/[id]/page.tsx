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
} from "lucide-react";

import {ShipmentEvent,ShipmentDocument, CargoItem, Shipment} from "../types";

import { ShipmentEditModal } from "@/app/(dashboard)/shipments/components/ShipmentEditModal";
import { UpdateStatusModal } from "@/app/(dashboard)/shipments/components/UpdateStatusModal";
import { CargoEditModal } from "@/app/(dashboard)/shipments/components/CargoEditModal";
import { UploadDocumentModal } from "@/app/(dashboard)/shipments/components/UploadDocumentModal";
import { EditDocumentModal } from "@/app/(dashboard)/shipments/components/EditDocumentModal";
import { FinancialEditModal } from "@/app/(dashboard)/shipments/components/FinancialEditModal";

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
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold mb-2">
            {shipment.mode} - {shipment.masterDoc || "N/A"}
          </div>
          <div className="text-xs text-gray-500">ETD: {shipment.etd || "N/A"}</div>
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
            {shipment.temperature?.setPoint ?? 0} deg{shipment.temperature?.unit ?? "C"} ({shipment.temperature?.range ?? "N/A"})
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
const formatTs = (ts: any) => {
  if (!ts) return "N/A";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};
export const TimelineTab = ({
  events,
  onUpdateClick,
}: {
  events: ShipmentEvent[];
  onUpdateClick: () => void;
}) => {
  // ✅ latest first (DESC)
  const sortedEvents = useMemo(() => {
    const list = Array.isArray(events) ? [...events] : [];
    return list.sort((a, b) => {
      const ta = new Date(a.timestamp as any).getTime();
      const tb = new Date(b.timestamp as any).getTime();

      // put invalid/missing timestamps at bottom
      const aBad = Number.isNaN(ta);
      const bBad = Number.isNaN(tb);
      if (aBad && bBad) return 0;
      if (aBad) return 1;
      if (bBad) return -1;

      return tb - ta; // DESC
    });
  }, [events]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Status History</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add a new status with timestamp. It will update Shipment status + timeline.
          </p>
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

        {sortedEvents.map((event) => (
          <div key={event.id} className="relative pl-8">
            <div
              className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                event.status === "EXCEPTION" ? "bg-red-500" : "bg-blue-600"
              }`}
            />

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div className="min-w-0">
                <span className="text-sm font-bold text-gray-900 block">
                  {String(event.status || "").replaceAll("_", " ")}
                </span>
                <span className="text-sm text-gray-600 block break-words">
                  {event.description || "N/A"}
                </span>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500">{formatTs(event.timestamp)}</div>
                <div className="text-xs text-gray-400 font-medium">
                  {event.location || "N/A"} - {event.user || "N/A"}
                </div>
              </div>
            </div>
          </div>
        ))}
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
                {doc.type} - {doc.uploadDate ? `Uploaded: ${doc.uploadDate}` : "Not uploaded"}
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

const CargoTab = ({
  shipment,
  onEditClick,
}: {
  shipment: Shipment;
  onEditClick: () => void;
}) => (
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

    <div className="overflow-x-auto">
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
                <span className="inline-flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">{item.tempReq}</span>
              </td>
              <td className="px-6 py-4">{item.packaging || "N/A"}</td>
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
  </Card>
);

/* -------------------- Page -------------------- */

const ShipmentDetail = () => {
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
  const [selectedDoc, setSelectedDoc] = useState<ShipmentDocument | null>(null);

  const { data: shipment, isLoading, isError } = useQuery<Shipment>({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const res = await fetch(`/api/shipments/${id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!id,
  });

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: CheckCircle },
      { id: "timeline", label: "Timeline & Status", icon: Clock },
      { id: "cargo", label: "Cargo & Pack", icon: Box },
      { id: "documents", label: "ShipmentDocument", icon: FileText },
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
  if (isError || !shipment) return <div className="p-8 text-center text-gray-500">Shipment not found</div>;

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
          </div>

          <div className="text-sm text-gray-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" /> {shipment.origin.code} to {shipment.destination.code}
            </span>
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" /> ETA: {shipment.eta || "N/A"}
            </span>
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
          <TimelineTab events={shipment.events || []} onUpdateClick={() => setStatusOpen(true)} />
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
};

export default ShipmentDetail;
