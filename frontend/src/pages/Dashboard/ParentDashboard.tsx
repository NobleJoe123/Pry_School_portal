import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, CreditCard, Bell, CalendarDays, FileText,
    MessageSquare, ChevronRight, AlertCircle, CheckCircle,
    Clock, TrendingUp, Users, BookOpen, CalendarCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';
import ParentProfileCompletionModal from '../../components/ParentProfileCompletionModal';
import EnrollmentAdmissionModal from '../../components/EnrollmentAdmissionModal';

const getList = <T,>(val: any): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.results && Array.isArray(val.results)) return val.results;
    return [];
};

function ChildAvatar({ child, size = 'w-10 h-10' }: { child: any; size?: string }) {
    const [failed, setFailed] = useState(false);
    const user = child?.user || {};
    const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'P';
    const photoUrl = user.profile_photo_url;

    return (
        <div className={`${size} rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {photoUrl && !failed ? (
                <img
                    src={photoUrl}
                    alt=""
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : initials}
        </div>
    );
}

function QuickNavCard({ icon, label, desc, to, color }: {
    icon: React.ReactNode; label: string; desc: string; to: string; color: string;
}) {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            className="group flex items-center gap-4 p-5 rounded-2xl border border-white/[0.06] text-left w-full transition-all hover:scale-[1.02] hover:border-white/10 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}
        >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5 truncate">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
    );
}

function StatCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <div className="rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-3"
            style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
            <div className="flex items-center justify-between">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
            </div>
            <div>
                <p className="text-white text-2xl font-black">{value}</p>
                {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function ParentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
    const [profileCheckDone, setProfileCheckDone] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);

    // Summary data
    const [notifications, setNotifications] = useState<any[]>([]);
    const [fees, setFees] = useState<any[]>([]);
    const [upcomingEvent, setUpcomingEvent] = useState<any>(null);
    const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, total: 0 });

    const children = user?.children || [];

    useEffect(() => {
        const checkProfile = async () => {
            try {
                const data = await api.get<any>(endpoints.auth.parentEnrollmentStatus);
                if (data && typeof (data as any).completed_profile === 'boolean') {
                    setNeedsProfileCompletion(!(data as any).completed_profile);
                }
            } catch { /* silent */ } finally {
                setProfileCheckDone(true);
            }
        };
        checkProfile();
    }, []);

    useEffect(() => {
        Promise.allSettled([
            api.get<any>(endpoints.auth.notifications),
            api.get<any>(endpoints.finance.studentFees),
            api.get<any>(endpoints.academics.events),
            api.get<any>(endpoints.attendance.students),
        ]).then(([notifRes, feesRes, eventsRes, attRes]) => {
            if (notifRes.status === 'fulfilled') {
                const list = getList<any>(notifRes.value);
                setNotifications(list.filter((n: any) => !n.is_read).slice(0, 3));
            }
            if (feesRes.status === 'fulfilled') {
                setFees(getList<any>(feesRes.value));
            }
            if (eventsRes.status === 'fulfilled') {
                const events = getList<any>(eventsRes.value);
                const today = new Date();
                const next = events
                    .filter((e: any) => e.date && new Date(e.date) >= today)
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                setUpcomingEvent(next || null);
            }
            if (attRes.status === 'fulfilled') {
                const list = getList<any>(attRes.value);
                const today = new Date().toISOString().slice(0, 10);
                const todayRecs = list.filter((a: any) => a.date === today);
                const present = todayRecs.filter((a: any) => a.status === 'present' || a.status === 'late').length;
                setAttendanceSummary({ present, total: todayRecs.length });
            }
        }).finally(() => setLoading(false));
    }, []);

    const outstanding = fees.filter(f => f.status !== 'paid');
    const totalOwed = outstanding.reduce((s, f) => s + parseFloat(f.balance || '0'), 0);
    const nextDue = outstanding.sort((a, b) =>
        new Date(a.due_date || '9999').getTime() - new Date(b.due_date || '9999').getTime()
    )[0];

    const unreadCount = notifications.length;

    const formatCurrency = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { return d; }
    };

    if (!profileCheckDone) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-7 max-w-screen-xl">
            {needsProfileCompletion && (
                <ParentProfileCompletionModal onComplete={() => { setNeedsProfileCompletion(false); window.location.reload(); }} />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>
                        Welcome back, {user?.first_name}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Here's a quick overview of your children's school life.</p>
                </div>
                <button
                    onClick={() => setShowLinkModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 shrink-0"
                >
                    <Users size={13} /> Link Another Pupil
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<GraduationCap size={18} />}
                    label="My Children"
                    value={children.length}
                    sub={children.length === 1 ? 'enrolled pupil' : 'enrolled pupils'}
                    color="bg-sky-500/15 text-sky-400"
                />
                <StatCard
                    icon={<CreditCard size={18} />}
                    label="Outstanding Fees"
                    value={loading ? '—' : formatCurrency(totalOwed)}
                    sub={outstanding.length > 0 ? `${outstanding.length} invoice${outstanding.length > 1 ? 's' : ''} pending` : 'All fees cleared'}
                    color={totalOwed > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}
                />
                <StatCard
                    icon={<Bell size={18} />}
                    label="New Notifications"
                    value={loading ? '—' : unreadCount}
                    sub="unread messages"
                    color="bg-amber-500/15 text-amber-400"
                />
                <StatCard
                    icon={<CalendarCheck size={18} />}
                    label="Today's Attendance"
                    value={loading ? '—' : attendanceSummary.total > 0 ? `${attendanceSummary.present}/${attendanceSummary.total}` : 'N/A'}
                    sub={attendanceSummary.total > 0 ? 'children present today' : 'No attendance data'}
                    color="bg-violet-500/15 text-violet-400"
                />
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left col — 2/3 */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Children quick list */}
                    {children.length > 0 && (
                        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
                            style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#0a1628 100%)' }}>
                            <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <GraduationCap size={14} className="text-amber-400" />
                                    <span className="text-white text-sm font-bold">My Children</span>
                                </div>
                                <button onClick={() => navigate('/parent/children')}
                                    className="text-amber-400 text-xs font-semibold hover:text-amber-300 flex items-center gap-1">
                                    View All <ChevronRight size={12} />
                                </button>
                            </div>
                            <div className="divide-y divide-white/[0.04]">
                                {children.map((child: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-all">
                                        <ChildAvatar child={child} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold text-sm truncate">{child.user?.full_name}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">
                                                {child.profile?.current_class?.name || 'Unassigned'} · {child.profile?.admission_number}
                                            </p>
                                        </div>
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 uppercase shrink-0">
                                            {child.profile?.status || 'Active'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {children.length === 0 && !loading && (
                        <div className="rounded-2xl border border-dashed border-white/10 p-10 flex flex-col items-center text-center"
                            style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
                            <GraduationCap size={40} className="text-slate-700 mb-3" />
                            <p className="text-white font-bold text-sm mb-1">No Children Linked Yet</p>
                            <p className="text-slate-500 text-xs max-w-xs">Link your child using their admission number from the school's approval email.</p>
                            <button onClick={() => setShowLinkModal(true)}
                                className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all">
                                Link a Pupil
                            </button>
                        </div>
                    )}

                    {/* Recent Notifications */}
                    <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
                        style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#0a1628 100%)' }}>
                        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell size={14} className="text-amber-400" />
                                <span className="text-white text-sm font-bold">Recent Notifications</span>
                            </div>
                            <button onClick={() => navigate('/notifications')}
                                className="text-amber-400 text-xs font-semibold hover:text-amber-300 flex items-center gap-1">
                                See All <ChevronRight size={12} />
                            </button>
                        </div>
                        {loading ? (
                            <div className="px-5 py-6 space-y-3">
                                {[1, 2].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-5 py-8 text-center">
                                <Bell size={24} className="text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500 text-xs">No new notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                {notifications.map((n: any) => (
                                    <div key={n.id} className="flex gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-all">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Bell size={13} className="text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs font-semibold">{n.title}</p>
                                            <p className="text-slate-500 text-[11px] mt-0.5 truncate">{n.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right col — 1/3 */}
                <div className="space-y-4">

                    {/* Upcoming Event */}
                    <div className="rounded-2xl border border-white/[0.06] p-5"
                        style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarDays size={14} className="text-violet-400" />
                            <span className="text-white text-sm font-bold">Upcoming Event</span>
                        </div>
                        {loading ? (
                            <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                        ) : upcomingEvent ? (
                            <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                                <p className="text-white text-sm font-bold">{upcomingEvent.title}</p>
                                <p className="text-violet-400 text-xs mt-1 font-semibold">{formatDate(upcomingEvent.date)}</p>
                                {upcomingEvent.description && (
                                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{upcomingEvent.description}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-600 text-xs text-center py-4">No upcoming events scheduled</p>
                        )}
                        <button onClick={() => navigate('/calendar')}
                            className="mt-3 w-full py-2 text-xs font-bold text-violet-400 hover:text-white border border-violet-500/20 hover:border-violet-500/40 rounded-xl transition-all">
                            View Full Calendar
                        </button>
                    </div>

                    {/* Next Fee Deadline */}
                    <div className="rounded-2xl border border-white/[0.06] p-5"
                        style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard size={14} className={totalOwed > 0 ? 'text-red-400' : 'text-emerald-400'} />
                            <span className="text-white text-sm font-bold">Fee Status</span>
                        </div>
                        {loading ? (
                            <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                        ) : totalOwed > 0 ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                    <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5">
                                        <AlertCircle size={11} /> Outstanding Balance
                                    </p>
                                    <p className="text-white text-lg font-black mt-1">{formatCurrency(totalOwed)}</p>
                                    {nextDue?.due_date && (
                                        <p className="text-slate-500 text-[11px] mt-0.5">Due: {formatDate(nextDue.due_date)}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                <p className="text-emerald-400 text-xs font-semibold">All fees are cleared</p>
                            </div>
                        )}
                        <button onClick={() => navigate('/parent/fees')}
                            className="mt-3 w-full py-2 text-xs font-bold text-sky-400 hover:text-white border border-sky-500/20 hover:border-sky-500/40 rounded-xl transition-all">
                            Go to Fee Payments
                        </button>
                    </div>

                    {/* Quick Nav */}
                    <div className="space-y-2">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-1">Quick Access</p>
                        <QuickNavCard icon={<TrendingUp size={16} />} label="Academic Reports" desc="View term results & download" to="/parent/reports" color="bg-emerald-500/15 text-emerald-400" />
                        <QuickNavCard icon={<BookOpen size={16} />} label="My Children" desc="Full child profiles & records" to="/parent/children" color="bg-sky-500/15 text-sky-400" />
                        <QuickNavCard icon={<MessageSquare size={16} />} label="Tickets & Messages" desc="Contact teachers & admin" to="/parent/tickets" color="bg-violet-500/15 text-violet-400" />
                        <QuickNavCard icon={<Clock size={16} />} label="Fee Payments" desc="Invoices, receipts & payments" to="/parent/fees" color="bg-amber-500/15 text-amber-400" />
                    </div>
                </div>
            </div>

            <EnrollmentAdmissionModal
                isOpen={showLinkModal}
                parentId={user?.id || ''}
                onSuccess={() => { setShowLinkModal(false); window.location.reload(); }}
            />
        </div>
    );
}
