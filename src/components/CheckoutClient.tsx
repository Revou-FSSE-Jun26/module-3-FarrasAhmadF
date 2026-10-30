"use client"

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Coffee, CreditCard, Lock, QrCode, Wallet, CircleCheck } from "lucide-react";
import ProtectedRoute from "./ProtectedRoute";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "./ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
    CheckoutForm, EMPTY_CHECKOUT_FORM, PROVINCES, SHIPPING_METHODS, PaymentMethodId,
    formatCardNumber, formatExpiry, isAddressReady, shippingCost, validateCheckout,
} from "@/lib/checkout";

const inputBase = "w-full rounded-md border bg-white px-3 py-3 text-sm text-black placeholder:text-neutral-500 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black";
const inputClass = (error?: string) => `${inputBase} ${error ? 'border-red-500' : 'border-neutral-300'}`;

function FieldError({id, error}: {id: string; error?: string}) {
    return error ? <p id={id} className="mt-1 text-xs text-red-600">{error}</p> : null;
}

const PAYMENT_OPTIONS: { id: PaymentMethodId; label: string; Icon: typeof CreditCard }[] = [
    { id: "card", label: "Credit card", Icon: CreditCard },
    { id: "gopay", label: "GoPay", Icon: Wallet },
    { id: "qris", label: "QRIS", Icon: QrCode },
];

interface PlacedOrder { id: number; total: number }

function Checkout() {
    const { user } = useAuth();
    const { items, note, clearCart, hydrated } = useCart();

    const [form, setForm] = useState<CheckoutForm>(EMPTY_CHECKOUT_FORM);
    const [touched, setTouched] = useState<Partial<Record<keyof CheckoutForm, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState('');
    const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
    const [discountCode, setDiscountCode] = useState('');
    const [discountError, setDiscountError] = useState('');

    const errors = validateCheckout(form);
    // Same pattern as the register form: errors show once a field is touched or after submit.
    const errorFor = (key: keyof CheckoutForm) => (touched[key] || submitAttempted ? errors[key] : undefined);

    const set = <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
        setForm((f) => ({ ...f, [key]: value }));
        setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
    };
    const touch = (key: keyof CheckoutForm) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

    // Props shared by every text input: value, change/blur handlers, a11y wiring.
    const textProps = (key: keyof CheckoutForm, label: string) => {
        const error = errorFor(key);
        return {
            id: `checkout-${key}`,
            name: key,
            value: form[key] as string,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never),
            onBlur: () => touch(key),
            placeholder: label,
            'aria-label': label,
            'aria-invalid': !!error,
            'aria-describedby': error ? `checkout-${key}-error` : undefined,
            className: inputClass(error),
            'data-testid': `checkout-${key}`,
        };
    };

    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const addressReady = isAddressReady(form);
    const shipping = addressReady ? shippingCost(form.shippingMethod, subtotal) : null;
    const total = subtotal + (shipping ?? 0);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError('');
        if (Object.keys(errors).length > 0) {
            setSubmitAttempted(true);
            // Move focus to the first invalid field once the errors have rendered.
            requestAnimationFrame(() => {
                document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
            });
            return;
        }
        if (!user) return;

        setSubmitting(true);
        try {
            // The buyer comes from the JWT; shipping cost/total are recalculated by the backend.
            // Card / GoPay numbers are deliberately NOT sent: they must never be stored.
            const res = await apiFetch('/orders', {
                method: 'POST',
                body: JSON.stringify({
                    items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
                    first_name: form.firstName,
                    last_name: form.lastName,
                    phone: form.phone,
                    company: form.company,
                    address: form.address,
                    apartment: form.apartment,
                    city: form.city,
                    province: form.province,
                    postal_code: form.postalCode,
                    country: form.country,
                    shipping_method: form.shippingMethod,
                    payment_method: form.paymentMethod,
                    note: note.trim(),
                }),
            });
            if (res.status === 201) {
                const order = await res.json();
                setPlacedOrder({ id: order.id, total: Number(order.total_price ?? total) });
                clearCart();
                window.scrollTo({ top: 0 });
            } else {
                const data = await res.json().catch(() => null);
                setServerError(data?.error || 'Failed to place order. Please try again.');
            }
        } catch {
            setServerError('Cannot reach server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (placedOrder) {
        return (
            <main className="flex-1 bg-white text-black">
                <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center" data-testid="checkout-success">
                    <CircleCheck className="size-12 text-green-600" strokeWidth={1.5} aria-hidden />
                    <h1 className="mt-4 text-2xl font-bold uppercase tracking-wide">Thank you</h1>
                    <p className="mt-2 text-sm text-neutral-700">
                        Order #{placedOrder.id} placed successfully. Total {formatPrice(placedOrder.total)}.
                    </p>
                    <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                        <Link href={`/orders/${placedOrder.id}`} className="flex-1 rounded-full bg-black py-3 text-xs font-medium uppercase tracking-widest text-white hover:bg-neutral-800">
                            View order
                        </Link>
                        <Link href="/products" className="flex-1 rounded-full border border-black py-3 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                            Continue shopping
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // Wait for the cart to load from localStorage so we don't flash the empty state.
    if (!hydrated) {
        return <main className="flex-1 bg-white" aria-busy="true" />;
    }

    if (items.length === 0) {
        return (
            <main className="flex-1 bg-white text-black">
                <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center" data-testid="checkout-empty">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">Checkout</h1>
                    <p className="mt-3 text-sm text-neutral-600">Your cart is empty.</p>
                    <Link href="/products" className="mt-6 rounded-full border border-black px-6 py-2.5 text-xs font-medium uppercase tracking-widest hover:bg-black hover:text-white">
                        Continue shopping
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 bg-white text-black">
            <h1 className="sr-only">Checkout</h1>
            <div className="grid lg:grid-cols-2">
                {/* ===== Left: form ===== */}
                <div className="flex justify-end">
                    <form onSubmit={handleSubmit} noValidate className="w-full max-w-[560px] px-6 py-8 lg:pr-12" data-testid="checkout-form">
                        {/* Contact */}
                        <section aria-labelledby="checkout-contact">
                            <h2 id="checkout-contact" className="sr-only">Contact</h2>
                            <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                                <span className="flex size-7 items-center justify-center rounded-full border border-neutral-300 text-xs uppercase" aria-hidden>
                                    {user?.username?.[0] ?? '?'}
                                </span>
                                <span className="text-sm" data-testid="checkout-email">{user?.email}</span>
                            </div>
                            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.newsletter}
                                    onChange={(e) => set('newsletter', e.target.checked)}
                                    className="size-4 accent-black"
                                />
                                Email me with news and offers
                            </label>
                        </section>

                        {/* Delivery */}
                        <section aria-labelledby="checkout-delivery" className="mt-8">
                            <h2 id="checkout-delivery" className="text-lg">Delivery</h2>
                            <div className="mt-3 space-y-3">
                                <div className="relative">
                                    <label htmlFor="checkout-country" className="pointer-events-none absolute left-3 top-1.5 text-[11px] text-neutral-500">Country/Region</label>
                                    <select
                                        id="checkout-country"
                                        value={form.country}
                                        onChange={(e) => set('country', e.target.value)}
                                        className={`${inputClass()} appearance-none pb-2 pt-5`}
                                    >
                                        <option>Indonesia</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <input {...textProps('firstName', 'First name')} autoComplete="given-name" />
                                        <FieldError id="checkout-firstName-error" error={errorFor('firstName')} />
                                    </div>
                                    <div>
                                        <input {...textProps('lastName', 'Last name')} autoComplete="family-name" />
                                        <FieldError id="checkout-lastName-error" error={errorFor('lastName')} />
                                    </div>
                                </div>

                                <input {...textProps('company', 'Company (optional)')} autoComplete="organization" />

                                <div>
                                    <input {...textProps('address', 'Address')} autoComplete="address-line1" />
                                    <FieldError id="checkout-address-error" error={errorFor('address')} />
                                </div>

                                <input {...textProps('apartment', 'Apartment, suite, etc. (optional)')} autoComplete="address-line2" />

                                <div>
                                    <input {...textProps('city', 'City')} autoComplete="address-level2" />
                                    <FieldError id="checkout-city-error" error={errorFor('city')} />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <div className="relative">
                                            <select
                                                id="checkout-province"
                                                aria-label="Province"
                                                value={form.province}
                                                onChange={(e) => set('province', e.target.value)}
                                                onBlur={() => touch('province')}
                                                aria-invalid={!!errorFor('province')}
                                                aria-describedby={errorFor('province') ? 'checkout-province-error' : undefined}
                                                autoComplete="address-level1"
                                                className={`${inputClass(errorFor('province'))} appearance-none pr-9 ${form.province ? '' : 'text-neutral-500'}`}
                                                data-testid="checkout-province"
                                            >
                                                <option value="" disabled>Province</option>
                                                {PROVINCES.map((p) => <option key={p} value={p} className="text-black">{p}</option>)}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
                                        </div>
                                        <FieldError id="checkout-province-error" error={errorFor('province')} />
                                    </div>
                                    <div>
                                        <input {...textProps('postalCode', 'Postal code')} inputMode="numeric" maxLength={5} autoComplete="postal-code" />
                                        <FieldError id="checkout-postalCode-error" error={errorFor('postalCode')} />
                                    </div>
                                </div>

                                <div>
                                    <input {...textProps('phone', 'Phone')} type="tel" autoComplete="tel" />
                                    <FieldError id="checkout-phone-error" error={errorFor('phone')} />
                                </div>
                            </div>
                        </section>

                        {/* Shipping method */}
                        <section aria-labelledby="checkout-shipping" className="mt-8">
                            <h2 id="checkout-shipping" className="text-sm font-medium">Shipping method</h2>
                            {!addressReady ? (
                                <p className="mt-3 rounded-md bg-neutral-100 px-4 py-4 text-center text-xs text-neutral-600" data-testid="shipping-placeholder">
                                    Enter your shipping address to view available shipping methods.
                                </p>
                            ) : (
                                <fieldset className="mt-3 overflow-hidden rounded-md border border-neutral-300">
                                    <legend className="sr-only">Shipping method</legend>
                                    {SHIPPING_METHODS.map((m) => {
                                        const cost = shippingCost(m.id, subtotal);
                                        const selected = form.shippingMethod === m.id;
                                        return (
                                            <label
                                                key={m.id}
                                                className={`flex cursor-pointer items-center gap-3 border-b border-neutral-300 px-4 py-3.5 text-sm last:border-b-0 ${selected ? 'bg-neutral-50 ring-1 ring-inset ring-black' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value={m.id}
                                                    checked={selected}
                                                    onChange={() => set('shippingMethod', m.id)}
                                                    className="size-4 accent-black"
                                                    data-testid={`shipping-${m.id}`}
                                                />
                                                <span className="flex-1">
                                                    <span className="block">{m.label}</span>
                                                    <span className="block text-xs text-neutral-500">{m.eta}</span>
                                                </span>
                                                <span className="font-medium">{cost === 0 ? 'FREE' : formatPrice(cost)}</span>
                                            </label>
                                        );
                                    })}
                                </fieldset>
                            )}
                        </section>

                        {/* Payment */}
                        <section aria-labelledby="checkout-payment" className="mt-8">
                            <h2 id="checkout-payment" className="text-lg">Payment</h2>
                            <p className="flex items-center gap-1 text-xs text-neutral-500">
                                <Lock className="size-3" aria-hidden /> All transactions are secure and encrypted.
                            </p>

                            <fieldset className="mt-3">
                                <legend className="sr-only">Payment method</legend>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYMENT_OPTIONS.map(({ id, label, Icon }) => {
                                        const selected = form.paymentMethod === id;
                                        return (
                                            <label
                                                key={id}
                                                className={`flex cursor-pointer flex-col gap-2 rounded-md border px-3 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-black ${selected ? 'border-black bg-neutral-50 ring-1 ring-black' : 'border-neutral-300 hover:border-neutral-500'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={id}
                                                    checked={selected}
                                                    onChange={() => set('paymentMethod', id)}
                                                    className="sr-only"
                                                    data-testid={`payment-${id}`}
                                                />
                                                <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                                                {label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            <div className="mt-3 space-y-3">
                                {form.paymentMethod === 'card' && (
                                    <>
                                        <div>
                                            <input
                                                {...textProps('cardNumber', 'Card number')}
                                                onChange={(e) => set('cardNumber', formatCardNumber(e.target.value))}
                                                inputMode="numeric"
                                                autoComplete="cc-number"
                                            />
                                            <FieldError id="checkout-cardNumber-error" error={errorFor('cardNumber')} />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <input
                                                    {...textProps('cardExpiry', 'Expiration date (MM / YY)')}
                                                    onChange={(e) => set('cardExpiry', formatExpiry(e.target.value))}
                                                    inputMode="numeric"
                                                    autoComplete="cc-exp"
                                                />
                                                <FieldError id="checkout-cardExpiry-error" error={errorFor('cardExpiry')} />
                                            </div>
                                            <div>
                                                <input
                                                    {...textProps('cardCvc', 'Security code')}
                                                    onChange={(e) => set('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    inputMode="numeric"
                                                    autoComplete="cc-csc"
                                                />
                                                <FieldError id="checkout-cardCvc-error" error={errorFor('cardCvc')} />
                                            </div>
                                        </div>
                                        <div>
                                            <input {...textProps('cardName', 'Name on card')} autoComplete="cc-name" />
                                            <FieldError id="checkout-cardName-error" error={errorFor('cardName')} />
                                        </div>
                                    </>
                                )}

                                {form.paymentMethod === 'gopay' && (
                                    <div>
                                        <input {...textProps('gopayPhone', 'GoPay phone number')} type="tel" autoComplete="tel" />
                                        <FieldError id="checkout-gopayPhone-error" error={errorFor('gopayPhone')} />
                                        <p className="mt-1 text-xs text-neutral-500">Use the phone number linked to your GoPay account.</p>
                                    </div>
                                )}

                                {form.paymentMethod === 'qris' && (
                                    <p className="rounded-md bg-neutral-100 px-4 py-4 text-center text-xs text-neutral-600" data-testid="qris-info">
                                        No extra details needed. Pay with any QRIS-supported e-wallet or banking app.
                                    </p>
                                )}
                            </div>
                        </section>

                        {serverError && (
                            <p role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="checkout-error">
                                {serverError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-8 w-full cursor-pointer rounded-md bg-black py-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                            data-testid="pay-now"
                        >
                            {submitting ? 'Processing...' : 'Pay now'}
                        </button>
                    </form>
                </div>

                {/* ===== Right: order summary ===== */}
                <aside aria-labelledby="checkout-summary" className="order-first border-b border-neutral-200 bg-neutral-100 lg:order-none lg:border-b-0 lg:border-l">
                    <div className="w-full max-w-[460px] px-6 py-8 lg:sticky lg:top-0 lg:pl-12">
                        <h2 id="checkout-summary" className="sr-only">Order summary</h2>
                        <ul className="space-y-4">
                            {items.map((item) => (
                                <li key={item.id} className="flex items-center gap-4 text-sm" data-testid={`summary-item-${item.id}`}>
                                    <div className="relative size-14 shrink-0 rounded-md border border-neutral-200 bg-white">
                                        {item.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.image} alt={item.name} className="size-full rounded-md object-cover" />
                                        ) : (
                                            <span className="flex size-full items-center justify-center text-neutral-300">
                                                <Coffee className="size-6" strokeWidth={1} aria-hidden />
                                            </span>
                                        )}
                                        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-black text-[11px] text-white">
                                            {item.quantity}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium">{item.name}</p>
                                        {item.category && <p className="text-[11px] text-neutral-500">{item.category}</p>}
                                    </div>
                                    <span className="text-xs">{formatPrice(Number(item.price) * item.quantity)}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Discount code: UI only, the backend has no discounts yet. */}
                        <div className="mt-6">
                            <div className="flex gap-2">
                                <input
                                    value={discountCode}
                                    onChange={(e) => { setDiscountCode(e.target.value); setDiscountError(''); }}
                                    placeholder="Discount code or gift card"
                                    aria-label="Discount code or gift card"
                                    aria-invalid={!!discountError}
                                    aria-describedby={discountError ? 'discount-error' : undefined}
                                    className={inputClass(discountError)}
                                />
                                <button
                                    type="button"
                                    disabled={!discountCode.trim()}
                                    onClick={() => setDiscountError('Enter a valid discount code or gift card')}
                                    className="cursor-pointer rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium disabled:cursor-not-allowed disabled:text-neutral-400"
                                >
                                    Apply
                                </button>
                            </div>
                            <FieldError id="discount-error" error={discountError} />
                        </div>

                        <dl className="mt-6 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt>Subtotal · {itemCount} {itemCount === 1 ? 'item' : 'items'}</dt>
                                <dd data-testid="summary-subtotal">{formatPrice(subtotal)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>Shipping</dt>
                                <dd className={shipping === null ? 'text-xs text-neutral-500' : ''} data-testid="summary-shipping">
                                    {shipping === null ? 'Enter shipping address' : shipping === 0 ? 'FREE' : formatPrice(shipping)}
                                </dd>
                            </div>
                            <div className="flex items-baseline justify-between pt-2 text-base font-semibold">
                                <dt>Total</dt>
                                <dd>
                                    <span className="mr-2 text-xs font-normal text-neutral-500">USD</span>
                                    <span data-testid="summary-total">{formatPrice(total)}</span>
                                </dd>
                            </div>
                        </dl>

                        {note.trim() && (
                            <div className="mt-6 border-t border-neutral-200 pt-4">
                                <p className="text-xs font-medium">Order note</p>
                                <p className="mt-1 whitespace-pre-line text-xs text-neutral-600" data-testid="summary-note">{note}</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </main>
    );
}

export default function CheckoutClient() {
    return (
        <ProtectedRoute>
            <Checkout />
        </ProtectedRoute>
    );
}
