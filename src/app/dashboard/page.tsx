"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, Coffee, Minus } from "lucide-react";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatPrice } from "@/components/ProductCard";
import { apiFetch } from "@/lib/api";
import { Order, PAYMENT_LABELS, SHIPPING_LABELS, formatOrderedAt, normalizeOrder } from "@/lib/orders";
import { Kpi, PERIODS, PeriodId, Stats, StatsProduct, StatsUser, bucketLabel, computeStats } from "@/lib/stats";

const STATUS_COLORS = { completed: "#16a34a", pending: "#f59e0b", cancelled: "#dc2626" } as const;
const compactUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

async function getList<T>(path: string): Promise<T[]> {
    const res = await apiFetch(path);
    if (res.status === 404) return []; // backend returns 404 for empty lists
    if (!res.ok) throw new Error(path + " " + res.status);
    return res.json();
}

function Change({kpi, compareLabel}: {kpi: Kpi; compareLabel: string}) {
    if (kpi.change === null) {
        return <p className="text-[11px] text-neutral-500">No data for {compareLabel}</p>;
    }
    const up = kpi.change > 0;
    const flat = Math.abs(kpi.change) < 0.05;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    return (
        <p className="flex items-center gap-1 text-[11px] text-neutral-500">
            <span className={`flex items-center font-medium ${flat ? "text-neutral-600" : up ? "text-green-700" : "text-red-600"}`}>
                <Icon className="size-3" aria-hidden />
                {flat ? "0%" : `${Math.abs(kpi.change).toFixed(1)}%`}
            </span>
            <span className="sr-only">{flat ? "no change" : up ? "increase" : "decrease"}</span>
            vs {compareLabel}
        </p>
    );
}

function KpiCard({label, value, kpi, compareLabel, note, testId}: {
    label: string; value: string; kpi: Kpi; compareLabel: string; note?: string; testId: string;
}) {
    return (
        <div className="rounded-md bg-white p-4 shadow-sm" data-testid={testId}>
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold" data-testid={`${testId}-value`}>{value}</p>
            {note && <p className="text-[11px] text-neutral-600">{note}</p>}
            <div className="mt-2"><Change kpi={kpi} compareLabel={compareLabel} /></div>
        </div>
    );
}

function Card({title, subtitle, children, className = "", testId}: {
    title: string; subtitle?: string; children: React.ReactNode; className?: string; testId?: string;
}) {
    return (
        <section className={`rounded-md bg-white p-5 shadow-sm ${className}`} aria-label={title} data-testid={testId}>
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle && <p className="text-[11px] text-neutral-500">{subtitle}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

const Empty = ({text}: {text: string}) => <p className="py-8 text-center text-xs text-neutral-500">{text}</p>;

/** Horizontal bars as plain divs: simple, accessible lists for small breakdowns. */
function BarList({items, format = (v) => String(v), testId}: {items: { name: string; value: number }[]; format?: (v: number) => string; testId?: string}) {
    const max = Math.max(...items.map((i) => i.value), 1);
    return (
        <ul className="space-y-2.5" data-testid={testId}>
            {items.map((i) => (
                <li key={i.name} className="text-xs">
                    <div className="mb-1 flex justify-between gap-3">
                        <span className="truncate">{i.name}</span>
                        <span className="shrink-0 font-medium">{format(i.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100" aria-hidden>
                        <div className="h-full rounded-full bg-black" style={{ width: `${(i.value / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function SectionTitle({children}: {children: React.ReactNode}) {
    return <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-neutral-500">{children}</h2>;
}

function Dashboard({stats, compareLabel}: {stats: Stats; compareLabel: string}) {
    const { kpis, statusCounts } = stats;
    const statusData = (Object.keys(statusCounts) as (keyof typeof statusCounts)[])
        .map((s) => ({ name: s, value: statusCounts[s] }))
        .filter((d) => d.value > 0);
    const totalOrders = kpis.orders.value;
    const chartData = stats.revenueSeries.map((p) => ({ ...p, label: bucketLabel(p.key) }));
    const hasRevenue = chartData.some((p) => p.revenue > 0);

    return (
        <>
            {/* 1. Store performance */}
            <SectionTitle>Store Performance</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Revenue" value={formatPrice(kpis.revenue.value)} kpi={kpis.revenue} compareLabel={compareLabel}
                    note={`From ${stats.completedInPeriod} completed order${stats.completedInPeriod === 1 ? "" : "s"}`} testId="kpi-revenue" />
                <KpiCard label="Orders" value={String(kpis.orders.value)} kpi={kpis.orders} compareLabel={compareLabel}
                    note={`${stats.pendingInPeriod} still pending`} testId="kpi-orders" />
                <KpiCard label="Average Order Value" value={formatPrice(kpis.aov.value)} kpi={kpis.aov} compareLabel={compareLabel}
                    note="Per completed order" testId="kpi-aov" />
                <KpiCard label="New Customers" value={String(kpis.newCustomers.value)} kpi={kpis.newCustomers} compareLabel={compareLabel}
                    note="Accounts created" testId="kpi-customers" />
            </div>

            {/* 2. Sales */}
            <SectionTitle>Sales</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Revenue over time" subtitle={`Completed orders, per ${stats.range.granularity} (WIB)`} className="lg:col-span-2" testId="revenue-chart">
                    {hasRevenue ? (
                        <div className="h-64" role="img" aria-label={`Revenue chart. Total ${formatPrice(kpis.revenue.value)}.`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#000" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="#000" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} minTickGap={16} />
                                    <YAxis tickFormatter={(v) => compactUsd.format(v)} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} width={56} />
                                    <Tooltip
                                        formatter={(v, name) => (name === "revenue" ? [formatPrice(Number(v)), "Revenue"] : [String(v), "Orders"])}
                                        contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e5e5e5" }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={2} fill="url(#revFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty text="No completed orders in this period yet." />}
                </Card>

                <Card title="Orders by status" subtitle={`Cancellation rate ${stats.cancellationRate.toFixed(1)}%`} testId="status-chart">
                    {totalOrders ? (
                        <>
                            <div className="relative h-40" role="img" aria-label={statusData.map((d) => `${d.value} ${d.name}`).join(", ")}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                                            {statusData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name as keyof typeof STATUS_COLORS]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
                                    <span className="text-lg font-semibold">{totalOrders}</span>
                                    <span className="text-[10px] text-neutral-500">orders</span>
                                </span>
                            </div>
                            <ul className="mt-3 space-y-1 text-xs" data-testid="status-legend">
                                {(["completed", "pending", "cancelled"] as const).map((s) => (
                                    <li key={s} className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 capitalize">
                                            <span className="size-2 rounded-full" style={{ background: STATUS_COLORS[s] }} aria-hidden />{s}
                                        </span>
                                        <span className="font-medium">{statusCounts[s]}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : <Empty text="No orders in this period." />}
                </Card>

                <Card title="Payment methods" subtitle="Non-cancelled orders" testId="payment-breakdown">
                    {stats.payment.length
                        ? <BarList items={stats.payment.map((p) => ({ name: PAYMENT_LABELS[p.name] ?? "Not recorded", value: p.value }))} />
                        : <Empty text="No orders in this period." />}
                </Card>
                <Card title="Shipping methods" subtitle="Non-cancelled orders" testId="shipping-breakdown">
                    {stats.shipping.length
                        ? <BarList items={stats.shipping.map((p) => ({ name: SHIPPING_LABELS[p.name] ?? "Not recorded", value: p.value }))} />
                        : <Empty text="No orders in this period." />}
                </Card>
                <Card title="Top provinces" subtitle="Delivery destinations" testId="province-breakdown">
                    {stats.provinces.length ? <BarList items={stats.provinces} /> : <Empty text="No delivery addresses in this period." />}
                </Card>
            </div>

            {/* 3. Product insight */}
            <SectionTitle>Product Insight</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Top products" subtitle="By revenue from completed orders" className="lg:col-span-2" testId="top-products">
                    {stats.topProducts.length ? (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                                    <th className="pb-2 font-medium">Product</th>
                                    <th className="pb-2 text-right font-medium">Units</th>
                                    <th className="pb-2 text-right font-medium">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topProducts.map((p, i) => (
                                    <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                                        <td className="py-2">
                                            <span className="mr-2 text-neutral-400">{i + 1}.</span>
                                            <Link href={`/dashboard/products/${p.id}`} className="hover:underline">{p.name}</Link>
                                            <span className="ml-2 text-neutral-500">{p.category}</span>
                                        </td>
                                        <td className="py-2 text-right">{p.units}</td>
                                        <td className="py-2 text-right font-medium">{formatPrice(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <Empty text="No products sold in this period yet." />}
                </Card>

                <Card title="Revenue by category" subtitle="Completed orders" testId="category-revenue">
                    {stats.categoryRevenue.length ? (
                        <div style={{ height: Math.max(120, stats.categoryRevenue.length * 36) }} role="img"
                            aria-label={stats.categoryRevenue.map((c) => `${c.name} ${formatPrice(c.value)}`).join(", ")}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.categoryRevenue} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#404040" }} tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(v) => [formatPrice(Number(v)), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: "#f5f5f5" }} />
                                    <Bar dataKey="value" fill="#000" radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty text="No category revenue yet." />}
                </Card>

                <Card title="Stock alerts" subtitle={`Active products with 5 or fewer in stock`} testId="stock-alerts">
                    {stats.stockAlerts.length ? (
                        <ul className="space-y-2 text-xs">
                            {stats.stockAlerts.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-3">
                                    <Link href={`/dashboard/products/${p.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                                        <AlertTriangle className={`size-3.5 shrink-0 ${p.stock_quantity === 0 ? "text-red-600" : "text-amber-500"}`} aria-hidden />
                                        <span className="truncate">{p.name}</span>
                                    </Link>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${p.stock_quantity === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                                        {p.stock_quantity === 0 ? "Out of stock" : `${p.stock_quantity} left`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : <Empty text="All active products are well stocked." />}
                </Card>

                <Card title="Never sold" subtitle="Active products not in any order yet" testId="never-sold">
                    {stats.neverSold.length ? (
                        <ul className="space-y-2 text-xs">
                            {stats.neverSold.slice(0, 6).map((p) => (
                                <li key={p.id} className="flex items-center gap-2">
                                    <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded bg-[#f5f5f5] text-neutral-300">
                                        {p.image
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={p.image} alt="" className="size-full object-cover" />
                                            : <Coffee className="size-4" strokeWidth={1} aria-hidden />}
                                    </span>
                                    <Link href={`/dashboard/products/${p.id}`} className="truncate hover:underline">{p.name}</Link>
                                </li>
                            ))}
                            {stats.neverSold.length > 6 && <li className="text-neutral-500">+{stats.neverSold.length - 6} more</li>}
                        </ul>
                    ) : <Empty text="Every active product has sold at least once." />}
                </Card>

                {/* 4. Needs action */}
                <Card title="Needs action" subtitle="Oldest pending orders" testId="needs-action">
                    {stats.needsAction.length ? (
                        <ul className="space-y-2.5 text-xs">
                            {stats.needsAction.map((o) => (
                                <li key={o.id} className="flex items-center justify-between gap-3">
                                    <Link href={`/dashboard/orders/${o.id}`} className="min-w-0 hover:underline">
                                        <span className="font-medium">#{o.id}</span>
                                        <span className="ml-1.5 text-neutral-600">{o.customer}</span>
                                        <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                                            <Clock className="size-3" aria-hidden /> {formatOrderedAt(o.ordered_at)}
                                        </span>
                                    </Link>
                                    <span className="shrink-0 font-medium">{formatPrice(o.total)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <Empty text="No pending orders. You're all caught up." />}
                </Card>
            </div>
        </>
    );
}

export default function DashboardPage() {
    const [period, setPeriod] = useState<PeriodId>("30d");
    const [data, setData] = useState<{ orders: Order[]; products: StatsProduct[]; users: StatsUser[] } | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([
            getList<Order>("/orders"),
            getList<StatsProduct>("/products?include_inactive=true"),
            getList<StatsUser>("/users?include_inactive=true"),
        ])
            .then(([orders, products, users]) => setData({
                orders: orders.map(normalizeOrder),
                products: products.map((p) => ({ ...p, stock_quantity: Number(p.stock_quantity), is_active: p.is_active !== false })),
                users,
            }))
            .catch(() => setError("Failed to load store statistics. Please try again."));
    }, []);

    const stats = useMemo(() => (data ? computeStats(data.orders, data.products, data.users, period) : null), [data, period]);
    const periodInfo = PERIODS.find((p) => p.id === period)!;

    return (
        <main className="flex-1 bg-neutral-50 p-6 text-black">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold">Store Overview</h1>
                    <p className="mt-1 text-sm text-neutral-600">Store performance, sales and product insight. Dates in WIB.</p>
                </div>
                <div role="group" aria-label="Period" className="flex rounded-md border border-neutral-300 bg-white p-0.5 text-xs">
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setPeriod(p.id)}
                            aria-pressed={period === p.id}
                            className={`cursor-pointer rounded px-3 py-1.5 transition-colors ${period === p.id ? "bg-black text-white" : "text-neutral-600 hover:text-black"}`}
                            data-testid={`period-${p.id}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <p role="alert" className="mt-10 rounded-md bg-red-50 p-6 text-center text-sm text-red-700">{error}</p>
            ) : !stats ? (
                <div aria-busy="true" className="mt-8 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-md bg-neutral-200" />)}
                    </div>
                    <div className="h-72 animate-pulse rounded-md bg-neutral-200" />
                </div>
            ) : (
                <Dashboard stats={stats} compareLabel={periodInfo.compareLabel} />
            )}
        </main>
    );
}
