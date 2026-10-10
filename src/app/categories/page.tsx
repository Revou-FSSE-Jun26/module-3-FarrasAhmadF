interface Categories {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    deleted_at?: string;
};

async function getCategories(): Promise<Categories[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/categories');
    if (!res.ok) throw new Error('Failed to load categories (' + res.status + ')');
    return res.json();
}

export default async function CategoriesPage() {
    const categories = await getCategories();
    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold mb-3">Categories</h1>
            <div className="grid grid-cols-2 gap-4">
                {categories.map((c) => (
                    <div key={c.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.description && (
                            <p className="text-sm text-gray-500">{c.description}</p>
                        )}
                    </div>
                ))}
            </div>
        </main>
    )
}