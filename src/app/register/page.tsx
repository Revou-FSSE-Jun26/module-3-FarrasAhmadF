"use client"

import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import RegisterForm from "@/components/RegisterForm";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function App() {
    const router = useRouter();
    return (
        <PublicOnlyRoute>
            <main className="flex-1 bg-white text-black">
                <div className="mx-auto flex max-w-sm flex-col items-center px-6 pb-20 pt-10">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">Create Account</h1>
                    <p className="mt-3 text-sm text-neutral-700">
                        Already have an account?{' '}
                        <Link href='/login' className="underline underline-offset-4 hover:text-neutral-500">Log in here.</Link>
                    </p>
                    <div className="mt-10 w-full">
                        <RegisterForm onSuccess={() => setTimeout(() => router.push('/login'), 2000)} />
                    </div>
                </div>
            </main>
        </PublicOnlyRoute>
    )
}
