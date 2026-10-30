"use client"

import { createContext, useContext, useState, useSyncExternalStore } from "react";

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

const emptySubscribe = () => () => {};

export function AuthProvider({children}: {children: React.ReactNode}) {
    const [user, setUser] = useState<User | null>(null);
    // false on the server and during hydration, true afterwards.
    const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const [restored, setRestored] = useState(false);
    // Restore the session once, right after hydration (render-time update instead of an
    // effect, so there's no extra render pass and no hydration mismatch).
    if (mounted && !restored) {
        setRestored(true);
        setUser(readUserFromStorage());
    }
    const loading = !restored;
    const isLoggedIn = user !== null;

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