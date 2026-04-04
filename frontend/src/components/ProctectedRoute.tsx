import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Types

interface ProtectedRouteProps { allowedRoles?: string[]; }

//Spinner

function LoadingScreen() {
    return (
        <div className="min-h-screen flex itemxs-center justify-center big-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-amber-500/50 animate-spin" />
                </div>
                <p className="text-slate-400 text-sma font-medium tracking-wide">Loading...

                </p>
            </div>

        </div>
    );
}

// Unauthorized Page {403}

function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="text-center">
                <p className="text-6xl font-black text-slate-700 mb-4">403</p>
                <p className="text-white font-semibold text-xl mb-2">Access Denied</p>
                <p className="text-slate-400 text-sm mb-6">You do not have permission to access this page.</p>
                <a href="/login" className="text-amber-400 text-sm hover:text-amber-300 transition-colors"> Back to Login </a>
            </div>
        </div>
    );
}

// Protected Route Component

export default function ProtectedRoute({ allowedRoles}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if(isLoading) return <LoadingScreen />;

    if(!isAuthenticated) {
        return <Navigate to="/Login" state={{ from: location}} replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <UnauthorizedPage />;

    }

    return <Outlet />;
}









