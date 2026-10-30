// Store statistics for the admin dashboard, computed in the browser from
// /orders, /products and /users. All day/month grouping uses WIB (Asia/Jakarta).

import { Order, OrderStatus, customerName, itemName } from "./orders";

export const TIME_ZONE = "Asia/Jakarta";
export const LOW_STOCK = 5;

export type PeriodId = "7d" | "30d" | "90d" | "12m";
export const PERIODS: { id: PeriodId; label: string; compareLabel: string }[] = [
    { id: "7d", label: "Last 7 days", compareLabel: "previous 7 days" },
    { id: "30d", label: "Last 30 days", compareLabel: "previous 30 days" },
    { id: "90d", label: "Last 90 days", compareLabel: "previous 90 days" },
    { id: "12m", label: "Last 12 months", compareLabel: "previous 12 months" },
];

export interface StatsProduct {
    id: number;
    name: string;
    category?: string | null;
    stock_quantity: number;
    is_active: boolean;
    image?: string | null;
}

export interface StatsUser {
    id: number;
    role: string;
    created_at: string;
}

// ---------- WIB date helpers ----------

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-03-07" in WIB. */
export function wibDayKey(raw: string | Date): string {
    const d = typeof raw === "string" ? new Date(raw) : raw;
    return Number.isNaN(d.getTime()) ? "" : dayKeyFmt.format(d);
}
/** "2026-03" in WIB. */
export const wibMonthKey = (raw: string | Date) => wibDayKey(raw).slice(0, 7);

// Calendar arithmetic on "yyyy-mm-dd" keys, done in UTC so it never shifts.
function addDays(key: string, n: number): string {
    const d = new Date(key + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
function addMonths(monthKey: string, n: number): string {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return d.toISOString().slice(0, 7);
}

export interface Range {
    /** Inclusive day keys. */
    start: string;
    end: string;
    /** Chart buckets (day keys, or month keys for 12m). */
    buckets: string[];
    granularity: "day" | "month";
}

/** Current period and the same-length period right before it. */
export function periodRanges(period: PeriodId, now = new Date()): { current: Range; previous: Range } {
    const today = wibDayKey(now);
    if (period === "12m") {
        const thisMonth = today.slice(0, 7);
        const months = (from: string) => Array.from({ length: 12 }, (_, i) => addMonths(from, i));
        const curStart = addMonths(thisMonth, -11);
        const prevStart = addMonths(thisMonth, -23);
        const range = (startMonth: string): Range => {
            const buckets = months(startMonth);
            const lastMonth = buckets[buckets.length - 1];
            const end = addDays(addMonths(lastMonth, 1) + "-01", -1);
            return { start: startMonth + "-01", end, buckets, granularity: "month" };
        };
        const current = range(curStart);
        // The current month is partial: cap at today.
        current.end = today;
        return { current, previous: range(prevStart) };
    }
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const curStart = addDays(today, -(days - 1));
    const prevStart = addDays(curStart, -days);
    const days_ = (from: string) => Array.from({ length: days }, (_, i) => addDays(from, i));
    return {
        current: { start: curStart, end: today, buckets: days_(curStart), granularity: "day" },
        previous: { start: prevStart, end: addDays(curStart, -1), buckets: days_(prevStart), granularity: "day" },
    };
}

const inRange = (raw: string, r: Range) => {
    const k = wibDayKey(raw);
    return k !== "" && k >= r.start && k <= r.end;
};

// ---------- Aggregations ----------

export interface Kpi {
    value: number;
    previous: number;
    /** % change vs previous period; null when previous is 0 (no baseline). */
    change: number | null;
}

const kpi = (value: number, previous: number): Kpi => ({
    value,
    previous,
    change: previous === 0 ? null : ((value - previous) / previous) * 100,
});

function summarize(orders: Order[], users: StatsUser[], r: Range) {
    const inPeriod = orders.filter((o) => inRange(o.ordered_at, r));
    // Revenue only counts completed orders: pending ones can still be cancelled.
    const completed = inPeriod.filter((o) => o.status === "completed");
    const revenue = completed.reduce((s, o) => s + o.total_price, 0);
    return {
        inPeriod,
        completed,
        revenue,
        orders: inPeriod.length,
        pending: inPeriod.filter((o) => o.status === "pending").length,
        aov: completed.length ? revenue / completed.length : 0,
        newCustomers: users.filter((u) => u.role !== "admin" && inRange(u.created_at, r)).length,
    };
}

export interface NamedValue { name: string; value: number }

const countBy = <T,>(list: T[], key: (t: T) => string): NamedValue[] => {
    const map = new Map<string, number>();
    list.forEach((t) => map.set(key(t), (map.get(key(t)) ?? 0) + 1));
    return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

export function computeStats(
    orders: Order[],
    products: StatsProduct[],
    users: StatsUser[],
    period: PeriodId,
    now = new Date(),
) {
    const { current, previous } = periodRanges(period, now);
    const cur = summarize(orders, users, current);
    const prev = summarize(orders, users, previous);

    // Revenue over time (completed orders), one bucket per day or month.
    const bucketOf = current.granularity === "day" ? wibDayKey : wibMonthKey;
    const byBucket = new Map(current.buckets.map((b) => [b, { revenue: 0, orders: 0 }]));
    cur.inPeriod.forEach((o) => {
        const b = byBucket.get(bucketOf(o.ordered_at));
        if (!b) return;
        b.orders += 1;
        if (o.status === "completed") b.revenue += o.total_price;
    });
    const revenueSeries = current.buckets.map((key) => ({ key, ...byBucket.get(key)! }));

    const statusCounts: Record<OrderStatus, number> = { pending: 0, completed: 0, cancelled: 0 };
    cur.inPeriod.forEach((o) => { statusCounts[o.status] += 1; });
    const cancellationRate = cur.orders ? (statusCounts.cancelled / cur.orders) * 100 : 0;

    // Payment / shipping / province over all non-cancelled orders in the period.
    const placed = cur.inPeriod.filter((o) => o.status !== "cancelled");
    const payment = countBy(placed, (o) => o.payment_method ?? "unknown");
    const shipping = countBy(placed, (o) => o.shipping_method ?? "unknown");
    const provinces = countBy(placed.filter((o) => o.province), (o) => o.province!).slice(0, 5);

    // Product insight from completed orders in the period.
    const productMap = new Map<number, { id: number; name: string; category: string; units: number; revenue: number }>();
    const categoryMap = new Map<string, number>();
    cur.completed.forEach((o) => (o.items ?? []).forEach((i) => {
        const revenue = i.price_at_order * i.quantity;
        const p = productMap.get(i.product_id) ?? { id: i.product_id, name: itemName(i), category: i.category ?? "Uncategorized", units: 0, revenue: 0 };
        p.units += i.quantity;
        p.revenue += revenue;
        productMap.set(i.product_id, p);
        const cat = i.category ?? "Uncategorized";
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + revenue);
    }));
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units).slice(0, 5);
    const categoryRevenue = [...categoryMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const activeProducts = products.filter((p) => p.is_active);
    const stockAlerts = activeProducts
        .filter((p) => p.stock_quantity <= LOW_STOCK)
        .sort((a, b) => a.stock_quantity - b.stock_quantity);
    // "Never sold" = never appeared in any non-cancelled order, regardless of period.
    const everOrdered = new Set(orders.filter((o) => o.status !== "cancelled").flatMap((o) => (o.items ?? []).map((i) => i.product_id)));
    const neverSold = activeProducts.filter((p) => !everOrdered.has(p.id));

    // Oldest pending orders first (all time): these need action.
    const needsAction = orders
        .filter((o) => o.status === "pending")
        .sort((a, b) => new Date(a.ordered_at).getTime() - new Date(b.ordered_at).getTime())
        .slice(0, 5)
        .map((o) => ({ id: o.id, customer: customerName(o), total: o.total_price, ordered_at: o.ordered_at }));

    return {
        range: current,
        kpis: {
            revenue: kpi(cur.revenue, prev.revenue),
            orders: kpi(cur.orders, prev.orders),
            aov: kpi(cur.aov, prev.aov),
            newCustomers: kpi(cur.newCustomers, prev.newCustomers),
        },
        pendingInPeriod: cur.pending,
        completedInPeriod: cur.completed.length,
        revenueSeries,
        statusCounts,
        cancellationRate,
        payment,
        shipping,
        provinces,
        topProducts,
        categoryRevenue,
        stockAlerts,
        neverSold,
        needsAction,
    };
}

export type Stats = ReturnType<typeof computeStats>;

const shortDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const shortMonth = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", year: "2-digit" });
/** Chart axis label for a bucket key. Keys are already WIB dates, so format them as-is (UTC). */
export function bucketLabel(key: string): string {
    return key.length === 7
        ? shortMonth.format(new Date(key + "-01T00:00:00Z"))
        : shortDay.format(new Date(key + "T00:00:00Z"));
}
