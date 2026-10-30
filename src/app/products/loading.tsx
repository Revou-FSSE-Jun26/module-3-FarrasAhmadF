export default function Loading() {
    return (
        <main className="flex-1 bg-white">
            <div className="mx-auto max-w-7xl px-6 pb-16 pt-8">
                <div className="mb-12 h-9 w-64 animate-pulse bg-neutral-200" />
                <div className="grid gap-8 md:grid-cols-[200px_1fr] lg:gap-12">
                    <div className="space-y-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-4 animate-pulse bg-neutral-200" />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div key={i}>
                                <div className="aspect-square animate-pulse bg-neutral-100" />
                                <div className="mx-auto mt-3 h-3 w-3/4 animate-pulse bg-neutral-200" />
                                <div className="mx-auto mt-2 h-3 w-1/3 animate-pulse bg-neutral-200" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
