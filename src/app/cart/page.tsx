"use client"

import CartContents from "@/components/CartContents";
import { useCart } from "@/context/CartContext";

// Full-page fallback for the cart drawer (bookmarks, old links, direct URL).
// It renders the same CartContents as the drawer, so there's one source of truth.
export default function CartPage() {
    const { items } = useCart();
    const count = items.reduce((sum, it) => sum + it.quantity, 0);

    return (
        <main className="flex-1 bg-white text-black" data-testid="cart-page">
            <div className="mx-auto flex max-w-xl flex-col px-6 pb-16 pt-10">
                <h1 className="text-center text-2xl font-bold uppercase tracking-wide">
                    Cart <span className="text-sm font-normal normal-case text-neutral-600">({count} {count === 1 ? 'item' : 'items'})</span>
                </h1>
                <div className="mt-8 flex flex-col border border-neutral-200">
                    <CartContents />
                </div>
            </div>
        </main>
    );
}
