"use client"

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { Product } from "./ProductCard";

export default function AddToCartButton({product}: {product: Product}) {
    const { addToCart, openCart } = useCart();
    const [added, setAdded] = useState(false);
    const soldOut = product.stock_quantity <= 0;

    // Reset the "Added" feedback after a short delay.
    useEffect(() => {
        if (!added) return;
        const t = setTimeout(() => setAdded(false), 2000);
        return () => clearTimeout(t);
    }, [added]);

    return (
        <>
            <button
                type="button"
                data-testid={`add-to-cart-${product.id}`}
                disabled={soldOut}
                onClick={() => { addToCart(product); setAdded(true); openCart(); }}
                className="w-full border border-black py-3 text-[11px] font-bold uppercase tracking-[0.25em] transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:bg-transparent"
            >
                {soldOut ? "Sold Out" : added ? "Added to Cart" : "Add to Cart"}
            </button>
            {/* Announce the result to screen readers */}
            <p className="sr-only" aria-live="polite">{added ? `${product.name} added to cart` : ""}</p>
        </>
    );
}
