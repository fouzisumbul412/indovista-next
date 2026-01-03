"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar"; // You can keep this, but adjust if needed
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <Topbar />
        <main className="flex-1 p-6 lg:p-8 bg-gray-50">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
