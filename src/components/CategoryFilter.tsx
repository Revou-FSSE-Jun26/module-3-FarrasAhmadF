"use client"

import { useEffect, useState } from "react";

interface Categories {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    deleted_at?: string;
};

export default function CategoryFilter({onSelect}: {onSelect: (value: string) => void}) {
    const [categories, setCategories] = useState<Categories[]>([]);
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    useEffect(() => {
        fetch(base + '/categories').then((r) => r.json()).then(setCategories);
    }, []);

    return (
        <select onChange={(e) => onSelect(e.target.value)}>
            <option value=''>All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
    )
}
