"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Search, Plus, CheckCircle, XCircle, Download } from "lucide-react";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { Customer } from "@/types";

const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await fetch("/api/customers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
};

const safeLower = (v: any) => String(v ?? "").toLowerCase();

const CustomerList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading,
    isError,
    error,
  } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  useEffect(() => {
    if (isError) {
      toast.error((error as any)?.message || "Failed to load customers");
    }
  }, [isError, error]);

  // called after modal creates a customer
  const handleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setIsModalOpen(false);
    toast.success("Customer created successfully");
  };

  const formatCurrency = (amount: any, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

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

  const filtered = useMemo(() => {
    const term = safeLower(searchTerm).trim();
    if (!term) return customers;

    return customers.filter((c: any) => {
      return (
        safeLower(c.companyName).includes(term) ||
        safeLower(c.country).includes(term) ||
        safeLower(c.customerCode).includes(term) ||
        safeLower(c.contactPerson).includes(term)
      );
    });
  }, [customers, searchTerm]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const inferFilename = (contentDisposition: string | null) => {
    if (!contentDisposition) return null;
    // tries: filename="xxx.xlsx" or filename=xxx.xlsx
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(contentDisposition);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  };

  const exportCustomers = async () => {
    if (isLoading) {
      toast.error("Please wait until customers are loaded");
      return;
    }
    if (!customers?.length) {
      toast.error("No customers to export");
      return;
    }

    await toast.promise(
      (async () => {
        const res = await fetch("/api/customers/export", { method: "GET" });
        if (!res.ok) {
          let msg = "Failed to export customers";
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {}
          throw new Error(msg);
        }

        const blob = await res.blob();
        const filename =
          inferFilename(res.headers.get("content-disposition")) ||
          `Customers_${new Date().toISOString().slice(0, 10)}.xlsx`;

        downloadBlob(blob, filename);
        return true;
      })(),
      {
        loading: "Preparing export…",
        success: "Export downloaded",
        error: (e) => e?.message ?? "Export failed",
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage importers, distributors, and retail partners</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Export */}
          <button
            onClick={exportCustomers}
            className="w-full sm:w-auto flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          {/* Add customer */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="relative w-full md:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, country, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Loading */}
        {isLoading && <div className="text-center text-gray-500 py-12">Loading customers...</div>}

        {/* Error (kept as UI + toast already fires once) */}
        {!isLoading && isError && (
          <div className="text-center text-red-600 py-12">
            {(error as any)?.message || "Failed to load customers"}
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((customer: any) => (
                <Link
                  href={`/customers/${customer.customerCode}`}
                  key={customer.customerCode}
                  className="block group"
                >
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer relative border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors truncate">
                          {customer.companyName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatCustomerType(customer.type)} • {customer.country}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Code: {customer.customerCode}</p>
                        {customer.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">Phone: {customer.phone}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 bg-blue-50 text-blue-600 uppercase">
                          {customer.currency}
                        </span>
                        <span
                          className={`mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusClass(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-baseline gap-3">
                        <span className="text-sm text-gray-500">Contact</span>
                        <span className="text-sm font-medium text-gray-900 text-right truncate">
                          {customer.contactPerson || "—"}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline gap-3">
                        <span className="text-sm text-gray-500">Credit Limit</span>
                        <span className="text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(customer.creditLimit || 0, customer.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline gap-3">
                        <span className="text-sm text-gray-500">Used Credits</span>
                        <span className="text-sm font-bold text-orange-600 text-right">
                          {formatCurrency(customer.usedCredits || 0, customer.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline gap-3">
                        <span className="text-sm text-gray-500">Total Amount</span>
                        <span className="text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(customer.totalAmount || 0, customer.currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline gap-3">
                        <span className="text-sm text-gray-500">Payment Terms</span>
                        <span className="text-sm font-medium text-gray-900 text-right">
                          {customer.paymentTerms || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          customer.kycStatus ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {customer.kycStatus ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        KYC
                      </div>

                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          customer.sanctionsCheck ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {customer.sanctionsCheck ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Sanctions
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No customers found matching your search.
              </div>
            )}
          </>
        )}
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdded}
      />
    </div>
  );
};

export default CustomerList;
