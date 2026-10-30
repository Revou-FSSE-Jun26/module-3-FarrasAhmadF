"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { PAGE_SIZES, Pagination, SortIcon, SortState, StatusBadge, ariaSort, nextSort } from "@/components/AdminTable";
import { apiFetch } from "@/lib/api";

interface AdminCategory {
    id: number;
    name: string;
    description?: string | null;
    image?: string | null;
    is_active: boolean;
    product_count: number;
}

type SortKey = "name" | "count";
type Toast = { kind: "success" | "error"; text: string } | null;

export default function DashboardCategoriesPage() {
    const [categories, setCategories] = useState<AdminCategory[]>([]);
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
        // Admin-only list that also includes deactivated categories. 404 = empty.
        apiFetch("/categories?include_inactive=true")
            .then(async (res) => {
                if (res.status === 404) return [];
                if (!res.ok) throw new Error(String(res.status));
                return res.json() as Promise<AdminCategory[]>;
            })
            .then((list) => setCategories(list.map((c) => ({
                ...c,
                is_active: c.is_active !== false,
                product_count: Number(c.product_count ?? 0),
            }))))
            .catch(() => setLoadError("Failed to load categories. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : [...categories];
        if (sort) {
            const dir = sort.dir === "asc" ? 1 : -1;
            list.sort((a, b) => (sort.key === "count" ? a.product_count - b.product_count : a.name.localeCompare(b.name)) * dir);
        }
        return list;
    }, [categories, search, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    const allOnPageSelected = pageItems.length > 0 && pageItems.every((c) => selected.has(c.id));

    const selectedActive = categories.filter((c) => selected.has(c.id) && c.is_active);

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
            pageItems.forEach((c) => (allOnPageSelected ? next.delete(c.id) : next.add(c.id)));
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

    /** Deactivate = soft delete, activate = restore. Returns an error message or null. */
    async function setActive(category: AdminCategory, active: boolean): Promise<string | null> {
        setBusy(category.id, true);
        try {
            const res = active
                ? await apiFetch(`/categories/restore/${category.id}`, { method: "PUT" })
                : await apiFetch(`/categories/${category.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                return `${category.name}: ${data?.error || "request failed"}`;
            }
            setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, is_active: active } : c)));
            return null;
        } catch {
            return `${category.name}: cannot reach server`;
        } finally {
            setBusy(category.id, false);
        }
    }

    async function handleRowToggle(category: AdminCategory) {
        if (category.is_active && !window.confirm(`Deactivate "${category.name}"? It will be hidden from the shop.`)) return;
        setToast(null);
        const error = await setActive(category, !category.is_active);
        setToast(error
            ? { kind: "error", text: error }
            : { kind: "success", text: `${category.name} ${category.is_active ? "deactivated" : "activated"}` });
    }

    async function handleBulkDeactivate() {
        // Categories that still have active products are refused by the backend, so skip them up front.
        const targets = selectedActive.filter((c) => c.product_count === 0);
        const skipped = selectedActive.filter((c) => c.product_count > 0);
        if (!targets.length) {
            setToast({ kind: "error", text: `Can't deactivate: ${skipped.map((c) => c.name).join(", ")} still have active products.` });
            return;
        }
        if (!window.confirm(`Deactivate ${targets.length} categor${targets.length === 1 ? "y" : "ies"}? They will be hidden from the shop.`)) return;
        setToast(null);
        const errors: string[] = [];
        for (const c of targets) {
            const error = await setActive(c, false);
            if (error) errors.push(error);
        }
        setSelected(new Set());
        const ok = targets.length - errors.length;
        const notes = [
            ...errors,
            ...(skipped.length ? [`skipped ${skipped.map((c) => c.name).join(", ")} (still have active products)`] : []),
        ];
        setToast(notes.length
            ? { kind: "error", text: `${ok} deactivated. ${notes.join(" · ")}` }
            : { kind: "success", text: `${ok} categor${ok === 1 ? "y" : "ies"} deactivated` });
    }

    return (
        <main className="flex-1 bg-neutral-50 p-6 text-black">
            <h1 className="text-xl font-bold">Category List</h1>

            <div className="mt-5 rounded-md bg-white p-4 shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard/categories/new"
                        className="flex items-center gap-1 rounded-md border border-green-600 px-3 py-1.5 text-xs font-semibold uppercase text-green-700 hover:bg-green-50"
                        data-testid="add-category"
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
                                aria-label="Search categories"
                                className="w-48 rounded-md border border-neutral-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-black"
                                data-testid="category-search"
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
                                        aria-label="Select all categories on this page"
                                        className="size-4 accent-black"
                                    />
                                </th>
                                <th className="p-3 font-medium">Image</th>
                                <th className="p-3 font-medium" aria-sort={ariaSort(sort, "name")}>
                                    <button type="button" onClick={() => setSort((s) => nextSort(s, "name"))} className="flex cursor-pointer items-center gap-1 hover:text-black" data-testid="sort-name">
                                        Name <SortIcon k="name" sort={sort} />
                                    </button>
                                </th>
                                <th className="p-3 font-medium" aria-sort={ariaSort(sort, "count")}>
                                    <button type="button" onClick={() => setSort((s) => nextSort(s, "count"))} className="flex cursor-pointer items-center gap-1 hover:text-black" data-testid="sort-count">
                                        Number of Product(s) <SortIcon k="count" sort={sort} />
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
                                <tr><td colSpan={6} className="p-10 text-center text-sm text-neutral-500" data-testid="categories-empty">
                                    {search ? `No categories match "${search}".` : "No categories yet."}
                                </td></tr>
                            ) : (
                                pageItems.map((c) => {
                                    const busy = busyIds.has(c.id);
                                    const locked = c.is_active && c.product_count > 0;
                                    return (
                                        <tr
                                            key={c.id}
                                            className={`border-b border-neutral-100 ${selected.has(c.id) ? "bg-neutral-50" : ""} ${c.is_active ? "" : "text-neutral-500"}`}
                                            data-testid={`admin-category-${c.id}`}
                                        >
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(c.id)}
                                                    onChange={() => toggleSelect(c.id)}
                                                    aria-label={`Select ${c.name}`}
                                                    className="size-4 accent-black"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className={`size-10 overflow-hidden rounded bg-[#f5f5f5] ${c.is_active ? "" : "opacity-50"}`}>
                                                    {c.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={c.image} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        <span className="flex size-full items-center justify-center text-neutral-300">
                                                            <FolderTree className="size-5" strokeWidth={1} aria-hidden />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="max-w-xs p-3">
                                                <span className="block">{c.name}</span>
                                                {c.description && <span className="block truncate text-[11px] text-neutral-500">{c.description}</span>}
                                            </td>
                                            <td className="p-3" data-testid={`admin-count-${c.id}`}>{c.product_count}</td>
                                            <td className="p-3" data-testid={`admin-status-${c.id}`}><StatusBadge active={c.is_active} /></td>
                                            <td className="p-3">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={`/dashboard/categories/${c.id}`}
                                                        className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black"
                                                        aria-label={`Edit ${c.name}`}
                                                        title="Edit"
                                                        data-testid={`edit-${c.id}`}
                                                    >
                                                        <Pencil className="size-4" aria-hidden />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRowToggle(c)}
                                                        disabled={busy || locked}
                                                        className={`cursor-pointer rounded-md p-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                                                            c.is_active ? "text-red-600 hover:bg-red-50" : "text-green-700 hover:bg-green-50"
                                                        }`}
                                                        aria-label={`${c.is_active ? "Deactivate" : "Activate"} ${c.name}`}
                                                        title={locked
                                                            ? `Can't deactivate: ${c.product_count} active product(s) in this category`
                                                            : c.is_active ? "Deactivate" : "Activate"}
                                                        data-testid={`${c.is_active ? "deactivate" : "activate"}-${c.id}`}
                                                    >
                                                        {c.is_active ? <Trash2 className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
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
