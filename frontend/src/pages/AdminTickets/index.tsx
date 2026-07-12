import { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare, Clock, CheckCircle, AlertCircle, X, Send,
    Tag, Search, Loader2, RefreshCw, ChevronRight, User, Filter
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';

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

function StatusBadge({ status }: { status: TicketStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${cfg.color}`}>
            {cfg.icon}{cfg.label}
        </span>
    );
}

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

export default function AdminTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
    const [filterPriority, setFilterPriority] = useState<'all' | TicketPriority>('all');
    const [search, setSearch] = useState('');

    const fetchTickets = useCallback(async () => {
        try {
            const data = await api.get<Ticket[]>(endpoints.tickets.list);
            setTickets(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to load tickets.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const filtered = tickets.filter(t => {
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
        if (search) {
            const q = search.toLowerCase();
            return t.subject.toLowerCase().includes(q) || t.parent_name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
    });

    const handleUpdate = (updated: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelected(updated);
    };

    const totalUnread = tickets.reduce((acc, t) => acc + t.unread_count, 0);

    const stats = {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        urgent: tickets.filter(t => t.priority === 'urgent').length,
    };

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>
                        Support Tickets
                        {totalUnread > 0 && <span className="ml-3 px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-lg">{totalUnread} new</span>}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage and respond to parent queries and requests</p>
                </div>
                <button onClick={fetchTickets} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Refresh">
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Open', value: stats.open, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
                    { label: 'In Progress', value: stats.in_progress, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Resolved', value: stats.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Urgent', value: stats.urgent, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border px-4 py-3 ${s.bg}`}>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Search by parent, subject…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <Filter size={12} className="text-slate-600" />
                    {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${filterStatus === s ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                    <span className="text-slate-700 text-xs">|</span>
                    {(['all', 'urgent', 'high', 'normal', 'low'] as const).map(p => (
                        <button key={p} onClick={() => setFilterPriority(p as 'all' | TicketPriority)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${filterPriority === p ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ticket list */}
            <div className="rounded-3xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#0a1628 100%)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-amber-400 animate-spin" /></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <AlertCircle size={36} className="text-red-400 mb-3" />
                        <p className="text-white font-bold text-sm mb-1">Could Not Load Tickets</p>
                        <p className="text-slate-500 text-xs mb-4">{error}</p>
                        <button onClick={fetchTickets} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl">Retry</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <MessageSquare size={40} className="text-slate-700 mb-4" />
                        <h3 className="text-white font-bold text-base mb-2">No Tickets</h3>
                        <p className="text-slate-500 text-sm">{search || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'No support tickets from parents yet.'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {filtered.map(ticket => (
                            <button key={ticket.id} onClick={() => setSelected(ticket)}
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
                                        <span className={`text-[10px] font-bold ${PRIORITY_CONFIG[ticket.priority].color}`}>{PRIORITY_CONFIG[ticket.priority].label}</span>
                                        <span className="text-slate-600 text-[10px]">{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                                        <span className="text-slate-600 text-[10px]">Updated {new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-600 mt-1 shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selected && <TicketDetailPanel ticket={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
        </div>
    );
}
