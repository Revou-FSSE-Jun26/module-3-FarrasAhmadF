"use client"

import { useState } from "react";
import { Product } from "./ProductCard";
import { ProductFormData } from "./Validate";
import ProductSearchLive from "./ProductSearchLive";
import ProductForm from "./ProductForm";

export default function ProductsClient({initialProducts}: {initialProducts: Product[]}) {
    const [products, setProducts] = useState<Product[]>(initialProducts)

    function addProduct(data: ProductFormData) {
        setProducts([...products, {id:Date.now(), created_at:new Date().toISOString(), ...data}]);
    }

    return (
        <div className="flex flex-col gap-6 items-start">
            <ProductSearchLive products={products}/>
            <ProductForm onAddProduct={addProduct} />
        </div>
    )
}