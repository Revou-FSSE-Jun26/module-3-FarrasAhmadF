"use client"

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Coffee, Search, X } from "lucide-react";
import { Product, formatPrice } from "./ProductCard";
import { matchesQuery } from "@/lib/catalog";

const CLOSE_DURATION_MS = 300; // matches duration-300 below
const MAX_SUGGESTIONS = 4;

type Load = { status: "idle" | "loading" | "error" } | { status: "ready"; products: Product[] };

/**
 * Modal search panel that slides down from the top (like the cart drawer, the page
 * behind is dimmed and blocked). Shows live suggestions; Enter goes to /products/search?q=.
 */
export default function SearchOverlay({open, onClose, returnFocusRef}: {
    open: boolean;
    onClose: () => void;
    /** Element to focus after closing (the header search icon). Safari doesn't focus buttons on click. */
    returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [load, setLoad] = useState<Load>({ status: "idle" });

    // Keep it visible while sliding out, then hide (same approach as CartDrawer).
    const [prevOpen, setPrevOpen] = useState(open);
    const [closing, setClosing] = useState(false);
    if (prevOpen !== open) {
        setPrevOpen(open);
        setClosing(!open);
        // Load products the first time the overlay opens.
        if (open && load.status === "idle") setLoad({ status: "loading" });
    }
    useEffect(() => {
        if (!closing) return;
        const t = setTimeout(() => setClosing(false), CLOSE_DURATION_MS);
        return () => clearTimeout(t);
    }, [closing]);
    const visible = open || closing;

    useEffect(() => {
        if (load.status !== "loading") return;
        fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/products")
            .then((res) => (res.status === 404 ? [] : res.ok ? res.json() : Promise.reject(res.status)))
            .then((list: Product[]) => setLoad({ status: "ready", products: list.map((p) => ({ ...p, price: Number(p.price) })) }))
            .catch(() => setLoad({ status: "error" }));
    }, [load.status]);

    // While open: Esc closes, page scroll is locked, focus goes to the input and back afterwards.
    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        const prevOverflow = document.body.style.overflow;
        const returnTo = returnFocusRef?.current ?? previouslyFocused;
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        inputRef.current?.focus();
        inputRef.current?.select();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            returnTo?.focus?.();
        };
    }, [open, onClose, returnFocusRef]);

    const q = query.trim();
    const matches = load.status === "ready" && q ? load.products.filter((p) => matchesQuery(p.name, q)) : [];
    const searchHref = `/products/search?q=${encodeURIComponent(q)}`;

    return (
        <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"} ${visible ? "" : "invisible"}`} inert={!open}>
            <div
                aria-hidden
                onClick={onClose}
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Search products"
                className={`absolute inset-x-0 top-0 bg-white text-black shadow-xl transition-transform duration-300 ${open ? "translate-y-0" : "-translate-y-full"}`}
                data-testid="search-overlay"
            >
                <Form
                    action="/products/search"
                    role="search"
                    onSubmit={(e) => { if (!q) { e.preventDefault(); return; } onClose(); }}
                    className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-6"
                >
                    <Search className="size-5 shrink-0 text-neutral-600" aria-hidden />
                    <label htmlFor="search-overlay-q" className="sr-only">Search our store</label>
                    <input
                        ref={inputRef}
                        id="search-overlay-q"
                        name="q"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search our store"
                        autoComplete="off"
                        maxLength={100}
                        aria-controls="search-suggestions"
                        className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-neutral-500 [&::-webkit-search-cancel-button]:hidden"
                        data-testid="search-overlay-input"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer text-neutral-600 hover:text-black"
                        aria-label="Close search"
                        data-testid="search-overlay-close"
                    >
                        <X className="size-5" />
                    </button>
                </Form>

                {/* Live suggestions */}
                {q && (
                    <div id="search-suggestions" className="mx-auto max-w-6xl border-t border-neutral-200 px-6 pb-6 pt-4" aria-live="polite">
                        {load.status === "loading" || load.status === "idle" ? (
                            <p className="text-xs text-neutral-500">Searching…</p>
                        ) : load.status === "error" ? (
                            <p className="text-xs text-red-600">Couldn&apos;t load suggestions. Press Enter to search anyway.</p>
                        ) : matches.length === 0 ? (
                            <p className="text-xs text-neutral-500" data-testid="search-no-suggestions">No products match &ldquo;{q}&rdquo;.</p>
                        ) : (
                            <>
                                <p className="mb-3 text-[11px] uppercase tracking-widest text-neutral-500">Products</p>
                                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="search-suggestions">
                                    {matches.slice(0, MAX_SUGGESTIONS).map((p) => (
                                        <li key={p.id}>
                                            <Link
                                                href={`/products/${encodeURIComponent(p.slug || String(p.id))}`}
                                                onClick={onClose}
                                                className="flex items-center gap-3 rounded-md p-2 hover:bg-neutral-50"
                                            >
                                                <span className="size-12 shrink-0 overflow-hidden bg-[#f5f5f5]">
                                                    {p.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={p.image} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        <span className="flex size-full items-center justify-center text-neutral-300">
                                                            <Coffee className="size-5" strokeWidth={1} aria-hidden />
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-xs">{p.name}</span>
                                                    <span className="block text-xs text-neutral-600">{formatPrice(p.price)}</span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={searchHref}
                                    onClick={onClose}
                                    className="mt-4 inline-flex items-center gap-1 text-xs underline underline-offset-4 hover:text-neutral-500"
                                    data-testid="search-view-all"
                                >
                                    View all {matches.length} result{matches.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
                                    <ArrowRight className="size-3" aria-hidden />
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
