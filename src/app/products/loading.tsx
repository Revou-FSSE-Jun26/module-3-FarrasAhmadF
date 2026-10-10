export default function Loading() {
    return (
        <div className="grid grid-cols-3 gap-4 p-6">
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse" />
            ))}
        </div>
    );
}