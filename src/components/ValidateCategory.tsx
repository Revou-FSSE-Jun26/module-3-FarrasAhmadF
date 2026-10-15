export interface CategoryFormData {
    name: string;
    description: string;
}

interface CategoryFormErrors {
    name?: string;
}

export function ValidateCategory(data: CategoryFormData): CategoryFormErrors {
    const errors: CategoryFormErrors = {};
    if (!data.name.trim()) errors.name = 'Name is required';
    return errors;
}
