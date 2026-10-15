"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PublicOnlyRoute({children}: {children: React.ReactNode}) {
    const { user, isLoggedIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoggedIn && !loading) {
            router.replace(user?.role === 'admin' ? '/dashboard' : '/');
        }
    }, [user, isLoggedIn, loading, router]);

    if (loading) return <p>Loading...</p>;
    if (isLoggedIn) return null;
    return <>{children}</>
}