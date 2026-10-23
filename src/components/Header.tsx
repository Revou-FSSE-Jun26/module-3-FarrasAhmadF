"use client"

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";


const emptySubscribe = () => () => {};
function useMounted() {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,   // client snapshot
        () => false,  // server snapshot
    );
}

const NAV_LINKS =[
    {href: '/', label: 'Home'},
    {href: '/products', label: 'Products'},
    {href: '/categories', label: 'Categories'},
    {href: '/orders', label: 'Orders'},
];

export default function Header() {
    const { user, isLoggedIn, loading, logout } = useAuth();
    const pathname = usePathname();
    const isActive = (href: string) => pathname === href;

    const mounted = useMounted();

    return (
        <header className="flex justify-between items-center border-b px-6 py-3">
            <h1 className="font-bold text-lg" data-testid="home-heading">RevoShop</h1>
            <div className="flex items-center gap-6">
                <nav className="flex gap-4 text-sm text-gray-600">
                    {NAV_LINKS.map((e) => (
                        <Link 
                        key={e.href} 
                        href={e.href} 
                        className={isActive(e.href) ? 'font-semibold text-blue-600 underline cursor-pointer' : 'text-gray-500 hover:text-black cursor-pointer'}>{e.label}</Link>
                    ))}
                </nav>
                {!mounted || loading ? null : isLoggedIn ? (
                    <div className="flex gap-4 items-center text-sm">
                        <Link href='/cart' data-testid='nav-cart' className="text-gray-500 hover:text-black cursor-pointer">Cart</Link>
                        <span data-testid='nav-username'>Hi, {user?.username}</span>
                        <button onClick={logout} data-testid='nav-logout' className="text-gray-500 hover:text-black cursor-pointer">Logout</button>
                    </div>
                ) : (
                    <div className="flex gap-4 items-center text-sm">
                        <Link href='/login' className="text-gray-500 hover:text-black cursor-pointer" data-testid="nav-login">Login</Link>
                    </div>
                )}
            </div>
        </header>
    )
}