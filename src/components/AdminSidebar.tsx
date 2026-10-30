"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTree, LayoutDashboard, LogOut, Package, PanelLeftClose, PanelLeftOpen, ShoppingBag, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAdminSidebar } from "@/context/AdminSidebarContext";

const MENU = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, exact: true },
    { href: "/dashboard/users", label: "User Management", Icon: Users },
    { href: "/dashboard/products", label: "Product Management", Icon: Package },
    { href: "/dashboard/orders", label: "Orders Management", Icon: ShoppingBag },
    { href: "/dashboard/categories", label: "Category Management", Icon: FolderTree },
];

/**
 * Non-modal admin navigation. Unlike the cart drawer there's no overlay or scroll
 * lock, so the page next to it stays fully usable.
 */
export default function AdminSidebar() {
    const { open, setOpen } = useAdminSidebar();
    const { logout } = useAuth();
    const pathname = usePathname();

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

    return (
        <aside
            id="admin-sidebar"
            aria-label="Admin navigation"
            hidden={!open}
            className="w-full shrink-0 border-b border-neutral-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:self-start md:border-b-0 md:border-r"
            data-testid="admin-sidebar"
        >
            <div className="flex h-full flex-col p-4">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Admin</span>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="cursor-pointer rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-black"
                        aria-label="Close admin menu"
                        aria-controls="admin-sidebar"
                        data-testid="admin-sidebar-close"
                    >
                        <PanelLeftClose className="size-4" />
                    </button>
                </div>

                <nav>
                    <ul className="space-y-1">
                        {MENU.map(({ href, label, Icon, exact }) => {
                            const active = isActive(href, exact);
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                            active ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                                        }`}
                                    >
                                        <Icon className="size-4" aria-hidden />
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <button
                    type="button"
                    onClick={logout}
                    className="mt-6 flex cursor-pointer items-center gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 md:mt-auto"
                >
                    <LogOut className="size-4" aria-hidden /> Logout
                </button>
            </div>
        </aside>
    );
}

/** Slim rail shown on every dashboard page while the sidebar is closed, to reopen it. */
export function AdminSidebarRail() {
    const { open, setOpen } = useAdminSidebar();
    if (open) return null;
    return (
        <div className="shrink-0 border-b border-neutral-200 bg-white p-2 md:sticky md:top-0 md:h-screen md:self-start md:border-b-0 md:border-r">
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={false}
                aria-controls="admin-sidebar"
                aria-label="Open admin menu"
                title="Open admin menu"
                className="cursor-pointer rounded-md border border-neutral-300 p-1.5 text-neutral-700 hover:border-black hover:text-black"
                data-testid="admin-sidebar-open"
            >
                <PanelLeftOpen className="size-4" aria-hidden />
            </button>
        </div>
    );
}
