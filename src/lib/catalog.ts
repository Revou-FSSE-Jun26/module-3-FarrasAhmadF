// Server-side data loading shared by /products and /products/search.

import { Product } from "@/components/ProductCard";
import type { Category } from "@/components/ProductsClient";

export async function getProducts(): Promise<Product[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/products');
    if (res.status === 404) return []; // backend returns 404 when there are no products
    if (!res.ok) throw new Error('Failed to load products (' + res.status + ')');
    const data = await res.json();
    return data.map((p: Product) => ({
        ...p,
        price: Number(p.price),
        stock_quantity: Number(p.stock_quantity),
    }));
}

// Categories only power the sidebar filter, so a failure here shouldn't break the page.
export async function getCategories(): Promise<Category[]> {
    try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(base + '/categories');
        if (!res.ok) return [];
        const data: Category[] = await res.json();
        return data.filter((c) => c.is_active !== false);
    } catch {
        return [];
    }
}

/**
 * Product name search: case-insensitive, every word must appear somewhere in the name
 * ("grinder revo" matches "RevoGrinder II").
 */
export function matchesQuery(name: string, query: string): boolean {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = name.toLowerCase();
    return words.length > 0 && words.every((w) => haystack.includes(w));
}
