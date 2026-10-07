"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS =[
    {href: '/', label: 'Home'},
    {href: '/products', label: 'Products'},
    {href: '/categories', label: 'Categories'},
    {href: '/orders', label: 'Orders'},
];

export default function Header() {
    const pathname = usePathname();
    const isActive = (href: string) => pathname === href;

    return (
        <header className="flex justify-between items-center border-b px-6 py-3">
            <span className="font-bold text-lg">RevoShop</span>
            <nav className="flex gap-4 text-sm text-gray-600 mr-3">
                {NAV_LINKS.map((e) => (
                    <Link 
                    key={e.href} 
                    href={e.href} 
                    className={isActive(e.href) ? 'font-semibold text-blue-600 underline cursor-pointer' : 'text-gray-500 hover:text-black cursor-pointer'}>{e.label}</Link>
                ))}
            </nav>
        </header>
    )
}