"use client"

import { useState } from "react";
import ValidateRegister, { RegisterFormData } from "./ValidateRegister";

export default function RegisterForm({onSuccess}: {onSuccess: () => void}) {
    const [form, setForm] = useState<RegisterFormData>({username: '', email: '', password: '', confirmPassword: ''});
    const [successMsg, setSuccessMsg] = useState('');
    const [formError, setFormError] = useState('');
    // A field's error is only shown once the user has typed in it or left it.
    const [touched, setTouched] = useState<Partial<Record<keyof RegisterFormData, boolean>>>({});
    const errors = ValidateRegister(form);
    const hasErrors = Object.keys(errors).length > 0;

    const touch = (key: keyof RegisterFormData) =>
        setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (hasErrors) {
            // Submitting reveals every remaining error, including untouched fields.
            setTouched({ username: true, email: true, password: true, confirmPassword: true });
            return;
        }

        setSuccessMsg('');
        setFormError('');

        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(base + '/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username: form.username, email: form.email, password: form.password})
        })

        if (res.status === 201) {
            setForm({username: '', email: '', password: '', confirmPassword: ''});
            setTouched({});
            setSuccessMsg('Registration successful. Redirecting you to login page...');
            onSuccess();
        } else if (res.status === 400) {
            const data = await res.json();
            setFormError(data.error)
        } else if (res.status === 409) {
            const data = await res.json();
            setFormError(data.error)
        } else {
            setFormError('Something went wrong. Please try again.');
        }
    }

    const fields: {
        key: keyof RegisterFormData;
        label: string;
        type: string;
        autoComplete: string;
        testId: string;
    }[] = [
        { key: 'username', label: 'Username', type: 'text', autoComplete: 'username', testId: 'username' },
        { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', testId: 'email' },
        { key: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', testId: 'password' },
        { key: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password', testId: 'confirm-password' },
    ];

    return (
        <form onSubmit={handleSubmit} noValidate className="w-full space-y-3">
            {fields.map((f) => {
                const error = touched[f.key] ? errors[f.key] : undefined;
                const inputId = `register-${f.testId}`;
                const errorId = `${inputId}-error`;
                return (
                    <div key={f.key}>
                        <label htmlFor={inputId} className="sr-only">{f.label}</label>
                        <input
                            id={inputId}
                            type={f.type}
                            autoComplete={f.autoComplete}
                            value={form[f.key]}
                            onChange={(e) => { setForm({...form, [f.key]: e.target.value}); touch(f.key); }}
                            onBlur={() => touch(f.key)}
                            placeholder={f.label}
                            aria-invalid={!!error}
                            aria-describedby={error ? errorId : undefined}
                            className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm text-black placeholder:text-neutral-600 outline-none transition-colors focus:border-black"
                            data-testid={`${f.testId}-input`} />
                        {error && <p id={errorId} className="mt-1 px-4 text-xs text-red-600" data-testid={`${f.testId}-error`}>{error}</p>}
                    </div>
                );
            })}

            <button
                type="submit"
                data-testid='register-submit'
                className="w-full cursor-pointer rounded-full bg-black py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
                Create Account
            </button>

            {successMsg && <p role="status" className="text-center text-sm text-green-700">{successMsg}</p>}
            {formError && <p role="alert" className="text-center text-sm text-red-600">{formError}</p>}
        </form>
    )
}