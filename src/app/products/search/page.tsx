import { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import ProductsClient from "@/components/ProductsClient";
import { getCategories, getProducts, matchesQuery } from "@/lib/catalog";

type SearchParams = Promise<{ q?: string | string[] }>;

export const metadata: Metadata = { title: 'Search - RevoCoffee' };

const readQuery = (q: string | string[] | undefined) => (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 100);

function SearchForm({q}: {q: string}) {
    return (
        // GET form: submitting navigates to /products/search?q=... (client-side via next/form).
        <Form action="/products/search" role="search" className="mx-auto mt-5 flex max-w-sm" data-testid="search-page-form">
            <label htmlFor="search-page-q" className="sr-only">Search products</label>
            <input
                id="search-page-q"
                key={q}
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search our store"
                maxLength={100}
                className="flex-1 border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                data-testid="search-page-input"
            />
            <button type="submit" className="cursor-pointer bg-black px-5 text-white hover:bg-neutral-800" aria-label="Search">
                <Search className="size-4" aria-hidden />
            </button>
        </Form>
    );
}

/** Reads ?q= and the catalog. Lives inside <Suspense> because both are request-time data. */
async function SearchResults({searchParams}: {searchParams: SearchParams}) {
    const q = readQuery((await searchParams).q);
    const [products, categories] = q ? await Promise.all([getProducts(), getCategories()]) : [[], []];
    const results = q ? products.filter((p) => matchesQuery(p.name, q)) : [];

    return (
        <>
            <SearchForm q={q} />
            <hr className="my-10 border-neutral-200" />
            {!q ? (
                <p className="py-16 text-center text-sm text-neutral-500" data-testid="search-prompt">
                    Type a product name to start searching.
                </p>
            ) : results.length === 0 ? (
                <div className="py-16 text-center" data-testid="search-empty">
                    <p className="text-sm text-neutral-700">No results for &ldquo;{q}&rdquo;.</p>
                    <p className="mt-1 text-xs text-neutral-500">Check the spelling or try a shorter keyword.</p>
                    <Link href="/products" className="mt-6 inline-block rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                        View all products
                    </Link>
                </div>
            ) : (
                <>
                    <p className="sr-only" role="status">{results.length} results for {q}</p>
                    <ProductsClient key={q} initialProducts={results} categories={categories} breadcrumb={`SEARCH: "${q.toUpperCase()}"`} />
                </>
            )}
        </>
    );
}

function ResultsSkeleton() {
    return (
        <div aria-busy="true">
            <div className="mx-auto mt-5 h-10 max-w-sm animate-pulse bg-neutral-100" />
            <hr className="my-10 border-neutral-200" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:ml-[248px] lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-square animate-pulse bg-neutral-100" />)}
            </div>
        </div>
    );
}

export default function SearchPage({searchParams}: {searchParams: SearchParams}) {
    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto max-w-7xl px-6 pb-16 pt-8">
                <h1 className="text-center text-xl font-light">Search</h1>
                <Suspense fallback={<ResultsSkeleton />}>
                    <SearchResults searchParams={searchParams} />
                </Suspense>
            </div>
        </main>
    );
}
