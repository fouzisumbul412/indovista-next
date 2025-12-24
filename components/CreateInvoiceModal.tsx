// components/CreateInvoiceModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, FileText, Plus, Trash2 } from "lucide-react";
import { Invoice, InvoiceLineItem } from "@/types";
import { openInvoicePdfInNewTab } from "@/types/invoiceUtils";
import { addDays, makeIndoInvoiceNumber } from "@/lib/invoice";

type ShipmentOption = {
  id: string;
  reference: string;
  customerName: string;
  amount: number;
  currency: string;
};

type InvoiceDetail = {
  shipmentId: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  placeOfSupply: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  tdsRate: number;
  status: string;
  items: InvoiceLineItem[];
  subtotal: number;
  totalTax: number;
  tdsAmount: number;
  amount: number;
};

interface CreateInvoiceModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  shipmentId?: string | null; // for edit
  shipments: ShipmentOption[];
  onClose: () => void;
  onSaved: () => void; // refetch billing list after save
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  mode,
  shipmentId,
  shipments,
  onClose,
  onSaved,
}) => {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const selectedShipment = useMemo(
    () => shipments.find((s) => s.id === selectedShipmentId) || null,
    [shipments, selectedShipmentId]
  );

  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerGstin: "",
    placeOfSupply: "",
    shipmentRef: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    currency: "INR",
    tdsRate: 0,
    status: "DRAFT",
  });

  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: "1",
      description: "",
      hsnCode: "",
      quantity: 1,
      rate: 0,
      taxRate: 18,
      amount: 0,
      taxableValue: 0,
    },
  ]);

  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState<string>("");

  const FORM_ID = "create-invoice-form";

  // Assume Company's State is Maharashtra for Demo
  const COMPANY_STATE = "Maharashtra";
  const isInterState =
    formData.placeOfSupply &&
    formData.placeOfSupply.toLowerCase() !== COMPANY_STATE.toLowerCase();

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerGstin: "",
      placeOfSupply: "",
      shipmentRef: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      currency: "INR",
      tdsRate: 0,
      status: "DRAFT",
    });
    setItems([
      {
        id: "1",
        description: "",
        hsnCode: "",
        quantity: 1,
        rate: 0,
        taxRate: 18,
        amount: 0,
        taxableValue: 0,
      },
    ]);
    setInvoiceNumberPreview("");
    setSelectedShipmentId("");
  };

  // When modal opens: set shipment based on mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && shipmentId) {
      setSelectedShipmentId(shipmentId);
      return;
    }

    // create mode: default to first shipment in list
    if (mode === "create" && shipments.length > 0) {
      setSelectedShipmentId(shipments[0].id);
    }
  }, [isOpen, mode, shipmentId, shipments]);

  // Prefill from shipment when selected shipment changes (create mode)
  useEffect(() => {
    if (!isOpen) return;
    if (!selectedShipment) return;

    const issue = new Date(formData.issueDate);
    const dueDefault = formData.dueDate
      ? formData.dueDate
      : addDays(issue, 30).toISOString().slice(0, 10);

    const nextInvoiceNo = makeIndoInvoiceNumber(issue, selectedShipment.reference || selectedShipment.id);

    setFormData((prev) => ({
      ...prev,
      customerName: selectedShipment.customerName || prev.customerName,
      shipmentRef: selectedShipment.reference || "",
      currency: selectedShipment.currency || prev.currency,
      dueDate: dueDefault,
    }));

    // default line item for create mode (only if user hasn't started editing)
    if (mode === "create") {
      const defaultRate = Number(selectedShipment.amount || 0);
      const taxable = 1 * defaultRate;
      const gstAmount = taxable * (18 / 100);

      setItems([
        {
          id: "1",
          description: `Freight charges for shipment ${selectedShipment.reference || ""}`,
          hsnCode: "",
          quantity: 1,
          rate: defaultRate,
          taxRate: 18,
          taxableValue: taxable,
          amount: taxable + gstAmount,
        },
      ]);
    }

    setInvoiceNumberPreview(nextInvoiceNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShipmentId, isOpen]);

  // Load invoice for edit mode
  useEffect(() => {
    const run = async () => {
      if (!isOpen) return;
      if (mode !== "edit") return;
      if (!shipmentId) return;

      setLoadingInvoice(true);
      try {
        const res = await fetch(`/api/invoices/${shipmentId}`, { cache: "no-store" });
        const data: InvoiceDetail | null = await res.json();

        if (data) {
          setFormData({
            customerName: data.customerName || "",
            customerGstin: data.customerGstin || "",
            placeOfSupply: data.placeOfSupply || "",
            shipmentRef: shipments.find((s) => s.id === shipmentId)?.reference || "",
            issueDate: data.issueDate,
            dueDate: data.dueDate,
            currency: data.currency || "INR",
            tdsRate: Number(data.tdsRate || 0),
            status: data.status || "DRAFT",
          });
          setItems(Array.isArray(data.items) && data.items.length ? data.items : []);
          setInvoiceNumberPreview(data.invoiceNumber || "");
        }
      } finally {
        setLoadingInvoice(false);
      }
    };

    run();
  }, [isOpen, mode, shipmentId, shipments]);

  // Update invoice no preview when issue date changes
  useEffect(() => {
    if (!isOpen) return;
    if (!selectedShipment) return;

    const issue = new Date(formData.issueDate);
    const nextInvoiceNo = makeIndoInvoiceNumber(issue, selectedShipment.reference || selectedShipment.id);
    setInvoiceNumberPreview(nextInvoiceNo);

    // if dueDate empty, auto set +30
    if (!formData.dueDate) {
      setFormData((prev) => ({
        ...prev,
        dueDate: addDays(issue, 30).toISOString().slice(0, 10),
      }));
    }
  }, [formData.issueDate, isOpen, selectedShipment]); // keep minimal

  const updateItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Recalculate amounts
          if (field === "quantity" || field === "rate" || field === "taxRate") {
            const qty = field === "quantity" ? Number(value) : Number(item.quantity);
            const rate = field === "rate" ? Number(value) : Number(item.rate);
            const tax = field === "taxRate" ? Number(value) : Number(item.taxRate);

            const taxable = qty * rate;
            const gstAmount = taxable * (tax / 100);

            updated.taxableValue = taxable;
            updated.amount = taxable + gstAmount;
          }

          return updated;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "",
        hsnCode: "",
        quantity: 1,
        rate: 0,
        taxRate: 18,
        amount: 0,
        taxableValue: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.taxableValue || 0), 0);
    const totalTax = items.reduce((sum, item) => sum + (item.amount - (item.taxableValue || 0)), 0);
    const totalAmount = subtotal + totalTax;
    const tdsAmount = subtotal * (formData.tdsRate / 100);
    const payable = totalAmount - tdsAmount;

    return { subtotal, totalTax, totalAmount, tdsAmount, payable };
  };

  const totals = calculateTotals();

  const buildInvoiceForPdf = (): Invoice => {
    const inv: Invoice = {
      id: invoiceNumberPreview || "INVOICE",
      invoiceNumber: invoiceNumberPreview || "INVOICE",
      customerName: formData.customerName,
      customerGstin: formData.customerGstin,
      placeOfSupply: formData.placeOfSupply,
      shipmentRef: formData.shipmentRef,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      subtotal: totals.subtotal,
      totalTax: totals.totalTax,
      tdsRate: formData.tdsRate,
      tdsAmount: totals.tdsAmount,
      amount: totals.payable,
      currency: formData.currency,
      status: formData.status as any,
      items: items,
    };
    return inv;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sid = mode === "edit" ? shipmentId : selectedShipmentId;
    if (!sid) return;

    const payload = {
      customerName: formData.customerName,
      customerGstin: formData.customerGstin,
      placeOfSupply: formData.placeOfSupply,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      currency: formData.currency,
      tdsRate: formData.tdsRate,
      status: formData.status,
      items,
    };

    const res = await fetch(`/api/invoices/${sid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.message || "Failed to save invoice");
      return;
    }

    // open PDF
    openInvoicePdfInNewTab(buildInvoiceForPdf());

    onSaved();
    onClose();
    resetForm();
  };

  const closeAndReset = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  const invoiceTitle = mode === "edit" ? "Edit Tax Invoice" : "New Tax Invoice";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{invoiceTitle}</h2>
              <p className="text-sm text-gray-500">
                Invoice No:{" "}
                <span className="font-mono font-semibold text-gray-800">
                  {invoiceNumberPreview || "—"}
                </span>
              </p>
            </div>
          </div>
          <button onClick={closeAndReset} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form id={FORM_ID} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          {/* Section 0: Shipment Selection (Create mode only) */}
          {mode === "create" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Select Shipment
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipment</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                  >
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.reference} — {s.customerName} — {s.currency} {Number(s.amount || 0).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-2">Auto-filled from Shipment</div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer</span>
                    <span className="font-semibold text-gray-900">{selectedShipment?.customerName || "—"}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold text-gray-900">
                      {selectedShipment
                        ? `${selectedShipment.currency} ${Number(selectedShipment.amount || 0).toLocaleString("en-IN")}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Customer & Logistics Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Customer & Shipment Details
            </h3>

            {loadingInvoice ? (
              <div className="text-gray-500">Loading invoice details…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer GSTIN</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono uppercase"
                    value={formData.customerGstin}
                    onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value })}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Place of Supply</label>
                  <input
                    type="text"
                    list="states"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={formData.placeOfSupply}
                    onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                    placeholder="State Name"
                  />
                  <datalist id="states">
                    <option value="Maharashtra" />
                    <option value="Karnataka" />
                    <option value="Delhi" />
                    <option value="Tamil Nadu" />
                    <option value="Gujarat" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipment Ref</label>
                  <input
                    disabled
                    type="text"
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700"
                    value={formData.shipmentRef}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Issue Date (Invoice Date)
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SENT">SENT</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
                  <input
                    disabled
                    type="text"
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700"
                    value={formData.currency}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Line Items */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Services & Products
            </h3>

            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 font-bold border-b text-xs uppercase">
                  <tr>
                    <th className="px-3 py-3 w-[25%]">Description</th>
                    <th className="px-3 py-3 w-[10%]">HSN/SAC</th>
                    <th className="px-3 py-3 w-[8%] text-center">Qty</th>
                    <th className="px-3 py-3 w-[12%] text-right">Rate</th>
                    <th className="px-3 py-3 w-[12%] text-right">Taxable</th>
                    <th className="px-3 py-3 w-[10%] text-center">GST %</th>
                    <th className="px-3 py-3 w-[15%] text-right">Total</th>
                    <th className="px-3 py-3 w-[8%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="group hover:bg-blue-50/50 transition-colors">
                      <td className="p-2">
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-transparent group-hover:border-gray-300 rounded bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-transparent group-hover:border-gray-300 rounded bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs transition-all"
                          placeholder="9967"
                          value={item.hsnCode}
                          onChange={(e) => updateItem(item.id, "hsnCode", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          className="w-full px-2 py-1.5 border border-transparent group-hover:border-gray-300 rounded bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-center transition-all"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          className="w-full px-2 py-1.5 border border-transparent group-hover:border-gray-300 rounded bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right transition-all"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-gray-700">
                        {(item.taxableValue || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2">
                        <select
                          className="w-full px-1 py-1.5 border border-transparent group-hover:border-gray-300 rounded bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-center text-xs font-semibold"
                          value={item.taxRate}
                          onChange={(e) => updateItem(item.id, "taxRate", Number(e.target.value))}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900 font-mono">
                        {Number(item.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="flex items-center text-sm text-blue-600 font-semibold hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Service Line
            </button>
          </div>

          {/* Section 3: Summary & TDS */}
          <div className="flex flex-col md:flex-row gap-6 justify-end">
            {/* TDS Configuration */}
            <div className="w-full md:w-64 bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-fit">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">TDS Deduction</h4>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-700">TDS Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  className="w-16 px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.tdsRate}
                  onChange={(e) => setFormData({ ...formData, tdsRate: Number(e.target.value) })}
                />
              </div>
              <div className="text-xs text-gray-500 italic">TDS is calculated on the taxable subtotal.</div>
            </div>

            {/* Final Calculations */}
            <div className="w-full md:w-96 bg-gray-900 text-white p-6 rounded-xl shadow-lg">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal (Taxable)</span>
                  <span className="font-mono">
                    ₹{totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* GST Breakdown */}
                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>CGST (Output)</span>
                      <span className="font-mono">
                        + ₹{(totals.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>SGST (Output)</span>
                      <span className="font-mono">
                        + ₹{(totals.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-gray-400">
                    <span>IGST (Output)</span>
                    <span className="font-mono">
                      + ₹{totals.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-700 my-2 pt-2 flex justify-between font-bold text-lg">
                  <span>Invoice Total</span>
                  <span className="font-mono">
                    ₹{totals.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {formData.tdsRate > 0 && (
                  <div className="flex justify-between text-orange-300 text-xs font-medium">
                    <span>Less: TDS @ {formData.tdsRate}%</span>
                    <span className="font-mono">
                      - ₹{totals.tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-3 mt-1">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-400">Net Payable</span>
                    <span className="text-2xl font-bold text-green-400 font-mono">
                      ₹{totals.payable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={closeAndReset}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95"
          >
            {mode === "edit" ? "Save & Generate PDF" : "Generate Invoice (PDF)"}
          </button>
        </div>
      </div>
    </div>
  );
};
