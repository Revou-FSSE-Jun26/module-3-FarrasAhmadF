"use client"

import { useState } from "react";
import { CategoryFormData, ValidateCategory } from "./ValidateCategory";

export interface Category {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    deleted_at?: string;
}

export default function CategoryForm({onAddCategory}: {onAddCategory: (p: Category) => void}) {
    const [form, setForm] = useState<CategoryFormData>({name: '', description: ''});
    const [successMsg, setSuccessMsg] = useState('');
    const [formError, setFormError] = useState('');
    const errors = ValidateCategory(form);
    const hasErrors = Object.keys(errors).length > 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (hasErrors) return;

        setSuccessMsg('');
        setFormError('');

        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(base + '/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })

        if (res.status === 201) {
            const created: Category = await res.json();
            onAddCategory(created);
            setForm({name: '', description: ''})
            setSuccessMsg('Category created successfully');
        } else if (res.status === 400) {
            const data = await res.json();
            setFormError(data.error)
        } else {
            setFormError('Something went wrong. Please try again.');
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 w-64 border border-gray-700 rounded-lg p-4 mt-4">
            <h3 className="font-bold">Add new category</h3>
            <div>
                <label className="block text-sm">Name</label>
                <input 
                    className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                    value={form.name} 
                    onChange={(e) => setForm({...form, name: e.target.value})} 
                    placeholder="Name" />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div>
                <label className="block text-sm">Description</label>
                <textarea 
                    className="border border-gray-600 bg-gray-800 rounded px-2 py-1 w-full"
                    value={form.description} 
                    onChange={(e) => setForm({...form, description: e.target.value})} 
                    placeholder="Description (optional)" />
            </div>
            <button type="submit" disabled={hasErrors} className="px-4 py-2 rounded bg-blue-600 text-white w-full disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 hover:cursor-pointer">Add category</button>
            {successMsg && <p className="text-green-500 text-sm">{successMsg}</p>}
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
        </form>
    )
}
