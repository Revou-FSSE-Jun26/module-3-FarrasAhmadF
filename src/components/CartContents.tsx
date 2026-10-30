"use client"

import Link from "next/link";
import { useId } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Minus, Plus, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "./ProductCard";

import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout";

/**
 * Cart body shared by the slide-out drawer and the /cart page:
 * item list, order note, subtotal and the checkout button.
 */
export default function CartContents() {
    const { items, updateQuantity, removeFromCart, note, setNote, closeCart } = useCart();
    const { isLoggedIn, loading } = useAuth();
    const router = useRouter();
    const noteId = useId();

    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const isEmpty = items.length === 0;

    function handleCheckout() {
        closeCart();
        router.push('/checkout');
    }

    if (isEmpty) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <p className="text-sm text-neutral-600">Your cart is empty.</p>
                <Link
                    href="/products"
                    onClick={closeCart}
                    className="rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <p className="border-b border-neutral-200 px-5 py-3 text-xs text-neutral-700">
                {freeShipping
                    ? 'FREE shipping will be applied at checkout'
                    : `Spend ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for FREE shipping`}
            </p>

            {/* Items */}
            <ul className="min-h-0 flex-1 divide-y divide-neutral-200 overflow-y-auto px-5">
                {items.map((item) => {
                    const href = `/products/${encodeURIComponent(item.slug || String(item.id))}`;
                    const atMax = item.stock_quantity > 0 && item.quantity >= item.stock_quantity;
                    return (
                        <li key={item.id} data-testid={`cart-item-${item.id}`} className="flex gap-4 py-5">
                            <Link href={href} onClick={closeCart} className="size-20 shrink-0 overflow-hidden bg-[#f5f5f5]">
                                {item.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image} alt={item.name} className="size-full object-cover" />
                                ) : (
                                    <span className="flex size-full items-center justify-center text-neutral-300">
                                        <Coffee className="size-8" strokeWidth={1} aria-hidden />
                                    </span>
                                )}
                            </Link>

                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <div className="flex justify-between gap-3">
                                    <Link href={href} onClick={closeCart} className="text-xs font-semibold leading-snug hover:underline">
                                        {item.name}
                                    </Link>
                                    <span className="shrink-0 text-xs" data-testid={`cart-item-subtotal-${item.id}`}>
                                        {formatPrice(Number(item.price) * item.quantity)}
                                    </span>
                                </div>
                                {item.category && <p className="text-[11px] text-neutral-500">{item.category}</p>}

                                <div className="mt-auto flex items-center gap-4">
                                    <div className="flex items-center border border-neutral-300">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="flex size-7 cursor-pointer items-center justify-center text-neutral-600 hover:text-black"
                                            aria-label={`Decrease quantity of ${item.name}`}
                                            data-testid={`cart-decrease-${item.id}`}
                                        >
                                            <Minus className="size-3" aria-hidden />
                                        </button>
                                        <span className="w-8 text-center text-xs" aria-live="polite" data-testid={`cart-qty-${item.id}`}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            disabled={atMax}
                                            className="flex size-7 cursor-pointer items-center justify-center text-neutral-600 hover:text-black disabled:cursor-not-allowed disabled:text-neutral-300"
                                            aria-label={`Increase quantity of ${item.name}`}
                                            data-testid={`cart-increase-${item.id}`}
                                        >
                                            <Plus className="size-3" aria-hidden />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(item.id)}
                                        className="cursor-pointer text-[11px] text-neutral-600 underline underline-offset-4 hover:text-black"
                                        data-testid={`cart-remove-${item.id}`}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Footer: note, subtotal, checkout */}
            <div className="border-t border-neutral-200 px-5 pb-5 pt-3">
                <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-xs text-neutral-700 [&::-webkit-details-marker]:hidden">
                        <label htmlFor={noteId} className="cursor-pointer">Add order notes</label>
                        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <textarea
                        id={noteId}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="How can we help you?"
                        className="mt-1 w-full resize-none border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-black"
                        data-testid="cart-note"
                    />
                </details>

                <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-semibold" data-testid="cart-total">{formatPrice(subtotal)}</span>
                </div>

                {loading ? null : isLoggedIn ? (
                    <button
                        type="button"
                        onClick={handleCheckout}
                        data-testid="checkout-button"
                        className="mt-3 w-full cursor-pointer rounded-full bg-black py-3 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
                    >
                        Checkout · {formatPrice(subtotal)}
                    </button>
                ) : (
                    <Link
                        href="/login?next=%2Fcheckout"
                        onClick={closeCart}
                        data-testid="login-to-checkout"
                        className="mt-3 block w-full rounded-full bg-black py-3 text-center text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
                    >
                        Login to Checkout
                    </Link>
                )}
                <p className="mt-2 text-center text-[11px] text-neutral-500">Shipping &amp; taxes calculated at checkout</p>
            </div>
        </div>
    );
}
