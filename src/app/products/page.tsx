import { Product } from "@/components/ProductCard";
import ProductsClient from "@/components/ProductsClient";
import ProductSearchLive from "@/components/ProductSearchLive";

const INITIAL_PRODUCTS: Product[] = [
    {id: 1, name: 'Keyboard Gemink', category_id: 2, price: 1500000, stock_quantity: 5, created_at: '15:45.45 2026'},
    {id: 2, name: 'Monitor 2.5K', category_id: 1, price: 2500000, stock_quantity: 0, created_at: '15:45.45 2026'},
    {id: 3, name: 'Mouse kantor', category_id: 2, price: 500000, stock_quantity: 15, created_at: '15:45.45 2026'}
];

export default function App() {
    return (
        <main className="p-4">
            <ProductsClient initialProducts={INITIAL_PRODUCTS}/>
        </main>
    )
}