import ProductCard, { Product } from "@/components/ProductCard";

const products: Product[] = [
    {id: 1, name: 'Keyboard Gemink', category_id: 2, price: 1500000, stock_quantity: 5, created_at: '15:45.45 2026'},
    {id: 2, name: 'Monitor 2.5K', category_id: 1, price: 2500000, stock_quantity: 0, created_at: '15:45.45 2026'},
    {id: 3, name: 'Mouse kantor', category_id: 2, price: 500000, stock_quantity: 15, created_at: '15:45.45 2026'}
];

export default function App() {
    return (
        <main className="p-4">
            <div className="flex flex-row p-4 gap-4">
                {products.map((e) => (
                    <ProductCard key={e.id} product={e} />
                ))}
            </div>
        </main>
    )
}