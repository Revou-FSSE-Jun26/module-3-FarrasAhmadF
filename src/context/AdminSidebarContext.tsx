"use client"

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

// Open/closed state of the admin sidebar, persisted in localStorage so it survives
// navigation between dashboard pages. useSyncExternalStore avoids a hydration mismatch:
// the server always renders it open, the client then reads the saved value.
const KEY = "admin-sidebar-open";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
const getSnapshot = () => localStorage.getItem(KEY) !== "false";
const getServerSnapshot = () => true;

function write(open: boolean) {
    localStorage.setItem(KEY, String(open));
    listeners.forEach((l) => l());
}

interface AdminSidebarContextType {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export function AdminSidebarProvider({children}: {children: React.ReactNode}) {
    const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const setOpen = useCallback((value: boolean) => write(value), []);
    const toggle = useCallback(() => write(!getSnapshot()), []);
    return (
        <AdminSidebarContext.Provider value={{ open, setOpen, toggle }}>
            {children}
        </AdminSidebarContext.Provider>
    );
}

export function useAdminSidebar() {
    const ctx = useContext(AdminSidebarContext);
    if (!ctx) throw new Error("useAdminSidebar must be used inside AdminSidebarProvider");
    return ctx;
}
