"use client"

import { createContext, useContext, useEffect, useState } from "react";

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    loading: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined >(undefined);

function readUserFromStorage(): User | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem('user');
        return stored ? (JSON.parse(stored) as User) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({children}: {children: React.ReactNode}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const isLoggedIn = user !== null;

    useEffect(() => {
        setUser(readUserFromStorage());
        setLoading(false);
    }, []);

    function login(user: User, token: string) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
    }

    function logout() {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    return (
        <AuthContext.Provider value={{user,isLoggedIn, loading, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth muse be used inside AuthProvider')
    }
    return context;
}