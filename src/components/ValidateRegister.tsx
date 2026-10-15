export interface RegisterFormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface RegisterFormErrors {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export default function ValidateRegister(data: RegisterFormData): RegisterFormErrors {
    const errors: RegisterFormErrors = {};
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.username.trim()) errors.username = "Username is required";
    if (!EMAIL_RE.test(data.email)) errors.email = "Enter a valid email address";
    if (data.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (data.confirmPassword !== data.password) errors.confirmPassword = "Passwords do not match";
    return errors
}