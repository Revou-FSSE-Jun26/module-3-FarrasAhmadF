export interface ProductFormData {
    name: string;
    category_id: number;
    price: number;
    stock_quantity: number;
};

interface ProductFormErrors {
    name?: string;
    category_id?: string;
    price?: string;
    stock_quantity?: string;
};

export default function Validate(data: ProductFormData): ProductFormErrors {
    const errors: ProductFormErrors = {};
    if (!data.name.trim()) errors.name = "Name is required";
    if (data.price <= 0) errors.price = "Price must be positive";
    if (data.stock_quantity < 0) errors.stock_quantity = "Stock cannot be negative";
    if (data.category_id < 1) errors.category_id = "Category id is required";
    return errors;
};