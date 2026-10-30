import { Metadata } from "next";
import Link from "next/link";
import { Coffee } from "lucide-react";
import { Category } from "@/components/ProductsClient";

async function getCategories(): Promise<Category[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/categories');
    if (!res.ok) {
        // The backend returns 404 when there are no categories.
        if (res.status === 404) return [];
        throw new Error('Failed to load categories (' + res.status + ')');
    }
    const data: Category[] = await res.json();
    return data.filter((c) => c.is_active !== false);
}

export const metadata: Metadata = {
    title: 'Categories - RevoCoffee',
    description: 'Browse RevoCoffee collections.',
};

export default async function CategoriesPage() {
    const categories = await getCategories();

    return (
        <main className="flex-1 bg-neutral-50 text-black">
            <div className="mx-auto max-w-6xl px-6 py-6">
                <h1 className="sr-only">Categories</h1>

                {categories.length === 0 ? (
                    <p className="py-20 text-center text-sm text-neutral-500">No categories yet.</p>
                ) : (
                    // Tiles sit flush against each other (no gap), like the reference.
                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                        {categories.map((c) => (
                            <li key={c.id}>
                                <Link
                                    href={`/products?category=${c.id}`}
                                    data-testid={`category-${c.id}`}
                                    className="group relative flex aspect-square items-center justify-center overflow-hidden bg-neutral-200"
                                >
                                    {c.image ? (
                                        // Category images come from arbitrary hosts, so a plain <img> is used instead of next/image.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={c.image}
                                            alt=""
                                            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <Coffee className="absolute size-16 text-neutral-400" strokeWidth={1} aria-hidden />
                                    )}
                                    {/* Light overlay keeps the white label readable on bright photos. */}
                                    <span aria-hidden className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/35" />
                                    <span className="relative px-3 text-center text-sm text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                                        {c.name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}
