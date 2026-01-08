"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

import EditModal from "@/components/EditModal";
import AddEntryModal from "@/components/AddEntryModal";
import Pagination from "@/components/Pagination";
import { Card } from "./ui/Card";

/* ---------------- types ---------------- */

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

/* ---------------- helpers ---------------- */

const modeIcon = (mode: any) => {
  switch (String(mode).toUpperCase()) {
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

/* ---------------- config ---------------- */

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
    subtitle: "Exchange Rates",
    icon: <DollarSign className="w-6 h-6 text-purple-600" />,
    bg: "bg-purple-50",
    columns: [
      { key: "currencyCode", label: "Currency" },
      { key: "name", label: "Name" },
      { key: "exchangeRate", label: "Rate" },
    ],
  },
  "temp-presets": {
    title: "Temperature Presets",
    subtitle: "Cold Chain",
    icon: <Thermometer className="w-6 h-6 text-cyan-600" />,
    bg: "bg-cyan-50",
    columns: [
      { key: "name", label: "Name" },
      { key: "range", label: "Range" },
      { key: "tolerance", label: "Tolerance" },
    ],
  },
  containers: {
    title: "Containers",
    subtitle: "Air / Sea / Road",
    icon: <Ship className="w-6 h-6 text-indigo-600" />,
    bg: "bg-indigo-50",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "transportMode", label: "Mode" },
      { key: "type", label: "Type" },
      { key: "maxWeight", label: "Max Weight" },
    ],
  },
};

/* ---------------- component ---------------- */

const MasterData: React.FC<{ type: MasterDataType }> = ({ type }) => {
  const queryClient = useQueryClient();
  const config = configMap[type];

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<MasterDataEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  /* ---------- data ---------- */

  const { data = [], isLoading } = useQuery<MasterDataEntry[]>({
    queryKey: ["master-data", type],
    queryFn: async () => {
      const res = await fetch(`/api/master-data/${type}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    return data.filter((item) =>
      Object.values(item).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    );
  }, [data, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ---------- mutations ---------- */

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master-data/${type}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: (_d, id) => {
      queryClient.setQueryData<MasterDataEntry[]>(
        ["master-data", type],
        (old = []) => old.filter((i) => i.id !== id)
      );
    },
  });

  /* ---------------- UI ---------------- */

  return (
    <>
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fields={config.columns}
        values={editItem || {}}
        onSave={() => {}}
      />
      <AddEntryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fields={config.columns}
        onSave={() => {}}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/settings"
              className="flex items-center text-sm text-gray-500 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${config.bg}`}>{config.icon}</div>
              <div>
                <h1 className="text-xl font-bold">{config.title}</h1>
                <p className="text-sm text-gray-500">{config.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-sm">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  {config.columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginated.map((item) => (
                  <TableRow key={item.id}>
                    {config.columns.map((c) => (
                      <TableCell key={c.key}>
                        {c.key === "transportMode" ? (
                          <div className="flex items-center gap-2">
                            {modeIcon(item.transportMode)}
                            {item.transportMode}
                          </div>
                        ) : (
                          item[c.key] ?? "-"
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditItem(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Mobile Cards – Pro Design */}
        <div className="md:hidden space-y-4">
          {paginated.map((item) => {
            const primary = config.columns[0]; // first column = title

            return (
              <Card
                key={item.id}
                className="p-4 rounded-2xl shadow-sm border border-gray-200 bg-white"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 leading-tight">
                      {item[primary.key] ?? "-"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {config.title}
                    </p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditItem(item)}
                      className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {config.columns.slice(1).map((c) => (
                    <div key={c.key} className="space-y-0.5">
                      <p className="text-xs text-gray-500">{c.label}</p>
                      <p className="font-medium text-gray-900">
                        {c.key === "transportMode" ? (
                          <span className="inline-flex items-center gap-2">
                            {modeIcon(item.transportMode)}
                            {item.transportMode ?? "-"}
                          </span>
                        ) : (
                          item[c.key] ?? "-"
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </>
  );
};

export default MasterData;
