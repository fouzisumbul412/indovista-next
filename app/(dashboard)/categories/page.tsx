"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Search, Plus, Pencil, Trash2, Layers, Thermometer, FileText, Download } from "lucide-react";
import { Category } from "@/types/category";
import { CategoryModal } from "@/components/CategoryModal";

type CategoryPayload = {
  id?: string;
  name: string;
  hsCode?: string | null;
  storageType: "AMBIENT" | "CHILLED" | "FROZEN";
  documents?: string | null;
  notes?: string | null;
  temperatureId?: number | null; // ✅
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

  const { data: categories = [], isLoading } = useQuery<Category[]>({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsModalOpen(false);
      setEditingCategory(null);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to save category");
    },
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
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to delete category");
    },
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const hs = (c.hsCode || "").toLowerCase();
      const temp = (c.temperature?.range || c.temperature?.name || "").toLowerCase();
      return name.includes(q) || hs.includes(q) || temp.includes(q);
    });
  }, [categories, searchTerm]);

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (c: Category) => {
    setEditingCategory(c);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = (payload: CategoryPayload) => {
    upsertMutation.mutate(payload);
  };

  const handleExport = () => {
    window.location.href = "/api/categories/export";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Manage import/export category master list</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full md:max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {isLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">HS Code</th>
                <th className="px-6 py-4">Temperature</th>
                <th className="px-6 py-4">Storage Type</th>
                {/* <th className="px-6 py-4">Documents</th> */}
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No categories found.
                  </td>
                </tr>
              )}

              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
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
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-4 h-4 text-gray-400" />
                      {c.temperature?.range || c.temperature?.name || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-4 capitalize text-gray-700">
                    {String(c.storageType || "").toLowerCase()}
                  </td>

                  {/* <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="truncate max-w-[160px]">{c.documents || "-"}</span>
                    </div>
                  </td> */}

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
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
                        onClick={() => handleDelete(c.id)}
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
