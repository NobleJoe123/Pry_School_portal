import type { AuthTokens, ApiError } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Token Base

let _accessToken: string | null = null;

export const AccessToken = {
    get: () => _accessToken,
    set: (token: string) => (_accessToken = token),
    clear: () => (_accessToken = null),
};


//Token Refresh

let _isRefreshing = false;
let _refreshQueue: ((token: string) => void)[] = [];

const drainQueue = (token: string) => {
    _refreshQueue.forEach((cb) => cb(token));
    _refreshQueue = [];
};


export const refreshAccessToken = async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        AccessToken.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json();
    const newToken: string = data.access_token;
    AccessToken.set(newToken);
    return newToken;
};

// fetch Wrapper

interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
}

export async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}

): Promise<T> {
    const { skipAuth = false, ...rest } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(rest.headers as Record<string, string>),
    };

    if (!skipAuth) {
        const token = AccessToken.get();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    let res = await fetch(url, { ...rest, headers, credentials: 'include', });

    //Auto refresh on 401

    if (res.status === 401 && !skipAuth) {
        if (!_isRefreshing) {
            _isRefreshing = true;
            try {
                const newToken = await refreshAccessToken();
                drainQueue(newToken);
            
            } finally {
                _isRefreshing = false;
            }

        } else {

            await new Promise<string>((resolve) => _refreshQueue.push(resolve));
        }

        headers['Authorization'] = `Bearer ${AccessToken.get()}`;
        res = await fetch(url, {...rest, headers, credentials: 'include', })
    }

    if (!res.ok) {
        const errorData: ApiError = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        const message = 
            errorData.error ||
            errorData.detail ||
            Object.values(errorData).flat().join(' ') || 'Something went wrong';
        throw new Error(message);
            
    }

    if (res.status === 204) return {} as T;
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