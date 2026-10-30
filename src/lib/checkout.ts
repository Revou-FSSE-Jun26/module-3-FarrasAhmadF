// Checkout constants and validation. Delivery, shipping and payment details are
// UI-only for now: the backend has no columns for them, so only the cart items are
// sent to POST /orders.

export const FREE_SHIPPING_THRESHOLD = 50;

export type ShippingMethodId = "regular" | "fast" | "cargo";
export type PaymentMethodId = "card" | "gopay" | "qris";

export const SHIPPING_METHODS: {
    id: ShippingMethodId;
    label: string;
    eta: string;
    price: number;
    freeOverThreshold?: boolean;
}[] = [
    { id: "regular", label: "Reguler", eta: "3-5 business days", price: 5, freeOverThreshold: true },
    { id: "fast", label: "Fast", eta: "1-2 business days", price: 15 },
    { id: "cargo", label: "Cargo", eta: "5-10 business days, best for large items", price: 8 },
];

export function shippingCost(id: ShippingMethodId, subtotal: number): number {
    const method = SHIPPING_METHODS.find((m) => m.id === id)!;
    return method.freeOverThreshold && subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : method.price;
}

export const PROVINCES = [
    "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi",
    "Sumatera Selatan", "Kepulauan Bangka Belitung", "Bengkulu", "Lampung",
    "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur",
    "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
    "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
    "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara",
    "Maluku", "Maluku Utara",
    "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan",
];

export interface CheckoutForm {
    newsletter: boolean;
    country: string;
    firstName: string;
    lastName: string;
    company: string;
    address: string;
    apartment: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
    shippingMethod: ShippingMethodId;
    paymentMethod: PaymentMethodId;
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
    cardName: string;
    gopayPhone: string;
}

export const EMPTY_CHECKOUT_FORM: CheckoutForm = {
    newsletter: false,
    country: "Indonesia",
    firstName: "",
    lastName: "",
    company: "",
    address: "",
    apartment: "",
    city: "",
    province: "",
    postalCode: "",
    phone: "",
    shippingMethod: "regular",
    paymentMethod: "card",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    cardName: "",
    gopayPhone: "",
};

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

const digits = (s: string) => s.replace(/\D/g, "");

// Indonesian mobile number: 08xx / 628xx / +628xx, 10-14 digits total.
export function isValidIdPhone(raw: string): boolean {
    const s = raw.replace(/[\s-]/g, "");
    return /^(\+62|62|0)8\d{7,11}$/.test(s);
}

function passesLuhn(num: string): boolean {
    let sum = 0;
    let double = false;
    for (let i = num.length - 1; i >= 0; i--) {
        let d = Number(num[i]);
        if (double) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        double = !double;
    }
    return sum % 10 === 0;
}

function isValidExpiry(raw: string, now = new Date()): boolean {
    const m = raw.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!m) return false;
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    // Valid through the end of the expiry month.
    return new Date(year, month, 1) > now;
}

/** Fields that must be valid before shipping methods are shown (like the reference). */
export function isAddressReady(f: CheckoutForm): boolean {
    return !!f.address.trim() && !!f.city.trim() && !!f.province && /^\d{5}$/.test(f.postalCode.trim());
}

export function validateCheckout(f: CheckoutForm): CheckoutErrors {
    const e: CheckoutErrors = {};
    if (!f.firstName.trim()) e.firstName = "Enter a first name";
    if (!f.lastName.trim()) e.lastName = "Enter a last name";
    if (!f.address.trim()) e.address = "Enter an address";
    if (!f.city.trim()) e.city = "Enter a city";
    if (!f.province) e.province = "Select a province";
    if (!/^\d{5}$/.test(f.postalCode.trim())) e.postalCode = "Enter a valid 5-digit postal code";
    if (!isValidIdPhone(f.phone)) e.phone = "Enter a valid phone number, e.g. 081234567890";

    if (f.paymentMethod === "card") {
        const num = digits(f.cardNumber);
        if (num.length < 13 || num.length > 19 || !passesLuhn(num)) e.cardNumber = "Enter a valid card number";
        if (!isValidExpiry(f.cardExpiry)) e.cardExpiry = "Enter a valid expiration date";
        if (!/^\d{3,4}$/.test(f.cardCvc)) e.cardCvc = "Enter a valid security code";
        if (!f.cardName.trim()) e.cardName = "Enter the name on the card";
    } else if (f.paymentMethod === "gopay") {
        if (!isValidIdPhone(f.gopayPhone)) e.gopayPhone = "Enter the phone number linked to your GoPay";
    }
    return e;
}

/** "4242424242424242" -> "4242 4242 4242 4242" */
export function formatCardNumber(raw: string): string {
    return digits(raw).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "1229" -> "12/29" */
export function formatExpiry(raw: string): string {
    const d = digits(raw).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
