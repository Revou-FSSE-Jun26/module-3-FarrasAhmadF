// Shared pieces of the admin list pages (/dashboard/products, /dashboard/categories).

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

export const PAGE_SIZES = [10, 25, 50];

/** Cycles a column's sort: off -> asc -> desc -> off. */
export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
    if (current?.key !== key) return { key, dir: "asc" };
    return current.dir === "asc" ? { key, dir: "desc" } : null;
}

export function ariaSort<K extends string>(sort: SortState<K>, key: K): "none" | "ascending" | "descending" {
    if (sort?.key !== key) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
}

export function SortIcon<K extends string>({k, sort}: {k: K; sort: SortState<K>}) {
    if (sort?.key !== k) return <ArrowUpDown className="size-3 text-neutral-400" aria-hidden />;
    return sort.dir === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />;
}

export function StatusBadge({active}: {active: boolean}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
        >
            <span className={`size-1.5 rounded-full ${active ? "bg-green-500" : "bg-red-500"}`} aria-hidden />
            {active ? "Active" : "Deactive"}
        </span>
    );
}

/** 1 … 4 5 [6] 7 8 … 12 */
function pageList(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
        out.push(p);
    });
    return out;
}

/** "Showing X to Y of Z entries" + page buttons. */
export function Pagination({page, totalPages, start, shown, total, onPage}: {
    page: number;
    totalPages: number;
    start: number;
    shown: number;
    total: number;
    onPage: (page: number) => void;
}) {
    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
            <p data-testid="showing">
                Showing {start + 1} to {start + shown} of {total} entries
            </p>
            <nav aria-label="Pagination" className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPage(page - 1)}
                    disabled={page === 1}
                    className="cursor-pointer rounded-md p-1.5 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="size-4" aria-hidden />
                </button>
                {pageList(page, totalPages).map((n, i) =>
                    n === "…" ? (
                        <span key={`gap-${i}`} className="px-1" aria-hidden>…</span>
                    ) : (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onPage(n)}
                            aria-current={n === page ? "page" : undefined}
                            aria-label={`Page ${n}`}
                            className={`min-w-7 cursor-pointer rounded-md px-2 py-1 ${n === page ? "bg-black text-white" : "hover:bg-neutral-100"}`}
                            data-testid={`page-${n}`}
                        >
                            {n}
                        </button>
                    ),
                )}
                <button
                    type="button"
                    onClick={() => onPage(page + 1)}
                    disabled={page === totalPages}
                    className="cursor-pointer rounded-md p-1.5 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight className="size-4" aria-hidden />
                </button>
            </nav>
        </div>
    );
}
