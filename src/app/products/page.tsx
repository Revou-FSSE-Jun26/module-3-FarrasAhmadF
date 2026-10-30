import { Metadata } from "next";
import ProductsClient from "@/components/ProductsClient";
import { getCategories, getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
    title: 'All Products - RevoCoffee',
    description: 'Browse all RevoCoffee products.'
}

export default async function ProductsPage() {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto max-w-7xl px-6 pb-16 pt-8">
                <h1 className="mb-12 text-3xl font-bold uppercase tracking-wide">All Products</h1>
                <ProductsClient initialProducts={products} categories={categories} />
            </div>
        </main>
    )
}
