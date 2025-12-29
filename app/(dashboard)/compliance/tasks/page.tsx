"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, CheckCircle, XCircle, Calendar, User } from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  type: "KYC_REVIEW" | "SANCTIONS_CHECK" | "DOC_VALIDATION";
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "APPROVED" | "REJECTED";
  entityType: string;
  entityId: string;
  entityName: string;
  entityRef: string | null;
  description: string;
  dueDate: string | null;
  assignedTo: string | null;
};

const ComplianceTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/compliance/tasks?status=PENDING", { cache: "no-store" }).then((r) => r.json());
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    if (!confirm(`Are you sure you want to ${action} this task?`)) return;

    const note = prompt("Optional note for audit log (press OK to skip):") || "";

    const res = await fetch(`/api/compliance/tasks/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // TODO: replace actorName/actorRole with your actual logged-in user context
      body: JSON.stringify({ action, note, actorName: "Operator", actorRole: "OPERATOR" }),
    });

    if (!res.ok) {
      const msg = await res.text();
      alert(msg);
      return;
    }

    await load();
  };

  const getPriorityColor = (p: string) => {
    if (p === "HIGH") return "text-red-600 bg-red-50 border-red-200";
    if (p === "MEDIUM") return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getTypeLabel = (type: Task["type"]) => {
    if (type === "KYC_REVIEW") return "KYC Review";
    if (type === "SANCTIONS_CHECK") return "Sanctions Check";
    return "Doc Validation";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/compliance" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Overview
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Pending Reviews</h1>
          <p className="text-gray-500 mt-1">Manage KYC, Sanctions, and Document approval tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading && <Card className="p-6 text-gray-500">Loading…</Card>}

        {!loading && tasks.length === 0 && (
          <Card className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
            <p>No pending compliance tasks requiring your attention.</p>
          </Card>
        )}

        {!loading &&
          tasks.map((task) => (
            <Card
              key={task.id}
              className={`border-l-4 ${
                task.status === "PENDING" ? "border-l-blue-500" : task.status === "APPROVED" ? "border-l-green-500" : "border-l-red-500"
              } transition-all`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getPriorityColor(task.priority)}`}>
                      {task.priority} Priority
                    </span>
                    <span className="text-xs font-mono text-gray-400">ID: {task.id}</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {getTypeLabel(task.type)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {task.entityName}
                    <span className="text-sm font-normal text-gray-500 ml-2">({task.entityRef || task.entityId})</span>
                  </h3>

                  <p className="text-gray-600 mb-4">{task.description}</p>

                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {task.dueDate}</span>
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>Assigned: {task.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>

                {task.status === "PENDING" ? (
                  <div className="flex flex-row md:flex-col gap-3">
                    <button
                      onClick={() => handleAction(task.id, "APPROVE")}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 shadow-sm transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(task.id, "REJECT")}
                      className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </button>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2 rounded-lg font-bold text-sm border flex items-center gap-2 ${
                      task.status === "APPROVED" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {task.status === "APPROVED" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {task.status}
                  </div>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default ComplianceTasks;
