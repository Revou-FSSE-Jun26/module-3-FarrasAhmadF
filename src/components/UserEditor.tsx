"use client"

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type Role = "user" | "admin";

interface FormState {
    username: string;
    email: string;
    role: Role;
    password: string;
    confirmPassword: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { username: "", email: "", role: "user", password: "", confirmPassword: "" };
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Mirrors validation/users_validation.py. Password is required on create, optional on edit.
function validate(f: FormState, isEdit: boolean): Errors {
    const e: Errors = {};
    if (!f.username.trim()) e.username = "Username is required";
    else if (f.username.trim().length > 50) e.username = "Username cannot exceed 50 characters";
    if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address";
    if (!isEdit || f.password) {
        if (f.password.trim().length < 8) e.password = "Password must be at least 8 characters";
        if (f.confirmPassword !== f.password) e.confirmPassword = "Passwords do not match";
    }
    return e;
}

const inputBase = "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-black placeholder:text-neutral-400 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black disabled:bg-neutral-100 disabled:text-neutral-500";
const inputClass = (error?: string) => `${inputBase} ${error ? "border-red-500" : "border-neutral-300"}`;

function FieldError({id, error}: {id: string; error?: string}) {
    return error ? <p id={id} className="mt-1 text-xs text-red-600">{error}</p> : null;
}

type Load = { status: "loading" } | { status: "not-found" } | { status: "error"; message: string } | { status: "ready" };

/** Admin create/edit form for users. `userId` undefined = create mode (/dashboard/users/new). */
export default function UserEditor({userId}: {userId?: string}) {
    const isEdit = userId !== undefined;
    const router = useRouter();
    const uid = useId();
    const { user: me } = useAuth();

    const [load, setLoad] = useState<Load>(isEdit ? { status: "loading" } : { status: "ready" });
    const [initial, setInitial] = useState<FormState>(EMPTY);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [isActive, setIsActive] = useState(true);
    const [joined, setJoined] = useState("");
    const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

    const validId = !isEdit || /^\d+$/.test(userId);
    const isMe = isEdit && me?.id === Number(userId);

    useEffect(() => {
        if (!isEdit || !validId) return;
        apiFetch(`/users/${userId}?include_inactive=true`)
            .then(async (res) => {
                if (res.status === 404) return setLoad({ status: "not-found" });
                if (!res.ok) throw new Error(String(res.status));
                const u = await res.json();
                const values: FormState = { username: u.username ?? "", email: u.email ?? "", role: u.role === "admin" ? "admin" : "user", password: "", confirmPassword: "" };
                setInitial(values);
                setForm(values);
                setIsActive(u.is_active !== false);
                setJoined(u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");
                setLoad({ status: "ready" });
            })
            .catch(() => setLoad({ status: "error", message: "Failed to load this user. Please try again." }));
    }, [isEdit, userId, validId]);

    const errors = validate(form, isEdit);
    const errorFor = (k: keyof FormState) => (touched[k] || submitAttempted ? errors[k] : undefined);
    const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
        setMessage(null);
    };
    const touch = (k: keyof FormState) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

    const textProps = (k: Exclude<keyof FormState, "role">) => ({
        id: `${uid}-${k}`,
        value: form[k],
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
        onBlur: () => touch(k),
        "aria-invalid": !!errorFor(k),
        "aria-describedby": errorFor(k) ? `${uid}-${k}-error` : undefined,
        className: inputClass(errorFor(k)),
        "data-testid": `editor-${k}`,
    });

    async function handleSave() {
        setMessage(null);
        if (Object.keys(errors).length > 0) {
            setSubmitAttempted(true);
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
        }
        setSaving(true);
        // On edit, only send what changed; password only when a new one was typed.
        const body: Record<string, string> = {};
        if (!isEdit || form.username.trim() !== initial.username) body.username = form.username.trim();
        if (!isEdit || form.email.trim() !== initial.email) body.email = form.email.trim();
        if (!isEdit || form.role !== initial.role) body.role = form.role;
        if (form.password) body.password = form.password;
        try {
            const res = await apiFetch(isEdit ? `/users/${userId}` : "/users", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setMessage({ kind: "error", text: data?.error || "Failed to save user." });
                return;
            }
            if (!isEdit) {
                setInitial(form);
                router.push("/dashboard/users");
                return;
            }
            const saved: FormState = { username: data.username, email: data.email, role: data.role, password: "", confirmPassword: "" };
            setInitial(saved);
            setForm(saved);
            setTouched({});
            setSubmitAttempted(false);
            setMessage({ kind: "success", text: body.password ? "User saved. Password has been reset." : "User saved" });
        } catch {
            setMessage({ kind: "error", text: "Cannot reach server. Please try again." });
        } finally {
            setSaving(false);
        }
    }

    const state: Load = validId ? load : { status: "not-found" };
    if (state.status === "loading") {
        return (
            <main className="flex-1 bg-neutral-50 p-6" aria-busy="true">
                <div className="h-14 animate-pulse rounded-md bg-neutral-200" />
                <div className="mt-6 h-96 max-w-3xl animate-pulse rounded-md bg-neutral-200" />
            </main>
        );
    }
    if (state.status !== "ready") {
        return (
            <main className="flex flex-1 flex-col items-center bg-neutral-50 p-6 py-24 text-center" data-testid="editor-not-found">
                <h1 className="text-xl font-semibold">{state.status === "error" ? "Something went wrong" : "User not found"}</h1>
                <p className="mt-2 text-sm text-neutral-500">{state.status === "error" ? state.message : "This user doesn't exist."}</p>
                <Link href="/dashboard/users" className="mt-6 rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                    Back to List
                </Link>
            </main>
        );
    }

    const PasswordToggle = (
        <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-neutral-500 hover:text-black"
            aria-label={showPassword ? "Hide password" : "Show password"}
        >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
    );

    return (
        <main className="flex-1 bg-neutral-50 text-black">
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 bg-white px-6 py-4">
                <Link
                    href="/dashboard/users"
                    className="rounded-md border border-neutral-300 p-2 text-neutral-700 hover:border-black hover:text-black"
                    aria-label="Back to user list"
                >
                    <ArrowLeft className="size-4" aria-hidden />
                </Link>
                <div className="flex-1">
                    <Link href="/dashboard/users" className="text-[11px] text-neutral-500 hover:underline">Back to List</Link>
                    <h1 className="flex items-center gap-2 text-lg font-semibold">
                        {isEdit ? "Edit User" : "Add New User"}
                        {isEdit && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`} data-testid="editor-status">
                                {isActive ? "Active" : "Deactive"}
                            </span>
                        )}
                    </h1>
                    {isEdit && joined && <p className="text-xs text-neutral-500">Joined {joined}</p>}
                </div>
                {dirty && !saving && <span className="text-xs text-neutral-500" data-testid="unsaved">Unsaved changes</span>}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || (isEdit && !dirty)}
                    className="cursor-pointer rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    data-testid="save-user"
                >
                    {saving ? "Saving..." : "Save User"}
                </button>
            </div>

            {message && (
                <p
                    role={message.kind === "error" ? "alert" : "status"}
                    className={`mx-6 mt-4 max-w-3xl rounded-md px-4 py-2.5 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                    data-testid={`editor-${message.kind}`}
                >
                    {message.text}
                </p>
            )}

            <div className="max-w-3xl space-y-6 p-6">
                <section aria-labelledby={`${uid}-account`} className="rounded-md border border-neutral-200 bg-white">
                    <h2 id={`${uid}-account`} className="border-b border-neutral-200 px-5 py-4 text-base font-semibold">Account Information</h2>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${uid}-username`} className="mb-1 block text-sm font-medium">Username</label>
                            <input {...textProps("username")} autoComplete="off" placeholder="e.g. jonny77" />
                            <FieldError id={`${uid}-username-error`} error={errorFor("username")} />
                        </div>
                        <div>
                            <label htmlFor={`${uid}-email`} className="mb-1 block text-sm font-medium">Email</label>
                            <input {...textProps("email")} type="email" autoComplete="off" placeholder="name@email.com" />
                            <FieldError id={`${uid}-email-error`} error={errorFor("email")} />
                        </div>
                        <div>
                            <label htmlFor={`${uid}-role`} className="mb-1 block text-sm font-medium">Role</label>
                            <div className="relative">
                                <select
                                    id={`${uid}-role`}
                                    value={form.role}
                                    onChange={(e) => set("role", e.target.value as Role)}
                                    disabled={isMe}
                                    aria-describedby={isMe ? `${uid}-role-hint` : undefined}
                                    className={`${inputClass()} appearance-none pr-9`}
                                    data-testid="editor-role"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
                            </div>
                            {isMe && <p id={`${uid}-role-hint`} className="mt-1 text-xs text-neutral-500">You can&apos;t change your own role.</p>}
                        </div>
                    </div>
                </section>

                <section aria-labelledby={`${uid}-password`} className="rounded-md border border-neutral-200 bg-white">
                    <div className="border-b border-neutral-200 px-5 py-4">
                        <h2 id={`${uid}-password`} className="text-base font-semibold">{isEdit ? "Reset Password" : "Password"}</h2>
                        {isEdit && <p className="text-xs text-neutral-500">Leave empty to keep the current password.</p>}
                    </div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${uid}-password`} className="mb-1 block text-sm font-medium">{isEdit ? "New password" : "Password"}</label>
                            <div className="relative">
                                <input {...textProps("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" />
                                {PasswordToggle}
                            </div>
                            <FieldError id={`${uid}-password-error`} error={errorFor("password")} />
                        </div>
                        <div>
                            <label htmlFor={`${uid}-confirmPassword`} className="mb-1 block text-sm font-medium">Confirm password</label>
                            <input {...textProps("confirmPassword")} type={showPassword ? "text" : "password"} autoComplete="new-password" />
                            <FieldError id={`${uid}-confirmPassword-error`} error={errorFor("confirmPassword")} />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
