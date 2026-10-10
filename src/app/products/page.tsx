import Link from "next/link";
import { Product } from "@/components/ProductCard";
import ProductsClient from "@/components/ProductsClient";
import { Metadata } from "next";

// const INITIAL_PRODUCTS: Product[] = [
//     {id: 1, name: 'Keyboard Gemink', category_id: 2, price: 1500000, stock_quantity: 5, created_at: '15:45.45 2026'},
//     {id: 2, name: 'Monitor 2.5K', category_id: 1, price: 2500000, stock_quantity: 0, created_at: '15:45.45 2026'},
//     {id: 3, name: 'Mouse kantor', category_id: 2, price: 500000, stock_quantity: 15, created_at: '15:45.45 2026'}
// ];

async function getProducts() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/products');
    if (!res.ok) throw new Error('Failed to load products (' + res.status + ')');
    return res.json();
}

export const metadata: Metadata = {
    title: 'Products - RevoShop',
    description: 'Browse all RevoShop products.'
}

export default async function App() {
    const products = await getProducts();
    return (
        <main className="p-4">
            <div className="flex justify-end mb-3">
                <Link href="/products/search" className="text-sm text-blue-600 hover:underline">
                    Search product &rarr;
                </Link>
            </div>
            <ProductsClient initialProducts={products}/>
        </main>
    )
}