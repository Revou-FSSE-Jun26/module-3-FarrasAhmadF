"use client"

import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import DemoAccounts from "@/components/DemoAccounts";
import { getSafeNext } from "@/lib/redirect";
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
                // Honor ?next= (e.g. /login?next=/checkout from the cart drawer).
                const destination = getSafeNext(data.user.role === 'admin' ? '/dashboard' : '/');
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

    const inputClass = "w-full rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm text-black placeholder:text-neutral-600 outline-none transition-colors focus:border-black aria-[invalid=true]:border-red-500";

    function fillDemoAccount(account: { email: string; password: string }) {
        setEmail(account.email);
        setPassword(account.password);
        setError('');
        setFieldErrors({});
        // Put the cursor on the submit button so Enter / Space logs in right away.
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-testid="login-submit"]')?.focus());
    }

    return (
        <main className="flex-1 bg-white text-black">
            <div className="mx-auto grid max-w-4xl items-start gap-10 px-6 pb-20 pt-10 md:grid-cols-2 md:gap-16">
            <div className="flex flex-col items-center">
                <h1 className="text-2xl font-bold uppercase tracking-wide">Login</h1>
                <p className="mt-3 text-sm text-neutral-700">
                    Don&apos;t have an account?{' '}
                    <Link href='/register' className="underline underline-offset-4 hover:text-neutral-500">Sign up here.</Link>
                </p>

                <form onSubmit={handleSubmit} noValidate className="mt-10 w-full space-y-3">
                    <div>
                        <label htmlFor="login-email" className="sr-only">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                            className={inputClass}
                            data-testid='email-login' />
                        {fieldErrors.email && <p id="login-email-error" className="mt-1 px-4 text-xs text-red-600" data-testid='email-error-login'>{fieldErrors.email}</p>}
                    </div>
                    <div>
                        <label htmlFor="login-password" className="sr-only">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            aria-invalid={!!fieldErrors.password}
                            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                            className={inputClass}
                            data-testid='password-login' />
                        {fieldErrors.password && <p id="login-password-error" className="mt-1 px-4 text-xs text-red-600" data-testid='password-error-login'>{fieldErrors.password}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        data-testid='login-submit'
                        className="w-full cursor-pointer rounded-full bg-black py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                    >
                        {submitting ? 'Signing in...' : 'Sign In'}
                    </button>

                    {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
                </form>
            </div>

            <DemoAccounts onUse={fillDemoAccount} />
            </div>
        </main>
    )
}

export default function App() {
    return (
        <PublicOnlyRoute>
            <LoginPage />
        </PublicOnlyRoute>
    )
}