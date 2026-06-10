import { useEffect, useState } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, endpoints } from '../utils/api';
import type { Notification } from '../types';

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

export default function RecentNotifications() {
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<any>(`${endpoints.auth.notifications}?page_size=4`)
            .then((data) => setItems(getList<Notification>(data).slice(0, 4)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Bell size={18} className="text-sky-400" />
                    Recent Notifications
                </h3>
                <Link to="/notifications" className="text-sky-400 text-xs font-semibold hover:underline">View all</Link>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <p className="text-slate-500 text-sm">No notifications yet.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-start gap-3">
                                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.is_read ? 'bg-slate-600' : 'bg-sky-400'}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-white text-xs font-bold truncate">{item.title}</p>
                                    <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{item.message}</p>
                                </div>
                                {item.is_read && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
