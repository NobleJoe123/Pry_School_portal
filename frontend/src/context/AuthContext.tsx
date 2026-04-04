

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User, LoginRequest, LoginResponse } from '../types';
import { api, endpoints, TokenStorage } from '../utils/api';


// Context Types

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// Context

const AuthContext = createContext<AuthContextValue | null>(null);


//Provider

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // On mount: restore session from localstorage

    useEffect(() => {
        const storedUser = TokenStorage.getUser();
        const token = TokenStorage.getAccess();

        if (storedUser && token) {
            setUser(storedUser);
            refreshUser().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }


    }, []);

    const login = useCallback(async (credentials: LoginRequest) => {
        const data = await api.post<LoginResponse>(endpoints.auth.login, credentials,
            { skipAuth: true }
        );

        TokenStorage.set(data.tokens, data.user);
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        const refresh = TokenStorage.getRefresh();
        try {
            if (refresh) {
                await api.post(endpoints.auth.logout, { refresh_token: refresh });
            }
        } catch {

        } finally {
            TokenStorage.clear();
            setUser(null);

        }

    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const data = await api.get<{ user: User }>(endpoints.auth.profile); setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch { TokenStorage.clear(); setUser(null); }
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser, }}>{children}</AuthContext.Provider>);
}



export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within <AuthProvider>'); return ctx;
}

