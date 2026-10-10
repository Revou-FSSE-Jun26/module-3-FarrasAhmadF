"use client"

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Product } from "./ProductCard";
import { useState } from "react";

export default function ProductsPageSearch({products}: {products: Product[]}) {
    const router = useRouter();
    const search = useSearchParams().get('search');
    const [query, setQuery] = useState(search ?? '');

    const visible = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products;

    return (
        <main>
            <div className="font-sans p-6">
                <Link href="/products" className="text-sm text-blue-600 hover:underline">
                    &larr; Back to products
                </Link>
                <p className="text-gray-400 text-mono text-xs mb-3 mt-3">localhost:3000/products/search{search ? `?search=${search}` : ''}</p>
                <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)} 
                onKeyDown={(e) => {
                    if (e.key === 'Enter') 
                        router.push(`/products/search?search=${encodeURIComponent(query)}`)
                }}
                placeholder="Search products..." 
                className="w-full border rounded-lg px-3 py-2 mb-3" />
                <div className="grid gap-3">
                    {visible.map((e) => (
                        <div key={e.id} className="border rounded-lg p-4">
                            <h2 className="font-semibold">{e.name}</h2>
                            <p className="text-gray-600 text-sm">{e.price}</p>
                            <span className={e.stock_quantity > 0 ? 'text-xs text-green-700 bg-green-100 rounded px-2 py-0.5' : 'text-xs text-red-700 bg-red-100 rounded px-2 py-0.5'}>
                                {e.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}