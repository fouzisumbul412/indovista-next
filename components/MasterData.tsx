// components/MasterData.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  Pencil,
  ArrowUpDown,
  Globe,
  Ship,
  Clock,
  DollarSign,
  Thermometer,
  Download,
  Plane,
  Truck,
} from "lucide-react";
import Link from "next/link";
import EditModal from "@/components/EditModal";
import AddEntryModal from "@/components/AddEntryModal";
import Pagination from "@/components/Pagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type MasterDataType =
  | "ports"
  | "incoterms"
  | "status-codes"
  | "currencies"
  | "temp-presets"
  | "containers";

interface MasterDataEntry {
  id: number;
  [key: string]: any;
}

interface MasterDataProps {
  type: MasterDataType;
}

interface ColumnDef {
  key: string;
  label: string;
}

interface Config {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bg: string;
  columns: ColumnDef[];
}

const PAGE_SIZE = 10;

/* ---------------- ICON + COLOR HELPERS (NO UI LAYOUT CHANGE) ---------------- */

const modeIcon = (modeRaw: any) => {
  const mode = String(modeRaw ?? "").trim().toUpperCase();
  switch (mode) {
    case "AIR":
      return <Plane className="w-4 h-4 text-blue-600" />;
    case "SEA":
      return <Ship className="w-4 h-4 text-teal-600" />;
    case "ROAD":
      return <Truck className="w-4 h-4 text-amber-600" />;
    default:
      return null;
  }
};

const modeTabStyle = (active: boolean, mode: string) => {
  if (!active) return "bg-gray-100 text-gray-600 hover:bg-gray-200";

  switch (mode) {
    case "AIR":
      return "bg-blue-600 text-white";
    case "SEA":
      return "bg-teal-600 text-white";
    case "ROAD":
      return "bg-amber-600 text-white";
    default:
      return "bg-blue-600 text-white"; // ALL keeps your original active color feel
  }
};

const configMap: Record<MasterDataType, Config> = {
  ports: {
    title: "Ports & Airports",
    subtitle: "UN/LOCODE Database",
    icon: <Globe className="w-6 h-6 text-blue-600" />,
    bg: "bg-blue-50",
    columns: [
      { key: "code", label: "Code" },
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
    ],
  },
  incoterms: {
    title: "Incoterms",
    subtitle: "Incoterms 2020 Rules",
    icon: <Ship className="w-6 h-6 text-green-600" />,
    bg: "bg-green-50",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
    ],
  },
  "status-codes": {
    title: "Status Codes",
    subtitle: "Shipment Tracking Milestones",
    icon: <Clock className="w-6 h-6 text-orange-600" />,
    bg: "bg-orange-50",
    columns: [
      { key: "code", label: "Code" },
      { key: "description", label: "Description" },
      { key: "stage", label: "Stage" },
    ],
  },
  currencies: {
    title: "Currencies",
    subtitle: "Supported Exchange Rates",
    icon: <DollarSign className="w-6 h-6 text-purple-600" />,
    bg: "bg-purple-50",
    columns: [
      { key: "currencyCode", label: "Currency Code" },
      { key: "name", label: "Name" },
      { key: "exchangeRate", label: "Exch. Rate (to INR)" },
    ],
  },
  "temp-presets": {
    title: "Temperature Presets",
    subtitle: "Cold Chain Configuration",
    icon: <Thermometer className="w-6 h-6 text-cyan-600" />,
    bg: "bg-cyan-50",
    columns: [
      { key: "name", label: "Preset Name" },
      { key: "range", label: "Range" },
      { key: "tolerance", label: "Tolerance" },
    ],
  },
  containers: {
    title: "Containers / ULD Types",
    subtitle: "Air, Sea & Road Containers",
    icon: <Ship className="w-6 h-6 text-indigo-600" />,
    bg: "bg-indigo-50",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "transportMode", label: "Mode" },
      { key: "type", label: "Type" },
      { key: "maxWeight", label: "Max Weight" },
      { key: "weightUnit", label: "Unit" }, // ✅
    ],
  },
};

const MasterData: React.FC<MasterDataProps> = ({ type }) => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "AIR" | "SEA" | "ROAD">("ALL");

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<MasterDataEntry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const config = configMap[type];

  const normalizeForType = (record: any) => {
    const copy: any = { ...record };

    if (type === "currencies" && copy.exchangeRate !== undefined) {
      const num = parseFloat(copy.exchangeRate);
      copy.exchangeRate = isNaN(num) ? null : num;
    }

    // ✅ FIX FOR CONTAINERS
    if (type === "containers" && copy.maxWeight !== undefined) {
      const num = parseFloat(copy.maxWeight);
      copy.maxWeight = isNaN(num) ? null : num;
    }

    return copy;
  };

  // 🔹 React Query – fetch master data
  const {
    data: records = [],
    isLoading,
    isFetching,
  } = useQuery<MasterDataEntry[], Error>({
    queryKey: ["master-data", type],
    queryFn: async () => {
      const res = await fetch(`/api/master-data/${type}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch master data");
      }
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  // 🔹 Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master-data/${type}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete");
      }
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<MasterDataEntry[]>(["master-data", type], (old = []) =>
        old.filter((item) => item.id !== id)
      );
    },
  });

  const editMutation = useMutation({
    mutationFn: async (payload: { id: number; values: any }) => {
      const { id, values } = payload;
      const body = normalizeForType(values);

      const res = await fetch(`/api/master-data/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update");
      }

      return (await res.json()) as MasterDataEntry;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<MasterDataEntry[]>(["master-data", type], (old = []) =>
        old.map((i) => (i.id === updated.id ? updated : i))
      );
      setEditOpen(false);
      setEditItem(null);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (values: any) => {
      const body = normalizeForType(values);

      const res = await fetch(`/api/master-data/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create");
      }

      return (await res.json()) as MasterDataEntry;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<MasterDataEntry[]>(["master-data", type], (old = []) => [
        ...old,
        created,
      ]);
      setAddOpen(false);
    },
  });

  // 🔹 search + sort + pagination
  const processed = useMemo(() => {
    const base = Array.isArray(records) ? records : [];

    const filtered = base
      .filter((item) =>
        Object.values(item).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      )
      .filter((item) => {
        if (type !== "containers") return true;
        if (modeFilter === "ALL") return true;
        const itemMode = String(item.transportMode ?? "").trim().toUpperCase();
        return itemMode === modeFilter;
      });

    let sorted = filtered;
    if (sortKey) {
      sorted = [...filtered].sort((a, b) => {
        const va = a[sortKey!];
        const vb = b[sortKey!];

        if (va == null && vb == null) return 0;
        if (va == null) return sortDir === "asc" ? -1 : 1;
        if (vb == null) return sortDir === "asc" ? 1 : -1;

        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }

        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paginated = sorted.slice(start, start + PAGE_SIZE);

    return { filtered: sorted, paginated, total, currentPage };
    // ✅ IMPORTANT: include modeFilter + type so containers filter recalculates
  }, [records, searchTerm, modeFilter, type, sortKey, sortDir, page]);

  // keep page in range
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(processed.total / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [processed.total, page]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this entry?")) return;
    deleteMutation.mutate(id);
  };

  const openEdit = (item: MasterDataEntry) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const handleSaveEdit = (updatedValues: any) => {
    if (!editItem) return;
    editMutation.mutate({ id: editItem.id, values: updatedValues });
  };

  const handleSaveAdd = (values: any) => {
    addMutation.mutate(values);
  };

  const handleExport = () => {
    const rows = processed.filtered;
    if (!rows.length) {
      alert("No records to export");
      return;
    }

    const columns = config.columns.map((c) => c.key);
    const header = config.columns.map((c) => c.label).join(",");

    const csvRows = rows.map((item) =>
      columns
        .map((key) => {
          const val = item[key];
          if (val == null) return "";
          const s = String(val).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(",")
    );

    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const anyLoading =
    isLoading ||
    isFetching ||
    deleteMutation.isPending ||
    addMutation.isPending ||
    editMutation.isPending;

  return (
    <>
      {/* Modals */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fields={config.columns}
        values={editItem || {}}
        onSave={handleSaveEdit}
      />
      <AddEntryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fields={config.columns}
        onSave={handleSaveAdd}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Settings
            </Link>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bg}`}>{config.icon}</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
                <p className="text-gray-500 text-sm">{config.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 text-white bg-green-600 hover:bg-green-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Table card */}
        <Card noPadding className="border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-white flex flex-col gap-3">
            {/* MODE TABS – ONLY FOR CONTAINERS */}
            {type === "containers" && (
              <div className="flex items-center gap-2">
                {["ALL", "SEA", "AIR", "ROAD"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setModeFilter(mode as any);
                      setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${modeTabStyle(
                      modeFilter === mode,
                      mode
                    )}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {mode === "AIR" ? (
                        <Plane className={`w-4 h-4 ${modeFilter === mode ? "text-white" : "text-blue-600"}`} />
                      ) : mode === "SEA" ? (
                        <Ship className={`w-4 h-4 ${modeFilter === mode ? "text-white" : "text-teal-600"}`} />
                      ) : mode === "ROAD" ? (
                        <Truck className={`w-4 h-4 ${modeFilter === mode ? "text-white" : "text-amber-600"}`} />
                      ) : null}
                      {mode}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* SEARCH */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {anyLoading && (
              <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                <tr>
                  {config.columns.map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className="px-6 py-3 cursor-pointer select-none"
                        onClick={() => toggleSort(col.key)}
                      >
                        <div className="inline-flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown
                            className={`w-3 h-3 ${active ? "text-blue-600" : "text-gray-400"}`}
                          />
                          {active && (
                            <span className="text-[10px] text-blue-600">
                              {sortDir === "asc" ? "ASC" : "DESC"}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {processed.paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {config.columns.map((col, idx) => (
                      <td
                        key={col.key}
                        className={`px-6 py-3 ${
                          idx === 0 ? "font-medium text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {col.key === "transportMode" ? (
                          <div className="flex items-center gap-2">
                            {modeIcon(item.transportMode)}
                            <span>{String(item.transportMode ?? "-")}</span>
                          </div>
                        ) : col.key === "maxWeight" ? (
                          `${item.maxWeight ?? "-"} ${item.weightUnit ?? ""}`
                        ) : (
                          item[col.key] ?? "-"
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {!processed.paginated.length && !anyLoading && (
                  <tr>
                    <td
                      colSpan={config.columns.length + 1}
                      className="px-6 py-6 text-center text-sm text-gray-500"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={processed.currentPage}
            pageSize={PAGE_SIZE}
            total={processed.total}
            onPageChange={setPage}
          />
        </Card>
      </div>
    </>
  );
};

export default MasterData;
