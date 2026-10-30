export default function Loading() {
    return (
        <main className="flex-1 bg-neutral-50">
            <div className="mx-auto max-w-6xl px-6 py-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="aspect-square animate-pulse bg-neutral-200 even:bg-neutral-300" />
                    ))}
                </div>
            </div>
        </main>
    );
}
