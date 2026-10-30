import ProductDetailSkeleton from "@/components/ProductDetailSkeleton";

export default function Loading() {
    return (
        <main className="flex-1 bg-white">
            <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
                <ProductDetailSkeleton />
            </div>
        </main>
    );
}
