// Shared order types and helpers for /orders and /orders/[id].

export type OrderStatus = "pending" | "completed" | "cancelled";

export interface OrderItem {
    product_id: number;
    quantity: number;
    price_at_order: number;
    name?: string | null;
    slug?: string | null;
    image?: string | null;
    category?: string | null;
}

export interface Order {
    id: number;
    user_id: number;
    email?: string | null;
    username?: string | null;
    total_price: number;
    shipping_cost?: number;
    status: OrderStatus;
    ordered_at: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    company?: string | null;
    address?: string | null;
    apartment?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
    shipping_method?: string | null;
    payment_method?: string | null;
    note?: string | null;
    items?: OrderItem[];
}

/** Flask may send Numeric columns as strings; normalize numbers once. */
export function normalizeOrder(o: Order): Order {
    return {
        ...o,
        total_price: Number(o.total_price),
        shipping_cost: Number(o.shipping_cost ?? 0),
        items: (o.items ?? []).map((i) => ({ ...i, price_at_order: Number(i.price_at_order), quantity: Number(i.quantity) })),
    };
}

export const itemName = (i: OrderItem) => i.name ?? `Product #${i.product_id}`;

export function formatOrderedAt(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const abs = Math.abs(diffSec);
    if (abs < 60) return "just now";
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
    return "on " + date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** PUT /orders/:id { status: "cancelled" }. Returns the updated order or an error message. */
export function cancelOrder(
    fetcher: (path: string, init?: RequestInit) => Promise<Response>,
    id: number,
): Promise<{ order?: Order; error?: string }> {
    return updateOrderStatus(fetcher, id, "cancelled");
}

/** PUT /orders/:id { status }. Customers may only cancel; "completed" is admin-only (backend enforced). */
export async function updateOrderStatus(
    fetcher: (path: string, init?: RequestInit) => Promise<Response>,
    id: number,
    status: OrderStatus,
): Promise<{ order?: Order; error?: string }> {
    try {
        const res = await fetcher("/orders/" + id, { method: "PUT", body: JSON.stringify({ status }) });
        if (res.ok) return { order: normalizeOrder(await res.json()) };
        const data = await res.json().catch(() => null);
        return { error: data?.error || "Failed to cancel order." };
    } catch {
        return { error: "Cannot reach server. Please try again." };
    }
}

/** Recipient name from checkout, falling back to the account username for older orders. */
export function customerName(o: Order): string {
    const name = [o.first_name, o.last_name].filter(Boolean).join(" ");
    return name || o.username || `User #${o.user_id}`;
}

export const STATUS_STYLES: Record<OrderStatus, string> = {
    pending: "bg-amber-50 text-amber-800",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
};

export const SHIPPING_LABELS: Record<string, string> = { regular: "Reguler", fast: "Fast", cargo: "Cargo" };
export const PAYMENT_LABELS: Record<string, string> = { card: "Credit card", gopay: "GoPay", qris: "QRIS" };
