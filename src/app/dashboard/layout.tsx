"use client"

import AdminRoute from "@/components/AdminRoute";
import AdminSidebar, { AdminSidebarRail } from "@/components/AdminSidebar";
import { AdminSidebarProvider } from "@/context/AdminSidebarContext";

export default function DashboardLayout({children}: {children: React.ReactNode}) {
    return (
        <AdminRoute>
            <AdminSidebarProvider>
                <div className="flex flex-1 flex-col md:flex-row">
                    <AdminSidebar />
                    <AdminSidebarRail />
                    <div className="flex min-w-0 flex-1 flex-col">{children}</div>
                </div>
            </AdminSidebarProvider>
        </AdminRoute>
    );
}
