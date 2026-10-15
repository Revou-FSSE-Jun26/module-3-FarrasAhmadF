"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({children}: {children: React.ReactNode}) {
    const { isLoggedIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isLoggedIn) router.replace('/login');
    }, [isLoggedIn, loading, router]);

    if (loading) return <p>Loading...</p>
    if (!isLoggedIn) return null;
    return <>{children}</>
}