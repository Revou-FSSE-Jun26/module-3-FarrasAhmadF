"use client"

import { useState } from "react";
import { Product } from "./ProductCard";
import ProductSearchLive from "./ProductSearchLive";
import ProductForm from "./ProductForm";
import CategoryFilter from "./CategoryFilter";

export default function ProductsClient({initialProducts}: {initialProducts: Product[]}) {
    const [products, setProducts] = useState<Product[]>(initialProducts)

    function addProduct(product: Product) {
        setProducts([...products, product]);
    }

    async function handleCategorySelect(categoryId: string) {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const url = categoryId
            ? base + '/products?category_id=' + categoryId
            : base + '/products';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load products (' + res.status + ')');
        setProducts(await res.json());
    }

    return (
        <div className="flex flex-col gap-6 items-start">
            <CategoryFilter onSelect={handleCategorySelect} />
            <ProductSearchLive products={products}/>
            <ProductForm onAddProduct={addProduct} />
        </div>
    )
}