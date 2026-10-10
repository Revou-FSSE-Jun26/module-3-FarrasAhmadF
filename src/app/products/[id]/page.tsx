import { Suspense } from "react";
import ProductDetailSkeleton from "@/components/ProductDetailSkeleton";

async function getProduct(id: number) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/products/' + id);
    if (!res.ok) throw new Error('Failed to load product ' + id + ' (' + res.status + ')');
    return res.json();
}

export async function generateMetadata({params}: {params: Promise<{id: number}>}) {
    const {id} = await params;
    const product = await getProduct(id);
    return {title: product.name + ' - RevoShop'};
}

async function ProductCard({id}: {id: number}) {
    const product = await getProduct(id);
    return (
        <div className="border border-gray-600 rounded-xl p-5">
            <p className="text-sm text-gray-500 mb-3">
                RevoShop › Products › {product.name}
            </p>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p>Rp {product.price.toLocaleString('id-ID')}</p>
        </div>
    );
}

export default async function ProductDetail({params}: {params: Promise<{id: number}>}) {
    const {id} = await params;
    return (
        <main className="p-6">
            <Suspense fallback={<ProductDetailSkeleton />}>
                <ProductCard id={id} />
            </Suspense>
        </main>
    )
}
