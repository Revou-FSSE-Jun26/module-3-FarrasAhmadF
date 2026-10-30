export default function Loading() {
    return (
        <main className="flex-1 bg-neutral-50 p-6" aria-busy="true">
            <div className="h-14 animate-pulse rounded-md bg-neutral-200" />
            <div className="mt-6 h-96 max-w-3xl animate-pulse rounded-md bg-neutral-200" />
        </main>
    );
}
