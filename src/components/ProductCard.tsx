import Link from "next/link";
import { Coffee } from "lucide-react";

export interface Product {
    id: number;
    name: string;
    category_id: number;
    category?: string | null;
    description?: string;
    price: number;
    stock_quantity: number;
    created_at: string;
    deleted_at?: string;
    image?: string | null;
    slug?: string;
};

const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

export function formatPrice(value: number) {
    return usd.format(value);
}

export default function ProductCard({product}: {product: Product}) {
    const inStock = product.stock_quantity > 0;
    // Detail route is /products/[slug]; fall back to id for products without a slug.
    const href = `/products/${encodeURIComponent(product.slug || String(product.id))}`;

    return (
        <Link href={href} className="group block text-center" data-testid={`product-${product.id}`}>
            {/* Square box: most product photos are ~1:1, so object-cover fills the card with minimal cropping. */}
            <div className="relative aspect-square overflow-hidden rounded-sm bg-[#f5f5f5]">
                {product.image ? (
                    // Product images come from arbitrary hosts, so a plain <img> is used instead of next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={product.image}
                        alt={product.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300">
                        <Coffee className="size-16" strokeWidth={1} aria-hidden />
                    </div>
                )}
                {!inStock && (
                    <span className="absolute left-3 top-3 bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                        Sold out
                    </span>
                )}
            </div>
            <h3 className="mt-3 text-xs text-black group-hover:underline underline-offset-4">{product.name}</h3>
            <p className="mt-1 text-xs text-neutral-700">{formatPrice(product.price)}</p>
        </Link>
    );
};
