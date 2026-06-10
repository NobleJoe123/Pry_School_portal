import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User, LoginRequest, EnrollmentStatus } from '../types';
import { api, endpoints, AccessToken, refreshAccessToken } from '../utils/api';


// Context Types

interface LoginResult {
    user: User;
    enrollmentStatus?: EnrollmentStatus;
}

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginRequest) => Promise<LoginResult>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

interface LoginApiResponse {
    user: User;
    access_token: string;
    message: string;

}

// Context

const AuthContext = createContext<AuthContextValue | null>(null);


//Provider

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // On mount: restore session from localstorage

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const token = await refreshAccessToken();
                if (!token) {
                    setUser(null);
                    setIsLoading(false);
                    return;
                }
                const data = await api.get<{ user: User }>(endpoints.auth.profile);
                setUser(data.user);
            } catch {
                setUser(null);

            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);


    const login = useCallback(async (credentials: LoginRequest) => {
        const data = await api.post<LoginApiResponse>(endpoints.auth.login, credentials,
            { skipAuth: true }
        );

        AccessToken.set(data.access_token);
        setUser(data.user);

        // For parent users, check enrollment status
        let enrollmentStatus: EnrollmentStatus | undefined;
        if (data.user.role === 'parent') {
            try {
                enrollmentStatus = await api.get<EnrollmentStatus>(
                    '/auth/parent-enrollment-status/'
                );
            } catch (err) {
                // If enrollment status check fails, continue without it
                console.warn('Could not fetch enrollment status');
            }
        }

        return { user: data.user, enrollmentStatus };
    }, []);



    const logout = useCallback(async () => {
        try {
            await api.post(endpoints.auth.logout, {});
        } catch {

        } finally {
            AccessToken.clear();
            setUser(null);

        }

    }, []);

    const refreshUser = useCallback(async () => {
        const data = await api.get<{ user: User }>(endpoints.auth.profile);
        setUser(data.user);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser, }}>{children}</AuthContext.Provider>);
}



export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}

