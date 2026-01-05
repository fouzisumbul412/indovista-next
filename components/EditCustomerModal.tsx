"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Users } from "lucide-react";
import { Customer, CustomerStatus, CustomerType } from "@/types";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onUpdated: (customer: Customer) => void;
}

interface FormState {
  companyName: string;
  type: CustomerType;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  creditLimit: string;
  usedCredits: string;
  totalAmount: string;
  paymentTerms: string;
  status: CustomerStatus;
  kycStatus: boolean;
  sanctionsCheck: boolean;
}

const toFormState = (customer: Customer): FormState => ({
  companyName: customer.companyName ?? "",
  type: customer.type,
  contactPerson: customer.contactPerson ?? "",
  phone: customer.phone ?? "",
  email: customer.email ?? "",
  address: customer.address ?? "",
  city: customer.city ?? "",
  country: customer.country ?? "",
  currency: customer.currency ?? "INR",
  creditLimit: (customer.creditLimit ?? 0).toString(),
  usedCredits: (customer.usedCredits ?? 0).toString(),
  totalAmount: (customer.totalAmount ?? 0).toString(),
  paymentTerms: customer.paymentTerms ?? "",
  status: customer.status,
  kycStatus: customer.kycStatus,
  sanctionsCheck: customer.sanctionsCheck,
});

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const normalizePhone = (phone: string) => String(phone || "").replace(/\D/g, ""); // keep digits only

const isValidPhone = (phone: string) => {
  const p = normalizePhone(phone);
  return /^\d{7,15}$/.test(p);
};

const EditCustomerModalInner: React.FC<EditCustomerModalProps> = ({
  onClose,
  customer,
  onUpdated,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormState>(() => toFormState(customer!));

  const trimmed = useMemo(() => {
    return {
      ...formData,
      companyName: formData.companyName.trim(),
      contactPerson: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      paymentTerms: formData.paymentTerms.trim(),
    };
  }, [formData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...trimmed,
        creditLimit: Number(trimmed.creditLimit || 0),
        usedCredits: Number(trimmed.usedCredits || 0),
        totalAmount: Number(trimmed.totalAmount || 0),
        phone: normalizePhone(trimmed.phone),
        email: trimmed.email,
      };

      const res = await fetch(`/api/customers/${customer!.customerCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to update customer");
      }

      return (await res.json()) as Customer;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", customer!.customerCode] });
      onUpdated(updated);
      toast.success("Customer updated successfully");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update customer");
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

    const nums = [
      { label: "Credit Limit", value: trimmed.creditLimit },
      { label: "Used Credits", value: trimmed.usedCredits },
      { label: "Total Amount", value: trimmed.totalAmount },
    ];

    for (const n of nums) {
      const v = Number(n.value || 0);
      if (Number.isNaN(v) || v < 0) {
        toast.error(`${n.label} must be a valid number (0 or more)`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await toast.promise(updateMutation.mutateAsync(), {
      loading: "Saving changes…",
      success: "Customer updated",
      error: (e) => e?.message ?? "Failed to update customer",
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
              <h2 className="text-xl font-bold text-gray-900">Edit Customer</h2>
              <p className="text-sm text-gray-500">Update partner profile details</p>
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
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomerType })}
              >
                <option value="Distributor">Distributor</option>
                <option value="Importer">Importer</option>
                <option value="RetailChain">Retail Chain</option>
                <option value="RestaurantGroup">Restaurant Group</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Person Name
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
                <option value="">None</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
          </div>

          {/* Used Credits + Total Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Used Credits</label>
              <input
                type="number"
                min={0}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.usedCredits}
                onChange={(e) => setFormData({ ...formData, usedCredits: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Total Amount</label>
              <input
                type="number"
                min={0}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
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
                onChange={(e) =>
                  setFormData({ ...formData, sanctionsCheck: e.target.checked })
                }
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
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditCustomerModal: React.FC<EditCustomerModalProps> = (props) => {
  if (!props.isOpen || !props.customer) return null;
  return <EditCustomerModalInner key={props.customer.customerCode} {...props} />;
};
