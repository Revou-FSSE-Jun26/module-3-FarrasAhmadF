"use client"

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Order, cancelOrder } from "@/lib/orders";

/** "Cancel Order" link with an inline confirmation. Used on the list and detail pages. */
export default function CancelOrderButton({order, onCancelled}: {order: Order; onCancelled: (o: Order) => void}) {
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");

    async function confirm() {
        setCancelling(true);
        setError("");
        const result = await cancelOrder(apiFetch, order.id);
        setCancelling(false);
        if (result.order) {
            onCancelled({ ...order, ...result.order, status: "cancelled" });
        } else {
            setError(result.error ?? "Failed to cancel order.");
            setConfirming(false);
        }
    }

    return (
        <div className="contents">
            {!confirming ? (
                <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="cursor-pointer text-xs text-red-600 underline-offset-4 hover:underline"
                    data-testid={`cancel-order-${order.id}`}
                >
                    Cancel Order
                </button>
            ) : (
                <div role="alertdialog" aria-label={`Cancel order #${order.id}?`} className="flex w-full basis-full flex-wrap items-center gap-3 rounded-md bg-red-50 px-4 py-3 text-xs">
                    <span className="flex-1 text-red-800">Cancel order #{order.id}? This can&apos;t be undone.</span>
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={cancelling}
                        className="cursor-pointer rounded-full bg-red-600 px-4 py-1.5 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                        data-testid={`confirm-cancel-${order.id}`}
                    >
                        {cancelling ? "Cancelling..." : "Yes, cancel"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={cancelling}
                        className="cursor-pointer rounded-full border border-neutral-300 bg-white px-4 py-1.5 font-medium hover:border-black"
                    >
                        Keep order
                    </button>
                </div>
            )}
            {error && <p role="alert" className="basis-full text-xs text-red-600">{error}</p>}
        </div>
    );
}
