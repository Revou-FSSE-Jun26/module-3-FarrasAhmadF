"use client"

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Ellipsis, ListFilter, Search } from "lucide-react";
import { PAGE_SIZES, Pagination, SortIcon, SortState, ariaSort, nextSort } from "@/components/AdminTable";
import { formatPrice } from "@/components/ProductCard";
import { apiFetch } from "@/lib/api";
import {
    Order, OrderStatus, PAYMENT_LABELS, STATUS_STYLES, customerName, itemName, normalizeOrder, updateOrderStatus,
} from "@/lib/orders";

type SortKey = "id" | "customer" | "amount" | "status";
type StatusFilter = "all" | OrderStatus;
type Toast = { kind: "success" | "error"; text: string } | null;

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });
const formatDate = (raw: string) => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "-" : dateFmt.format(d);
};
/** yyyy-mm-dd in local time, comparable with <input type="date"> values. */
const toDateKey = (raw: string) => {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function StatusBadge({status}: {status: OrderStatus}) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {status}
        </span>
    );
}

/** "…" menu with quick status actions for pending orders. */
function QuickActions({order, busy, onSet}: {order: Order; busy: boolean; onSet: (status: OrderStatus) => void}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const disabled = busy || order.status !== "pending";
    const choose = (status: OrderStatus) => { setOpen(false); onSet(status); };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`More actions for order #${order.id}`}
                title={order.status === "pending" ? "More actions" : `Order is ${order.status}`}
                className="cursor-pointer rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                data-testid={`more-${order.id}`}
            >
                <Ellipsis className="size-4" aria-hidden />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 text-left text-xs shadow-lg">
                    <button role="menuitem" type="button" onClick={() => choose("completed")} className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-neutral-100" data-testid={`complete-${order.id}`}>
                        Mark as completed
                    </button>
                    <button role="menuitem" type="button" onClick={() => choose("cancelled")} className="block w-full cursor-pointer px-3 py-2 text-left text-red-600 hover:bg-red-50" data-testid={`cancel-${order.id}`}>
                        Cancel order
                    </button>
                </div>
            )}
        </div>
    );
}

export default function DashboardOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [toast, setToast] = useState<Toast>(null);
    const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [sort, setSort] = useState<SortState<SortKey>>(null);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    useEffect(() => {
        // Admin token: the backend returns every order. 404 = no orders.
        apiFetch("/orders")
            .then(async (res) => {
                if (res.status === 404) return [];
                if (!res.ok) throw new Error(String(res.status));
                return res.json() as Promise<Order[]>;
            })
            .then((list) => setOrders(list.map(normalizeOrder).sort((a, b) => b.id - a.id)))
            .catch(() => setLoadError("Failed to load orders. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase().replace(/^#/, "");
        const list = orders.filter((o) => {
            if (statusFilter !== "all" && o.status !== statusFilter) return false;
            const day = toDateKey(o.ordered_at);
            if (from && day < from) return false;
            if (to && day > to) return false;
            if (!q) return true;
            return String(o.id).includes(q)
                || customerName(o).toLowerCase().includes(q)
                || (o.email ?? "").toLowerCase().includes(q)
                || (o.items ?? []).some((i) => itemName(i).toLowerCase().includes(q));
        });
        if (sort) {
            const dir = sort.dir === "asc" ? 1 : -1;
            list.sort((a, b) => {
                switch (sort.key) {
                    case "id": return (a.id - b.id) * dir;
                    case "amount": return (a.total_price - b.total_price) * dir;
                    case "customer": return customerName(a).localeCompare(customerName(b)) * dir;
                    case "status": return a.status.localeCompare(b.status) * dir;
                }
            });
        }
        return list;
    }, [orders, search, statusFilter, from, to, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    const hasFilters = !!(search || statusFilter !== "all" || from || to);
    const resetPage = () => setPage(1);

    async function setStatus(order: Order, status: OrderStatus) {
        const label = status === "completed" ? "mark order #" + order.id + " as completed" : "cancel order #" + order.id;
        if (!window.confirm(`Are you sure you want to ${label}? This can't be undone.`)) return;
        setToast(null);
        setBusyIds((s) => new Set(s).add(order.id));
        const result = await updateOrderStatus(apiFetch, order.id, status);
        setBusyIds((s) => { const n = new Set(s); n.delete(order.id); return n; });
        if (result.order) {
            setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, ...result.order } : o)));
            setToast({ kind: "success", text: `Order #${order.id} ${status === "completed" ? "marked as completed" : "cancelled"}` });
        } else {
            setToast({ kind: "error", text: `Order #${order.id}: ${result.error}` });
        }
    }

    const header = (key: SortKey, label: string) => (
        <th className="p-3 font-medium" aria-sort={ariaSort(sort, key)}>
            <button type="button" onClick={() => setSort((s) => nextSort(s, key))} className="flex cursor-pointer items-center gap-1 whitespace-nowrap hover:text-black" data-testid={`sort-${key}`}>
                {label} <SortIcon k={key} sort={sort} />
            </button>
        </th>
    );

    return (
        <main className="flex-1 bg-neutral-50 p-6 text-black">
            <h1 className="text-xl font-bold">Orders List</h1>
            <p className="mt-1 text-sm text-neutral-600">Here you can find all of your orders.</p>

            <div className="mt-5 rounded-md bg-white p-4 shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                            placeholder="Search by name, order ID..."
                            aria-label="Search by customer, email, product or order ID"
                            className="w-64 rounded-md border border-neutral-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-black"
                            data-testid="order-search"
                        />
                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <label className="relative flex items-center">
                            <span className="sr-only">Filter by status</span>
                            <ListFilter className="pointer-events-none absolute left-3 size-3.5 text-neutral-500" aria-hidden />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); resetPage(); }}
                                className="cursor-pointer appearance-none rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-8 text-xs outline-none hover:border-black focus:border-black"
                                data-testid="status-filter"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-neutral-500" aria-hidden />
                        </label>

                        <fieldset className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1 text-xs">
                            <legend className="sr-only">Order date range</legend>
                            <CalendarDays className="size-3.5 text-neutral-500" aria-hidden />
                            <label className="sr-only" htmlFor="orders-from">From</label>
                            <input id="orders-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); resetPage(); }} className="bg-transparent outline-none" data-testid="date-from" />
                            <span className="text-neutral-500">to</span>
                            <label className="sr-only" htmlFor="orders-to">To</label>
                            <input id="orders-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); resetPage(); }} className="bg-transparent outline-none" data-testid="date-to" />
                        </fieldset>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={() => { setSearch(""); setStatusFilter("all"); setFrom(""); setTo(""); resetPage(); }}
                                className="cursor-pointer text-xs underline underline-offset-4 hover:text-neutral-500"
                                data-testid="clear-filters"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {toast && (
                    <p
                        role={toast.kind === "error" ? "alert" : "status"}
                        className={`mt-3 rounded-md px-3 py-2 text-xs ${toast.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                        data-testid={`toast-${toast.kind}`}
                    >
                        {toast.text}
                    </p>
                )}

                {/* Table */}
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-600">
                                {header("id", "Order ID")}
                                {header("customer", "Customer Name")}
                                {header("amount", "Amount")}
                                {header("status", "Status")}
                                <th className="p-3 text-right font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }, (_, i) => (
                                    <tr key={i} className="border-b border-neutral-100">
                                        <td colSpan={5} className="p-3"><div className="h-9 animate-pulse rounded bg-neutral-100" /></td>
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr><td colSpan={5} role="alert" className="p-10 text-center text-sm text-red-600">{loadError}</td></tr>
                            ) : pageItems.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-sm text-neutral-500" data-testid="orders-empty">
                                    {orders.length ? "No orders match the current filters." : "No orders yet."}
                                </td></tr>
                            ) : (
                                pageItems.map((o) => {
                                    const items = o.items ?? [];
                                    const count = items.reduce((s, i) => s + i.quantity, 0);
                                    const names = items.map(itemName);
                                    const summary = names.length === 0 ? "No items" : names.length === 1 ? names[0] : `${names[0]} & ${names.length - 1} more`;
                                    const payment = o.payment_method ? PAYMENT_LABELS[o.payment_method] ?? o.payment_method : null;
                                    return (
                                        <tr key={o.id} className="border-b border-neutral-100" data-testid={`admin-order-${o.id}`}>
                                            <td className="p-3">
                                                <span className="block font-medium">#{o.id}</span>
                                                <span className="block max-w-56 truncate text-[11px] text-neutral-500" title={names.join(", ")}>
                                                    {formatDate(o.ordered_at)} · {count} {count === 1 ? "item" : "items"} · {summary}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold uppercase text-neutral-700" aria-hidden>
                                                        {customerName(o)[0]}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate" data-testid={`admin-customer-${o.id}`}>{customerName(o)}</span>
                                                        {o.email && <span className="block truncate text-[11px] text-neutral-500">{o.email}</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="block" data-testid={`admin-amount-${o.id}`}>{formatPrice(o.total_price)}</span>
                                                {payment && <span className="block text-[11px] text-neutral-500">Paid by {payment}</span>}
                                            </td>
                                            <td className="p-3" data-testid={`admin-status-${o.id}`}><StatusBadge status={o.status} /></td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/dashboard/orders/${o.id}`}
                                                        className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:border-black"
                                                        data-testid={`details-${o.id}`}
                                                    >
                                                        Details
                                                    </Link>
                                                    <QuickActions order={o} busy={busyIds.has(o.id)} onSet={(s) => setStatus(o, s)} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && !loadError && filtered.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="mt-4 flex items-center gap-2 text-xs text-neutral-600">
                            Rows per page
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
                                className="rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-black"
                                data-testid="page-size"
                            >
                                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <div className="flex-1">
                            <Pagination page={currentPage} totalPages={totalPages} start={start} shown={pageItems.length} total={filtered.length} onPage={setPage} />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
