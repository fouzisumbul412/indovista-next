"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  ShieldCheck,
  Users,
  FileText,
  AlertTriangle,
  User,
  File,
  CreditCard,
  Settings,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuditLogRow = {
  id: string;
  timestamp: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityRef: string | null;
  description: string;
};

type SummaryResp = {
  kpis: {
    totalActions: number;
    activeUsers: number;
    complianceScore: number;
    pendingReviews: number;
  };
  roles: { role: string; count: number }[];
};

const CompliancePage = () => {
  const router = useRouter();

  const [summary, setSummary] = useState<SummaryResp | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const roleCountMap = useMemo(() => {
    const m = new Map<string, number>();
    summary?.roles?.forEach((r) => m.set(r.role, r.count));
    return m;
  }, [summary]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, logs] = await Promise.all([
          fetch("/api/compliance/summary", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/compliance/audit-logs?take=5", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setSummary(s);
          setRecentLogs(logs);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-blue-100 text-blue-600";
      case "OPERATOR":
        return "bg-cyan-100 text-cyan-600";
      case "DOCUMENTOR":
        return "bg-green-100 text-green-600";
      case "FINANCE":
        return "bg-orange-100 text-orange-600";
      case "SUPER_ADMIN":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getLogIcon = (entityType: string) => {
    switch (entityType) {
      case "USER":
        return <User className="w-5 h-5 text-gray-500" />;
      case "DOCUMENT":
        return <File className="w-5 h-5 text-gray-500" />;
      case "INVOICE":
      case "PAYMENT":
        return <CreditCard className="w-5 h-5 text-gray-500" />;
      case "SYSTEM":
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
      default:
        return <Settings className="w-5 h-5 text-gray-500" />;
    }
  };

  const k = summary?.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance &amp; Audit</h1>
        <p className="text-gray-500 mt-1">Audit trail and compliance monitoring</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="p-6 flex items-center justify-between border-l-4 border-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Actions</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "…" : k?.totalActions ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-l-4 border-cyan-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Users</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "…" : k?.activeUsers ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">Across all roles</p>
          </div>
          <div className="p-3 bg-cyan-50 rounded-lg">
            <Users className="w-6 h-6 text-cyan-600" />
          </div>
        </Card>

        <Card className="p-6 flex items-center justify-between border-l-4 border-green-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Compliance Score</p>
            <p className="text-2xl font-bold text-green-600">
              {loading ? "…" : `${k?.complianceScore ?? 100}%`}
            </p>
            <p className="text-xs text-gray-400 mt-1">Based on tasks closed</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
        </Card>

        <Card
          className="p-6 flex items-center justify-between border-l-4 border-amber-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/compliance/tasks")}
        >
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pending Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "…" : k?.pendingReviews ?? 0}</p>
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              Requires attention <ArrowRight className="w-3 h-3" />
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
        </Card>
      </div>

      {/* User Roles */}
      <Card className="p-8">
        <h3 className="font-bold text-gray-900 mb-6">User Roles</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 text-center">
          {[
            { role: "SUPER_ADMIN", color: "bg-purple-500" },
            { role: "ADMIN", color: "bg-blue-500" },
            { role: "OPERATOR", color: "bg-cyan-500" },
            { role: "DOCUMENTOR", color: "bg-green-500" },
            { role: "FINANCE", color: "bg-orange-400" },
          ].map((item) => (
            <div key={item.role} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 ${item.color}`}>
                <User className="w-6 h-6" />
              </div>
              <div className="font-semibold text-gray-900 text-sm">{item.role}</div>
              <div className="text-xs text-gray-500">{loading ? "…" : `${roleCountMap.get(item.role) ?? 0} users`}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Audit Trail */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gray-900" />
            <h3 className="font-bold text-gray-900">Recent Audit Trail</h3>
          </div>
          <Link
            href="/compliance/audit-logs"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View Full History <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-4">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="mt-1 p-2 bg-gray-100 rounded-full">{getLogIcon(log.entityType)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{log.action}</span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-mono border border-gray-200">
                    {log.entityRef || "-"}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getRoleColor(log.actorRole || "")}`}>
                    {log.actorRole || "SYSTEM"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <User className="w-3 h-3" />
                  <span>{log.actorName || "System"}</span>
                  <span>•</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
          {!loading && recentLogs.length === 0 && <div className="text-sm text-gray-500">No audit logs yet.</div>}
        </div>
      </Card>
    </div>
  );
};

export default CompliancePage;
