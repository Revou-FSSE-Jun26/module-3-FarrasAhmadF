import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
                <h1 className="text-2xl font-light">Product not found</h1>
                <p className="mt-2 text-sm text-neutral-500">
                    The product you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <Link
                    href="/products"
                    className="mt-6 border border-black px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] transition-colors hover:bg-black hover:text-white"
                >
                    Back to Shop
                </Link>
            </div>
        </main>
    );
}
