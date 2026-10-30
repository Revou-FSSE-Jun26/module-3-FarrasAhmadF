"use client"

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LogOut, Package, User } from "lucide-react";
import { User as AuthUser } from "@/context/AuthContext";

/**
 * Account dropdown for logged-in users: greeting, My Orders and Logout.
 * Closes on outside click, Escape, or choosing an item.
 */
export default function AccountMenu({user, onLogout, className}: {user: AuthUser; onLogout: () => void; className: string}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
                return;
            }
            // Arrow keys move between menu items.
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
            if (!items.length) return;
            e.preventDefault();
            const i = items.indexOf(document.activeElement as HTMLElement);
            const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
            items[next].focus();
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        // Focus the first item so keyboard users can act right away.
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const itemClass = "flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-black outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100";

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={`Account menu for ${user.username}`}
                title="Account"
                className={className}
                data-testid="nav-account"
            >
                <User className="size-[18px]" />
            </button>

            {open && (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 top-full z-40 mt-3 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
                    data-testid="account-menu"
                >
                    <div className="border-b border-neutral-200 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-black" data-testid="nav-username">Hi, {user.username}</p>
                        <p className="truncate text-xs text-neutral-500">{user.email}</p>
                    </div>
                    <Link href="/orders" role="menuitem" onClick={() => setOpen(false)} className={itemClass} data-testid="nav-orders">
                        <Package className="size-4" aria-hidden /> My Orders
                    </Link>
                    <div className="my-1 border-t border-neutral-200" />
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setOpen(false); onLogout(); }}
                        className={`${itemClass} text-red-600`}
                        data-testid="nav-logout"
                    >
                        <LogOut className="size-4" aria-hidden /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}
