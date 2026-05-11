import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import ParentDashboard from './ParentDashboard';

export default function Dashboard() {
    const { user } = useAuth();

    if (!user) return null;

    switch (user.role) {
        case 'admin':
            return <AdminDashboard />;
        case 'teacher':
            return <TeacherDashboard />;
        case 'parent':
            return <ParentDashboard />;
        default:
            return (
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5">
                        <p className="text-slate-400">Dashboard for role <span className="text-amber-400 font-bold capitalize">{user.role}</span> is coming soon.</p>
                    </div>
                </div>
            );
    }
}
