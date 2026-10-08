import React from "react"
import { Product } from "./ProductCard";

interface CardProps {
    children: React.ReactNode;
    product: Product;
};

function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(" ");
};

export default function Card({children, product}: CardProps) {
    const inStock = product.stock_quantity > 0;
    return (
        <div className={cn("border rounded-lg p-4 w-56", inStock ? "border-gray-700" : "border-gray-800 opacity-80")}>
            {children}
        </div>
    );
};