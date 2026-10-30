"use client"

import { useState } from "react";
import { Check, Copy, ShieldCheck, UserRound } from "lucide-react";

// Demo accounts for assignment reviewers. These are intentionally public:
// keep them as throwaway accounts, never real credentials.
export const DEMO_ACCOUNTS = [
    {
        role: "Admin",
        email: "admin@email.com",
        password: "Password123",
        Icon: ShieldCheck,
        features: "Store overview, manage products, categories, orders and users.",
    },
    {
        role: "User",
        email: "jhon@email.com",
        password: "Password123",
        Icon: UserRound,
        features: "Browse products, cart, checkout and track or cancel orders.",
    },
] as const;

type Account = (typeof DEMO_ACCOUNTS)[number];

function CopyButton({value, label}: {value: string; label: string}) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard may be blocked (e.g. non-HTTPS); the value is still visible to select.
        }
    }
    return (
        <button
            type="button"
            onClick={copy}
            className="cursor-pointer rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-black"
            aria-label={copied ? `${label} copied` : `Copy ${label}`}
            title={copied ? "Copied" : "Copy"}
        >
            {copied ? <Check className="size-3.5 text-green-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        </button>
    );
}

/** Right-hand panel on the login page listing demo credentials, with a one-click fill. */
export default function DemoAccounts({onUse}: {onUse: (account: Account) => void}) {
    return (
        <section aria-labelledby="demo-accounts-title" className="rounded-md border border-neutral-200 bg-neutral-50 p-6" data-testid="demo-accounts">
            <h2 id="demo-accounts-title" className="text-sm font-bold uppercase tracking-widest">Demo Accounts</h2>
            <p className="mt-1 text-xs text-neutral-600">
                Use these accounts to try every feature. Click &ldquo;Use this account&rdquo; to fill the form.
            </p>

            <ul className="mt-5 space-y-4">
                {DEMO_ACCOUNTS.map((a) => (
                    <li key={a.role} className="rounded-md border border-neutral-200 bg-white p-4" data-testid={`demo-${a.role.toLowerCase()}`}>
                        <div className="flex items-center gap-2">
                            <a.Icon className="size-4" aria-hidden />
                            <h3 className="text-sm font-semibold">{a.role}</h3>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">{a.features}</p>

                        <dl className="mt-3 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2">
                                <dt className="w-16 shrink-0 text-neutral-500">Email</dt>
                                <dd className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded bg-neutral-100 px-2 py-1 font-mono">
                                    <span className="truncate select-all">{a.email}</span>
                                    <CopyButton value={a.email} label={`${a.role} email`} />
                                </dd>
                            </div>
                            <div className="flex items-center gap-2">
                                <dt className="w-16 shrink-0 text-neutral-500">Password</dt>
                                <dd className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded bg-neutral-100 px-2 py-1 font-mono">
                                    <span className="truncate select-all">{a.password}</span>
                                    <CopyButton value={a.password} label={`${a.role} password`} />
                                </dd>
                            </div>
                        </dl>

                        <button
                            type="button"
                            onClick={() => onUse(a)}
                            className="mt-3 w-full cursor-pointer rounded-full border border-black py-2 text-[11px] font-medium uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
                            data-testid={`use-${a.role.toLowerCase()}`}
                        >
                            Use this account
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
