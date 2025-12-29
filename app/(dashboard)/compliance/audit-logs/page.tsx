"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Search, ArrowLeft, Filter, Download, User, File, CreditCard, AlertTriangle, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";

type Row = {
  id: string;
  timestamp: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityRef: string | null;
  description: string;
};

const AuditLogList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(q: string, role: string) {
    setLoading(true);
    try {
      const url = `/api/compliance/audit-logs?q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}&take=200`;
      const data = await fetch(url, { cache: "no-store" }).then((r) => r.json());
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(searchTerm, filterRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLogIcon = (entityType: string) => {
    switch (entityType) {
      case "USER":
        return <User className="w-4 h-4 text-gray-500" />;
      case "DOCUMENT":
        return <File className="w-4 h-4 text-gray-500" />;
      case "INVOICE":
      case "PAYMENT":
        return <CreditCard className="w-4 h-4 text-gray-500" />;
      case "SYSTEM":
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string | null) => {
    const r = role || "SYSTEM";
    let color = "bg-gray-100 text-gray-600";
    if (r === "ADMIN") color = "bg-blue-100 text-blue-600";
    if (r === "OPERATOR") color = "bg-cyan-100 text-cyan-600";
    if (r === "FINANCE") color = "bg-orange-100 text-orange-600";
    if (r === "DOCUMENTOR") color = "bg-green-100 text-green-600";
    if (r === "SUPER_ADMIN") color = "bg-purple-100 text-purple-600";

    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{r}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/compliance" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Overview
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
          <p className="text-gray-500 mt-1">Complete history of system actions and events</p>
        </div>

        <button
          onClick={() => {
            // simple client-side CSV export (you can also do server route later)
            const header = ["timestamp", "user", "role", "action", "entityType", "entityRef", "description"];
            const lines = [
              header.join(","),
              ...rows.map((r) =>
                [
                  new Date(r.timestamp).toISOString(),
                  (r.actorName || "System").replaceAll(",", " "),
                  (r.actorRole || "SYSTEM").replaceAll(",", " "),
                  r.action,
                  r.entityType,
                  (r.entityRef || "").replaceAll(",", " "),
                  (r.description || "").replaceAll(",", " "),
                ].join(",")
              ),
            ];
            const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "audit-logs.csv";
            a.click();
          }}
          className="flex items-center px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      <Card noPadding className="border border-gray-200">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs by user, description or ref…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(searchTerm, filterRole);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Role:</span>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
              value={filterRole}
              onChange={(e) => {
                const v = e.target.value;
                setFilterRole(v);
                load(searchTerm, v);
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="OPERATOR">Operator</option>
              <option value="FINANCE">Finance</option>
              <option value="DOCUMENTOR">Documentor</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <button
            onClick={() => load(searchTerm, filterRole)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Apply
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User / Role</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="px-6 py-4 text-gray-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{log.actorName || "System"}</span>
                        <div className="mt-1">{getRoleBadge(log.actorRole)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-gray-100 rounded">{getLogIcon(log.entityType)}</div>
                        <span className="font-medium text-gray-700">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase">{log.entityType}</span>
                        <span className="font-mono text-xs bg-gray-50 px-1 py-0.5 rounded border border-gray-200 w-fit">
                          {log.entityRef || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{log.description}</td>
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-gray-500" colSpan={5}>
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogList;
