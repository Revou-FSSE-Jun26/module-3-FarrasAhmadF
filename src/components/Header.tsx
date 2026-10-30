"use client"

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { LayoutDashboard, LogOut, Search, ShoppingCart, Trophy, User, Coffee } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import SearchOverlay from "./SearchOverlay";


const emptySubscribe = () => () => {};
function useMounted() {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,   // client snapshot
        () => false,  // server snapshot
    );
}

const NAV_LINKS = [
    { href: '/products', label: 'Shop All' },
    { href: '/categories', label: 'Collection' },
    { href: '/orders', label: 'Support' },
];

export default function Header() {
    const { user, isLoggedIn, loading, logout } = useAuth();
    const { items, openCart } = useCart();
    const pathname = usePathname();
    const mounted = useMounted();
    const [searchOpen, setSearchOpen] = useState(false);
    const searchButtonRef = useRef<HTMLButtonElement>(null);
    // Stable so the overlay's open effect doesn't re-run (and steal focus) on every render.
    const closeSearch = useCallback(() => setSearchOpen(false), []);
    // The header lives in the root layout's prerendered shell, where the server pathname
    // can differ from the real URL. Only highlight the active link after mount to avoid
    // a hydration mismatch.
    const isActive = (href: string) => mounted && pathname === href;
    const cartCount = items.reduce((sum, it) => sum + it.quantity, 0);

    const iconClass = "text-white/90 hover:text-white transition-colors cursor-pointer";

    const navItems = NAV_LINKS.map((e) => (
        <Link
            key={e.href}
            href={e.href}
            className={`uppercase tracking-wide text-[13px] transition-colors ${
                isActive(e.href) ? 'text-white underline underline-offset-8' : 'text-white/90 hover:text-white'
            }`}
        >
            {e.label}
        </Link>
    ));

    return (
        <header>
            {/* Announcement bar */}
            <div className="bg-white text-black text-xs py-1.5 flex items-center justify-center gap-1 border-b border-neutral-200">
                <Trophy className="size-3.5 text-amber-500" aria-hidden />
                <Link href="/products" className="hover:underline">
                    A Sensational New Release · RevoGrinder II
                </Link>
            </div>

            {/* Main nav */}
            <div className="bg-black text-white">
                <div className="mx-auto max-w-6xl px-6 h-[70px] grid grid-cols-[1fr_auto] md:grid-cols-3 items-center">
                    <Link href="/" className="flex items-center gap-2.5 w-fit" data-testid="home-heading" aria-label="RevoCoffee home">
                        <span className="flex size-8 items-center justify-center rounded-full bg-white">
                            <Coffee className="size-4 text-black" strokeWidth={2.5} aria-hidden />
                        </span>
                        <span className="text-sm font-medium tracking-[0.25em] uppercase">
                            RevoCoffee<sup className="text-[8px] tracking-normal">®</sup>
                        </span>
                    </Link>

                    <nav className="hidden md:flex justify-center gap-6" aria-label="Main">
                        {navItems}
                    </nav>

                    <div className="flex items-center justify-end gap-5">
                        {!mounted || loading ? null : isLoggedIn ? (
                            <>
                                <span data-testid="nav-username" className="hidden sm:inline text-xs text-white/80">
                                    Hi, {user?.username}
                                </span>
                                {user?.role === 'admin' && (
                                    // Visibility only: the dashboard itself is still guarded by AdminRoute + admin-only API.
                                    <Link
                                        href="/dashboard"
                                        data-testid="nav-dashboard"
                                        className={`${iconClass} ${pathname.startsWith('/dashboard') && mounted ? 'text-white' : ''}`}
                                        aria-label="Admin dashboard"
                                        title="Admin dashboard"
                                    >
                                        <LayoutDashboard className="size-[18px]" />
                                    </Link>
                                )}
                                <button
                                    onClick={logout}
                                    data-testid="nav-logout"
                                    className={iconClass}
                                    aria-label="Logout"
                                    title="Logout"
                                >
                                    <LogOut className="size-[18px]" />
                                </button>
                            </>
                        ) : (
                            <Link href="/login" data-testid="nav-login" className={iconClass} aria-label="Login" title="Login">
                                <User className="size-[18px]" />
                            </Link>
                        )}
                        <button
                            type="button"
                            ref={searchButtonRef}
                            onClick={() => setSearchOpen(true)}
                            className={iconClass}
                            aria-label="Search"
                            aria-haspopup="dialog"
                            title="Search"
                            data-testid="nav-search"
                        >
                            <Search className="size-[18px]" />
                        </button>
                        <button
                            type="button"
                            onClick={openCart}
                            data-testid="nav-cart"
                            className={`${iconClass} relative`}
                            aria-label={`Open cart${mounted && cartCount > 0 ? `, ${cartCount} items` : ''}`}
                            aria-haspopup="dialog"
                            title="Cart"
                        >
                            <ShoppingCart className="size-[18px]" />
                            {mounted && cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-black">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile nav */}
                <nav className="md:hidden flex justify-center gap-6 pb-3" aria-label="Main mobile">
                    {navItems}
                </nav>
            </div>
            <SearchOverlay open={searchOpen} onClose={closeSearch} returnFocusRef={searchButtonRef} />
        </header>
    )
}
