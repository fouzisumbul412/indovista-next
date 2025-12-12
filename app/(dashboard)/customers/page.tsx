"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Search, Plus, CheckCircle, XCircle, Download } from "lucide-react";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { Customer } from "@/types";

const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await fetch("/api/customers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
};

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

  // called after modal creates a customer
  const handleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setIsModalOpen(false);
  };

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

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter((c) => {
      return (
        c.companyName.toLowerCase().includes(term) ||
        c.country.toLowerCase().includes(term) ||
        c.customerCode.toLowerCase().includes(term) ||
        (c.contactPerson || "").toLowerCase().includes(term)
      );
    });
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">
            Manage importers, distributors, and retail partners
          </p>
        </div>

        <div className="flex gap-2">
          {/* Export Excel */}
          <button
            onClick={() => {
              window.location.href = "/api/customers/export";
            }}
            className="flex items-center px-3 py-2 border bg-green-600 text-white border-gray-300 rounded-lg text-sm hover:bg-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          {/* Add customer */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="relative max-w-lg">
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
        {isLoading && (
          <div className="text-center text-gray-500 py-12">
            Loading customers...
          </div>
        )}

        {/* Error */}
        {!isLoading && isError && (
          <div className="text-center text-red-600 py-12">
            {(error as any)?.message || "Failed to load customers"}
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((customer) => (
                <Link
                  href={`/customers/${customer.customerCode}`}
                  key={customer.customerCode}
                  className="block group"
                >
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer relative border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                          {customer.companyName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatCustomerType(customer.type)} •{" "}
                          {customer.country}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Code: {customer.customerCode}
                        </p>
                        {customer.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Phone: {customer.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
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
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">Contact</span>
                        <span className="text-sm font-medium text-gray-900 text-right">
                          {customer.contactPerson || "—"}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">
                          Credit Limit
                        </span>
                        <span className="text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(
                            customer.creditLimit || 0,
                            customer.currency
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">
                          Used Credits
                        </span>
                        <span className="text-sm font-bold text-orange-600 text-right">
                          {formatCurrency(
                            customer.usedCredits || 0,
                            customer.currency
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">
                          Total Amount
                        </span>
                        <span className="text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(
                            customer.totalAmount || 0,
                            customer.currency
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">
                          Payment Terms
                        </span>
                        <span className="text-sm font-medium text-gray-900 text-right">
                          {customer.paymentTerms || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          customer.kycStatus
                            ? "text-green-600"
                            : "text-gray-400"
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
                          customer.sanctionsCheck
                            ? "text-green-600"
                            : "text-gray-400"
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
