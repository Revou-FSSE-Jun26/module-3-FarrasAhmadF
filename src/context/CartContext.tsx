"use client"

import { Product } from "@/components/ProductCard";
import { createContext, useContext, useState } from "react"

interface CartContextType {
    items: Product[];
    addToCart: (p: Product) => void;
    removeFromCart: (id: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({children}: {children: React.ReactNode}) {
    const [items, setItems] = useState<Product[]>([]);
    const addToCart = (p: Product) => setItems((prev) => [...prev, p]);
    const removeFromCart = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));
    return (
        <CartContext.Provider value={{items, addToCart, removeFromCart}}>
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