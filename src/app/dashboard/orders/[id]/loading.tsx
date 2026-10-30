export default function Loading() {
    return (
        <main className="flex-1 bg-neutral-50" aria-busy="true">
            <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1fr_300px]">
                <div className="h-96 animate-pulse rounded-md bg-neutral-200" />
                <div className="h-64 animate-pulse rounded-md bg-neutral-200" />
            </div>
        </main>
    );
}
