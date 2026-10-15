"use client"

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

interface Order {
    id: number;
    user_id: number;
    total_price: number;
    status: string;
    ordered_at: string;
    deleted_at?: string;
}

function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;

    useEffect(() => {
        if (!user) return;
        fetch(base + '/orders')
            .then((e) => e.json())
            .then((data: Order[]) => {
                const myOrders = data.filter((o) => o.user_id === user.id);
                setOrders(myOrders);
                setLoading(false);
            });
    }, [user])

    return (
        <main className="font-sans p-6 min-h-screen bg-linear-to-bl from-white via-purple-100 to-purple-300">
            <header className="flex items-center gap-2 mb-5">
                <span className="font-bold text-xl text-blue-900">Orders</span>
                <span className="ml-auto text-sm text-gray-600">Hi, {user?.username}</span>
            </header>
            {loading ? (
                <p className="text-sm text-gray-600">Loading orders...</p>
            ) : orders.length === 0 ? (
                <p className="text-sm text-gray-600">You have no orders yet.</p>
            ) : (
                <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-3 text-blue-900 font-bold">Order ID</th>
                            <th className="p-3 text-blue-900 font-bold">Status</th>
                            <th className="p-3 text-blue-900 font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr key={o.id} className="border-t">
                                <td className="p-3 text-blue-900">{o.id}</td>
                                <td className="p-3 text-blue-900">{o.status}</td>
                                <td className="p-3 text-blue-900">Rp {o.total_price.toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    )
}

export default function App() {
    return (
        <ProtectedRoute>
            <OrdersPage />
        </ProtectedRoute>
    )
}