"use client"

import { useState } from "react";
import Validate, { ProductFormData } from "./ValidateProduct";
import { Product } from "./ProductCard";

interface ProductFormProps {
    onAddProduct?: (p: Product) => void;
    editingProduct?: Product | null;
    onUpdateProduct?: (p: Product) => void;
    onCancel?: () => void;
}

export default function ProductForm({ onAddProduct, editingProduct, onUpdateProduct, onCancel }: ProductFormProps) {
    const isEdit = Boolean(editingProduct);

    const [form, setForm] = useState<ProductFormData>(
        editingProduct
            ? {
                name: editingProduct.name,
                price: editingProduct.price,
                stock_quantity: editingProduct.stock_quantity,
                category_id: editingProduct.category_id,
            }
            : { name: '', price: 0, stock_quantity: 0, category_id: 0 }
    );
    const [successMsg, setSuccessMsg] = useState('');
    const [formError, setFormError] = useState('');
    const errors = Validate(form);
    const hasErrors = Object.keys(errors).length > 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (hasErrors) return;

        setSuccessMsg('');
        setFormError('');

        const base = process.env.NEXT_PUBLIC_API_BASE_URL;

        if (isEdit && editingProduct) {
            const res = await fetch(base + '/products/' + editingProduct.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                const updated: Product = await res.json();
                onUpdateProduct?.(updated);
                setSuccessMsg('Product updated successfully');
            } else if (res.status === 400) {
                const data = await res.json();
                setFormError(data.error);
            } else {
                setFormError('Something went wrong. Please try again.');
            }
            return;
        }

        const res = await fetch(base + '/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });

        if (res.status === 201) {
            const created: Product = await res.json();
            onAddProduct?.(created);
            setForm({ name: '', price: 0, stock_quantity: 0, category_id: 0 });
            setSuccessMsg('Product created successfully');
        } else if (res.status === 400) {
            const data = await res.json();
            setFormError(data.error);
        } else {
            setFormError('Something went wrong. Please try again.');
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 w-64 border border-gray-700 rounded-lg p-4 mt-4">
            <h3 className="font-bold">{isEdit ? 'Edit product' : 'Add new product'}</h3>
            <div>
                <label className="block text-sm">Name</label>
                <input
                    data-testid="name-input"
                    className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Name" />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div className="flex gap-2">
                <div>
                    <label className="block text-sm mb-5">Price</label>
                    <input
                        data-testid="price-input"
                        className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                    {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
                </div>
                {!isEdit && (
                    <>
                        <div>
                            <label className="block text-sm">Category id</label>
                            <input
                                data-testid="category-id-input"
                                className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                                type="number"
                                value={form.category_id}
                                onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })} />
                            {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm">Stock quantity</label>
                            <input
                                data-testid="stock-quantity-input"
                                className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                                type="number"
                                value={form.stock_quantity}
                                onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} />
                            {errors.stock_quantity && <p className="text-red-500 text-sm">{errors.stock_quantity}</p>}
                        </div>
                    </>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    data-testid="save-product"
                    type="submit"
                    disabled={hasErrors}
                    className="px-4 py-2 rounded bg-blue-600 text-white w-full disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 hover:cursor-pointer">
                    {isEdit ? 'Save changes' : 'Add product'}
                </button>
                {isEdit && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded border w-full">
                        Cancel
                    </button>
                )}
            </div>
            {successMsg && <p data-testid="form-success" className="text-green-500 text-sm">{successMsg}</p>}
            {formError && <p data-testid="form-error" className="text-red-500 text-sm">{formError}</p>}
        </form>
    )
}
