import OrderDetailClient from "@/components/OrderDetailClient";

export const metadata = { title: 'Order Detail - RevoCoffee' };

export default async function OrderDetailPage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    // Data is fetched client-side because the order endpoint needs the JWT from localStorage.
    return <OrderDetailClient id={id} />;
}
