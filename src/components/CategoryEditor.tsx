"use client"

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderTree, ImageOff } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface FormState {
    name: string;
    description: string;
    image: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { name: "", description: "", image: "" };
const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

// Mirrors validation/categories_validation.py in the backend.
function validate(f: FormState): Errors {
    const e: Errors = {};
    if (!f.name.trim()) e.name = "Category name is required";
    else if (f.name.trim().length > NAME_MAX) e.name = `Category name cannot exceed ${NAME_MAX} characters`;
    if (f.description.trim().length > DESCRIPTION_MAX) e.description = `Description cannot exceed ${DESCRIPTION_MAX} characters`;
    if (f.image.trim() && !/^https?:\/\//i.test(f.image.trim())) e.image = "Image must be a URL starting with http:// or https://";
    return e;
}

const inputBase = "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-black placeholder:text-neutral-400 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black";
const inputClass = (error?: string) => `${inputBase} ${error ? "border-red-500" : "border-neutral-300"}`;

function FieldError({id, error}: {id: string; error?: string}) {
    return error ? <p id={id} className="mt-1 text-xs text-red-600">{error}</p> : null;
}

type Load = { status: "loading" } | { status: "not-found" } | { status: "error"; message: string } | { status: "ready" };

/** Admin create/edit form for categories. `categoryId` undefined = create mode. */
export default function CategoryEditor({categoryId}: {categoryId?: string}) {
    const isEdit = categoryId !== undefined;
    const router = useRouter();
    const uid = useId();
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [load, setLoad] = useState<Load>(isEdit ? { status: "loading" } : { status: "ready" });
    const [initial, setInitial] = useState<FormState>(EMPTY);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [isActive, setIsActive] = useState(true);
    const [productCount, setProductCount] = useState(0);
    const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
    const [imageBroken, setImageBroken] = useState(false);

    const validId = !isEdit || /^\d+$/.test(categoryId);

    useEffect(() => {
        if (!isEdit || !validId) return;
        // include_inactive lets admins edit deactivated categories too.
        apiFetch(`/categories/${categoryId}?include_inactive=true`)
            .then(async (res) => {
                if (res.status === 404) return setLoad({ status: "not-found" });
                if (!res.ok) throw new Error(String(res.status));
                const c = await res.json();
                const values: FormState = { name: c.name ?? "", description: c.description ?? "", image: c.image ?? "" };
                setInitial(values);
                setForm(values);
                setIsActive(c.is_active !== false);
                setProductCount(Number(c.product_count ?? 0));
                setLoad({ status: "ready" });
            })
            .catch(() => setLoad({ status: "error", message: "Failed to load this category. Please try again." }));
    }, [isEdit, categoryId, validId]);

    const errors = validate(form);
    const errorFor = (k: keyof FormState) => (touched[k] || submitAttempted ? errors[k] : undefined);
    const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);

    // Warn before reloading / closing the tab with unsaved changes.
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);

    const set = (k: keyof FormState, v: string) => {
        setForm((f) => ({ ...f, [k]: v }));
        setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
        setMessage(null);
        if (k === "image") setImageBroken(false);
    };
    const touch = (k: keyof FormState) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

    const fieldProps = (k: keyof FormState) => ({
        id: `${uid}-${k}`,
        value: form[k],
        onBlur: () => touch(k),
        "aria-invalid": !!errorFor(k),
        "aria-describedby": errorFor(k) ? `${uid}-${k}-error` : undefined,
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
        const body = { name: form.name.trim(), description: form.description.trim(), image: form.image.trim() };
        try {
            const res = await apiFetch(isEdit ? `/categories/${categoryId}` : "/categories", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setMessage({ kind: "error", text: data?.error || "Failed to save category." });
                return;
            }
            if (!isEdit) {
                setInitial(form);
                router.push("/dashboard/categories");
                return;
            }
            setInitial(body);
            setForm(body);
            setMessage({ kind: "success", text: "Category saved" });
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
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="h-80 animate-pulse rounded-md bg-neutral-200" />
                    <div className="h-64 animate-pulse rounded-md bg-neutral-200" />
                </div>
            </main>
        );
    }
    if (state.status !== "ready") {
        return (
            <main className="flex flex-1 flex-col items-center bg-neutral-50 p-6 py-24 text-center" data-testid="editor-not-found">
                <h1 className="text-xl font-semibold">{state.status === "error" ? "Something went wrong" : "Category not found"}</h1>
                <p className="mt-2 text-sm text-neutral-500">{state.status === "error" ? state.message : "This category doesn't exist."}</p>
                <Link href="/dashboard/categories" className="mt-6 rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                    Back to List
                </Link>
            </main>
        );
    }

    const showImage = form.image.trim() && !errors.image;

    return (
        <main className="flex-1 bg-neutral-50 text-black">
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 bg-white px-6 py-4">
                <Link
                    href="/dashboard/categories"
                    className="rounded-md border border-neutral-300 p-2 text-neutral-700 hover:border-black hover:text-black"
                    aria-label="Back to category list"
                >
                    <ArrowLeft className="size-4" aria-hidden />
                </Link>
                <div className="flex-1">
                    <Link href="/dashboard/categories" className="text-[11px] text-neutral-500 hover:underline">Back to List</Link>
                    <h1 className="flex items-center gap-2 text-lg font-semibold">
                        {isEdit ? "Edit Category" : "Add New Category"}
                        {isEdit && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`} data-testid="editor-status">
                                {isActive ? "Active" : "Deactive"}
                            </span>
                        )}
                    </h1>
                    {isEdit && (
                        <p className="text-xs text-neutral-500" data-testid="editor-product-count">
                            {productCount} active product{productCount === 1 ? "" : "s"}
                        </p>
                    )}
                </div>
                {dirty && !saving && <span className="text-xs text-neutral-500" data-testid="unsaved">Unsaved changes</span>}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || (isEdit && !dirty)}
                    className="cursor-pointer rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    data-testid="save-category"
                >
                    {saving ? "Saving..." : "Save Category"}
                </button>
            </div>

            {message && (
                <p
                    role={message.kind === "error" ? "alert" : "status"}
                    className={`mx-6 mt-4 rounded-md px-4 py-2.5 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                    data-testid={`editor-${message.kind}`}
                >
                    {message.text}
                </p>
            )}

            <div className="grid items-start gap-6 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                {/* Category image */}
                <section aria-labelledby={`${uid}-image-title`} className="rounded-md border border-neutral-200 bg-white">
                    <h2 id={`${uid}-image-title`} className="border-b border-neutral-200 px-5 py-4 text-base font-semibold">Category Image</h2>
                    <div className="space-y-3 p-5">
                        {/* Square, like the tiles on /categories */}
                        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[#f5f5f5]" data-testid="editor-preview">
                            {showImage && !imageBroken ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.image.trim()} alt="Category preview" onError={() => setImageBroken(true)} className="size-full object-cover" />
                            ) : showImage && imageBroken ? (
                                <span className="flex flex-col items-center gap-2 text-xs text-neutral-500">
                                    <ImageOff className="size-8" strokeWidth={1} aria-hidden /> Image could not be loaded
                                </span>
                            ) : (
                                <span className="flex flex-col items-center gap-2 text-xs text-neutral-400">
                                    <FolderTree className="size-10" strokeWidth={1} aria-hidden /> No image
                                </span>
                            )}
                            {showImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 opacity-0 transition-opacity hover:bg-black/20 hover:opacity-100 focus-within:bg-black/20 focus-within:opacity-100">
                                    <button
                                        type="button"
                                        onClick={() => { imageInputRef.current?.focus(); imageInputRef.current?.select(); }}
                                        className="w-24 cursor-pointer rounded-md bg-white py-1.5 text-xs font-medium shadow"
                                    >
                                        Replace
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => set("image", "")}
                                        className="w-24 cursor-pointer rounded-md bg-white py-1.5 text-xs font-medium text-red-600 shadow"
                                        data-testid="editor-remove-image"
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor={`${uid}-image`} className="mb-1 block text-sm font-medium">Image URL</label>
                            <input
                                {...fieldProps("image")}
                                ref={imageInputRef}
                                type="url"
                                inputMode="url"
                                placeholder="https://..."
                                onChange={(e) => set("image", e.target.value)}
                                className={inputClass(errorFor("image"))}
                            />
                            <FieldError id={`${uid}-image-error`} error={errorFor("image")} />
                            <p className="mt-1 text-xs text-neutral-500">Paste a direct link to an image file. Leave empty for no image.</p>
                        </div>
                    </div>
                </section>

                {/* General information */}
                <section aria-labelledby={`${uid}-general-title`} className="rounded-md border border-neutral-200 bg-white">
                    <h2 id={`${uid}-general-title`} className="border-b border-neutral-200 px-5 py-4 text-base font-semibold">General Information</h2>
                    <div className="space-y-4 p-5">
                        <div>
                            <label htmlFor={`${uid}-name`} className="mb-1 block text-sm font-medium">Category Name</label>
                            <input {...fieldProps("name")} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Coffee Grinder" className={inputClass(errorFor("name"))} />
                            <FieldError id={`${uid}-name-error`} error={errorFor("name")} />
                        </div>
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label htmlFor={`${uid}-description`} className="text-sm font-medium">Description <span className="font-normal text-neutral-400">(optional)</span></label>
                                <span className={`text-xs ${form.description.trim().length > DESCRIPTION_MAX ? "text-red-600" : "text-neutral-400"}`} data-testid="editor-description-count">
                                    {form.description.trim().length}/{DESCRIPTION_MAX}
                                </span>
                            </div>
                            <textarea
                                {...fieldProps("description")}
                                rows={6}
                                placeholder="Description"
                                onChange={(e) => set("description", e.target.value)}
                                className={`${inputClass(errorFor("description"))} resize-y`}
                            />
                            <FieldError id={`${uid}-description-error`} error={errorFor("description")} />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
