"use client"

import { Product } from "@/components/ProductCard";
import { createContext, useContext, useEffect, useState } from "react"

export interface CartItem extends Product {
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (p: Product) => void;
    removeFromCart: (id: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart";

export function CartProvider({children}: {children: React.ReactNode}) {
    // Always start empty so the first client render matches the server output (avoids hydration mismatch).
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // After mounting in the browser, read the cart from localStorage.
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Array<Product & { quantity?: number }>;
                // Normalize items from older cart formats that didn't store quantity.
                const normalized: CartItem[] = parsed.map((it) => ({
                    ...it,
                    quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1,
                }));
                setItems(normalized);
            }
        } catch {
        }
        setHydrated(true);
    }, []);

    // Persist to localStorage whenever items change, but only after hydration is done
    // so the stored cart isn't immediately overwritten by [] on the first render.
    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }, [items, hydrated]);

    const addToCart = (p: Product) =>
        setItems((prev) => {
            const existing = prev.find((it) => it.id === p.id);
            if (existing) {
                return prev.map((it) =>
                    it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it
                );
            }
            return [...prev, { ...p, quantity: 1 }];
        });
    const removeFromCart = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));
    const clearCart = () => setItems([]);
    return (
        <CartContext.Provider value={{items, addToCart, removeFromCart, clearCart}}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used inside CartProvider');
    }
    return context;
}