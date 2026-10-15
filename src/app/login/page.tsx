"use client"

import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react"

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{email?: string, password?: string}>({})
    const [submitting, setSubmitting] = useState(false);

    const {login} = useAuth();
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        setFieldErrors({});

        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        try {
            const res = await fetch(base + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({email, password})
            });
            const data = await res.json();

            if (res.status === 200 && data.success) {
                login(data.user, data.access_token);
                const destination = data.user.role === 'admin' ? '/dashboard' : '/'
                router.push(destination);
            } else if (res.status === 401) {
                setError('Invalid email or password');
            } else if (res.status === 400) {
                setFieldErrors({ [data.field]: data.error })
            } else {
                setError(data.message || 'Login failed');
            }
        } catch {
            setError('Cannot reach server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 w-72 mx-auto mt-20 mb-20 border rounded-lg p-6 shadow-md">
            <h2 className="font-bold text-xl">Login</h2>
            <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="border rounded px-2 py-1 w-full" />
            {fieldErrors.email && <p className="text-red-500 text-sm">{fieldErrors.email}</p>}
            <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="border rounded px-2 py-1 w-full" />
            {fieldErrors.password && <p className="text-red-500 text-sm">{fieldErrors.password}</p>}
            <button type="submit" disabled={submitting} className="bg-blue-600 text-white rounded px-4 py-2 w-full hover:bg-blue-700 hover:cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed">{submitting ? 'Logging in...' : 'Login'}</button>
            <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link href='/register' className="text-blue-600 hover:underline">Create account</Link>
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
    )
}

export default function App() {
    return (
        <PublicOnlyRoute>
            <LoginPage />
        </PublicOnlyRoute>
    )
}