"use client"

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartContents from "./CartContents";

// Must match the duration-300 transition classes below.
const CLOSE_DURATION_MS = 300;

export default function CartDrawer() {
    const { items, isOpen, closeCart } = useCart();
    const closeRef = useRef<HTMLButtonElement>(null);
    const count = items.reduce((sum, it) => sum + it.quantity, 0);

    // Keep the drawer visible while it slides out, then hide it once the animation is done.
    // `closing` is flipped on during render when isOpen goes true -> false.
    const [prevOpen, setPrevOpen] = useState(isOpen);
    const [closing, setClosing] = useState(false);
    if (prevOpen !== isOpen) {
        setPrevOpen(isOpen);
        setClosing(!isOpen);
    }
    useEffect(() => {
        if (!closing) return;
        const t = setTimeout(() => setClosing(false), CLOSE_DURATION_MS);
        return () => clearTimeout(t);
    }, [closing]);
    const visible = isOpen || closing;

    // While open: close on Escape, lock page scroll, and move focus into the drawer.
    useEffect(() => {
        if (!isOpen) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
        const prevOverflow = document.body.style.overflow;

        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen, closeCart]);

    return (
        <div
            className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'} ${visible ? '' : 'invisible'}`}
            inert={!isOpen}
        >
            {/* Overlay */}
            <div
                aria-hidden
                onClick={closeCart}
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="cart-drawer-title"
                data-testid="cart-drawer"
                className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white text-black shadow-xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between px-5 pb-2 pt-5">
                    <h2 id="cart-drawer-title" className="text-sm font-bold uppercase tracking-wide">
                        Cart <span className="ml-1 text-[11px] font-normal normal-case text-neutral-600">({count} {count === 1 ? 'item' : 'items'})</span>
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={closeCart}
                        className="cursor-pointer text-neutral-600 hover:text-black"
                        aria-label="Close cart"
                        data-testid="cart-close"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                <CartContents />
            </aside>
        </div>
    );
}
