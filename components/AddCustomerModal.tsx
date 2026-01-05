"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Users } from "lucide-react";
import { CustomerStatus, CustomerType } from "@/types";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void; // callback to refresh list
}

const emptyForm = () => ({
  companyName: "",
  type: "Distributor" as CustomerType,
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  currency: "INR",
  creditLimit: "",
  paymentTerms: "Net 30",
  status: "ACTIVE" as CustomerStatus,
  kycStatus: false,
  sanctionsCheck: false,
});

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const normalizePhone = (phone: string) => String(phone || "").replace(/\D/g, ""); // keep digits only

const isValidPhone = (phone: string) => {
  const p = normalizePhone(phone);
  return /^\d{7,15}$/.test(p);
};


const AddCustomerModalInner: React.FC<AddCustomerModalProps> = ({ onClose, onAdd }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(emptyForm());

  const trimmed = useMemo(() => {
    // only for validation/submission (not mutating state on every keypress)
    return {
      ...formData,
      companyName: formData.companyName.trim(),
      contactPerson: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      creditLimit: formData.creditLimit,
      paymentTerms: formData.paymentTerms.trim(),
    };
  }, [formData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...trimmed,
        creditLimit: Number(trimmed.creditLimit || 0),
        phone: normalizePhone(trimmed.phone),
        email: trimmed.email,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to create customer");
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onAdd();
      onClose();
      toast.success("Customer created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create customer");
    },
  });

  const validate = () => {
    if (!trimmed.companyName) {
      toast.error("Company Name is required");
      return false;
    }
    if (!trimmed.country) {
      toast.error("Country is required");
      return false;
    }
    // ✅ contact no mandatory
   if (!trimmed.phone) {
  toast.error("Contact number is mandatory");
  return false;
}
if (!isValidPhone(trimmed.phone)) {
  toast.error("Contact number must be 7 to 15 digits (numbers only)");
  return false;
}

    if (!trimmed.email) {
      toast.error("Email is required");
      return false;
    }
    if (!isValidEmail(trimmed.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    const cl = Number(trimmed.creditLimit || 0);
    if (Number.isNaN(cl) || cl < 0) {
      toast.error("Credit Limit must be a valid number (0 or more)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await toast.promise(createMutation.mutateAsync(), {
      loading: "Creating customer…",
      success: "Customer created",
      error: (e) => e?.message ?? "Failed to create customer",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Customer</h2>
              <p className="text-sm text-gray-500">Create a new partner profile</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          {/* Type + Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
              <select
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as CustomerType })
                }
              >
                <option value="Distributor">Distributor</option>
                <option value="Importer">Importer</option>
                <option value="RetailChain">Retail Chain</option>
                <option value="RestaurantGroup">Restaurant Group</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone / Contact No *
              </label>
              <input
  required
  inputMode="numeric"
  pattern="\d{7,15}"
  maxLength={15}
  type="text"
  placeholder="Enter 7 to 15 digits"
  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
  value={formData.phone}
  onChange={(e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, phone: digitsOnly });
  }}
  onBlur={() => {
    if (formData.phone && !isValidPhone(formData.phone)) {
      toast.error("Contact number must be 7 to 15 digits (numbers only)");
    }
  }}
/>

            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
              <input
                required
                type="email"
                placeholder="name@company.com"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => {
                  if (formData.email && !isValidEmail(formData.email)) {
                    toast.error("Please enter a valid email address");
                  }
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* City + Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Country *
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          {/* Currency + Credit Limit + Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
              <select
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Credit Limit</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Terms</label>
              <select
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
          </div>

          {/* KYC + Sanctions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.kycStatus}
                onChange={(e) => setFormData({ ...formData, kycStatus: e.target.checked })}
                className="rounded border-gray-300"
              />
              KYC Verified
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.sanctionsCheck}
                onChange={(e) => setFormData({ ...formData, sanctionsCheck: e.target.checked })}
                className="rounded border-gray-300"
              />
              Sanctions Check Done
            </label>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as CustomerStatus })
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddCustomerModal: React.FC<AddCustomerModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <AddCustomerModalInner {...props} />;
};
