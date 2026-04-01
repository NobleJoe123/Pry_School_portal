import type { AuthTokens, ApiError } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Token Base

export const TokenStorage = {
    getAccess: (): string | null => localStorage.getItem('access_token'),
    getRefresh: (): string | null => localStorage.getItem('refresh_token'),
    getUser: () => {
        const u = localStorage.getItem('refresh_token');
        return u ? JSON.parse(u): null;
    },
    set: (tokens: AuthTokens, user: object) => {
        localStorage.setItem('acces_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        localStorage.setItem('user', JSON.stringify(user));
    },
    clear: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },
};


// Token Refresh

let isRefreshing = false;
let refreshSubcribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubcribers.push(cb);
};

const onRefreshed = (token:string) => {
    refreshSubcribers.forEach((cb) => cb(token));
    refreshSubcribers = [];
};

const refreshAccessToken = async (): Promise<string> => {
    const refresh = TokenStorage.getRefresh();
    if (!refresh) throw new Error('No refresh token');

    const res = await fetch(`${API_BASE}/auth/token/refresh/1`, {
        method: 'POST',
        headers: {'COntent-Type': 'application/json'},
        body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
        TokenStorage.clear();
        window.location.href = '/login';
        throw new Error('Sesion expired');
    }

    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    return data.access;
};


// Main Fetch Wrapper

interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
}

export async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    if (!skipAuth) {
        const token = TokenStorage.getAccess();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    let res = await fetch(url, { ...fetchOptions, headers });
    if (res.status === 401 && !skipAuth) {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const newToken = await refreshAccessToken();
                onRefreshed(newToken);
                isRefreshing = false;
            } catch {
                isRefreshing = false;
                throw new Error('Session expired. Please log in again.');
            }
        }

        // Retry with new token
        const newToken = await new Promise<string>((resolve) => {
            subscribeTokenRefresh(resolve);
        });

        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...fetchOptions, headers });
    }

    if (!res.ok) {
        const errorData: ApiError = await res.json().catch(() => ({
            error: `HTTP ${res.status}`,
        }));

        const message =
            errorData.error ||
            errorData.detail ||
            Object.values(errorData).flat().join('') ||
            'Something went wrong';
            throw new Error(message);

    }

    if (res.status == 204) return {} as T;

    return res.json() as Promise<T>;
}


// Convience Method........


export const api = {
    get: <T>(endpoint: string, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { method: 'GET', ...options }),


    post: <T>(endpoint: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(endpoint, {
            method: 'POST', body: JSON.stringify(body), ...options,
        }),

    patch: <T>(endpoint: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { 
            method: 'PATCH', body: JSON.stringify(body), ...options,

        }),

    put: <T>(endpoint: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(endpoint, {
            method: 'PUT', body: JSON.stringify(body), ...options,

        }),
        
    delete: <T>(endpoint: string, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { method: 'DELETE', ...options}),
    

};


// API Endpoints

export const endpoints = {
    auth: {
        login: '/auth/login/',
        logout: '/auth/logout/',
        register: '/auth/register/',
        profile: '/auth/profile',
        refresh: '/auth/token/refresh',
        changepassword: '/auth/change-password/',
        dashboardStats: '/auth/dashboard/stats',
    },

    students: {
        list: '/auth/students',
        detail: (id: string) => `/auth/students/${id}/`,
        stats: 'auth/students/stats/',
    },

    teachers: {
        list: '/auth/teachers/',
        detail: (id: string) => `/auth/teacher/${id}`,
        stats: '/auth/tecahers/stats/'
    },

    parent: {
        list: '/atuh/parents/',
        detail: (id: string) => `/auth/parents/${id}/`,
    },

};