"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminRoute({children}: {children: React.ReactNode}) {
    const { user, loading, isLoggedIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isLoggedIn) router.replace('/login');
        else if (!loading && user?.role !== 'admin') router.replace('/')
    }, [user, loading, router, isLoggedIn]);

    if (loading) return <p>Loading...</p>
    if (!isLoggedIn || user?.role !== 'admin') return null;
    return <>{children}</>;
}