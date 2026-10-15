"use client"

import { useState } from "react";
import ValidateRegister, { RegisterFormData } from "./ValidateRegister";
import { User } from "@/context/AuthContext";

export default function RegisterForm({onSuccess}: {onSuccess: () => void}) {
    const [form, setForm] = useState<RegisterFormData>({username: '', email: '', password: '', confirmPassword: ''});
    const [successMsg, setSuccessMsg] = useState('');
    const [formError, setFormError] = useState('');
    const errors = ValidateRegister(form);
    const hasErrors = Object.keys(errors).length > 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (hasErrors) return;

        setSuccessMsg('');
        setFormError('');

        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(base + '/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username: form.username, email: form.email, password: form.password})
        })

        if (res.status === 201) {
            const created: User = await res.json();
            setForm({username: '', email: '', password: '', confirmPassword: ''});
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

    return (
        <form onSubmit={handleSubmit} className="space-y-3 w-72 mx-auto mt-20">
            <h2 className="font-bold text-lg">Register Form</h2>
            <input 
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                placeholder="Username"
                className="border rounded px-2 py-1 w-full" />
            {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
            <input 
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="Email"
                className="border rounded px-2 py-1 w-full" />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            <input 
                type="password"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                placeholder="Password"
                className="border rounded px-2 py-1 w-full" />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
            <input 
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                placeholder="Confirm password"
                className="border rounded px-2 py-1 w-full" />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
            <button type="submit" disabled={hasErrors} className="bg-blue-600 text-white rounded px-4 py-2 w-full disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 hover:cursor-pointer">Register</button>
            {successMsg && <p className="text-green-500 text-sm bg-green-100 border rounded-lg">{successMsg}</p>}
            {formError && <p className="text-red-500 text-sm bg-red-100 border rounded-lg">{formError}</p>}
        </form>
    )
}