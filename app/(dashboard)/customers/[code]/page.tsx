"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Building,
  CreditCard,
  Pencil,
  Trash2,
  ArrowRight,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Customer } from "@/types";
import { EditCustomerModal } from "@/components/EditCustomerModal";

type CustomerShipmentRow = {
  id: string;
  reference: string;
  mode: string;
  status: string;
  etd?: string;
  origin: { code: string };
  destination: { code: string };
  financials: { currency: string; revenue: number };
};

type CustomerWithShipments = Customer & {
  shipments?: CustomerShipmentRow[];
};

const CustomerDetail = () => {
  const { code } = useParams<{ code: string }>(); // e.g. "CUST-001"
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatCustomerType = (type: Customer["type"]) => {
    switch (type) {
      case "RetailChain":
        return "Retail Chain";
      case "RestaurantGroup":
        return "Restaurant Group";
      default:
        return type;
    }
  };

  const statusClass = (status: Customer["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "INACTIVE":
        return "bg-gray-50 text-gray-600 border-gray-200";
      case "SUSPENDED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  // ✅ fetch customer + shipments from DB
  const {
    data: customer,
    isLoading,
    isError,
    error,
  } = useQuery<CustomerWithShipments, Error>({
    queryKey: ["customer", code],
    enabled: !!code,
    queryFn: async () => {
      const res = await fetch(`/api/customers/${code}`, { cache: "no-store" });
      if (!res.ok) {
        let message = `Failed to fetch customer (${res.status})`;
        try {
          const json = await res.json();
          if (json?.message) message = json.message;
        } catch {}
        throw new Error(message);
      }
      return (await res.json()) as CustomerWithShipments;
    },
  });

  const customerShipments = customer?.shipments || [];

  // ✅ delete customer
  const deleteMutation = useMutation({
    mutationFn: async (customerCode: string) => {
      const res = await fetch(`/api/customers/${customerCode}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to delete customer");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.removeQueries({ queryKey: ["customer", code] });
      router.push("/customers");
    },
    onError: (err: any) => {
      console.error(err);
      alert(err?.message || "Failed to delete customer.");
    },
  });

  const handleDelete = async () => {
    if (!customer) return;
    const ok = confirm(`Are you sure you want to delete ${customer.companyName}?`);
    if (!ok) return;
    deleteMutation.mutate(customer.customerCode);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading customer...</div>;
  }

  if (isError || !customer) {
    console.error(error);
    return <div className="p-8 text-center text-gray-500">Customer not found</div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/customers"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Customers
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>

              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-200">
                {formatCustomerType(customer.type)}
              </span>

              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${statusClass(customer.status)}`}>
                {customer.status}
              </span>

              <span className="text-xs text-gray-500">Code: {customer.customerCode}</span>
            </div>

            <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-4">
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1" />{" "}
                {customer.city ? `${customer.city}, ` : ""}
                {customer.country}
              </span>

              <span className="flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1" /> {customer.email}
              </span>

              {customer.phone && (
                <span className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1" /> {customer.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-4 py-2 border border-gray-300 bg-white rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Profile
            </button>

            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 border border-red-200 bg-red-50 rounded-md text-sm font-medium hover:bg-red-100 text-red-700 flex items-center disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Financials
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Currency</span>
                  <span className="font-mono font-medium">{customer.currency}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Credit Limit</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(customer.creditLimit || 0, customer.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Used Credit</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(customer.usedCredits || 0, customer.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Total Amount</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(customer.totalAmount || 0, customer.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 text-sm">Payment Terms</span>
                  <span className="font-medium bg-gray-100 px-2 py-1 rounded text-xs">
                    {customer.paymentTerms || "—"}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Building className="w-4 h-4" /> Company Info
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Main Contact</div>
                  <div className="font-medium">{customer.contactPerson || "—"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Billing Address</div>
                  <div className="text-sm text-gray-600">
                    {customer.address ? (
                      <>
                        {customer.address}
                        <br />
                        {customer.city && `${customer.city}, `}
                        {customer.country}
                      </>
                    ) : (
                      <>
                        {customer.city && `${customer.city}, `}
                        {customer.country}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Compliance Status</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                        customer.kycStatus
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      KYC {customer.kycStatus ? "Verified" : "Pending"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                        customer.sanctionsCheck
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Sanctions {customer.sanctionsCheck ? "Cleared" : "Not Checked"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900">Shipment History</h3>
                <Link href="/shipments" className="text-sm text-blue-600 hover:underline">
                  View All
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {customerShipments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No shipment history found for this customer.
                        </td>
                      </tr>
                    )}

                    {customerShipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        className="hover:bg-gray-50 group cursor-pointer"
                        onClick={() => router.push(`/shipments/${shipment.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-blue-600 group-hover:underline">
                          {shipment.reference}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {shipment.origin.code} <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                          {shipment.destination.code}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs uppercase">{shipment.mode}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{shipment.etd || "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={shipment.status as any} />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {shipment.financials.currency} {shipment.financials.revenue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditCustomerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        customer={customer as any}
        onUpdated={(updated) => {
          // API now returns shipments too (because PUT re-fetches), but keep safe merge:
          queryClient.setQueryData(["customer", code], (prev: any) => ({ ...(prev || {}), ...updated }));
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          setIsEditOpen(false);
        }}
      />
    </>
  );
};

export default CustomerDetail;
