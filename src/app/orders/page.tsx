"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import OrderProgress from "@/components/OrderProgress";
import CancelOrderButton from "@/components/CancelOrderButton";
import { formatPrice } from "@/components/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Order, formatOrderedAt, itemName, normalizeOrder } from "@/lib/orders";

type Tab = "upcoming" | "previous";

function StatusBadge({order}: {order: Order}) {
    if (order.status === "cancelled") {
        return (
            <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-red-700" data-testid={`order-status-${order.id}`}>
                Cancelled
            </span>
        );
    }
    if (order.status === "completed") {
        return (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-black" data-testid={`order-status-${order.id}`}>
                Completed
            </span>
        );
    }
    return null;
}

function OrderCard({order, onCancelled}: {order: Order; onCancelled: (updated: Order) => void}) {
    const items = order.items ?? [];
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const first = items[0];
    const names = items.map(itemName);
    const title = names.length === 0 ? "Order" : names.length === 1 ? names[0] : `${names[0]} & ${names.length - 1} more`;

    return (
        <li className="rounded-md border border-neutral-200 bg-white p-5" data-testid={`order-${order.id}`}>
            <div className="flex flex-wrap items-start gap-4">
                <div className="size-14 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-[#f5f5f5]">
                    {first?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={first.image} alt="" className="size-full object-cover" />
                    ) : (
                        <span className="flex size-full items-center justify-center text-neutral-300">
                            <Coffee className="size-6" strokeWidth={1} aria-hidden />
                        </span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Order no #{order.id}</p>
                    <p className="truncate text-xs text-neutral-600">{title}</p>
                    <p className="mt-1 text-sm" data-testid={`order-total-${order.id}`}>{formatPrice(order.total_price)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <Link
                        href={`/orders/${order.id}`}
                        className="rounded-full bg-black px-5 py-2 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
                        data-testid={`order-details-${order.id}`}
                    >
                        Order Details
                    </Link>
                    {order.status === "pending" ? <CancelOrderButton order={order} onCancelled={onCancelled} /> : <StatusBadge order={order} />}
                </div>
            </div>

            {order.status !== "cancelled" && (
                <div className="mt-5">
                    <OrderProgress status={order.status} />
                </div>
            )}

            <p className="mt-4 text-xs text-neutral-600">
                <span className="font-semibold text-black">{itemCount} {itemCount === 1 ? "Item" : "Items"}</span>
                {" • "}Ordered {formatOrderedAt(order.ordered_at)}
            </p>
        </li>
    );
}

function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [tab, setTab] = useState<Tab>("upcoming");

    useEffect(() => {
        if (!user) return;
        // The backend only returns the logged-in user's orders. 404 means "no orders yet".
        apiFetch("/orders")
            .then(async (res) => {
                if (res.status === 404) return [];
                if (!res.ok) throw new Error(String(res.status));
                return res.json() as Promise<Order[]>;
            })
            .then((list) => setOrders(list.map(normalizeOrder).sort((a, b) => b.id - a.id)))
            .catch(() => setLoadError("Failed to load orders. Please try again."))
            .finally(() => setLoading(false));
    }, [user]);

    const upcoming = orders.filter((o) => o.status === "pending");
    const previous = orders.filter((o) => o.status !== "pending");
    const visible = tab === "upcoming" ? upcoming : previous;

    const tabs: { id: Tab; label: string; count: number }[] = [
        { id: "upcoming", label: "Upcoming Orders", count: upcoming.length },
        { id: "previous", label: "Previous Orders", count: previous.length },
    ];

    const replaceOrder = (updated: Order) =>
        setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));

    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto max-w-3xl px-6 pb-16 pt-10">
                <h1 className="text-3xl font-bold uppercase tracking-wide">My Orders</h1>

                <div role="tablist" aria-label="Orders" className="mt-6 flex gap-8 border-b border-neutral-200">
                    {tabs.map((t) => {
                        const selected = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                id={`orders-tab-${t.id}`}
                                aria-selected={selected}
                                aria-controls="orders-panel"
                                onClick={() => setTab(t.id)}
                                className={`-mb-px cursor-pointer border-b-2 pb-3 text-sm transition-colors ${
                                    selected ? "border-black font-medium text-black" : "border-transparent text-neutral-500 hover:text-black"
                                }`}
                                data-testid={`orders-tab-${t.id}`}
                            >
                                {t.label} ({loading ? "…" : t.count})
                            </button>
                        );
                    })}
                </div>

                <div id="orders-panel" role="tabpanel" aria-labelledby={`orders-tab-${tab}`} className="mt-6">
                    {loading ? (
                        <ul className="space-y-4" aria-busy="true">
                            {[0, 1].map((i) => (
                                <li key={i} className="h-40 animate-pulse rounded-md bg-neutral-100" />
                            ))}
                        </ul>
                    ) : loadError ? (
                        <p role="alert" className="py-16 text-center text-sm text-red-600">{loadError}</p>
                    ) : visible.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center" data-testid="orders-empty">
                            <p className="text-sm text-neutral-600">
                                {tab === "upcoming" ? "You have no upcoming orders." : "You have no previous orders."}
                            </p>
                            <Link
                                href="/products"
                                className="mt-5 rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
                            >
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {visible.map((o) => (
                                <OrderCard key={o.id} order={o} onCancelled={replaceOrder} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function App() {
    return (
        <ProtectedRoute>
            <OrdersPage />
        </ProtectedRoute>
    );
}
