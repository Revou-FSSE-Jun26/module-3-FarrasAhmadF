"use client"

import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import RegisterForm from "@/components/RegisterForm";
import { useRouter } from "next/navigation";

export default function App() {
    const router = useRouter();
    return (
        <PublicOnlyRoute>
            <main className="p-6">
                <RegisterForm onSuccess={() => setTimeout(() => router.push('/login'), 2000)} />
            </main>
        </PublicOnlyRoute>
    )
}