import { Metadata } from "next";
import CheckoutClient from "@/components/CheckoutClient";

export const metadata: Metadata = {
    title: 'Checkout - RevoCoffee',
};

export default function CheckoutPage() {
    return <CheckoutClient />;
}
