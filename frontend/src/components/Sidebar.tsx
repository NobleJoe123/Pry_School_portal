import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen, CreditCard, CalendarCheck, Settings, LogOut, ChevronLeft, ChevronRight, Bell, } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

// Navigation Items

interface NavItem {
    label: string;
    icon: React.ReactNode;
    to: string;
    badge?: number;

}


const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
    { label: 'Students', icon: <GraduationCap size={18} />, to: '/students' },
    { label: 'Teachers', icon: <UserCheck size={18} />, to: '/teachers' },
    { label: 'Parents', icon: <Users size={18} />, to: '/parents' },
    { label: 'Academics', icon: <BookOpen size={18} />, to: '/academics' },
    { label: 'Finance', icon: <CreditCard size={18} />, to: '/finance' },
    { label: 'Attendance', icon: <CalendarCheck size={18} />, to: '/attendance' },

];


const BOTTOM_ITEMS: NavItem[] = [
    { label: 'Notifications', icon: <Bell size={18} />, to: '/notifications', badge: 3 },
    { label: 'Settings', icon: <Settings size={18} />, to: '/settings' },
];

// Sidebar Component

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const linkBase = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group';
    const activeClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
    const inactiveClass = 'text-slate-400 hover:text-white hover:bg-white/5';

    return (
        <aside className="flex flex-col h-screen sticky top-0 border-r border-white/5 transition-all duration-300 shrink-0"
            style={{ width: collapsed ? '72px' : '240px', background: 'linear-gradient(180deg, #0d1b2a 0%, #0a1628 100%)', }}>

            { /* Logo */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
                {!collapsed && (
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                            <GraduationCap size={16} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight"> Anyi Primary School</p>
                            <p className="text-slate-500 text-[10px]"> Admin Portal</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
                        <GraduationCap size={16} />
                    </div>
                )}
                <button onClick={onToggle} className="text-slate-500 hover:text-white transition-colors ml-auto" aria-label="Toggle sidebar">
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Main Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`} title={collapsed ? item.label : undefined}>
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {item.badge && !collapsed && (
                            <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                        )}

                        {item.badge && collapsed && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                        )}
                        {/* Tooltip */}
                        {collapsed && (
                            <div className="absolute left-full ml-3 px-2.5 py-2.5 bg-slate-800 text-white text-xs rounded-lg opacity-group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                                {item.label}

                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Nav */}
            <div className="px-3 pb-2 space-y-1 border-t border-white/5 pt-3">
                {BOTTOM_ITEMS.map((item) => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) =>
                        `${linkBase} ${isActive ? activeClass : inactiveClass}`
                    }
                        title={collapsed ? item.label : undefined}>
                        <span className="shrink-0">{item.icon}</span>
                        {item.badge && !collapsed && (
                            <span className="ml-auto bg-amber-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {item.badge}
                            </span>
                        )}

                    </NavLink>
                ))}

                <button onClick={handleLogout} className={`${linkBase} ${inactiveClass} w-full text-left hover:text-red-400`}
                    title={collapsed ? 'Logout' : undefined}>
                        <LogOut size={18} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
            </div>

            {/* User info */}
            {!collapsed && user && (
                <div className="px-3 pb-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-2.5 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {user.first_name[0]}{user.last_name[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-xs font-semibold truncate"> {user.full_name}</p>
                                <p className="text-slate-500 text-[10px] capitalize truncate">{user.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </aside>
    );
}