// components/layout/Sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Ship,
  Users,
  Package,
  Container,
  FileText,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const operationsItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Truck, label: "Vehicle", href: "/vehicles" },
  { icon: Ship, label: "Shipments", href: "/shipments" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: Container, label: "Categories", href: "/categories" },
  { icon: FileText, label: "Documents", href: "/documents" },
  { icon: ClipboardList, label: "Quotes", href: "/quotes" },
  { icon: DollarSign, label: "Billing", href: "/billing" },
  { icon: ShieldCheck, label: "Compliance", href: "/compliance" },
];

const systemItems = [{ icon: Settings, label: "Settings", href: "/settings" }];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-gray-800"
      // Custom styling for dark theme
      style={
        {
          "--sidebar-background": "#0f172a",
          "--sidebar-foreground": "#ffffff",
          "--sidebar-primary": "#3b82f6",
          "--sidebar-primary-foreground": "#ffffff",
          "--sidebar-border": "#1e293b",
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <SidebarHeader className="h-16 border-b border-gray-800 bg-[#0f172a]">
        <div className="flex items-center gap-3 px-4 h-full">
          <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Indovista Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
            INDOVISTA
          </span>
        </div>
      </SidebarHeader>

      {/* Main Menu Content */}
      <SidebarContent className="bg-[#0f172a]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs font-medium uppercase tracking-wider px-4 pt-4">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={cn(
                      "w-full justify-start text-gray-300 hover:bg-[#1e293b] hover:text-white transition-colors",
                      "data-[active=true]:bg-blue-600 data-[active=true]:text-white",
                      "data-[active=true]:rounded-l-md data-[active=true]:rounded-r-none",
                      "data-[state=collapsed]:justify-center data-[state=collapsed]:px-3",
                      "py-2.5"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs font-medium uppercase tracking-wider px-4 pt-4">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={cn(
                      "w-full justify-start text-gray-300 hover:bg-blue-600 hover:text-white",
                      "data-[active=true]:bg-blue-600 data-[active=true]:text-white",
                      "data-[state=collapsed]:justify-center"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer - Now matches sidebar dark theme */}
      <SidebarFooter className="border-t border-gray-800 bg-[#0f172a] mt-auto">
        <div className="px-6 py-5">
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            Powered by{" "}
            <a
              href="https://www.outrightcreators.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#139BC3] hover:underline transition-underline"
            >
              Outright Creators
            </a>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
