import { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare, Clock, CheckCircle, AlertCircle, X, Send,
    Tag, Search, Loader2, RefreshCw, ChevronRight, User, Filter,
    Bell, MailOpen, Trash2, Megaphone
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { Notification, User as UserType } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

// ── Types ─────────────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

interface TicketMessage {
    id: string;
    sender_name: string;
    sender_role: string;
    body: string;
    created_at: string;
}

interface Ticket {
    id: string;
    parent_name: string;
    subject: string;
    category: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
    messages: TicketMessage[];
    unread_count: number;
}

// ── Configs ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
    open:        { label: 'Open',        color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',          icon: <AlertCircle size={11} /> },
    in_progress: { label: 'In Progress', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    icon: <Clock size={11} /> },
    resolved:    { label: 'Resolved',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={11} /> },
    closed:      { label: 'Closed',      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   icon: <X size={11} /> },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
    low:    { label: 'Low',    color: 'text-slate-400' },
    normal: { label: 'Normal', color: 'text-sky-400' },
    high:   { label: 'High',   color: 'text-amber-400' },
    urgent: { label: 'Urgent', color: 'text-red-400' },
};

// ── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${cfg.color}`}>
            {cfg.icon}{cfg.label}
        </span>
    );
}

// ── Notice Composer Modal ─────────────────────────────────────────────────────

function NewNoticeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
    const [audience, setAudience] = useState('all_teachers');
    const [selectedRole, setSelectedRole] = useState<'parent' | 'teacher'>('parent');
    const [category, setCategory] = useState('general');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState<UserType[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (audience !== 'selected') return;
        setLoadingUsers(true);
        Promise.all([
            api.get<any>(endpoints.teachers.list),
            api.get<any>(endpoints.parents.list),
        ]).then(([teachers, parents]) => {
            setUsers([...getList<UserType>(teachers), ...getList<UserType>(parents)]);
        }).catch(() => {})
          .finally(() => setLoadingUsers(false));
    }, [audience]);

    useEffect(() => {
        setSelected([]);
    }, [selectedRole, audience]);

    const toggleSelected = (id: string) => {
        setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const sendNotice = async (event: React.FormEvent) => {
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
            onSent();
            onClose();
        } catch { /* silent */ } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#070e1a 100%)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Megaphone size={16} className="text-amber-400" />
                        <p className="text-white font-bold text-sm">Create Announcement / Notice</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={sendNotice} className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FilterDropdown
                            label="Recipient Group"
                            value={audience}
                            options={[
                                { id: 'all_teachers', label: 'All teachers' },
                                { id: 'all_parents', label: 'All parents' },
                                { id: 'all_students', label: 'All students' },
                                { id: 'all_staff', label: 'All staff' },
                                { id: 'selected', label: 'Specific people' }
                            ]}
                            onChange={setAudience}
                            placeholder="Recipient Group"
                            colorTheme="amber"
                            fullWidth
                        />
                        <FilterDropdown
                            label="Category"
                            value={category}
                            options={[
                                { id: 'general', label: 'General' },
                                { id: 'attendance', label: 'Attendance' },
                                { id: 'academics', label: 'Academics' },
                                { id: 'finance', label: 'Finance' },
                                { id: 'enrollment', label: 'Enrollment' }
                            ]}
                            onChange={setCategory}
                            placeholder="Category"
                            colorTheme="amber"
                            fullWidth
                        />
                    </div>

                    {audience === 'selected' && (
                        <div className="space-y-3">
                            <FilterDropdown
                                label="Recipient Type"
                                value={selectedRole}
                                options={[
                                    { id: 'parent', label: 'Parents' },
                                    { id: 'teacher', label: 'Teachers' },
                                ]}
                                onChange={(value) => setSelectedRole(value as 'parent' | 'teacher')}
                                placeholder="Recipient Type"
                                colorTheme="amber"
                                fullWidth
                            />
                            {loadingUsers ? (
                                <div className="py-6 flex justify-center"><Loader2 size={20} className="animate-spin text-amber-500" /></div>
                            ) : (
                                <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2 space-y-1">
                                    {users.filter((person) => person.role === selectedRole).map((person) => (
                                        <label key={person.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
                                            <input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggleSelected(person.id)} />
                                            <span className="text-sm text-white">{person.full_name}</span>
                                            <span className="text-[10px] uppercase text-slate-500 ml-auto">{person.role}</span>
                                        </label>
                                    ))}
                                    {users.filter((person) => person.role === selectedRole).length === 0 && (
                                        <p className="px-3 py-4 text-center text-xs text-slate-500">No {selectedRole}s found.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Title *</label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Annoucement Title"
                            className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Notice Body *</label>
                        <textarea
                            required
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write the notice details here..."
                            className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={sending || (audience === 'selected' && selected.length === 0) || !title.trim() || !message.trim()}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {sending ? 'Sending...' : 'Broadcast Notice'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Support Ticket Detail Panel ────────────────────────────────────────────────

function TicketDetailPanel({ ticket, onClose, onUpdate }: {
    ticket: Ticket; onClose: () => void; onUpdate: (updated: Ticket) => void;
}) {
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const handleReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            await api.post(endpoints.tickets.messages(ticket.id), { body: reply.trim() });
            setReply('');
            const updated = await api.get<Ticket>(endpoints.tickets.detail(ticket.id));
            onUpdate(updated);
        } catch { /* silent */ } finally { setSending(false); }
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        setUpdatingStatus(true);
        try {
            const updated = await api.patch<Ticket>(endpoints.tickets.detail(ticket.id), { status: newStatus });
            onUpdate(updated);
        } catch { /* silent */ } finally { setUpdatingStatus(false); }
    };

    const handlePriorityChange = async (newPriority: TicketPriority) => {
        try {
            const updated = await api.patch<Ticket>(endpoints.tickets.detail(ticket.id), { priority: newPriority });
            onUpdate(updated);
        } catch { /* silent */ }
    };

    const closed = ticket.status === 'resolved' || ticket.status === 'closed';

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg h-full flex flex-col"
                style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#070e1a 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between gap-3 shrink-0">
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{ticket.subject}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                            <User size={9} /> {ticket.parent_name}
                            <span className="text-slate-700">·</span>
                            <Tag size={9} /> {ticket.category}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all shrink-0"><X size={15} /></button>
                </div>

                {/* Controls */}
                <div className="px-5 py-3 border-b border-white/5 flex gap-3 shrink-0">
                    <div className="flex-1">
                        <label className="block text-[10px] text-slate-600 uppercase tracking-widest mb-1">Status</label>
                        <select value={ticket.status} onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                            disabled={updatingStatus}
                            className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50 transition-all">
                            {(Object.entries(STATUS_CONFIG)).map(([k, v]) => (
                                <option key={k} value={k} className="bg-slate-900">{v.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] text-slate-600 uppercase tracking-widest mb-1">Priority</label>
                        <select value={ticket.priority} onChange={e => handlePriorityChange(e.target.value as TicketPriority)}
                            className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50 transition-all">
                            {(Object.entries(PRIORITY_CONFIG)).map(([k, v]) => (
                                <option key={k} value={k} className="bg-slate-900">{v.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {ticket.messages.map(msg => {
                        const isParent = msg.sender_role === 'parent';
                        return (
                            <div key={msg.id} className={`flex flex-col ${isParent ? 'items-start' : 'items-end'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${isParent ? 'bg-white/5 border border-white/5 text-white rounded-bl-sm' : 'bg-amber-500 text-slate-950 rounded-br-sm'}`}>
                                    {msg.body}
                                </div>
                                <p className="text-slate-600 text-[10px] mt-1 px-1">
                                    {msg.sender_name} · {new Date(msg.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        );
                    })}
                    {ticket.messages.length === 0 && (
                        <p className="text-center text-slate-600 text-xs py-10">No messages yet.</p>
                    )}
                </div>

                {/* Reply */}
                {!closed ? (
                    <div className="px-5 py-4 border-t border-white/5 flex gap-2 shrink-0">
                        <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)}
                            placeholder="Write a response as the school…"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                            className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none transition-all"
                        />
                        <button onClick={handleReply} disabled={sending || !reply.trim()}
                            className="self-end p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 rounded-xl transition-all shrink-0">
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                ) : (
                    <div className="px-5 py-4 border-t border-white/5 shrink-0 text-center">
                        <p className="text-slate-500 text-xs">This ticket is {ticket.status}.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Combined Page ────────────────────────────────────────────────────────

export default function AdminTickets() {
    const [activeTab, setActiveTab] = useState<'tickets' | 'notices'>('tickets');
    
    // Support Tickets States
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [ticketsError, setTicketsError] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [ticketsFilterStatus, setTicketsFilterStatus] = useState<'all' | TicketStatus>('all');
    const [ticketsFilterPriority, setTicketsFilterPriority] = useState<'all' | TicketPriority>('all');
    const [ticketsSearch, setTicketsSearch] = useState('');

    // School Notices States
    const [notices, setNotices] = useState<Notification[]>([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [noticesError, setNoticesError] = useState('');
    const [noticesSearch, setNoticesSearch] = useState('');
    const [noticesFilterCategory, setNoticesFilterCategory] = useState<string>('all');
    const [noticesFilterAudience, setNoticesFilterAudience] = useState<string>('all');
    const [showNewNotice, setShowNewNotice] = useState(false);

    // ── Fetch Actions ──────────────────────────────────────────────────────────

    const fetchTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const data = await api.get<Ticket[]>(endpoints.tickets.list);
            setTickets(data);
            setTicketsError('');
        } catch (err: any) {
            setTicketsError(err.message || 'Failed to load tickets.');
        } finally {
            setTicketsLoading(false);
        }
    }, []);

    const fetchNotices = useCallback(async () => {
        setNoticesLoading(true);
        try {
            const data = await api.get<any>(endpoints.auth.notifications);
            setNotices(getList<Notification>(data));
            setNoticesError('');
        } catch (err: any) {
            setNoticesError(err.message || 'Failed to load notices.');
        } finally {
            setNoticesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
        fetchNotices();
    }, [fetchTickets, fetchNotices]);

    const handleRefresh = () => {
        if (activeTab === 'tickets') {
            fetchTickets();
        } else {
            fetchNotices();
        }
    };

    // ── Notices Actions ────────────────────────────────────────────────────────

    const markNoticeRead = async (id: string) => {
        try {
            await api.post(`${endpoints.auth.notifications}${id}/mark_read/`, {});
            setNotices((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
        } catch {}
    };

    const clearNotice = async (id: string) => {
        try {
            await api.delete(`${endpoints.auth.notifications}${id}/`);
            setNotices((current) => current.filter((item) => item.id !== id));
        } catch {}
    };

    const clearAllNotices = async () => {
        if (window.confirm('Are you sure you want to clear all notices?')) {
            try {
                await api.delete(`${endpoints.auth.notifications}clear_all/`);
                setNotices([]);
            } catch {}
        }
    };

    // ── Filter Computations ────────────────────────────────────────────────────

    const filteredTickets = tickets.filter(t => {
        if (ticketsFilterStatus !== 'all' && t.status !== ticketsFilterStatus) return false;
        if (ticketsFilterPriority !== 'all' && t.priority !== ticketsFilterPriority) return false;
        if (ticketsSearch) {
            const q = ticketsSearch.toLowerCase();
            return t.subject.toLowerCase().includes(q) || t.parent_name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
    });

    const filteredNotices = notices.filter(item => {
        if (noticesFilterCategory !== 'all' && item.category !== noticesFilterCategory) return false;
        if (noticesFilterAudience !== 'all' && item.audience !== noticesFilterAudience) return false;
        if (noticesSearch) {
            const q = noticesSearch.toLowerCase();
            return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
        }
        return true;
    });

    // ── Statistics Computations ────────────────────────────────────────────────

    const ticketStats = {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        urgent: tickets.filter(t => t.priority === 'urgent').length,
    };

    const noticeStats = {
        total: notices.length,
        unread: notices.filter(n => !n.is_read).length,
        staff: notices.filter(n => n.audience === 'all_teachers' || n.audience === 'all_staff').length,
        parents: notices.filter(n => n.audience === 'all_parents' || n.audience === 'all_students').length,
    };

    const totalUnreadTickets = tickets.reduce((acc, t) => acc + t.unread_count, 0);

    const handleTicketUpdate = (updated: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelectedTicket(updated);
    };

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>
                        Communications & Support
                        {totalUnreadTickets > 0 && (
                            <span className="ml-3 px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-lg">
                                {totalUnreadTickets} ticket{totalUnreadTickets !== 1 ? 's' : ''} unread
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage support tickets and broadcast notices to the school portal</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                    {activeTab === 'notices' && notices.length > 0 && (
                        <button onClick={clearAllNotices} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 hover:text-red-300 text-sm font-bold transition-all">
                            <Trash2 size={14} /> Clear all notices
                        </button>
                    )}
                    <button onClick={() => setShowNewNotice(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 shrink-0">
                        <Megaphone size={14} /> Create Notice
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 space-x-6 shrink-0">
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                        activeTab === 'tickets' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                >
                    Support Tickets ({tickets.length})
                </button>
                <button
                    onClick={() => setActiveTab('notices')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                        activeTab === 'notices' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                >
                    School Notices & Announcements ({notices.length})
                </button>
            </div>

            {/* Statistics Cards */}
            {activeTab === 'tickets' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Open Tickets', value: ticketStats.open, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
                        { label: 'In Progress', value: ticketStats.in_progress, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Resolved', value: ticketStats.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Urgent Priority', value: ticketStats.urgent, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl border px-4 py-3 ${s.bg}`}>
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Notices', value: noticeStats.total, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
                        { label: 'Unread Notices', value: noticeStats.unread, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Staff Notices', value: noticeStats.staff, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
                        { label: 'Pupil / Parent', value: noticeStats.parents, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl border px-4 py-3 ${s.bg}`}>
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters Area */}
            {activeTab === 'tickets' ? (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Search by parent, subject…" value={ticketsSearch} onChange={e => setTicketsSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <Filter size={12} className="text-slate-600" />
                        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                            <button key={s} onClick={() => setTicketsFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${ticketsFilterStatus === s ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                                {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                        <span className="text-slate-700 text-xs">|</span>
                        {(['all', 'urgent', 'high', 'normal', 'low'] as const).map(p => (
                            <button key={p} onClick={() => setTicketsFilterPriority(p as 'all' | TicketPriority)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${ticketsFilterPriority === p ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Search notices…" value={noticesSearch} onChange={e => setNoticesSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <Filter size={12} className="text-slate-600" />
                        {(['all', 'general', 'attendance', 'academics', 'finance', 'enrollment'] as const).map(c => (
                            <button key={c} onClick={() => setNoticesFilterCategory(c)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${noticesFilterCategory === c ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                                {c}
                            </button>
                        ))}
                        <span className="text-slate-700 text-xs">|</span>
                        {(['all', 'all_teachers', 'all_parents', 'all_students', 'all_staff', 'selected'] as const).map(aud => (
                            <button key={aud} onClick={() => setNoticesFilterAudience(aud)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${noticesFilterAudience === aud ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                                {aud.replace('all_', '').replace('selected', 'Specific')}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* List Containers */}
            <div className="rounded-3xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#0a1628 100%)' }}>
                {activeTab === 'tickets' ? (
                    ticketsLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-amber-400 animate-spin" /></div>
                    ) : ticketsError ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <AlertCircle size={36} className="text-red-400 mb-3" />
                            <p className="text-white font-bold text-sm mb-1">Could Not Load Tickets</p>
                            <p className="text-slate-500 text-xs mb-4">{ticketsError}</p>
                            <button onClick={fetchTickets} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl">Retry</button>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <MessageSquare size={40} className="text-slate-700 mb-4" />
                            <h3 className="text-white font-bold text-base mb-2">No Tickets Found</h3>
                            <p className="text-slate-500 text-sm">{ticketsSearch || ticketsFilterStatus !== 'all' ? 'Try adjusting your filters.' : 'No support tickets from parents yet.'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {filteredTickets.map(ticket => (
                                <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                                    className="w-full flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all text-left">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 relative">
                                        <MessageSquare size={15} className="text-amber-400" />
                                        {ticket.unread_count > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center">{ticket.unread_count}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{ticket.subject}</p>
                                                <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1"><User size={9} /> {ticket.parent_name}</p>
                                            </div>
                                            <StatusBadge status={ticket.status} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <span className="text-slate-500 text-xs flex items-center gap-1"><Tag size={9} /> {ticket.category}</span>
                                            <span className={`text-[10px] font-bold ${PRIORITY_CONFIG[ticket.priority].color}`}>{PRIORITY_CONFIG[ticket.priority].label} Priority</span>
                                            <span className="text-slate-600 text-[10px]">{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                                            <span className="text-slate-600 text-[10px]">Updated {new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 mt-1 shrink-0" />
                                </button>
                            ))}
                        </div>
                    )
                ) : (
                    noticesLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-amber-400 animate-spin" /></div>
                    ) : noticesError ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <AlertCircle size={36} className="text-red-400 mb-3" />
                            <p className="text-white font-bold text-sm mb-1">Could Not Load Notices</p>
                            <p className="text-slate-500 text-xs mb-4">{noticesError}</p>
                            <button onClick={fetchNotices} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl">Retry</button>
                        </div>
                    ) : filteredNotices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <Megaphone size={40} className="text-slate-700 mb-4" />
                            <h3 className="text-white font-bold text-base mb-2">No Notices Found</h3>
                            <p className="text-slate-500 text-sm">{noticesSearch || noticesFilterCategory !== 'all' ? 'Try adjusting your search criteria.' : 'Create your first announcement notice above.'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {filteredNotices.map(item => (
                                <div key={item.id} className={`flex items-start gap-4 px-5 py-4 transition-all text-left ${item.is_read ? '' : 'bg-sky-500/[0.03]'}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.is_read ? 'bg-white/5 text-slate-500' : 'bg-sky-500/15 text-sky-400'}`}>
                                        {item.is_read ? <MailOpen size={15} /> : <Bell size={15} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-white font-bold text-sm">{item.title}</p>
                                                <p className="text-slate-400 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {!item.is_read && (
                                                    <button onClick={() => markNoticeRead(item.id)} className="px-2.5 py-1 rounded bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 text-[10px] font-bold transition-all">
                                                        Mark read
                                                    </button>
                                                )}
                                                <button onClick={() => clearNotice(item.id)} className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors animate-all" title="Delete notice">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className="text-slate-500 text-xs flex items-center gap-1"><Tag size={9} /> {item.category}</span>
                                            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{item.audience.replace('all_', ' ').replace('selected', 'Specific Recipient')}</span>
                                            <span className="text-slate-600 text-[10px]">From {item.sender_name || 'School'} · {new Date(item.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Modals & Slideouts */}
            {selectedTicket && <TicketDetailPanel ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdate={handleTicketUpdate} />}
            {showNewNotice && <NewNoticeModal onClose={() => setShowNewNotice(false)} onSent={fetchNotices} />}
        </div>
    );
}
