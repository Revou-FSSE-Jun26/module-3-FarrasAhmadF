"use client"

import { useState } from "react";
import CategoryForm, { Category } from "./CategoryForm";
import { useAuth } from "@/context/AuthContext";

export default function CategoriesClient({initialCategories}: {initialCategories: Category[]}) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;

    function addCategory(category: Category) {
        setCategories([...categories, category]);
    }

    async function deleteCategory(id: number) {
        const res = await fetch(base + '/categories/' + id, {
            method: 'DELETE'
        })
        
        if (res.ok) {
            setCategories(categories.filter((c) => c.id !== id))
        };
    };

    async function updateCategory(id: number, data: Partial<Pick<Category, "name" | "description">>) {
        const res = await fetch(base + '/categories/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        if (res.ok) {
            const updated: Category = await res.json();
            setCategories(categories.map((c) => (c.id === id ? updated : c)));
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((c) => (
                    <li key={c.id} className="border border-gray-700 rounded px-4 py-3">
                        {editingId === c.id ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="border border-gray-600 rounded px-2 py-1 bg-transparent"
                                    placeholder="Name"
                                />
                                <input
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="border border-gray-600 rounded px-2 py-1 bg-transparent"
                                    placeholder="Description"
                                />
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={async () => {
                                            await updateCategory(c.id, { name: editName, description: editDescription });
                                            setEditingId(null);
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button onClick={() => setEditingId(null)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="font-bold">{c.name}</p>
                                {c.description && <p className="text-sm text-gray-400">{c.description}</p>}
                                {isAdmin && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => {
                                                setEditingId(c.id);
                                                setEditName(c.name);
                                                setEditDescription(c.description ?? "");
                                            }}
                                            className="text-blue-600 hover:text-blue-700 hover:cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                        <button onClick={() => deleteCategory(c.id)} className="text-red-600 hover:text-red-700 hover:cursor-pointer">Delete</button>
                                    </div>
                                )}
                            </>
                        )}
                    </li>
                ))}
            </ul>
            {isAdmin && <CategoryForm onAddCategory={addCategory} />}
        </div>
    )
}
