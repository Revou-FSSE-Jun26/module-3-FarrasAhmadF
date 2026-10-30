"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({children}: {children: React.ReactNode}) {
    const { isLoggedIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isLoggedIn) {
            // Send the user back here after logging in.
            const here = window.location.pathname + window.location.search;
            router.replace('/login?next=' + encodeURIComponent(here));
        }
    }, [isLoggedIn, loading, router]);

    if (loading) return <p>Loading...</p>
    if (!isLoggedIn) return null;
    return <>{children}</>
}