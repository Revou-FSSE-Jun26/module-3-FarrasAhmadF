export default function Loading() {
    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold mb-3">Categories</h1>
            <div className="grid grid-cols-2 gap-4">
                {Array.from({length: 4}).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                        <div className="h-5 w-1/2 bg-gray-200 rounded mb-2" />
                        <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    </div>
                ))}
            </div>
        </main>
    );
}
