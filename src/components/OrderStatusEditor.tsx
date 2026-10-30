"use client"

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Order, OrderStatus, updateOrderStatus } from "@/lib/orders";

/**
 * Admin control on the order detail page. The backend treats completed / cancelled
 * as final, so only pending orders can be changed.
 */
export default function OrderStatusEditor({order, onUpdated}: {order: Order; onUpdated: (o: Order) => void}) {
    const [status, setStatus] = useState<OrderStatus>(order.status);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

    if (order.status !== "pending") {
        return (
            <p className="text-xs text-neutral-500" data-testid="status-final">
                This order is <span className="font-medium capitalize text-black">{order.status}</span>. Its status can no longer be changed.
            </p>
        );
    }

    async function save() {
        if (status === order.status) return;
        const label = status === "completed" ? "mark this order as completed" : "cancel this order";
        if (!window.confirm(`Are you sure you want to ${label}? This can't be undone.`)) return;
        setSaving(true);
        setMessage(null);
        const result = await updateOrderStatus(apiFetch, order.id, status);
        setSaving(false);
        if (result.order) {
            onUpdated({ ...order, ...result.order });
        } else {
            setMessage({ kind: "error", text: result.error ?? "Failed to update status." });
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="order-status-select" className="text-sm font-medium">Update status</label>
            <div className="relative">
                <select
                    id="order-status-select"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as OrderStatus); setMessage(null); }}
                    className="appearance-none rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-9 text-sm outline-none focus:border-black"
                    data-testid="status-select"
                >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
            </div>
            <button
                type="button"
                onClick={save}
                disabled={saving || status === order.status}
                className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                data-testid="save-status"
            >
                {saving ? "Saving..." : "Save Status"}
            </button>
            {message && <p role="alert" className="basis-full text-xs text-red-600" data-testid="status-error">{message.text}</p>}
        </div>
    );
}
