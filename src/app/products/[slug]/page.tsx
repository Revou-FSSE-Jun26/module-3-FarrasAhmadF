import { Suspense, cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coffee } from "lucide-react";
import ProductDetailSkeleton from "@/components/ProductDetailSkeleton";
import AddToCartButton from "@/components/AddToCartButton";
import { Product, formatPrice } from "@/components/ProductCard";

const LOW_STOCK = 5;

// cache() dedupes the request between generateMetadata and the page render.
const getProduct = cache(async (slug: string): Promise<Product> => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(base + '/products/' + encodeURIComponent(slug));
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error('Failed to load product ' + slug + ' (' + res.status + ')');
    const data = await res.json();
    // Flask serializes Numeric columns as strings, so normalize them.
    return { ...data, price: Number(data.price), stock_quantity: Number(data.stock_quantity) };
});

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const product = await getProduct(slug);
    return {
        title: product.name + ' - RevoCoffee',
        description: product.description,
    };
}

function StockStatus({stock}: {stock: number}) {
    if (stock <= 0) {
        return (
            <p className="flex items-center gap-2 text-xs text-neutral-600">
                <span className="size-2 rounded-full bg-neutral-400" aria-hidden />
                Sold out
            </p>
        );
    }
    return (
        <p className="flex items-center gap-2 text-xs text-neutral-700">
            <span className="size-2 rounded-full bg-green-500 ring-4 ring-green-100" aria-hidden />
            {stock <= LOW_STOCK ? `Low stock - only ${stock} left` : 'In stock, ready to ship'}
        </p>
    );
}

async function ProductDetailContent({slug}: {slug: string}) {
    const product = await getProduct(slug);

    return (
        <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
            {/* Image */}
            <div className="flex aspect-square items-center justify-center bg-white">
                {product.image ? (
                    // Product images come from arbitrary hosts, so a plain <img> is used instead of next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
                ) : (
                    <div className="flex size-full items-center justify-center bg-[#f5f5f5] text-neutral-300">
                        <Coffee className="size-24" strokeWidth={1} aria-hidden />
                    </div>
                )}
            </div>

            {/* Info */}
            <div>
                <nav aria-label="Breadcrumb" className="text-[11px] text-neutral-600">
                    <Link href="/" className="hover:underline">Home</Link>
                    <span className="mx-1">/</span>
                    <Link href="/categories" className="hover:underline">Collections</Link>
                    <span className="mx-1">/</span>
                    <Link href="/products" className="hover:underline">All Product</Link>
                    <span className="mx-1">/</span>
                </nav>

                <h1 className="mt-2 text-lg text-black" data-testid="product-name">{product.name}</h1>
                {product.category && (
                    <p className="mt-1 text-[11px] uppercase tracking-widest text-neutral-500">{product.category}</p>
                )}

                <p className="mt-4 text-red-600" data-testid="product-price">{formatPrice(product.price)}</p>
                <p className="text-[11px] text-neutral-600">Shipping calculated at checkout</p>

                <hr className="my-6 border-neutral-200" />

                <StockStatus stock={product.stock_quantity} />

                <div className="mt-5">
                    <AddToCartButton product={product} />
                </div>

                {product.description && (
                    <div className="mt-8">
                        <h2 className="text-sm font-bold text-black">Description</h2>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                            {product.description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default async function ProductDetail({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
                <Suspense fallback={<ProductDetailSkeleton />}>
                    <ProductDetailContent slug={slug} />
                </Suspense>
            </div>
        </main>
    )
}
