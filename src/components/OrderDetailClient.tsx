"use client"

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleCheck, CircleX, Coffee, Loader, MapPin, MessageSquare, PackageCheck, ShoppingBag } from "lucide-react";
import ProtectedRoute from "./ProtectedRoute";
import CancelOrderButton from "./CancelOrderButton";
import OrderStatusEditor from "./OrderStatusEditor";
import { formatPrice } from "./ProductCard";
import { apiFetch } from "@/lib/api";
import {
    Order, OrderStatus, PAYMENT_LABELS, SHIPPING_LABELS, STATUS_STYLES, formatDateTime, itemName, normalizeOrder,
} from "@/lib/orders";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "not-found" } | { status: "ok"; order: Order };

interface ActivityEntry {
    title: string;
    Icon: typeof ShoppingBag;
    state: "done" | "current" | "cancelled";
    time?: string;
}

// Newest first, like the reference. The backend only stores ordered_at, so later
// steps have no timestamp yet.
function activityFor(order: Order): ActivityEntry[] {
    const placed: ActivityEntry = { title: "Order Placed", Icon: ShoppingBag, state: "done", time: formatDateTime(order.ordered_at) };
    const byStatus: Record<OrderStatus, ActivityEntry[]> = {
        pending: [{ title: "Order Processing", Icon: Loader, state: "current" }, placed],
        completed: [
            { title: "Order Completed", Icon: PackageCheck, state: "done" },
            { title: "Order Processed", Icon: Loader, state: "done" },
            placed,
        ],
        cancelled: [{ title: "Order Cancelled", Icon: CircleX, state: "cancelled" }, placed],
    };
    return byStatus[order.status] ?? [placed];
}

function StatusPill({status}: {status: OrderStatus}) {
    return (
        <span className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`} data-testid="order-status">
            {status}
        </span>
    );
}

function DetailRow({label, value}: {label: string; value?: React.ReactNode}) {
    return (
        <div className="grid grid-cols-[110px_1fr] gap-3 py-1.5 text-sm">
            <dt className="font-medium">{label}</dt>
            <dd className="break-words text-neutral-600">{value || "N/A"}</dd>
        </div>
    );
}

function OrderDetail({id, admin = false}: {id: string; admin?: boolean}) {
    const listHref = admin ? "/dashboard/orders" : "/orders";
    const listLabel = admin ? "Orders List" : "My Orders";
    const [loaded, setState] = useState<LoadState>({ status: "loading" });
    const [csNotice, setCsNotice] = useState(false);
    const activityRef = useRef<HTMLElement>(null);

    const validId = /^\d+$/.test(id);

    useEffect(() => {
        if (!validId) return;
        apiFetch("/orders/" + id)
            .then(async (res) => {
                if (res.status === 404) return setState({ status: "not-found" });
                if (!res.ok) throw new Error(String(res.status));
                setState({ status: "ok", order: normalizeOrder(await res.json()) });
            })
            .catch(() => setState({ status: "error", message: "Failed to load this order. Please try again." }));
    }, [id, validId]);

    const state: LoadState = validId ? loaded : { status: "not-found" };

    if (state.status === "loading") {
        return (
            <main className="flex-1 bg-neutral-50" aria-busy="true">
                <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1fr_300px]">
                    <div className="h-96 animate-pulse rounded-md bg-neutral-200" />
                    <div className="h-64 animate-pulse rounded-md bg-neutral-200" />
                </div>
            </main>
        );
    }

    if (state.status !== "ok") {
        return (
            <main className="flex-1 bg-white text-black">
                <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center" data-testid="order-not-found">
                    <h1 className="text-2xl font-light">{state.status === "error" ? "Something went wrong" : "Order not found"}</h1>
                    <p className="mt-2 text-sm text-neutral-500">
                        {state.status === "error" ? state.message : admin ? "This order doesn't exist." : "This order doesn't exist or doesn't belong to your account."}
                    </p>
                    <Link href={listHref} className="mt-6 rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                        Back to {listLabel}
                    </Link>
                </div>
            </main>
        );
    }

    const order = state.order;
    const items = order.items ?? [];
    const subtotal = items.reduce((sum, i) => sum + i.price_at_order * i.quantity, 0);
    const shipping = order.shipping_cost ?? 0;
    const name = [order.first_name, order.last_name].filter(Boolean).join(" ");
    const address = [order.address, order.apartment].filter(Boolean).join(", ");
    const shippingMethod = order.shipping_method ? SHIPPING_LABELS[order.shipping_method] ?? order.shipping_method : undefined;
    const paymentMethod = order.payment_method ? PAYMENT_LABELS[order.payment_method] ?? order.payment_method : undefined;
    const activity = activityFor(order);

    function trackOrder() {
        // UI only: there's no tracking provider yet, so this jumps to the activity timeline.
        activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        activityRef.current?.focus({ preventScroll: true });
    }

    return (
        <main className="flex-1 bg-neutral-50 text-black" data-testid="order-detail-page">
            <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
                <nav aria-label="Breadcrumb" className="text-[11px] text-neutral-600">
                    <Link href={listHref} className="hover:underline">{listLabel}</Link>
                    <span className="mx-1.5">/</span>
                    <span className="text-black">#{order.id}</span>
                </nav>
                <h1 className="mt-2 text-2xl font-bold">Order Detail</h1>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-6">
                        {/* Order card */}
                        <section aria-labelledby="order-number" className="rounded-md bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 id="order-number" className="flex-1 text-base font-semibold">Order Number #{order.id}</h2>
                                {admin ? <StatusPill status={order.status} /> : <>
                                <button
                                    type="button"
                                    onClick={() => setCsNotice((v) => !v)}
                                    aria-expanded={csNotice}
                                    className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:border-black"
                                    data-testid="message-cs"
                                >
                                    <MessageSquare className="size-3.5" aria-hidden /> Message Customer Service
                                </button>
                                <button
                                    type="button"
                                    onClick={trackOrder}
                                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs text-white hover:bg-neutral-800"
                                    data-testid="track-order"
                                >
                                    <MapPin className="size-3.5" aria-hidden /> Track Order
                                </button>
                                </>}
                            </div>
                            {csNotice && (
                                <p role="status" className="mt-3 rounded-md bg-neutral-100 px-4 py-3 text-xs text-neutral-700">
                                    Customer service chat is coming soon. Please mention order #{order.id} when you contact us.
                                </p>
                            )}

                            <ul className="mt-4 divide-y divide-neutral-200 rounded-md border border-neutral-200">
                                {items.map((item) => (
                                    <li key={item.product_id} className="flex items-center gap-4 p-3" data-testid={`order-item-${item.product_id}`}>
                                        <div className="size-14 shrink-0 overflow-hidden rounded-md bg-[#f5f5f5]">
                                            {item.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.image} alt="" className="size-full object-cover" />
                                            ) : (
                                                <span className="flex size-full items-center justify-center text-neutral-300">
                                                    <Coffee className="size-6" strokeWidth={1} aria-hidden />
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {item.slug ? (
                                                <Link href={`/products/${encodeURIComponent(item.slug)}`} className="text-sm hover:underline">{itemName(item)}</Link>
                                            ) : (
                                                <p className="text-sm">{itemName(item)}</p>
                                            )}
                                            <p className="text-xs text-neutral-500">{item.category ?? "Uncategorized"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">{formatPrice(item.price_at_order * item.quantity)}</p>
                                            <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-5 grid gap-6 sm:grid-cols-2">
                                <div className="text-xs">
                                    <p className="font-semibold">Order Note:</p>
                                    <p className="mt-1 whitespace-pre-line text-neutral-600" data-testid="order-note">{order.note || "No note"}</p>
                                </div>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-neutral-600">Subtotal</dt>
                                        <dd data-testid="order-subtotal">{formatPrice(subtotal)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-neutral-600">Shipping{shippingMethod ? ` (${shippingMethod})` : ""}</dt>
                                        <dd data-testid="order-shipping">{shipping === 0 ? "FREE" : formatPrice(shipping)}</dd>
                                    </div>
                                    <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold">
                                        <dt>Total</dt>
                                        <dd data-testid="order-total">{formatPrice(order.total_price)}</dd>
                                    </div>
                                </dl>
                            </div>

                            {admin ? (
                                <div className="mt-5 border-t border-neutral-200 pt-4">
                                    <OrderStatusEditor order={order} onUpdated={(o) => setState({ status: "ok", order: o })} />
                                </div>
                            ) : order.status === "pending" && (
                                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
                                    <CancelOrderButton order={order} onCancelled={(o) => setState({ status: "ok", order: o })} />
                                </div>
                            )}
                        </section>

                        {/* Customer details */}
                        <details open className="group rounded-md bg-white p-5 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                                <h2 className="text-base font-semibold">Customer Details</h2>
                                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                            </summary>
                            <div className="mt-4 grid gap-x-10 md:grid-cols-2" data-testid="customer-details">
                                <dl>
                                    <DetailRow label="Name" value={name} />
                                    {admin && <DetailRow label="Account" value={order.username ? `${order.username} (#${order.user_id})` : `#${order.user_id}`} />}
                                    <DetailRow label="Email" value={order.email} />
                                    <DetailRow label="Company" value={order.company} />
                                    <DetailRow label="Address" value={address} />
                                    <DetailRow label="City" value={order.city} />
                                    <DetailRow label="Province" value={order.province} />
                                </dl>
                                <dl>
                                    <DetailRow label="Mobile" value={order.phone} />
                                    <DetailRow label="Postal Code" value={order.postal_code} />
                                    <DetailRow label="Country" value={order.country} />
                                    <DetailRow label="Shipping" value={shippingMethod} />
                                    <DetailRow label="Payment" value={paymentMethod} />
                                    <DetailRow label="Status" value={<StatusPill status={order.status} />} />
                                </dl>
                            </div>
                        </details>
                    </div>

                    {/* Activity */}
                    <section
                        ref={activityRef}
                        tabIndex={-1}
                        aria-labelledby="order-activity"
                        className="scroll-mt-6 rounded-md bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                        <h2 id="order-activity" className="text-base font-semibold">Activity</h2>
                        <ol className="mt-4" data-testid="order-activity">
                            {activity.map((a, i) => (
                                <li key={a.title} className="relative flex gap-3 pb-6 last:pb-0">
                                    {i < activity.length - 1 && <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-neutral-200" />}
                                    <span className="relative z-10 mt-0.5 shrink-0" aria-hidden>
                                        {a.state === "done" ? (
                                            <CircleCheck className="size-4 fill-black text-white" />
                                        ) : a.state === "cancelled" ? (
                                            <CircleX className="size-4 fill-red-600 text-white" />
                                        ) : (
                                            <span className="block size-4 rounded-full border-2 border-black bg-white" />
                                        )}
                                    </span>
                                    <a.Icon className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm ${a.state === "cancelled" ? "text-red-700" : ""} ${a.state === "current" ? "font-semibold" : ""}`}>
                                            {a.title}
                                            {a.state === "current" && <span className="sr-only"> (in progress)</span>}
                                        </p>
                                        <p className="text-xs text-neutral-500">Order #{order.id}{paymentMethod ? ` · ${paymentMethod}` : ""}</p>
                                    </div>
                                    {a.time && <span className="shrink-0 text-[11px] text-neutral-500">{a.time}</span>}
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            </div>
        </main>
    );
}

/** Admin version, rendered inside /dashboard (already guarded by AdminRoute). */
export function AdminOrderDetail({id}: {id: string}) {
    return <OrderDetail id={id} admin />;
}

export default function OrderDetailClient({id}: {id: string}) {
    return (
        <ProtectedRoute>
            <OrderDetail id={id} />
        </ProtectedRoute>
    );
}
