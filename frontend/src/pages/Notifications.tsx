import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, CheckCircle, MailOpen, RefreshCw, Send } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import type { Notification, User } from '../types';

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

function NotificationComposer({ onSent }: { onSent: () => void }) {
    const [audience, setAudience] = useState('all_teachers');
    const [category, setCategory] = useState('general');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (audience !== 'selected') return;
        Promise.all([
            api.get<any>(endpoints.teachers.list),
            api.get<any>(endpoints.parents.list),
            api.get<any>(endpoints.students.list),
        ]).then(([teachers, parents, students]) => {
            setUsers([...getList<User>(teachers), ...getList<User>(parents), ...getList<User>(students)]);
        });
    }, [audience]);

    const toggleSelected = (id: string) => {
        setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const sendNotice = async (event: FormEvent) => {
        event.preventDefault();
        setSending(true);
        try {
            await api.post(endpoints.auth.notifications, {
                audience,
                category,
                title,
                message,
                recipient_ids: audience === 'selected' ? selected : [],
            });
            setTitle('');
            setMessage('');
            setSelected([]);
            onSent();
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={sendNotice} className="rounded-2xl border border-white/5 p-5 space-y-4" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold text-sm">Send Notice</h3>
                    <p className="text-slate-500 text-xs">Broadcast to a group or pick specific recipients.</p>
                </div>
                <Send size={18} className="text-sky-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
                    <option value="all_teachers">All teachers</option>
                    <option value="all_parents">All parents</option>
                    <option value="all_students">All students</option>
                    <option value="all_staff">All staff</option>
                    <option value="selected">Specific people</option>
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
                    <option value="general">General</option>
                    <option value="attendance">Attendance</option>
                    <option value="academics">Academics</option>
                    <option value="finance">Finance</option>
                    <option value="enrollment">Enrollment</option>
                </select>
            </div>

            {audience === 'selected' && (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2 space-y-1">
                    {users.map((person) => (
                        <label key={person.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
                            <input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggleSelected(person.id)} />
                            <span className="text-sm text-white">{person.full_name}</span>
                            <span className="text-[10px] uppercase text-slate-500 ml-auto">{person.role}</span>
                        </label>
                    ))}
                </div>
            )}

            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Title" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-sky-500/50" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} placeholder="Write the notice..." className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-sky-500/50 resize-none" />

            <button disabled={sending || (audience === 'selected' && selected.length === 0)} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 text-sm font-black transition-all">
                <Send size={16} />
                {sending ? 'Sending...' : 'Send Notice'}
            </button>
        </form>
    );
}

export default function Notifications() {
    const { user } = useAuth();
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await api.get<any>(endpoints.auth.notifications);
            setItems(getList<Notification>(data));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markRead = async (id: string) => {
        await api.post(`${endpoints.auth.notifications}${id}/mark_read/`, {});
        setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    };

    const markAllRead = async () => {
        await api.post(`${endpoints.auth.notifications}mark_all_read/`, {});
        fetchNotifications();
    };

    const unreadCount = items.filter((item) => !item.is_read).length;

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Notifications</h1>
                    <p className="text-slate-500 text-sm">{unreadCount} unread notice{unreadCount === 1 ? '' : 's'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchNotifications} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white">
                        <RefreshCw size={17} />
                    </button>
                    <button onClick={markAllRead} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm">
                        <CheckCircle size={16} />
                        Mark all read
                    </button>
                </div>
            </div>

            {user?.role === 'admin' && <NotificationComposer onSent={fetchNotifications} />}

            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
                {loading ? (
                    <div className="p-10 flex justify-center">
                        <div className="premium-spinner" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <Bell size={34} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-500 text-sm">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {items.map((item) => (
                            <div key={item.id} className={`p-5 flex gap-4 ${item.is_read ? 'bg-transparent' : 'bg-sky-500/[0.04]'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.is_read ? 'bg-white/5 text-slate-500' : 'bg-sky-500/15 text-sky-400'}`}>
                                    {item.is_read ? <MailOpen size={18} /> : <Bell size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="text-white text-sm font-bold">{item.title}</h3>
                                        <span className="text-[10px] uppercase text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">{item.category}</span>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-6">{item.message}</p>
                                    <p className="text-slate-600 text-xs mt-3">
                                        From {item.sender_name || 'School'} - {new Date(item.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!item.is_read && (
                                    <button onClick={() => markRead(item.id)} className="self-start px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-300 hover:text-white hover:bg-white/10">
                                        Mark read
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
