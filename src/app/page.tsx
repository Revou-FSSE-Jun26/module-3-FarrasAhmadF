import Link from "next/link";
import { Suspense } from "react";
import { Coffee, Scale, Truck, ShieldCheck, Headphones } from "lucide-react";
import { getCategories } from "@/lib/catalog";

const FEATURES = [
    { Icon: Truck, title: "Free Shipping", desc: "On all orders over $50" },
    { Icon: ShieldCheck, title: "2-Year Warranty", desc: "Built to last, backed by us" },
    { Icon: Headphones, title: "Brewing Support", desc: "Talk to our coffee experts" },
];

// `match` is looked up in the category names from the backend ("Coffee Grinder" -> grinder),
// so the tiles keep working if a category's id changes.
const COLLECTIONS = [
    { Icon: Coffee, title: "Grinders", desc: "Consistent grind, every time.", match: "grinder" },
    { Icon: Scale, title: "Scales", desc: "Weigh and time your brew.", match: "scale" },
    { Icon: Coffee, title: "Kettles", desc: "Pour with precision.", match: "kettle" },
];

function CollectionTiles({hrefFor}: {hrefFor: (match: string) => string}) {
    return (
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {COLLECTIONS.map(({ Icon, title, desc, match }) => (
                <Link
                    key={title}
                    href={hrefFor(match)}
                    className="group flex flex-col items-center gap-3 bg-[#eeeeee] px-6 py-14 text-center transition-colors hover:bg-black hover:text-white"
                    data-testid={`collection-${match}`}
                >
                    <Icon className="size-10" strokeWidth={1.25} aria-hidden />
                    <h3 className="text-lg font-light">{title}</h3>
                    <p className="text-sm text-neutral-500 group-hover:text-white/70">{desc}</p>
                    <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] underline underline-offset-4">
                        Shop Now
                    </span>
                </Link>
            ))}
        </div>
    );
}

/** Links each tile to its category's filtered product list. */
async function Collections() {
    const categories = await getCategories();
    const hrefFor = (match: string) => {
        const category = categories.find((c) => c.name.toLowerCase().includes(match));
        // No matching category (renamed or deactivated): send them to all collections instead.
        return category ? `/products?category=${category.id}` : "/categories";
    };
    return <CollectionTiles hrefFor={hrefFor} />;
}

export default function Home() {
    return (
        <main className="flex-1 bg-neutral-50 text-black">
            {/* Hero */}
            <section className="bg-[url(https://images.unsplash.com/photo-1690983322938-9ca2d8e0b0eb?q=80&w=1895&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D)] bg-cover bg-bottom relative flex h-[60vh] min-h-[360px] items-end justify-center bg-[#eeeeee] pb-6">
                <div className="relative flex flex-col items-center gap-4 px-6 pt-10 pb-6 text-center">
                    {/* soft glow behind the text, like the reference */}
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0)_70%)] scale-x-150"
                    />
                    <h1 className="relative text-2xl sm:text-3xl font-light text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
                        A Sensational New Release
                    </h1>
                    <Link
                        href="/products"
                        className="relative bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-black transition-colors hover:bg-black hover:text-white"
                    >
                        Unbeatable Prices
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-3">
                    {FEATURES.map(({ Icon, title, desc }) => (
                        <div key={title} className="flex items-center gap-4">
                            <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest">{title}</p>
                                <p className="text-sm text-neutral-500">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Collections */}
            <section className="mx-auto max-w-6xl px-6 py-16">
                <h2 className="text-center text-xs font-semibold uppercase tracking-[0.3em]">Shop by Collection</h2>
                {/* Categories are fetched per request; until they arrive the tiles link to /categories. */}
                <Suspense fallback={<CollectionTiles hrefFor={() => "/categories"} />}>
                    <Collections />
                </Suspense>
            </section>

            {/* CTA banner */}
            <section className="bg-black text-white">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-16 text-center">
                    <h2 className="text-2xl sm:text-3xl font-light">Brew Better with RevoCoffee</h2>
                    <p className="max-w-md text-sm text-white/60">
                        Discover tools designed by coffee lovers, for coffee lovers.
                    </p>
                    <Link
                        href="/products"
                        className="bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-black transition-colors hover:bg-neutral-200"
                    >
                        Shop All
                    </Link>
                </div>
            </section>
        </main>
    );
}
