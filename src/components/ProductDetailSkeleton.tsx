export default function ProductDetailSkeleton() {
    return (
        <div className="grid gap-10 md:grid-cols-2 lg:gap-16 animate-pulse">
            <div className="aspect-square bg-neutral-100" />
            <div>
                <div className="h-3 w-48 bg-neutral-200" />
                <div className="mt-3 h-6 w-3/4 bg-neutral-200" />
                <div className="mt-5 h-5 w-24 bg-neutral-200" />
                <div className="mt-2 h-3 w-40 bg-neutral-200" />
                <div className="my-6 h-px bg-neutral-200" />
                <div className="h-3 w-36 bg-neutral-200" />
                <div className="mt-5 h-11 w-full bg-neutral-200" />
                <div className="mt-8 space-y-2">
                    <div className="h-3 w-full bg-neutral-200" />
                    <div className="h-3 w-5/6 bg-neutral-200" />
                    <div className="h-3 w-2/3 bg-neutral-200" />
                </div>
            </div>
        </div>
    );
}
