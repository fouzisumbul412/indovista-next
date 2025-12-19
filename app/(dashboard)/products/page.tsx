"use client";

import React, { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Search, Plus, Snowflake, Leaf, Thermometer, Pencil, Trash2, Download, Upload } from "lucide-react";
import { Product } from "@/types/product";
import { AddProductModal } from "@/components/AddProductModal";

type ProductPayload = {
  id?: string;
  name: string;
  type: "FROZEN" | "SPICE";
  categoryId: string;

  hsCode?: string | null;
  temperatureId?: number | null;
  packSize?: string | null;
  shelfLife?: string | null;

  // ✅ Pricing
  unitPrice?: number | null;
  currencyCode: string;

  unitsPerCarton?: number | "" | null;
  cartonsPerPallet?: number | "" | null;

  notes?: string | null;
};

const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch("/api/products", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
};

const ProductList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "FROZEN" | "SPICE">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: ProductPayload) => {
      if (payload.id) {
        const res = await fetch(`/api/products/${encodeURIComponent(payload.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to update product");
        return body as Product;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to create product");
      return body as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsModalOpen(false);
      setEditingProduct(null);
    },
    onError: (err: any) => alert(err?.message || "Failed to save product"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to delete product");
      return body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    onError: (err: any) => alert(err?.message || "Failed to delete product"),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: fd,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Import failed");
      return body;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const errs = Array.isArray(result?.errors) ? result.errors.length : 0;
      alert(`Import done ✅ Created: ${result.created} | Updated: ${result.updated} | Errors: ${errs}`);
    },
    onError: (err: any) => alert(err?.message || "Import failed"),
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        (p.name || "").toLowerCase().includes(q) ||
        (p.hsCode || "").toLowerCase().includes(q) ||
        (p.currencyCode || "").toLowerCase().includes(q) ||
        String(p.unitPrice ?? "").toLowerCase().includes(q) ||
        (p.temperature?.range || p.temperature?.name || "").toLowerCase().includes(q);

      const matchesType = filterType === "ALL" || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, filterType]);

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveProduct = (payload: ProductPayload) => {
    upsertMutation.mutate(payload);
  };

  const handleExport = () => {
    window.location.href = "/api/products/export";
  };

  const handlePickImport = () => {
    fileRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    importMutation.mutate(f);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Product master for frozen foods and spices</p>
        </div>

        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />

          <button
            onClick={handlePickImport}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </button>

          <button
            onClick={handleExport}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>

          <button
            onClick={handleAddNew}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full md:max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, HS codes, price, currency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-gray-500 whitespace-nowrap">Category:</span>
            <div className="flex bg-gray-100 p-1 rounded-lg flex-1 md:flex-none">
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  filterType === "ALL" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("FROZEN")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                  filterType === "FROZEN" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Snowflake className="w-3 h-3" /> Frozen Foods
              </button>
              <button
                onClick={() => setFilterType("SPICE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                  filterType === "SPICE" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Leaf className="w-3 h-3" /> Spices
              </button>
            </div>

            {(isLoading || importMutation.isPending) && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">HS Code</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Temperature</th>
                <th className="px-6 py-4">Pack Size</th>
                <th className="px-6 py-4">Shelf Life</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}

              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.type === "FROZEN" ? (
                        <Snowflake className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Leaf className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600">{product.category?.name || "-"}</td>

                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                    <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {product.hsCode || "-"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {product.unitPrice == null ? "-" : (
                      <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {product.currencyCode} {Number(product.unitPrice).toFixed(2)}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-gray-400" />
                      {product.temperature?.range || product.temperature?.name || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600">{product.packSize || "-"}</td>
                  <td className="px-6 py-4 text-gray-600">{product.shelfLife || "-"}</td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                        title="Edit Product"
                        type="button"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                        title="Delete Product"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialData={editingProduct}
      />
    </div>
  );
};

export default ProductList;
