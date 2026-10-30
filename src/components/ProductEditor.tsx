"use client"

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Coffee, ImageOff } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Category { id: number; name: string }

interface FormState {
    name: string;
    category_id: string;
    price: string;
    stock_quantity: string;
    description: string;
    image: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { name: "", category_id: "", price: "", stock_quantity: "", description: "", image: "" };
const DESCRIPTION_MAX = 500;

function validate(f: FormState): Errors {
    const e: Errors = {};
    if (!f.name.trim()) e.name = "Product name is required";
    else if (f.name.trim().length > 255) e.name = "Product name cannot exceed 255 characters";
    if (!f.category_id) e.category_id = "Select a category";
    const price = Number(f.price);
    if (f.price.trim() === "" || !Number.isFinite(price)) e.price = "Enter a price";
    else if (price <= 0) e.price = "Price must be greater than 0";
    else if (!/^\d+(\.\d{1,2})?$/.test(f.price.trim())) e.price = "Use at most 2 decimals, e.g. 19.99";
    if (f.stock_quantity.trim() === "" || !/^\d+$/.test(f.stock_quantity.trim())) e.stock_quantity = "Stock must be a whole number, 0 or more";
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

/** Admin create/edit form. `productId` undefined = create mode (/dashboard/products/new). */
export default function ProductEditor({productId}: {productId?: string}) {
    const isEdit = productId !== undefined;
    const router = useRouter();
    const uid = useId();
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [load, setLoad] = useState<Load>(isEdit ? { status: "loading" } : { status: "ready" });
    const [categories, setCategories] = useState<Category[]>([]);
    const [initial, setInitial] = useState<FormState>(EMPTY);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [isActive, setIsActive] = useState(true);
    const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
    const [imageBroken, setImageBroken] = useState(false);

    const validId = !isEdit || /^\d+$/.test(productId);

    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        fetch(base + "/categories")
            .then((r) => (r.ok ? r.json() : []))
            .then((list: Category[]) => setCategories(list))
            .catch(() => setCategories([]));

        if (!isEdit || !validId) return;
        // include_inactive lets admins edit deactivated products too.
        apiFetch(`/products/${productId}?include_inactive=true`)
            .then(async (res) => {
                if (res.status === 404) return setLoad({ status: "not-found" });
                if (!res.ok) throw new Error(String(res.status));
                const p = await res.json();
                const values: FormState = {
                    name: p.name ?? "",
                    category_id: p.category_id ? String(p.category_id) : "",
                    price: p.price != null ? String(Number(p.price)) : "",
                    stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : "",
                    description: p.description ?? "",
                    image: p.image ?? "",
                };
                setInitial(values);
                setForm(values);
                setIsActive(p.is_active !== false);
                setLoad({ status: "ready" });
            })
            .catch(() => setLoad({ status: "error", message: "Failed to load this product. Please try again." }));
    }, [isEdit, productId, validId]);

    const errors = validate(form);
    const errorFor = (k: keyof FormState) => (touched[k] || submitAttempted ? errors[k] : undefined);
    const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);

    // Warn before leaving the page with unsaved changes (reload / close tab).
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

    const required: (keyof FormState)[] = ["name", "category_id", "price", "stock_quantity", "description"];
    const filled = required.filter((k) => form[k].trim() !== "" && !errors[k]).length;

    async function handleSave() {
        setMessage(null);
        if (Object.keys(errors).length > 0) {
            setSubmitAttempted(true);
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
        }
        setSaving(true);
        const body = {
            name: form.name.trim(),
            category_id: Number(form.category_id),
            price: Number(form.price),
            stock_quantity: Number(form.stock_quantity),
            description: form.description.trim(),
            image: form.image.trim(),
        };
        try {
            const res = await apiFetch(isEdit ? `/products/${productId}` : "/products", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setMessage({ kind: "error", text: data?.error || "Failed to save product." });
                return;
            }
            if (!isEdit) {
                // Skip the unsaved-changes prompt: we're navigating on purpose.
                setInitial(form);
                router.push("/dashboard/products");
                return;
            }
            const saved: FormState = { ...form, ...Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])) } as FormState;
            setInitial(saved);
            setForm(saved);
            setMessage({ kind: "success", text: "Product saved" });
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
                    <div className="h-96 animate-pulse rounded-md bg-neutral-200" />
                </div>
            </main>
        );
    }
    if (state.status !== "ready") {
        return (
            <main className="flex flex-1 flex-col items-center bg-neutral-50 p-6 py-24 text-center" data-testid="editor-not-found">
                <h1 className="text-xl font-semibold">{state.status === "error" ? "Something went wrong" : "Product not found"}</h1>
                <p className="mt-2 text-sm text-neutral-500">{state.status === "error" ? state.message : "This product doesn't exist."}</p>
                <Link href="/dashboard/products" className="mt-6 rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                    Back to List
                </Link>
            </main>
        );
    }

    const categoryMissing = form.category_id && !categories.some((c) => String(c.id) === form.category_id);
    const showImage = form.image.trim() && !errors.image;

    return (
        <main className="flex-1 bg-neutral-50 text-black">
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 bg-white px-6 py-4">
                <Link
                    href="/dashboard/products"
                    className="rounded-md border border-neutral-300 p-2 text-neutral-700 hover:border-black hover:text-black"
                    aria-label="Back to product list"
                >
                    <ArrowLeft className="size-4" aria-hidden />
                </Link>
                <div className="flex-1">
                    <Link href="/dashboard/products" className="text-[11px] text-neutral-500 hover:underline">Back to List</Link>
                    <h1 className="flex items-center gap-2 text-lg font-semibold">
                        {isEdit ? "Edit Product" : "Add New Product"}
                        {isEdit && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`} data-testid="editor-status">
                                {isActive ? "Active" : "Deactive"}
                            </span>
                        )}
                    </h1>
                </div>
                {dirty && !saving && <span className="text-xs text-neutral-500" data-testid="unsaved">Unsaved changes</span>}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || (isEdit && !dirty)}
                    className="cursor-pointer rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    data-testid="save-product"
                >
                    {saving ? "Saving..." : "Save Product"}
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
                {/* Product image */}
                <section aria-labelledby={`${uid}-image-title`} className="rounded-md border border-neutral-200 bg-white">
                    <h2 id={`${uid}-image-title`} className="border-b border-neutral-200 px-5 py-4 text-base font-semibold">Product Image</h2>
                    <div className="space-y-3 p-5">
                        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-[#f5f5f5]" data-testid="editor-preview">
                            {showImage && !imageBroken ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.image.trim()} alt="Product preview" onError={() => setImageBroken(true)} className="size-full object-contain" />
                            ) : showImage && imageBroken ? (
                                <span className="flex flex-col items-center gap-2 text-xs text-neutral-500">
                                    <ImageOff className="size-8" strokeWidth={1} aria-hidden /> Image could not be loaded
                                </span>
                            ) : (
                                <span className="flex flex-col items-center gap-2 text-xs text-neutral-400">
                                    <Coffee className="size-10" strokeWidth={1} aria-hidden /> No image
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
                    <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                        <h2 id={`${uid}-general-title`} className="text-base font-semibold">General Information</h2>
                        <span className="flex items-center gap-2 text-xs text-neutral-600" aria-label={`${filled} of ${required.length} fields complete`}>
                            <span className="flex gap-0.5" aria-hidden>
                                {required.map((_, i) => (
                                    <span key={i} className={`h-1 w-3 rounded-full ${i < filled ? "bg-black" : "bg-neutral-200"}`} />
                                ))}
                            </span>
                            {filled}/{required.length}
                        </span>
                    </div>

                    <div className="space-y-4 p-5">
                        <div>
                            <label htmlFor={`${uid}-name`} className="mb-1 block text-sm font-medium">Product Name</label>
                            <input {...fieldProps("name")} onChange={(e) => set("name", e.target.value)} placeholder="e.g. RevoGrinder II" className={inputClass(errorFor("name"))} />
                            <FieldError id={`${uid}-name-error`} error={errorFor("name")} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label htmlFor={`${uid}-category_id`} className="mb-1 block text-sm font-medium">Product Category</label>
                                <div className="relative">
                                    <select
                                        {...fieldProps("category_id")}
                                        onChange={(e) => set("category_id", e.target.value)}
                                        className={`${inputClass(errorFor("category_id"))} appearance-none pr-9 ${form.category_id ? "" : "text-neutral-400"}`}
                                    >
                                        <option value="" disabled>Select category</option>
                                        {categories.map((c) => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
                                        {categoryMissing && <option value={form.category_id}>Category #{form.category_id} (inactive)</option>}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
                                </div>
                                <FieldError id={`${uid}-category_id-error`} error={errorFor("category_id")} />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-price`} className="mb-1 block text-sm font-medium">Price</label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500" aria-hidden>$</span>
                                    <input
                                        {...fieldProps("price")}
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        onChange={(e) => set("price", e.target.value.replace(",", "."))}
                                        className={`${inputClass(errorFor("price"))} pl-7`}
                                    />
                                </div>
                                <FieldError id={`${uid}-price-error`} error={errorFor("price")} />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-stock_quantity`} className="mb-1 block text-sm font-medium">Stock</label>
                                <input
                                    {...fieldProps("stock_quantity")}
                                    inputMode="numeric"
                                    placeholder="0"
                                    onChange={(e) => set("stock_quantity", e.target.value.replace(/\D/g, ""))}
                                    className={inputClass(errorFor("stock_quantity"))}
                                />
                                <FieldError id={`${uid}-stock_quantity-error`} error={errorFor("stock_quantity")} />
                            </div>
                        </div>

                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label htmlFor={`${uid}-description`} className="text-sm font-medium">Product Descriptions</label>
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
