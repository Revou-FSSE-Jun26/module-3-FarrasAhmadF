"use client"

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext"

function CartPage() {
    const { items, removeFromCart } = useCart();
    const total = items.reduce((sum, i) => sum + i.price, 0);
    const { user } = useAuth()

    return (
        <main className="font-sans p-6 max-w-2xl">
            <header className="flex items-center gap-4 border-b pb-3 mb-4"> 
                <span className="font-bold text-lg">RevoShop</span>
                <span className="text-gray-500 text-sm">Products</span>
                <span className="text-gray-500 text-sm">{user?.username}</span>
                <span className="ml-auto text-sm">Cart ({items.length})</span>
            </header>

            <h1 className="text-xl font-semibold mb-3">My cart</h1>
            {items.length === 0 && <p className="text-gray-500 text-sm">Cart is empty</p>}

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500 border-b">
                        <th className="py-2">Product</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Subtotal</th>
                        <th className="py-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((e) => (
                        <tr key={e.id} className="text-left text-gray-500 border-b">
                            <td className="py-2">{e.name}</td>
                            <td className="py-2">{e.price.toLocaleString('id-ID')}</td>
                            <td className="py-2">{e.price.toLocaleString('id-ID')}</td>
                            <td className="py-2">
                                <button onClick={() => removeFromCart(e.id)}>x</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-center mt-4 pt-3 border-t">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-lg">{total}</span>
            </div>

            <button    
            disabled={items.length === 0}
            className="w-full mt-4 px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50">Proceed to Checkout</button>
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