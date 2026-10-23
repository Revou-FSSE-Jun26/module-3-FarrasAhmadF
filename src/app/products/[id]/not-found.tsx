import Link from "next/link";

export default function NotFound() {
    return (
        <main className="p-6">
            <div className="border border-gray-600 rounded-xl p-6 text-center">
                <h1 className="text-xl font-bold">Product not found</h1>
                <p className="text-sm text-gray-500 mt-1">
                    The product you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <Link href="/products" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
                    &larr; Back to products
                </Link>
            </div>
        </main>
    );
}
