"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ship,
  Users,
  Package,
  Container,
  Database,
  FileText,
  DollarSign,
  ShieldCheck,
  Settings,
  Truck,
  LogOut,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Sidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false); // Desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // Mobile drawer

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Truck, label: "Vehicle", href: "/vehicles" },
    { icon: Ship, label: "Shipments", href: "/shipments" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: Package, label: "Products", href: "/products" },
    { icon: Database, label: "Categories", href: "/categories" },
    { icon: FileText, label: "Documents", href: "/documents" },
    { icon: ClipboardList, label: "Quotes", href: "/quotes" },
    { icon: DollarSign, label: "Billing", href: "/billing" },
    { icon: ShieldCheck, label: "Compliance", href: "/compliance" },
  ];

  return (
    <>
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-screen z-40 bg-slate-900 text-white flex flex-col transition-all duration-300
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header + Collapse Button */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">IV</span>
              </div>
              <span className="font-bold text-lg tracking-tight">
                INDOVISTA
              </span>
            </div>
          )}

          {/* Desktop Collapse Button */}
          <button
            className="hidden md:block"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="w-6 h-6 text-slate-300" />
          </button>

          {/* Mobile Close Button */}
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-6 h-6 text-slate-300" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
          {!collapsed && (
            <p className="px-6 text-xs font-semibold text-slate-500 uppercase mb-2">
              Operations
            </p>
          )}

          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)} // Auto close on mobile
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white border-r-4 border-blue-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {!collapsed && item.label}
              </Link>
            );
          })}

          {/* System Section */}
          {!collapsed && (
            <div className="mt-8">
              <p className="px-6 text-xs font-semibold text-slate-500 uppercase mb-2">
                System
              </p>
            </div>
          )}

          <Link
            href="/settings"
            className="flex items-center px-6 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Settings className="w-5 h-5 mr-3" />
            {!collapsed && "Settings"}
          </Link>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </div>

      {/* Mobile hamburger button (top-left) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-md"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
};

export default Sidebar;
