"use cache"

import AdminRoute from "@/components/AdminRoute";
import CategoriesClient from "@/components/CategoriesClient";

async function getCategories() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/categories');
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to load categories (' + res.status + ')');
    }
    return res.json();
}

export const metadata = { title: 'Categories - RevoShop' };

export default async function CategoriesPage() {
    const categories = await getCategories();
    return (
        <AdminRoute>
            <main className="p-6">
                <h1 className="text-2xl font-bold mb-3">Categories</h1>
                <CategoriesClient initialCategories={categories} />
            </main>
        </AdminRoute>
    )
}