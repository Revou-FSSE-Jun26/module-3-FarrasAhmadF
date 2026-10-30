"use client"

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Minus, Plus } from "lucide-react";
import ProductCard, { Product, formatPrice } from "./ProductCard";

export interface Category {
    id: number;
    name: string;
    description?: string | null;
    image?: string | null;
    is_active?: boolean;
}

type Availability = "in" | "out";
type SortKey = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "featured", label: "Featured" },
    { value: "price-asc", label: "Price, low to high" },
    { value: "price-desc", label: "Price, high to low" },
    { value: "name-asc", label: "Alphabetically, A-Z" },
    { value: "name-desc", label: "Alphabetically, Z-A" },
];

function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterSection({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <details open className="group border-b border-neutral-200 py-4 first:pt-0">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                {title}
                <Minus className="size-3.5 hidden group-open:block" aria-hidden />
                <Plus className="size-3.5 group-open:hidden" aria-hidden />
            </summary>
            <div className="mt-3 space-y-2">{children}</div>
        </details>
    );
}

function Checkbox({label, count, checked, onChange}: {label: string; count: number; checked: boolean; onChange: () => void}) {
    return (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700 hover:text-black">
            <input type="checkbox" checked={checked} onChange={onChange} className="size-3.5 accent-black" />
            <span>{label}</span>
            <span className="text-neutral-400">({count})</span>
        </label>
    );
}

export default function ProductsClient({initialProducts, categories, breadcrumb = "ALL PRODUCTS"}: {
    initialProducts: Product[];
    categories: Category[];
    breadcrumb?: string;
}) {
    const [availability, setAvailability] = useState<Availability[]>([]);
    // Price range as typed strings; empty = no bound.
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const highestPrice = Math.ceil(Math.max(0, ...initialProducts.map((p) => p.price)));
    const minBound = minPrice.trim() === "" ? null : Number(minPrice);
    const maxBound = maxPrice.trim() === "" ? null : Number(maxPrice);
    const priceInvalid = minBound !== null && maxBound !== null && minBound > maxBound;
    const [sort, setSort] = useState<SortKey>("featured");

    // Category selection lives in the URL (?category=1,3) so the /categories tiles can
    // link straight to a filtered view and the filter survives refresh / back button.
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get("category") ?? "";
    const parseIds = (raw: string) => raw
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);

    // Local state makes the checkbox respond instantly; the URL is updated alongside it.
    const [categoryIds, setCategoryState] = useState<number[]>(() => parseIds(categoryParam));
    // When the URL itself changes (tile link, header link, back button), re-sync during render.
    const [prevParam, setPrevParam] = useState(categoryParam);
    if (prevParam !== categoryParam) {
        setPrevParam(categoryParam);
        setCategoryState(parseIds(categoryParam));
    }

    const setCategoryIds = (update: (ids: number[]) => number[]) => {
        const next = update(categoryIds);
        setCategoryState(next);
        const params = new URLSearchParams(searchParams.toString());
        if (next.length) params.set("category", next.join(","));
        else params.delete("category");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const visible = useMemo(() => {
        const filtered = initialProducts.filter((p) => {
            const status: Availability = p.stock_quantity > 0 ? "in" : "out";
            if (availability.length && !availability.includes(status)) return false;
            if (categoryIds.length && !categoryIds.includes(p.category_id)) return false;
            if (!priceInvalid) {
                if (minBound !== null && p.price < minBound) return false;
                if (maxBound !== null && p.price > maxBound) return false;
            }
            return true;
        });
        const sorted = [...filtered];
        switch (sort) {
            case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
            case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
            case "name-asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "name-desc": sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
        }
        return sorted;
    }, [initialProducts, availability, categoryIds, sort, minBound, maxBound, priceInvalid]);

    const inStockCount = initialProducts.filter((p) => p.stock_quantity > 0).length;
    const hasFilters = availability.length > 0 || categoryIds.length > 0 || minPrice !== "" || maxPrice !== "";
    // Allow digits and one decimal separator (comma becomes a dot).
    const cleanPrice = (v: string) => v.replace(",", ".").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

    return (
        <div className="grid gap-8 md:grid-cols-[200px_1fr] lg:gap-12">
            {/* Sidebar */}
            <aside>
                <nav aria-label="Breadcrumb" className="mb-6 text-[11px] text-neutral-600">
                    <Link href="/" className="hover:underline">Home</Link>
                    <span className="mx-1.5">/</span>
                    <Link href="/categories" className="hover:underline">Collections</Link>
                    <span className="mx-1.5">/</span>
                    <span className="text-black">{breadcrumb}</span>
                </nav>

                <FilterSection title="Availability">
                    <Checkbox
                        label="In stock"
                        count={inStockCount}
                        checked={availability.includes("in")}
                        onChange={() => setAvailability((a) => toggle(a, "in"))}
                    />
                    <Checkbox
                        label="Out of stock"
                        count={initialProducts.length - inStockCount}
                        checked={availability.includes("out")}
                        onChange={() => setAvailability((a) => toggle(a, "out"))}
                    />
                </FilterSection>

                <FilterSection title="Category">
                    {categories.length === 0 ? (
                        <p className="text-xs text-neutral-400">No categories</p>
                    ) : (
                        categories.map((c) => (
                            <Checkbox
                                key={c.id}
                                label={c.name}
                                count={initialProducts.filter((p) => p.category_id === c.id).length}
                                checked={categoryIds.includes(c.id)}
                                onChange={() => setCategoryIds((ids) => toggle(ids, c.id))}
                            />
                        ))
                    )}
                </FilterSection>

                <FilterSection title="Price">
                    <p className="text-[11px] text-neutral-500">The highest price is {formatPrice(highestPrice)}</p>
                    <div className="flex items-center gap-2">
                        <label className="relative flex-1">
                            <span className="sr-only">Minimum price</span>
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500" aria-hidden>$</span>
                            <input
                                inputMode="decimal"
                                value={minPrice}
                                onChange={(e) => setMinPrice(cleanPrice(e.target.value))}
                                placeholder="From"
                                aria-invalid={priceInvalid}
                                className="w-full border border-neutral-300 py-1.5 pl-5 pr-2 text-xs outline-none focus:border-black aria-[invalid=true]:border-red-500"
                                data-testid="price-min"
                            />
                        </label>
                        <span className="text-xs text-neutral-400" aria-hidden>–</span>
                        <label className="relative flex-1">
                            <span className="sr-only">Maximum price</span>
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500" aria-hidden>$</span>
                            <input
                                inputMode="decimal"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(cleanPrice(e.target.value))}
                                placeholder="To"
                                aria-invalid={priceInvalid}
                                className="w-full border border-neutral-300 py-1.5 pl-5 pr-2 text-xs outline-none focus:border-black aria-[invalid=true]:border-red-500"
                                data-testid="price-max"
                            />
                        </label>
                    </div>
                    {priceInvalid && <p role="alert" className="text-[11px] text-red-600" data-testid="price-error">&ldquo;From&rdquo; must be lower than &ldquo;To&rdquo;.</p>}
                </FilterSection>

                {hasFilters && (
                    <button
                        type="button"
                        onClick={() => { setAvailability([]); setCategoryIds(() => []); setMinPrice(""); setMaxPrice(""); }}
                        className="mt-4 text-xs underline underline-offset-4 hover:text-neutral-500"
                    >
                        Clear all
                    </button>
                )}
            </aside>

            {/* Product grid */}
            <section>
                <div className="mb-4 flex items-center justify-between text-[11px]">
                    <label className="relative flex items-center gap-1">
                        <span className="sr-only">Sort by</span>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortKey)}
                            className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.value === "featured" ? "Sort by" : o.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 size-3" aria-hidden />
                    </label>
                    <p data-testid="product-count">{visible.length} products</p>
                </div>

                {visible.length === 0 ? (
                    <p className="py-20 text-center text-sm text-neutral-500">No products match the selected filters.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4">
                        {visible.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
