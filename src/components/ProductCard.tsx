"use client"

import { useState } from "react";
import Badge from "./Badge";
import Card from "./Card";

export interface Product {
    id: number;
    name: string;
    category_id: number;
    description?: string;
    price: number;
    stock_quantity: number;
    created_at: string;
    deleted_at?: string;
};

interface ProductCardProps {
    product: Product;
    currency?: string;
    // onAdd: (p: Product) => void
};

export default function ProductCard({product, currency='Rp'}: ProductCardProps) {
    const [qty, setQty] = useState(1);
    const increase = () => {qty < product.stock_quantity && setQty(qty + 1);};
    const decrease = () => {qty > 1 && setQty(qty - 1);};

    return (
        <div className="flex flex-row">
            <Card>
                <div className="bg-gray-800 h-24 flex items-center justify-center rounded mb-3">img</div>
                <h3 className="font-bold">{product.name}</h3>
                <p className="mb-2">{currency} {product.price.toLocaleString('id-ID')}</p> 
                <Badge variant={product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'} />
                <div className="flex items-center gap-3 mt-3">
                    <button onClick={decrease} disabled={qty <= 1} className="px-2 border rounded">-</button>
                    <span>{qty}</span>
                    <button onClick={increase} disabled={qty >= product.stock_quantity} className="px-2 border rounded">+</button>
                </div>
            </Card>
        </div>
    );
};