"use client"

import { useState } from "react";
import Validate, { ProductFormData } from "./Validate";

export default function ProductForm({onAddProduct}: {onAddProduct: (p: ProductFormData) => void}) {
    const [form, setForm] = useState<ProductFormData>({name: '', price: 0, stock_quantity: 0, category_id: 0});
    const errors = Validate(form);
    const hasErrors = Object.keys(errors).length > 0;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (hasErrors) return;
        onAddProduct(form);
        setForm({name: '', price: 0, stock_quantity: 0, category_id: 0})
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 w-64 border border-gray-700 rounded-lg p-4 mt-4">
            <h3 className="font-bold">Add new product</h3>
            <div>
                <label className="block text-sm">Name</label>
                <input 
                    className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                    value={form.name} 
                    onChange={(e) => setForm({...form, name: e.target.value})} 
                    placeholder="Name" />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div className="flex gap-2">
                <div>
                    <label className="block text-sm mb-5">Price</label>
                    <input 
                        className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                        type="number" 
                        value={form.price} 
                        onChange={(e) => setForm({...form, price: Number(e.target.value)})} />
                    {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
                </div>
                <div>
                    <label className="block text-sm">Category id</label>
                    <input 
                        className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                        type="number"
                        value={form.category_id} 
                        onChange={(e) => setForm({...form, category_id: Number(e.target.value)})} />
                    {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id}</p>}
                </div>
                <div>
                    <label className="block text-sm">Stock quantity</label>
                    <input 
                        className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                        type="number" 
                        value={form.stock_quantity} 
                        onChange={(e) => setForm({...form, stock_quantity: Number(e.target.value)})} />
                    {errors.stock_quantity && <p className="text-red-500 text-sm">{errors.stock_quantity}</p>}
                </div>
            </div>
            <button type="submit" disabled={hasErrors} className="px-4 py-2 rounded bg-blue-600 text-white w-full disabled:bg-gray-600 disabled:cursor-not-allowed">Add product</button>
        </form>
    )
}
