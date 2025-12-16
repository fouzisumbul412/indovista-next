"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Ship, Plane, Truck, Snowflake, Leaf, Upload, Trash2, Plus } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

type Mode = "SEA" | "AIR" | "ROAD";
type Direction = "IMPORT" | "EXPORT";
type Commodity = "FROZEN" | "SPICE" | "BOTH" | "OTHER";

type DocType =
  | "INVOICE"
  | "PACKING_LIST"
  | "BILL_LADING"
  | "HEALTH_CERT"
  | "ORIGIN_CERT"
  | "CUSTOMS_DEC"
  | "INSURANCE"
  | "OTHER";

type DocStatus =
  | "MISSING"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "FINAL"
  | "PENDING"
  | "NOT_RECEIVED";

type SLAStatus = "ON_TIME" | "AT_RISK" | "BREACHED";
type ShipmentStatus =
  | "BOOKED"
  | "PICKED_UP"
  | "IN_TRANSIT_ORIGIN"
  | "AT_PORT_ORIGIN"
  | "CUSTOMS_EXPORT"
  | "ON_VESSEL"
  | "AT_PORT_DEST"
  | "CUSTOMS_IMPORT"
  | "DELIVERED"
  | "EXCEPTION";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

// ✅ add currency to customer if your /api/customers returns it (recommended)
type CustomerRow = { id: string; customerCode: string; companyName: string; country: string; currency?: string };
type PortRow = { id: number; code: string; city: string; country: string };
type IncotermRow = { id: number; code: string; name: string };
type ContainerTypeRow = { id: number; code: string; name: string; transportMode: string };
type TemperatureRow = { id: number; name: string; range: string; tolerance: string; setPoint?: number | null; unit?: "C" | "F" };
type ProductRow = { id: string; name: string; type: string; hsCode?: string | null; temperature?: string | null; packSize?: string | null };

// ✅ backend Currency table
type CurrencyRow = { id: number; currencyCode: string; name: string; exchangeRate: number };

type ShipmentItemDraft = {
  productId: string;
  quantity: number;
  unit: string;
  weightKg?: number;
  packaging?: string;
};

// ✅ queued doc (no upload until shipment created)
type PendingDoc = {
  name: string;
  type: DocType;
  status: DocStatus;
  expiryDate?: string;
  file: File;
};

interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const NewShipmentModal: React.FC<NewShipmentModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [step, setStep] = useState<Step>(1);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [ports, setPorts] = useState<PortRow[]>([]);
  const [incoterms, setIncoterms] = useState<IncotermRow[]>([]);
  const [containerTypes, setContainerTypes] = useState<ContainerTypeRow[]>([]);
  const [temperatures, setTemperatures] = useState<TemperatureRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);

  const [loadingMaster, setLoadingMaster] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 3 doc queue state
  const [docDraft, setDocDraft] = useState({
    name: "",
    type: "BILL_LADING" as DocType,
    status: "DRAFT" as DocStatus,
    expiryDate: "",
    file: null as File | null,
  });
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);

  const [formData, setFormData] = useState({
    // Step 1
    reference: "",
    masterDoc: "",
    customerId: "",
    direction: "EXPORT" as Direction,
    mode: "SEA" as Mode,
    incotermId: "",
    commodity: "FROZEN" as Commodity,

    // Step 2
    originCity: "",
    originPortId: "",
    originCountry: "",
    originContact: "",

    destCity: "",
    destPortId: "",
    destCountry: "",
    destContact: "",

    // Step 3
    containerTypeId: "",
    temperatureId: "",
    items: [{ productId: "", quantity: 1, unit: "Cartons", weightKg: undefined, packaging: "" }] as ShipmentItemDraft[],

    // Step 4
    status: "BOOKED" as ShipmentStatus,
    etd: "",
    eta: "",
    slaStatus: "ON_TIME" as SLAStatus,

    currency: "INR",
    revenue: "",
    cost: "",
    invoiceStatus: "DRAFT" as InvoiceStatus,
  });

  const modeIcon = useMemo(() => {
    if (formData.mode === "SEA") return Ship;
    if (formData.mode === "AIR") return Plane;
    return Truck;
  }, [formData.mode]);

  const filteredContainerTypes = useMemo(() => {
    const m = formData.mode;
    return containerTypes.filter((c) => c.transportMode === m);
  }, [containerTypes, formData.mode]);

  // ✅ auto-set currency from selected customer (if customers api returns currency)
  useEffect(() => {
    if (!formData.customerId) return;
    const c = customers.find((x) => x.id === formData.customerId);
    if (c?.currency && c.currency !== formData.currency) {
      setFormData((prev) => ({ ...prev, currency: c.currency! }));
    }
  }, [formData.customerId, customers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setPendingDocs([]);
    setDocDraft({ name: "", type: "BILL_LADING", status: "DRAFT", expiryDate: "", file: null });

    (async () => {
      setLoadingMaster(true);
      try {
        const fetchJson = async <T,>(url: string): Promise<T> => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
          return res.json();
        };

        const [c, p, i, ct, t, pr, cur] = await Promise.all([
          fetchJson<CustomerRow[]>("/api/customers"),
          fetchJson<PortRow[]>("/api/master-data/ports"),
          fetchJson<IncotermRow[]>("/api/master-data/incoterms"),
          fetchJson<ContainerTypeRow[]>("/api/master-data/containers"),
          fetchJson<TemperatureRow[]>("/api/master-data/temp-presets"),
          fetchJson<ProductRow[]>("/api/products"),
          // ✅ currency master
          fetchJson<CurrencyRow[]>("/api/master-data/currencies"),
        ]);

        setCustomers(c);
        setPorts(p);
        setIncoterms(i);
        setContainerTypes(ct);
        setTemperatures(t);
        setProducts(pr);
        setCurrencies(cur);

        // ✅ if customer has currency, auto-set once customer selected later; keep INR for now
      } catch (e: any) {
        alert(e?.message || "Failed to load master data");
      } finally {
        setLoadingMaster(false);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => setStep((prev) => (Math.min(prev + 1, 4) as Step));
  const handleBack = () => setStep((prev) => (Math.max(prev - 1, 1) as Step));

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, unit: "Cartons", packaging: "" }],
    }));
  };

  const updateItemRow = (idx: number, patch: Partial<ShipmentItemDraft>) => {
    setFormData((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, items: next };
    });
  };

  const removeItemRow = (idx: number) => {
    setFormData((prev) => {
      const next = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items: next.length ? next : [{ productId: "", quantity: 1, unit: "Cartons", packaging: "" }] };
    });
  };

  // ✅ Step 3: queue document (no upload now)
  const addDocumentToQueue = () => {
    if (!docDraft.file) return alert("Please select a file (pdf/png/jpg).");

    const finalName = (docDraft.name || docDraft.file.name || "Document").trim();

    setPendingDocs((prev) => [
      ...prev,
      {
        name: finalName,
        type: docDraft.type,
        status: docDraft.status,
        expiryDate: docDraft.expiryDate || undefined,
        file: docDraft.file!,
      },
    ]);

    setDocDraft({ name: "", type: "BILL_LADING", status: "DRAFT", expiryDate: "", file: null });
  };

  const removePendingDoc = (index: number) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const createShipment = async () => {
    if (!formData.customerId) return alert("Customer is required.");
    if (!formData.direction || !formData.mode) return alert("Direction & Mode required.");

    if (!formData.originCity || !formData.originCountry) return alert("Origin City/Country required.");
    if (!formData.destCity || !formData.destCountry) return alert("Destination City/Country required.");

    setSaving(true);
    try {
      // ✅ no draftId, no id in payload
      const payload = {
        reference: formData.reference,
        masterDoc: formData.masterDoc,

        customerId: formData.customerId,
        direction: formData.direction,
        mode: formData.mode,
        incotermId: formData.incotermId || null,
        commodity: formData.commodity,

        origin: {
          city: formData.originCity,
          country: formData.originCountry,
          contact: formData.originContact,
          portId: formData.originPortId || null,
        },
        destination: {
          city: formData.destCity,
          country: formData.destCountry,
          contact: formData.destContact,
          portId: formData.destPortId || null,
        },

        containerTypeId: formData.containerTypeId || null,
        temperatureId: formData.temperatureId || null,

        items: formData.items
          .filter((it) => it.productId)
          .map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity || 0),
            unit: it.unit || "Unit",
            weightKg: it.weightKg != null ? Number(it.weightKg) : null,
            packaging: it.packaging || null,
          })),

        status: formData.status,
        etd: formData.etd || null,
        eta: formData.eta || null,
        slaStatus: formData.slaStatus,

        financials: {
          currency: formData.currency || "INR",
          revenue: formData.revenue ? Number(formData.revenue) : 0,
          cost: formData.cost ? Number(formData.cost) : 0,
          invoiceStatus: formData.invoiceStatus,
        },
      };

      // 1) create shipment (backend generates SHP-YYYY-001 and reference IMP-FZ-001)
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const created = await res.json(); // { id, reference }
      const shipmentId = created.id as string;

      // 2) upload queued docs AFTER shipment exists
      for (const doc of pendingDocs) {
        const fd = new FormData();
        fd.append("file", doc.file);
        fd.append("name", doc.name);
        fd.append("type", doc.type);
        fd.append("status", doc.status);
        if (doc.expiryDate) fd.append("expiryDate", doc.expiryDate);

        const up = await fetch(`/api/shipments/${shipmentId}/documents`, {
          method: "POST",
          body: fd,
        });

        if (!up.ok) throw new Error(await up.text());
      }

      onCreated?.();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Create shipment failed");
    } finally {
      setSaving(false);
    }
  };

  const ModeIcon = modeIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ModeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">New Shipment</h2>
              <p className="text-sm text-gray-500">Step {step} of 4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-6">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 transition-all duration-300"
              style={{ width: step === 1 ? "0%" : step === 2 ? "33%" : step === 3 ? "66%" : "100%" }}
            ></div>

            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= (n as Step) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {n}
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-gray-400">
            Shipment ID will be generated as: <span className="font-mono">SHP-YYYY-001</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 pt-2 flex-1">
          {loadingMaster && (
            <div className="p-4 rounded-lg bg-gray-50 text-gray-600 text-sm">Loading master data…</div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reference (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., IMP-FZ-001"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Master Doc (BL/AWB)</label>
                  <input
                    type="text"
                    placeholder="e.g., MAEU123456789"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.masterDoc}
                    onChange={(e) => setFormData({ ...formData, masterDoc: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer *</label>
                <select
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                >
                  <option value="" disabled>
                    Select customer
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerCode} — {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Direction</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(["EXPORT", "IMPORT"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFormData({ ...formData, direction: d })}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                          formData.direction === d ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {d === "EXPORT" ? "Export" : "Import"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(["SEA", "AIR", "ROAD"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData({ ...formData, mode: m })}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                          formData.mode === m ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {m === "SEA" && <Ship className="w-4 h-4" />}
                        {m === "AIR" && <Plane className="w-4 h-4" />}
                        {m === "ROAD" && <Truck className="w-4 h-4" />}
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Incoterm</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    value={formData.incotermId}
                    onChange={(e) => setFormData({ ...formData, incotermId: e.target.value })}
                  >
                    <option value="">Select incoterm</option>
                    {incoterms.map((i) => (
                      <option key={i.id} value={String(i.id)}>
                        {i.code} — {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Commodity</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, commodity: "FROZEN" })}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                        formData.commodity === "FROZEN" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Snowflake className="w-4 h-4" /> Frozen
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, commodity: "SPICE" })}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                        formData.commodity === "SPICE" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Leaf className="w-4 h-4" /> Spices
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, commodity: "BOTH" })}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                        formData.commodity === "BOTH" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Both
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, commodity: "OTHER" })}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                        formData.commodity === "OTHER" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Other
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Origin</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.originCity}
                      onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Port *</label>
                    <select
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.originPortId}
                      onChange={(e) => setFormData({ ...formData, originPortId: e.target.value })}
                    >
                      <option value="">Select port</option>
                      {ports.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.code} — {p.city}, {p.country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Country *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.originCountry}
                      onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.originContact}
                      onChange={(e) => setFormData({ ...formData, originContact: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Destination</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.destCity}
                      onChange={(e) => setFormData({ ...formData, destCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Port *</label>
                    <select
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.destPortId}
                      onChange={(e) => setFormData({ ...formData, destPortId: e.target.value })}
                    >
                      <option value="">Select port</option>
                      {ports.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.code} — {p.city}, {p.country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Country *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.destCountry}
                      onChange={(e) => setFormData({ ...formData, destCountry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.destContact}
                      onChange={(e) => setFormData({ ...formData, destContact: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Cargo + Container + Temperature</h3>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {/* Products */}
              <div className="space-y-3">
                {formData.items.map((it, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Product</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={it.productId}
                          onChange={(e) => updateItemRow(idx, { productId: e.target.value })}
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={it.quantity}
                          onChange={(e) => updateItemRow(idx, { quantity: Number(e.target.value || 0) })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={it.unit}
                          onChange={(e) => updateItemRow(idx, { unit: e.target.value })}
                        />
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Weight (kg)</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={it.weightKg ?? ""}
                            onChange={(e) => updateItemRow(idx, { weightKg: e.target.value ? Number(e.target.value) : undefined })}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
                          title="Remove product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Packaging</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={it.packaging || ""}
                        onChange={(e) => updateItemRow(idx, { packaging: e.target.value })}
                        placeholder="e.g., Master Carton"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Container + Temperature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Container Type</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.containerTypeId}
                    onChange={(e) => setFormData({ ...formData, containerTypeId: e.target.value })}
                  >
                    <option value="">Select container</option>
                    {filteredContainerTypes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Filtered by Mode: {formData.mode}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Temperature</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.temperatureId}
                    onChange={(e) => setFormData({ ...formData, temperatureId: e.target.value })}
                  >
                    <option value="">Select temperature</option>
                    {temperatures.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name} — {t.range}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Documents (QUEUE) */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                  Documents (Added now, uploaded after Create)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Document Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={docDraft.name}
                      onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })}
                      placeholder="e.g., Bill of Lading"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={docDraft.type}
                      onChange={(e) => setDocDraft({ ...docDraft, type: e.target.value as DocType })}
                    >
                      <option value="BILL_LADING">Bill of Lading</option>
                      <option value="INVOICE">Commercial Invoice</option>
                      <option value="PACKING_LIST">Packing List</option>
                      <option value="HEALTH_CERT">Health Certificate</option>
                      <option value="ORIGIN_CERT">Certificate of Origin</option>
                      <option value="CUSTOMS_DEC">Customs Declaration</option>
                      <option value="INSURANCE">Insurance Certificate</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={docDraft.status}
                      onChange={(e) => setDocDraft({ ...docDraft, status: e.target.value as DocStatus })}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="FINAL">Final</option>
                      <option value="NOT_RECEIVED">Not Received</option>
                      <option value="MISSING">Missing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={docDraft.expiryDate}
                      onChange={(e) => setDocDraft({ ...docDraft, expiryDate: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">File (pdf/png/jpg)</label>
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      className="w-full"
                      onChange={(e) => setDocDraft({ ...docDraft, file: e.target.files?.[0] || null })}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={addDocumentToQueue}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Add Document
                  </button>
                </div>

                {/* Pending docs list */}
                <div className="mt-5 space-y-3">
                  {pendingDocs.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">No documents added yet.</div>
                  ) : (
                    pendingDocs.map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{d.name}</div>
                          <div className="text-xs text-gray-500">
                            {d.type} • {d.status} {d.expiryDate ? `• Exp: ${d.expiryDate}` : ""} • {d.file.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingDoc(idx)}
                          className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Status + Dates + SLA + Financials</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ShipmentStatus })}
                  >
                    {[
                      "BOOKED",
                      "PICKED_UP",
                      "IN_TRANSIT_ORIGIN",
                      "AT_PORT_ORIGIN",
                      "CUSTOMS_EXPORT",
                      "ON_VESSEL",
                      "AT_PORT_DEST",
                      "CUSTOMS_IMPORT",
                      "DELIVERED",
                      "EXCEPTION",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ETD</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.etd}
                    onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ETA</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.eta}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SLA</label>
                  <select
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.slaStatus}
                    onChange={(e) => setFormData({ ...formData, slaStatus: e.target.value as SLAStatus })}
                  >
                    <option value="ON_TIME">On Time</option>
                    <option value="AT_RISK">At Risk</option>
                    <option value="BREACHED">Breached</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                  <select
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    {currencies.length === 0 ? (
                      <option value="INR">INR</option>
                    ) : (
                      currencies.map((c) => (
                        <option key={c.id} value={c.currencyCode}>
                          {c.currencyCode} — {c.name}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Fetched from backend master-data.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Revenue</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.revenue}
                    onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cost</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Status</label>
                  <select
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.invoiceStatus}
                    onChange={(e) => setFormData({ ...formData, invoiceStatus: e.target.value as InvoiceStatus })}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1">Preview</div>
                <div>
                  Margin (auto):{" "}
                  <span className="font-mono">{(Number(formData.revenue || 0) - Number(formData.cost || 0)).toFixed(0)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">Documents to upload after create: {pendingDocs.length}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={createShipment}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Shipment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
