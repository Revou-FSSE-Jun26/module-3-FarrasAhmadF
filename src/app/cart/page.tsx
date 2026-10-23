"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext"

function CartPage() {
    const { items, removeFromCart, clearCart } = useCart();
    const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const { user } = useAuth()
    const router = useRouter();
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleCheckout() {
        if (!user) return;
        setError('');
        setSubmitting(true);

        const orderItems = items.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
        }));

        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        try {
            const res = await fetch(base + '/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, items: orderItems }),
            });

            if (res.status === 201) {
                setOrderPlaced(true);
                clearCart();
                setTimeout(() => router.push('/orders'), 1500);
            } else {
                const data = await res.json().catch(() => null);
                setError(data?.error || 'Failed to place order. Please try again.');
            }
        } catch {
            setError('Cannot reach server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="font-sans p-6 max-w-2xl">
            <header className="flex items-center gap-4 border-b pb-3 mb-4"> 
                <span className="font-bold text-lg">RevoShop</span>
                <span className="text-gray-500 text-sm">Products</span>
                <span className="text-gray-500 text-sm">{user?.username}</span>
                <span className="ml-auto text-sm">Cart ({totalQty})</span>
            </header>

            <h1 className="text-xl font-semibold mb-3">My cart</h1>

            {orderPlaced && (
                <p data-testid="checkout-success" className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
                    Order placed successfully
                </p>
            )}

            {items.length === 0 && !orderPlaced && <p className="text-gray-500 text-sm">Cart is empty</p>}

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500 border-b">
                        <th className="py-2">Product</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">Subtotal</th>
                        <th className="py-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((e) => (
                        <tr key={e.id} data-testid={`cart-item-${e.id}`} className="text-left text-gray-500 border-b">
                            <td className="py-2">{e.name}</td>
                            <td className="py-2">{e.price.toLocaleString('id-ID')}</td>
                            <td className="py-2">{e.quantity}</td>
                            <td className="py-2">{(e.price * e.quantity).toLocaleString('id-ID')}</td>
                            <td className="py-2">
                                <button onClick={() => removeFromCart(e.id)}>x</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-center mt-4 pt-3 border-t">
                <span className="text-gray-500">Total</span>
                <span data-testid="cart-total" className="font-bold text-lg">{total.toLocaleString('id-ID')}</span>
            </div>

            {error && (
                <p data-testid="checkout-error" className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm">
                    {error}
                </p>
            )}

            <button
            data-testid="checkout-button"
            onClick={handleCheckout}
            disabled={items.length === 0 || submitting}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Placing order...' : 'Proceed to Checkout'}</button>
        </main>
    )
}

export default function App() {
    return (
        <ProtectedRoute>
            <CartPage />
        </ProtectedRoute>
    )
}