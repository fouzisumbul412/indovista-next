"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { Shipment } from "../types";

type PortRow = { id: number; code: string; city: string; country: string };
type IncotermRow = { id: number; code: string; name: string };
type ContainerTypeRow = { id: number; code: string; name: string; transportMode: string };
type TemperatureRow = { id: number; name: string; range: string; tolerance: string };

type CustomerRow = { id: string; customerCode: string; companyName: string; country: string; currency?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
  onSaved: () => void;
};

export const ShipmentEditModal: React.FC<Props> = ({ isOpen, onClose, shipment, onSaved }) => {
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [ports, setPorts] = useState<PortRow[]>([]);
  const [incoterms, setIncoterms] = useState<IncotermRow[]>([]);
  const [containers, setContainers] = useState<ContainerTypeRow[]>([]);
  const [temps, setTemps] = useState<TemperatureRow[]>([]);

  const [draft, setDraft] = useState({
    masterDoc: shipment.masterDoc || "",
    customerId: "",

    direction: shipment.direction,
    mode: shipment.mode,
    commodity: shipment.commodity,
 
    incotermId: shipment.incoterm?.id ? String(shipment.incoterm.id) : "",
    containerTypeId: shipment.containerType?.id ? String(shipment.containerType.id) : "",
    temperatureId: shipment.temperature?.id ? String(shipment.temperature.id) : "",

    originCity: shipment.origin.city || "",
    originCountry: shipment.origin.country || "",
    originContact: shipment.origin.contact || "",
    originPortId: shipment.origin.portId ? String(shipment.origin.portId) : "",

    destCity: shipment.destination.city || "",
    destCountry: shipment.destination.country || "",
    destContact: shipment.destination.contact || "",
    destPortId: shipment.destination.portId ? String(shipment.destination.portId) : "",

    etd: shipment.etd || "",
    eta: shipment.eta || "",
    slaStatus: shipment.slaStatus,
  });

  const filteredContainers = useMemo(
    () => containers.filter((c) => c.transportMode === draft.mode),
    [containers, draft.mode]
  );

  useEffect(() => {
    if (!isOpen) return;

    // reset on open (ensures latest)
    setDraft({
      masterDoc: shipment.masterDoc || "",
      customerId: "",

      direction: shipment.direction,
      mode: shipment.mode,
      commodity: shipment.commodity,

      incotermId: shipment.incoterm?.id ? String(shipment.incoterm.id) : "",
      containerTypeId: shipment.containerType?.id ? String(shipment.containerType.id) : "",
      temperatureId: shipment.temperature?.id ? String(shipment.temperature.id) : "",

      originCity: shipment.origin.city || "",
      originCountry: shipment.origin.country || "",
      originContact: shipment.origin.contact || "",
      originPortId: shipment.origin.portId ? String(shipment.origin.portId) : "",

      destCity: shipment.destination.city || "",
      destCountry: shipment.destination.country || "",
      destContact: shipment.destination.contact || "",
      destPortId: shipment.destination.portId ? String(shipment.destination.portId) : "",

      etd: shipment.etd || "",
      eta: shipment.eta || "",
      slaStatus: shipment.slaStatus,
    });

    (async () => {
      setLoadingMaster(true);
      try {
        const fetchJson = async <T,>(url: string): Promise<T> => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        };

        const [c, p, i, ct, t] = await Promise.all([
          fetchJson<CustomerRow[]>("/api/customers"),
          fetchJson<PortRow[]>("/api/master-data/ports"),
          fetchJson<IncotermRow[]>("/api/master-data/incoterms"),
          fetchJson<ContainerTypeRow[]>("/api/master-data/containers"),
          fetchJson<TemperatureRow[]>("/api/master-data/temp-presets"),
        ]);

        setCustomers(c);
        setPorts(p);
        setIncoterms(i);
        setContainers(ct);
        setTemps(t);

        // best effort set customerId if you want to edit customer later:
        // we don't have shipment.customerId in frontend response; if you want it, add it to GET.
      } catch (e: any) {
        alert(e?.message || "Failed to load master data");
      } finally {
        setLoadingMaster(false);
      }
    })();
  }, [isOpen, shipment]);

  if (!isOpen) return null;

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        masterDoc: draft.masterDoc,

        direction: draft.direction,
        mode: draft.mode,
        commodity: draft.commodity,

        incotermId: draft.incotermId || null,
        containerTypeId: draft.containerTypeId || null,
        temperatureId: draft.temperatureId || null,

        origin: {
          city: draft.originCity,
          country: draft.originCountry,
          contact: draft.originContact,
          portId: draft.originPortId || null,
        },
        destination: {
          city: draft.destCity,
          country: draft.destCountry,
          contact: draft.destContact,
          portId: draft.destPortId || null,
        },

        etd: draft.etd || null,
        eta: draft.eta || null,
        slaStatus: draft.slaStatus,
      };

      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      onSaved();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Shipment</h2>
            <p className="text-sm text-gray-500 mt-1">Update shipment details (mobile friendly).</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loadingMaster && (
          <div className="p-4 m-6 rounded-lg bg-gray-50 text-gray-600 text-sm">Loading master data...</div>
        )}

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Basic */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Basic</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Master Doc (BL/AWB)</label>
                <input
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.masterDoc}
                  onChange={(e) => setDraft((p) => ({ ...p, masterDoc: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Direction</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.direction}
                    onChange={(e) => setDraft((p) => ({ ...p, direction: e.target.value as any }))}
                  >
                    <option value="EXPORT">EXPORT</option>
                    <option value="IMPORT">IMPORT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.mode}
                    onChange={(e) => setDraft((p) => ({ ...p, mode: e.target.value as any }))}
                  >
                    <option value="SEA">SEA</option>
                    <option value="AIR">AIR</option>
                    <option value="ROAD">ROAD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Commodity</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.commodity}
                    onChange={(e) => setDraft((p) => ({ ...p, commodity: e.target.value as any }))}
                  >
                    <option value="FROZEN">FROZEN</option>
                    <option value="SPICE">SPICE</option>
                    <option value="BOTH">BOTH</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Ports + Addresses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Origin</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                  <input
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.originCity}
                    onChange={(e) => setDraft((p) => ({ ...p, originCity: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Country</label>
                  <input
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.originCountry}
                    onChange={(e) => setDraft((p) => ({ ...p, originCountry: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Port</label>
                  <select
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.originPortId}
                    onChange={(e) => setDraft((p) => ({ ...p, originPortId: e.target.value }))}
                  >
                    <option value="">Select port</option>
                    {ports.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.code} - {p.city}, {p.country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
                  <input
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.originContact}
                    onChange={(e) => setDraft((p) => ({ ...p, originContact: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Destination</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                  <input
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.destCity}
                    onChange={(e) => setDraft((p) => ({ ...p, destCity: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Country</label>
                  <input
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.destCountry}
                    onChange={(e) => setDraft((p) => ({ ...p, destCountry: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Port</label>
                  <select
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.destPortId}
                    onChange={(e) => setDraft((p) => ({ ...p, destPortId: e.target.value }))}
                  >
                    <option value="">Select port</option>
                    {ports.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.code} - {p.city}, {p.country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact</label>
                  <input
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draft.destContact}
                    onChange={(e) => setDraft((p) => ({ ...p, destContact: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Incoterm + Container + Temp + SLA */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Shipping Setup</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Incoterm</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.incotermId}
                  onChange={(e) => setDraft((p) => ({ ...p, incotermId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {incoterms.map((i) => (
                    <option key={i.id} value={String(i.id)}>
                      {i.code} - {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Container Type</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.containerTypeId}
                  onChange={(e) => setDraft((p) => ({ ...p, containerTypeId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {filteredContainers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-400 mt-1">Filtered by Mode: {draft.mode}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Temperature</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.temperatureId}
                  onChange={(e) => setDraft((p) => ({ ...p, temperatureId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {temps.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name} - {t.range}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">SLA</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.slaStatus}
                  onChange={(e) => setDraft((p) => ({ ...p, slaStatus: e.target.value as any }))}
                >
                  <option value="ON_TIME">ON_TIME</option>
                  <option value="AT_RISK">AT_RISK</option>
                  <option value="BREACHED">BREACHED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Dates</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ETD</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.etd}
                  onChange={(e) => setDraft((p) => ({ ...p, etd: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ETA</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={draft.eta}
                  onChange={(e) => setDraft((p) => ({ ...p, eta: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
