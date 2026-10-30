import { AdminOrderDetail } from "@/components/OrderDetailClient";

export const metadata = { title: 'Order Detail - RevoCoffee Admin' };

export default async function AdminOrderDetailPage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    // Fetched client-side: the order endpoint needs the admin JWT from localStorage.
    return <AdminOrderDetail id={id} />;
}
