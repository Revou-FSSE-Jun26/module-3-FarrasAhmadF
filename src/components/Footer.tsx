import { FaGithub, FaLinkedin } from "react-icons/fa";
import { Coffee } from "lucide-react";
import Link from "next/link";

const FOOTER_LINKS = [
    {
        title: "Shop",
        links: [
            { href: "/products", label: "Shop All" },
            { href: "/categories", label: "Categories" },
            { href: "/products/search", label: "Search" },
        ],
    },
    {
        title: "Support",
        links: [
            { href: "/orders", label: "My Orders" },
            { href: "/cart", label: "Cart" },
            { href: "/login", label: "Account" },
        ],
    },
];

const SOCIALS = [
    { href: "https://www.linkedin.com/in/farras-ahmad-fajari/", label: "LinkedIn", Icon: FaLinkedin },
    { href: "https://github.com/Revou-FSSE-Jun26/module-3-FarrasAhmadF.git", label: "GitHub", Icon: FaGithub },
];

export default function Footer() {
    return (
        <footer className="bg-black text-white mt-auto">
            <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 md:grid-cols-4">
                <div className="md:col-span-2">
                    <Link href="/" className="flex items-center gap-2.5 w-fit">
                        <span className="flex size-8 items-center justify-center rounded-full bg-white">
                            <Coffee className="size-4 text-black" strokeWidth={2.5} aria-hidden />
                        </span>
                        <span className="text-sm font-medium tracking-[0.25em] uppercase">
                            RevoCoffee<sup className="text-[8px] tracking-normal">®</sup>
                        </span>
                    </Link>
                    <p className="mt-4 max-w-sm text-sm text-white/60">
                        Precision coffee tools for every brewer. Grinders, scales, and kettles crafted for the perfect cup.
                    </p>
                </div>

                {FOOTER_LINKS.map((col) => (
                    <div key={col.title}>
                        <h3 className="text-xs font-semibold uppercase tracking-widest">{col.title}</h3>
                        <ul className="mt-4 space-y-2 text-sm text-white/60">
                            {col.links.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col-reverse gap-4 sm:flex-row items-center justify-between">
                    <p className="text-xs text-white/50">© RevoCoffee by Farras Ahmad F 2026</p>
                    <div className="flex gap-4">
                        {SOCIALS.map(({ href, label, Icon }) => (
                            <Link
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <Icon />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
