"use client"

import { useState } from "react";
import CategoryForm, { Category } from "./CategoryForm";

export default function CategoriesClient({initialCategories}: {initialCategories: Category[]}) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);

    function addCategory(category: Category) {
        setCategories([...categories, category]);
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((c) => (
                    <li key={c.id} className="border border-gray-700 rounded px-4 py-3">
                        <p className="font-bold">{c.name}</p>
                        {c.description && <p className="text-sm text-gray-400">{c.description}</p>}
                    </li>
                ))}
            </ul>
            <CategoryForm onAddCategory={addCategory} />
        </div>
    )
}
