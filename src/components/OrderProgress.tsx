import { Check } from "lucide-react";
import { OrderStatus } from "@/lib/orders";

// The backend only knows pending / completed / cancelled, so the progress bar
// maps pending -> "Processing" and completed -> every step done.
const STEPS = ["Ordered", "Processing", "Completed"];

export default function OrderProgress({status}: {status: OrderStatus}) {
    // Index of the step currently in progress; everything before it is done.
    const current = status === "completed" ? STEPS.length : 1;
    return (
        <ol className="grid grid-cols-3" aria-label="Order progress">
            {STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <li key={step} className="relative" aria-current={active ? "step" : undefined}>
                        <span className={`block text-[11px] ${done || active ? "text-black" : "text-neutral-400"} ${active ? "font-semibold" : ""}`}>
                            {step}
                        </span>
                        <div className="mt-1.5 flex items-center">
                            <span
                                className={`relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                    done ? "border-black bg-black text-white" : active ? "border-black bg-white" : "border-neutral-300 bg-white"
                                }`}
                            >
                                {done && <Check className="size-2.5" strokeWidth={3} aria-hidden />}
                            </span>
                            {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${done ? "bg-black" : "bg-neutral-200"}`} />}
                        </div>
                        <span className="sr-only">{done ? "(done)" : active ? "(in progress)" : "(not started)"}</span>
                    </li>
                );
            })}
        </ol>
    );
}
