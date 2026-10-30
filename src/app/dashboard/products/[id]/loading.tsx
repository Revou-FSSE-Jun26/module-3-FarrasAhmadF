export default function Loading() {
    return (
        <main className="flex-1 bg-neutral-50 p-6" aria-busy="true">
            <div className="h-14 animate-pulse rounded-md bg-neutral-200" />
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="h-80 animate-pulse rounded-md bg-neutral-200" />
                <div className="h-96 animate-pulse rounded-md bg-neutral-200" />
            </div>
        </main>
    );
}
