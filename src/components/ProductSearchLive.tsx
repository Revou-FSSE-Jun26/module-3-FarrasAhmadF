"use client"

import { useState } from "react";
import ProductCard, { Product } from "./ProductCard";
import { ProductFormData } from "./Validate";

interface ProductSearchLiveProps {
    products: Product[];
};

function CartSummary({cart}: {cart: Product[]}) {
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    return (
        <div className="border-t border-gray-700 mt-6 pt-4 flex justify-between">
            <div>
                <p className="text-xs text-gray-400">Items in cart</p>
                <p className="font-bold">Total</p>
            </div>
            <div className="text-right">
                <p>{cart.length}</p>
                <p className="font-bold">Rp {total.toLocaleString('id-ID')}</p>
            </div>
        </div>
    );
};

export default function ProductSearchLive({products}: ProductSearchLiveProps) {
    const [query, setQuery] = useState('');
    const [cart, setCart] = useState<Product[]>([])
    const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    const addToCart = (product: Product) => setCart([...cart, product]);

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
                    <ProductCard key={p.id} product={p} onAdd={addToCart}/>
                    ))}
                </div>
            )}
            <CartSummary cart={cart} />
        </div>
    )
}