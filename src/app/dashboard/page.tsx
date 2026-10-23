"use client"

import AdminRoute from "@/components/AdminRoute";
import { Product } from "@/components/ProductCard";
import ProductForm from "@/components/ProductForm";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useEffect, useState } from "react";

function DashboardPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [toast, setToast] = useState('');
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;

    function addProduct(product: Product) {
        setProducts([...products, product]);
        setToast('Product created successfully');
    }

    function updateProduct(product: Product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
        setEditing(null);
        setToast('Product updated successfully');
    }

    async function deleteProduct(id: number) {
        if (!window.confirm('Delete this product?')) return;
        const res = await fetch(base + '/products/' + id, { method: 'DELETE' });
        if (res.ok) {
            setProducts((prev) => prev.filter((p) => p.id !== id));
            setToast('Product deleted successfully');
        }
    }

    useEffect(() => {
        fetch(base + '/products').then((r) => r.json()).then((data) => { setProducts(data); setLoading(false) });
    }, []);

    return (
        <main className="font-sans p-6 min-h-screen bg-gradient-to-br from-white via-purple-100 to-purple-300">
            <p className="text-xs text-gray-700 mb-3">Dashboard</p>

            <header className="flex items-center gap-2 mb-5">
                <span className="font-bold text-lg text-blue-900">RevoShop</span>
                <span className="ml-auto text-sm text-gray-600">{user?.username}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900 text-white">{user?.role}</span>
            </header>

            <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-semibold mr-auto text-blue-900">Products</h1>
                <Link href='/dashboard/categories' className="text-sm text-blue-600 underline">Manage categories</Link>
                <button
                    data-testid="add-product-button"
                    onClick={() => { setEditing(null); setShowForm((s) => !s); }}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm">+ New product</button>
            </div>

            {toast && <p data-testid="toast-success" className="text-green-600 text-sm mb-3">{toast}</p>}

            {showForm && !editing && <ProductForm onAddProduct={addProduct} />}

            {editing && (
                <ProductForm
                    key={editing.id}
                    editingProduct={editing}
                    onUpdateProduct={updateProduct}
                    onCancel={() => setEditing(null)}
                />
            )}

            {loading ? (
                <p className="text-sm text-gray-500">Loading products...</p>
            ) : (
                <table className="w-full text-sm bg-white border rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-3 text-blue-900 font-bold">Name</th>
                            <th className="p-3 text-blue-900 font-bold">Price</th>
                            <th className="p-3 text-blue-900 font-bold">Stock</th>
                            <th className="p-3 text-blue-900 font-bold">Category</th>
                            <th className="p-3 text-blue-900 font-bold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id} data-testid={`product-row-${p.id}`} className="border-t">
                                <td className="p-3 text-blue-900">{p.name}</td>
                                <td className="p-3 text-blue-900">Rp {p.price.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-blue-900">{p.stock_quantity}</td>
                                <td className="p-3 text-blue-900">{p.category_id}</td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        data-testid={`edit-product-${p.id}`}
                                        onClick={() => { setShowForm(false); setToast(''); setEditing(p); }}
                                        className="px-2 py-1 border rounded">Edit</button>
                                    <button
                                        data-testid={`delete-product-${p.id}`}
                                        onClick={() => deleteProduct(p.id)}
                                        className="px-2 py-1 border rounded text-red-600">Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    )
}

export default function App() {
    return (
        <AdminRoute>
            <DashboardPage />
        </AdminRoute>
    )
}
