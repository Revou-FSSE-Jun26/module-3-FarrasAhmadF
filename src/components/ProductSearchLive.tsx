"use client"

import { useState } from "react";
import ProductCard, { Product } from "./ProductCard";
import { useCart, CartItem } from "@/context/CartContext";

interface ProductSearchLiveProps {
    products: Product[];
};

function CartSummary({cart}: {cart: CartItem[]}) {
    const total = cart.reduce((sum, p) => sum + Number(p.price) * (p.quantity ?? 1), 0);
    const totalQty = cart.reduce((sum, p) => sum + (p.quantity ?? 1), 0);
    return (
        <div className="border-t border-gray-700 mt-6 pt-4 flex justify-between">
            <div>
                <p className="text-xs text-gray-400">Items in cart</p>
                <p className="font-bold">Total</p>
            </div>
            <div className="text-right">
                <p>{totalQty}</p>
                <p className="font-bold">$ {total.toLocaleString('en-US')}</p>
            </div>
        </div>
    );
};

export default function ProductSearchLive({products}: ProductSearchLiveProps) {
    const [query, setQuery] = useState('');
    const { items: cart } = useCart();
    const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="p-4">
            <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search products..." 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mb-4" />
            {filtered.length === 0 ? (
                <p className="text-gray-400">No products match "{query}".</p>
            ) : (
                <div className="flex gap-4 flex-wrap">
                {filtered.map((p) => (
                    <ProductCard key={p.id} product={p}/>
                    ))}
                </div>
            )}
            <CartSummary cart={cart} />
        </div>
    )
}