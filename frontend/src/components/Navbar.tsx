import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search, Menu, MailOpen, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, endpoints } from '../utils/api';
import type { Notification } from '../types';

interface NavbarProps {
    onMenuClick: () => void;
    title?: string;
    showMenuIcon?: boolean;
}

export default function Navbar({ onMenuClick, title = 'Dashboard', showMenuIcon = false }: NavbarProps) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const fetchNotifications = async () => {
        try {
            const res = await api.get<any>(`${endpoints.auth.notifications}?page_size=5`);
            const getList = (val: any) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (val.results && Array.isArray(val.results)) return val.results;
                return [];
            };
            setNotifications(getList(res));
        } catch (err) {
            console.error("Failed to load navbar notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.post(`${endpoints.auth.notifications}${id}/mark_read/`, {});
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b border-white/5 backdrop-blur-sm relative"
            style={{ background: 'rgba(10, 22, 40, 0.85)' }}>

            {/* Left */}
            <div className="flex items-center gap-4">
                <button type="button" title="Toggle menu" onClick={onMenuClick} className={`text-slate-400 hover:text-white transition-colors ${showMenuIcon ? 'block' : 'lg:hidden'}`}>
                    <Menu size={20} />
                </button>
                <div>
                    <h1 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        {title}
                    </h1>
                    <p className="text-slate-500 text-xs hidden sm:block">{dateStr}</p>
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-white/8 transition-all w-48" />
                </div>

                {/* Notifications Bell */}
                <button 
                    type="button" 
                    title="Notifications" 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
                    )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showDropdown && (
                    <div 
                        className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl"
                        style={{ background: 'rgba(15, 23, 42, 0.95)' }}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <span className="text-white font-bold text-xs">Recent Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-sky-500/10 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                            {notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    className={`p-3.5 hover:bg-white/[0.02] transition-all flex gap-3 ${
                                        n.is_read ? 'opacity-60' : 'bg-sky-500/[0.02]'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${n.is_read ? 'bg-slate-700' : 'bg-sky-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-xs font-bold truncate">{n.title}</p>
                                        <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                    </div>
                                    {!n.is_read && (
                                        <button 
                                            onClick={(e) => handleMarkRead(n.id, e)}
                                            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-white/5 rounded-lg self-start transition-all"
                                            title="Mark as read"
                                        >
                                            <Check size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {notifications.length === 0 && (
                                <div className="p-8 text-center text-slate-600 text-xs">
                                    <Bell size={20} className="mx-auto mb-2 opacity-30" />
                                    No notifications found.
                                </div>
                            )}
                        </div>

                        <Link 
                            to="/notifications" 
                            onClick={() => setShowDropdown(false)}
                            className="block p-3 border-t border-white/5 text-center text-sky-400 hover:text-sky-300 text-xs font-semibold hover:bg-white/[0.02] transition-all"
                        >
                            View all notices
                        </Link>
                    </div>
                )}

                {/* Profile */}
                {user && (
                    <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold select-none">
                            {user.first_name?.[0] || '?'}{user.last_name?.[0] || ''}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-white text-xs font-semibold leading-tight">{user.full_name}</p>
                            <p className="text-slate-500 text-[10px] capitalize leading-none mt-0.5">{user.role}</p>
                        </div>
                    </div>
                )}
            </div>

        </header>
    );
}