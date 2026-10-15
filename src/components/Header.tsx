"use client"

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS =[
    {href: '/', label: 'Home'},
    {href: '/products', label: 'Products'},
    {href: '/categories', label: 'Categories'},
    {href: '/orders', label: 'Orders'},
];

export default function Header() {
    const { user, isLoggedIn, logout } = useAuth();
    const pathname = usePathname();
    const isActive = (href: string) => pathname === href;

    return (
        <header className="flex justify-between items-center border-b px-6 py-3">
            <span className="font-bold text-lg">RevoShop</span>
            <div className="flex items-center gap-6">
                <nav className="flex gap-4 text-sm text-gray-600">
                    {NAV_LINKS.map((e) => (
                        <Link 
                        key={e.href} 
                        href={e.href} 
                        className={isActive(e.href) ? 'font-semibold text-blue-600 underline cursor-pointer' : 'text-gray-500 hover:text-black cursor-pointer'}>{e.label}</Link>
                    ))}
                </nav>
                {isLoggedIn ? (
                    <div className="flex gap-4 items-center text-sm">
                        <span>Hi, {user?.username}</span>
                        <button onClick={logout} className="text-gray-500 hover:text-black cursor-pointer">Logout</button>
                    </div>
                ) : (
                    <div className="flex gap-4 items-center text-sm">
                        <Link href='/login' className="text-gray-500 hover:text-black cursor-pointer">Login</Link>
                    </div>
                )}
            </div>
        </header>
    )
}