import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen,
    CreditCard, CalendarCheck, Settings, LogOut, ChevronLeft,
    ChevronRight, Bell, CalendarDays, FileText, MessageSquare, UploadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/anyilogo.png';

// Navigation Items

interface NavItem {
    label: string;
    icon: React.ReactNode;
    to: string;
    end?: boolean;        // exact match — prevents prefix highlighting
    badge?: number;
    roles: string[];
}

const NAV_ITEMS: NavItem[] = [
    // Admin navigation
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/dashboard', end: true, roles: ['admin'] },
    { label: 'Pupils', icon: <GraduationCap size={18} />, to: '/students', roles: ['admin'] },
    { label: 'Teachers', icon: <UserCheck size={18} />, to: '/teachers', roles: ['admin'] },
    { label: 'Parents', icon: <Users size={18} />, to: '/parents', roles: ['admin'] },
    { label: 'Academics', icon: <BookOpen size={18} />, to: '/academics', roles: ['admin'] },
    { label: 'Finance', icon: <CreditCard size={18} />, to: '/finance', roles: ['admin'] },
    { label: 'Attendance', icon: <CalendarCheck size={18} />, to: '/attendance', roles: ['admin'] },
    { label: 'Communications', icon: <MessageSquare size={18} />, to: '/notifications', roles: ['admin'] },
    { label: 'School Calendar', icon: <CalendarDays size={18} />, to: '/calendar', roles: ['admin'] },
    { label: 'Reports', icon: <FileText size={18} />, to: '/reports', roles: ['admin'] },

    // Teacher navigation
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/teacher', end: true, roles: ['teacher'] },
    { label: 'My Class', icon: <Users size={18} />, to: '/teacher/class', roles: ['teacher'] },
    { label: 'Attendance', icon: <CalendarCheck size={18} />, to: '/teacher/attendance', roles: ['teacher'] },
    { label: 'Enter Scores', icon: <BookOpen size={18} />, to: '/teacher/scores', roles: ['teacher'] },
    { label: 'Results / Reports', icon: <FileText size={18} />, to: '/teacher/reports', roles: ['teacher'] },
    { label: 'Upload Materials', icon: <UploadCloud size={18} />, to: '/teacher/materials', roles: ['teacher'] },
    { label: 'Messages', icon: <MessageSquare size={18} />, to: '/teacher/messages', roles: ['teacher'] },
    { label: 'School Calendar', icon: <CalendarDays size={18} />, to: '/calendar', roles: ['teacher'] },
 
    // Parent navigation
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/parent', end: true, roles: ['parent'] },
    { label: 'My Children', icon: <GraduationCap size={18} />, to: '/parent/children', roles: ['parent'] },
    { label: 'Fee Payments', icon: <CreditCard size={18} />, to: '/parent/fees', roles: ['parent'] },
    { label: 'Messages', icon: <MessageSquare size={18} />, to: '/parent/messages', roles: ['parent'] },
    { label: 'School Calendar', icon: <CalendarDays size={18} />, to: '/calendar', roles: ['parent'] },
];


const BOTTOM_ITEMS = [
    { label: 'Settings', icon: <Settings size={18} />, to: '/settings', roles: ['admin', 'teacher', 'parent', 'student'] },
];

// Sidebar Component

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onLinkClick?: () => void;
}

export default function Sidebar({ collapsed, onToggle, onLinkClick }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const linkBase = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group';
    const activeClass = 'bg-sky-500/15 text-sky-400 border border-sky-500/20';
    const inactiveClass = 'text-slate-400 hover:text-white hover:bg-white/5';

    const userRole = user?.role || '';
    const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

    return (
        <aside className="flex flex-col h-screen sticky top-0 border-r border-white/5 transition-all duration-300 shrink-0"
            style={{ width: collapsed ? '72px' : '240px', background: 'linear-gradient(180deg, #0d1b2a 0%, #0a1628 100%)', }}>

            { /* Logo */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
                {!collapsed && (
                    <div className="flex items-center gap-2.5">
                        <img src={logo} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
                        <div>
                            <p className="text-white font-bold text-sm leading-tight"> Anyi Primary School</p>
                            <p className="text-slate-500 text-[10px] capitalize"> {userRole === 'student' ? 'Pupil' : userRole} Portal</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div onClick={onToggle} className="w-8 h-8 flex items-center justify-center mx-auto cursor-pointer hover:opacity-80 transition-all" title="Expand Sidebar">
                        <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
                    </div>
                )}
                {!collapsed && (
                    <button onClick={onToggle} className="text-slate-500 hover:text-white transition-colors ml-auto" aria-label="Toggle sidebar">
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Main Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onLinkClick}
                        className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {item.badge && !collapsed && (
                            <span className="ml-auto bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                        )}

                        {item.badge && collapsed && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full" />
                        )}
                        {/* Tooltip */}
                        {collapsed && (
                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                                {item.label}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Nav */}
            <div className="px-3 pb-2 space-y-0.5 border-t border-white/5 pt-3">
                {/* Notifications for admin only */}
                {userRole === 'teacher' || userRole === 'parent' ? (
                    <NavLink to="/notifications" onClick={onLinkClick} className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`} title={collapsed ? 'Notifications' : undefined}>
                        <Bell size={18} className="shrink-0" />
                        {!collapsed && <span className="truncate">Notifications</span>}
                        {collapsed && (
                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                                Notifications
                            </div>
                        )}
                    </NavLink>
                ) : null}

                {BOTTOM_ITEMS.filter(i => i.roles.includes(userRole)).map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={onLinkClick} className={({ isActive }) =>
                        `${linkBase} ${isActive ? activeClass : inactiveClass}`
                    }
                        title={collapsed ? item.label : undefined}>
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {collapsed && (
                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                                {item.label}
                            </div>
                        )}
                    </NavLink>
                ))}

                <button onClick={handleLogout} className={`${linkBase} ${inactiveClass} w-full text-left hover:text-red-400`}
                    title={collapsed ? 'Logout' : undefined}>
                    <LogOut size={18} className="shrink-0" />
                    {!collapsed && <span>Logout</span>}
                    {collapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                            Logout
                        </div>
                    )}
                </button>
            </div>

            {/* User info */}
            {!collapsed && user && (
                <div className="px-3 pb-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {user.first_name?.[0] || '?'}{user.last_name?.[0] || ''}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-xs font-semibold truncate"> {user.full_name}</p>
                            <p className="text-slate-500 text-[10px] capitalize truncate">{user.role === 'student' ? 'Pupil' : user.role}</p>
                        </div>
                    </div>
                </div>
            )}

        </aside>
    );
}
