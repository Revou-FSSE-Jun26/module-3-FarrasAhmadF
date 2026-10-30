"use client"

import { Product } from "@/components/ProductCard";
import { createContext, useCallback, useContext, useEffect, useState } from "react"

export interface CartItem extends Product {
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (p: Product) => void;
    updateQuantity: (id: number, quantity: number) => void;
    removeFromCart: (id: number) => void;
    clearCart: () => void;
    // Free-text order note. Kept client-side only for now (not sent to the backend).
    note: string;
    setNote: (note: string) => void;
    // Cart drawer visibility.
    isOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    // False until the cart has been read from localStorage.
    hydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart";
const NOTE_STORAGE_KEY = "cart-note";

export function CartProvider({children}: {children: React.ReactNode}) {
    // Always start empty so the first client render matches the server output (avoids hydration mismatch).
    const [items, setItems] = useState<CartItem[]>([]);
    const [note, setNote] = useState('');
    const [isOpen, setIsOpen] = useState(false);
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
            setNote(localStorage.getItem(NOTE_STORAGE_KEY) ?? '');
        } catch {
        }
        setHydrated(true);
    }, []);

    // Persist to localStorage whenever items/note change, but only after hydration is done
    // so the stored cart isn't immediately overwritten by [] on the first render.
    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }, [items, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(NOTE_STORAGE_KEY, note);
    }, [note, hydrated]);

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
    // Quantity below 1 removes the item.
    const updateQuantity = (id: number, quantity: number) =>
        setItems((prev) => quantity < 1
            ? prev.filter((it) => it.id !== id)
            : prev.map((it) => (it.id === id ? { ...it, quantity } : it)));
    const removeFromCart = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));
    const clearCart = () => { setItems([]); setNote(''); };
    // Stable references: CartDrawer's open/close effect depends on closeCart, and an
    // unstable function would re-run it (and steal focus) on every render.
    const openCart = useCallback(() => setIsOpen(true), []);
    const closeCart = useCallback(() => setIsOpen(false), []);

    return (
        <CartContext.Provider value={{items, addToCart, updateQuantity, removeFromCart, clearCart, note, setNote, isOpen, openCart, closeCart, hydrated}}>
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
