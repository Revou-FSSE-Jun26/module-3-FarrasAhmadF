"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Coffee, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Product, formatPrice } from "@/components/ProductCard";
import { PAGE_SIZES, Pagination, SortIcon, SortState, StatusBadge, ariaSort as ariaSortFor, nextSort } from "@/components/AdminTable";
import { apiFetch } from "@/lib/api";

interface AdminProduct extends Product {
    is_active: boolean;
}

type SortKey = "name" | "price";
type Toast = { kind: "success" | "error"; text: string } | null;

export default function DashboardProductsPage() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [toast, setToast] = useState<Toast>(null);
    const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortState<SortKey>>(null);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    useEffect(() => {
        // Admin-only list that also includes deactivated (soft-deleted) products. 404 = empty.
        apiFetch("/products?include_inactive=true")
            .then(async (res) => {
                if (res.status === 404) return [];
                if (!res.ok) throw new Error(String(res.status));
                return res.json() as Promise<AdminProduct[]>;
            })
            .then((list) => setProducts(list.map((p) => ({ ...p, price: Number(p.price), is_active: p.is_active !== false }))))
            .catch(() => setLoadError("Failed to load products. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    // Search + sort over the full list, then slice for the current page.
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : [...products];
        if (sort) {
            const dir = sort.dir === "asc" ? 1 : -1;
            list.sort((a, b) => (sort.key === "price" ? a.price - b.price : a.name.localeCompare(b.name)) * dir);
        }
        return list;
    }, [products, search, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    const selectedActive = [...selected].filter((id) => products.find((p) => p.id === id)?.is_active);
    const allOnPageSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

    function toggleSort(key: SortKey) {
        setSort((s) => nextSort(s, key));
    }

    function toggleSelect(id: number) {
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectPage() {
        setSelected((s) => {
            const next = new Set(s);
            pageItems.forEach((p) => (allOnPageSelected ? next.delete(p.id) : next.add(p.id)));
            return next;
        });
    }

    const setBusy = (id: number, busy: boolean) =>
        setBusyIds((s) => {
            const next = new Set(s);
            if (busy) next.add(id);
            else next.delete(id);
            return next;
        });

    /** Deactivate = soft delete (DELETE), activate = restore. Returns an error message or null. */
    async function setActive(product: AdminProduct, active: boolean): Promise<string | null> {
        setBusy(product.id, true);
        try {
            const res = active
                ? await apiFetch(`/products/restore/${product.id}`, { method: "PUT" })
                : await apiFetch(`/products/${product.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                return `${product.name}: ${data?.error || "request failed"}`;
            }
            setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, is_active: active } : p)));
            return null;
        } catch {
            return `${product.name}: cannot reach server`;
        } finally {
            setBusy(product.id, false);
        }
    }

    async function handleRowToggle(product: AdminProduct) {
        const action = product.is_active ? "Deactivate" : "Activate";
        if (product.is_active && !window.confirm(`Deactivate "${product.name}"? It will be hidden from the shop.`)) return;
        setToast(null);
        const error = await setActive(product, !product.is_active);
        setToast(error ? { kind: "error", text: error } : { kind: "success", text: `${product.name} ${action.toLowerCase()}d` });
    }

    async function handleBulkDeactivate() {
        const targets = products.filter((p) => selectedActive.includes(p.id));
        if (!targets.length) return;
        if (!window.confirm(`Deactivate ${targets.length} product(s)? They will be hidden from the shop.`)) return;
        setToast(null);
        const errors: string[] = [];
        for (const p of targets) {
            const error = await setActive(p, false);
            if (error) errors.push(error);
        }
        setSelected(new Set());
        const ok = targets.length - errors.length;
        setToast(
            errors.length
                ? { kind: "error", text: `${ok} deactivated, ${errors.length} failed. ${errors.join(" · ")}` }
                : { kind: "success", text: `${ok} product(s) deactivated` },
        );
    }

    const ariaSort = (k: SortKey) => ariaSortFor(sort, k);

    return (
        <main className="flex-1 bg-neutral-50 p-6 text-black">
            <h1 className="text-xl font-bold">Product List</h1>

            <div className="mt-5 rounded-md bg-white p-4 shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard/products/new"
                        className="flex items-center gap-1 rounded-md border border-green-600 px-3 py-1.5 text-xs font-semibold uppercase text-green-700 hover:bg-green-50"
                        data-testid="add-product"
                    >
                        <Plus className="size-3.5" aria-hidden /> Add
                    </Link>
                    <button
                        type="button"
                        onClick={handleBulkDeactivate}
                        disabled={selectedActive.length === 0}
                        className="flex cursor-pointer items-center gap-1 rounded-md border border-red-500 px-3 py-1.5 text-xs font-semibold uppercase text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:bg-transparent"
                        data-testid="bulk-deactivate"
                    >
                        <Trash2 className="size-3.5" aria-hidden /> Deactivate{selectedActive.length ? ` (${selectedActive.length})` : ""}
                    </button>

                    <div className="ml-auto flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-neutral-600">
                            <span className="sr-only">Rows per page</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-black"
                                data-testid="page-size"
                            >
                                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search"
                                aria-label="Search products"
                                className="w-48 rounded-md border border-neutral-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-black"
                                data-testid="product-search"
                            />
                        </div>
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
                                <th className="w-10 p-3">
                                    <input
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        onChange={toggleSelectPage}
                                        disabled={pageItems.length === 0}
                                        aria-label="Select all products on this page"
                                        className="size-4 accent-black"
                                    />
                                </th>
                                <th className="p-3 font-medium">Image</th>
                                <th className="p-3 font-medium" aria-sort={ariaSort("name")}>
                                    <button type="button" onClick={() => toggleSort("name")} className="flex cursor-pointer items-center gap-1 hover:text-black" data-testid="sort-name">
                                        Name <SortIcon k="name" sort={sort} />
                                    </button>
                                </th>
                                <th className="p-3 font-medium" aria-sort={ariaSort("price")}>
                                    <button type="button" onClick={() => toggleSort("price")} className="flex cursor-pointer items-center gap-1 hover:text-black" data-testid="sort-price">
                                        Price <SortIcon k="price" sort={sort} />
                                    </button>
                                </th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 text-right font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }, (_, i) => (
                                    <tr key={i} className="border-b border-neutral-100">
                                        <td colSpan={6} className="p-3"><div className="h-10 animate-pulse rounded bg-neutral-100" /></td>
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr><td colSpan={6} role="alert" className="p-10 text-center text-sm text-red-600">{loadError}</td></tr>
                            ) : pageItems.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-sm text-neutral-500" data-testid="products-empty">
                                    {search ? `No products match "${search}".` : "No products yet."}
                                </td></tr>
                            ) : (
                                pageItems.map((p) => {
                                    const busy = busyIds.has(p.id);
                                    return (
                                        <tr
                                            key={p.id}
                                            className={`border-b border-neutral-100 ${selected.has(p.id) ? "bg-neutral-50" : ""} ${p.is_active ? "" : "text-neutral-500"}`}
                                            data-testid={`admin-product-${p.id}`}
                                        >
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(p.id)}
                                                    onChange={() => toggleSelect(p.id)}
                                                    aria-label={`Select ${p.name}`}
                                                    className="size-4 accent-black"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className={`size-10 overflow-hidden rounded bg-[#f5f5f5] ${p.is_active ? "" : "opacity-50"}`}>
                                                    {p.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={p.image} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        <span className="flex size-full items-center justify-center text-neutral-300">
                                                            <Coffee className="size-5" strokeWidth={1} aria-hidden />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="block">{p.name}</span>
                                                {p.category && <span className="block text-[11px] text-neutral-500">{p.category}</span>}
                                            </td>
                                            <td className="p-3" data-testid={`admin-price-${p.id}`}>{formatPrice(p.price)}</td>
                                            <td className="p-3" data-testid={`admin-status-${p.id}`}><StatusBadge active={p.is_active} /></td>
                                            <td className="p-3">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={`/dashboard/products/${p.id}`}
                                                        className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black"
                                                        aria-label={`Edit ${p.name}`}
                                                        title="Edit"
                                                        data-testid={`edit-${p.id}`}
                                                    >
                                                        <Pencil className="size-4" aria-hidden />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRowToggle(p)}
                                                        disabled={busy}
                                                        className={`cursor-pointer rounded-md p-1.5 disabled:cursor-wait disabled:opacity-50 ${
                                                            p.is_active ? "text-red-600 hover:bg-red-50" : "text-green-700 hover:bg-green-50"
                                                        }`}
                                                        aria-label={`${p.is_active ? "Deactivate" : "Activate"} ${p.name}`}
                                                        title={p.is_active ? "Deactivate" : "Activate"}
                                                        data-testid={`${p.is_active ? "deactivate" : "activate"}-${p.id}`}
                                                    >
                                                        {p.is_active ? <Trash2 className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / pagination */}
                {!loading && !loadError && filtered.length > 0 && (
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        start={start}
                        shown={pageItems.length}
                        total={filtered.length}
                        onPage={setPage}
                    />
                )}
            </div>
        </main>
    );
}
