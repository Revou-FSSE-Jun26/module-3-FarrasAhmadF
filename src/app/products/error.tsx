"use client"

import Link from "next/link";
import { useEffect } from "react";

export default function Error({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
    // Log the real error for debugging; users only see a friendly message.
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center" role="alert" data-testid="products-error">
                <h1 className="text-2xl font-light">Something went wrong</h1>
                <p className="mt-2 text-sm text-neutral-500">
                    We couldn&apos;t load the products right now. Please try again in a moment.
                </p>
                {error.digest && <p className="mt-2 font-mono text-[11px] text-neutral-400">Error ID: {error.digest}</p>}
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="cursor-pointer rounded-full bg-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest text-white hover:bg-neutral-800"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </main>
    );
}
