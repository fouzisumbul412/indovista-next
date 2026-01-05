// app/(dashboard)/categories/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Search, Plus, Pencil, Trash2, Layers, Thermometer, Download } from "lucide-react";
import { Category } from "@/types/category";
import { CategoryModal } from "@/components/CategoryModal";

type CategoryPayload = {
  id?: string;
  name: string;
  hsCode?: string | null;
  storageType: "AMBIENT" | "CHILLED" | "FROZEN";
  documents?: string | null;
  notes?: string | null;
  temperatureId?: number | null;
};

const fetchCategories = async (): Promise<Category[]> => {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
};

const CategoryList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, isError, error } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: CategoryPayload) => {
      if (payload.id) {
        const res = await fetch(`/api/categories/${encodeURIComponent(payload.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to update category");
        return body as Category;
      }

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to create category");
      return body as Category;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsModalOpen(false);
      setEditingCategory(null);
      toast.success(vars?.id ? "Category updated successfully" : "Category created successfully");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save category"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to delete category");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      //toast.success("Category deleted successfully");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete category"),
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const hs = (c.hsCode || "").toLowerCase();
      const temp = (c.temperature?.range || c.temperature?.name || "").toLowerCase();
      const storage = String(c.storageType || "").toLowerCase();
      return name.includes(q) || hs.includes(q) || temp.includes(q) || storage.includes(q);
    });
  }, [categories, searchTerm]);

  const anyLoading = isLoading || upsertMutation.isPending || deleteMutation.isPending;

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (c: Category) => {
    setEditingCategory(c);
    setIsModalOpen(true);
  };

  const confirmDelete = (c: Category) => {
    toast.message("Delete category?", {
      description: `${c.name}${c.hsCode ? ` • HS: ${c.hsCode}` : ""}`,
      action: {
        label: "Delete",
        onClick: async () => {
          await toast.promise(deleteMutation.mutateAsync(c.id), {
            loading: "Deleting category…",
            success: "Category deleted successfully",
            error: (e) => e?.message ?? "Failed to delete category",
          });
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const handleSave = (payload: CategoryPayload) => upsertMutation.mutateAsync(payload);

  const handleExport = () => {
    toast.message("Downloading Excel…");
    window.location.href = "/api/categories/export";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Manage import/export category master list</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={handleExport}
            type="button"
            className="w-full sm:w-auto flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          <button
            onClick={handleAdd}
            type="button"
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row gap-3 lg:gap-4 justify-between items-stretch lg:items-center bg-white">
          <div className="relative w-full lg:max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {anyLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
        </div>

        {/* Error */}
        {!isLoading && isError && (
          <div className="p-6 text-center text-red-600">{(error as any)?.message || "Failed to load categories"}</div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">HS Code</th>
                  <th className="px-6 py-4">Temperature</th>
                  <th className="px-6 py-4">Storage Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No categories found.
                    </td>
                  </tr>
                )}

                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {c.hsCode || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Thermometer className="w-4 h-4 text-gray-400" />
                        {c.temperature?.range || c.temperature?.name || "-"}
                      </div>
                    </td>

                    <td className="px-6 py-4 capitalize text-gray-700">
                      {String(c.storageType || "").toLowerCase()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          aria-label="Edit category"
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmDelete(c)}
                          aria-label="Delete category"
                          className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
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
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-4 space-y-3">
          {!isLoading && filtered.length === 0 && <div className="text-center text-gray-500">No categories found.</div>}

          {filtered.map((c) => (
            <Card key={c.id} className="border border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="font-bold text-gray-900 truncate">{c.name}</div>
                  </div>

                  <div className="mt-3 text-sm space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">HS Code</span>
                      <span className="font-semibold text-gray-900">{c.hsCode || "-"}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Temperature</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {c.temperature?.range || c.temperature?.name || "-"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Storage</span>
                      <span className="font-semibold text-gray-900 capitalize">
                        {String(c.storageType || "").toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(c)}
                    aria-label="Edit"
                    className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(c)}
                    aria-label="Delete"
                    className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSave}
        initialData={editingCategory}
      />
    </div>
  );
};

export default CategoryList;
