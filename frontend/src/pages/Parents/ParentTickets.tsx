import { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare, Plus, Clock, CheckCircle, AlertCircle,
    Send, X, ChevronRight, Tag, Search, Loader2, RefreshCw
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';

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
    subject: string;
    category: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
    messages: TicketMessage[];
    unread_count: number;
}

// ── Static config ─────────────────────────────────────────────────────────────

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

const CATEGORIES = [
    'Fees & Finance',
    'Academics',
    'Attendance',
    'Health & Medical',
    'Discipline',
    'Admission',
    'General Inquiry',
    'Other',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${cfg.color}`}>
            {cfg.icon}{cfg.label}
        </span>
    );
}

function NewTicketModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [priority, setPriority] = useState<TicketPriority>('normal');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await api.post(endpoints.tickets.list, {
                subject: subject.trim(),
                category,
                priority,
                body: body.trim(),
            });
            onCreate();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to submit ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#070e1a 100%)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-amber-400" />
                        <p className="text-white font-bold text-sm">New Support Ticket</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Subject *</label>
                        <input
                            required value={subject} onChange={e => setSubject(e.target.value)}
                            placeholder="Brief description of your issue"
                            className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Category</label>
                            <select value={category} onChange={e => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-all">
                                {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}
                                className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-all">
                                {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map(p => (
                                    <option key={p} value={p} className="bg-slate-900">{PRIORITY_CONFIG[p].label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Message *</label>
                        <textarea required rows={5} value={body} onChange={e => setBody(e.target.value)}
                            placeholder="Please describe your issue in detail..."
                            className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                        />
                    </div>
                    <button type="submit" disabled={submitting || !subject.trim() || !body.trim()}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {submitting ? 'Submitting…' : 'Submit Ticket'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function TicketDetail({ ticket, onClose, onRefresh }: {
    ticket: Ticket; onClose: () => void; onRefresh: (updated: Ticket) => void;
}) {
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            await api.post(endpoints.tickets.messages(ticket.id), { body: reply.trim() });
            setReply('');
            const updated = await api.get<Ticket>(endpoints.tickets.detail(ticket.id));
            onRefresh(updated);
        } catch { /* silent */ } finally { setSending(false); }
    };

    const closed = ticket.status === 'resolved' || ticket.status === 'closed';

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-md h-full flex flex-col"
                style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#070e1a 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between gap-3 shrink-0">
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{ticket.subject}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <StatusBadge status={ticket.status} />
                            <span className="flex items-center gap-1 text-[10px] text-slate-500"><Tag size={9} /> {ticket.category}</span>
                            <span className={`text-[10px] font-bold ${PRIORITY_CONFIG[ticket.priority].color}`}>{PRIORITY_CONFIG[ticket.priority].label} Priority</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all shrink-0"><X size={15} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {ticket.messages.map(msg => {
                        const isParent = msg.sender_role === 'parent';
                        return (
                            <div key={msg.id} className={`flex flex-col ${isParent ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${isParent ? 'bg-amber-500 text-slate-950 rounded-br-sm' : 'bg-white/5 border border-white/5 text-white rounded-bl-sm'}`}>
                                    {msg.body}
                                </div>
                                <p className="text-slate-600 text-[10px] mt-1 px-1">
                                    {isParent ? 'You' : msg.sender_name} · {new Date(msg.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {!closed ? (
                    <div className="px-5 py-4 border-t border-white/5 flex gap-2 shrink-0">
                        <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)}
                            placeholder="Write a reply…"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none transition-all"
                        />
                        <button onClick={handleSend} disabled={sending || !reply.trim()}
                            className="self-end p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 rounded-xl transition-all shrink-0">
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                ) : (
                    <div className="px-5 py-4 border-t border-white/5 shrink-0 text-center">
                        <p className="text-slate-500 text-xs">This ticket has been {ticket.status}. Create a new ticket for further queries.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ParentTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
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
        if (search) {
            const q = search.toLowerCase();
            return t.subject.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
    });

    const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    const handleTicketUpdate = (updated: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelectedTicket(updated);
    };

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>Support Tickets</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Contact the school for queries, complaints, or requests
                        {openCount > 0 && <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20">{openCount} active</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchTickets} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => setShowNew(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 shrink-0">
                        <Plus size={14} /> New Ticket
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${filterStatus === s ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}>
                            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

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
                        <h3 className="text-white font-bold text-base mb-2">No Tickets Found</h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            {search || filterStatus !== 'all' ? 'Try adjusting your search or filter.' : 'Have a query? Click "New Ticket" to contact the school.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {filtered.map(ticket => (
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
                                        <p className="text-white font-bold text-sm truncate">{ticket.subject}</p>
                                        <StatusBadge status={ticket.status} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-slate-500 text-xs flex items-center gap-1"><Tag size={9} /> {ticket.category}</span>
                                        <span className={`text-[10px] font-semibold ${PRIORITY_CONFIG[ticket.priority].color}`}>{PRIORITY_CONFIG[ticket.priority].label} Priority</span>
                                        <span className="text-slate-600 text-[10px]">{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <p className="text-slate-600 text-[10px] mt-1">Updated {new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-600 mt-1 shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreate={fetchTickets} />}
            {selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onRefresh={handleTicketUpdate} />}
        </div>
    );
}
