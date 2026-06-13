import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    GraduationCap, UserCheck, Users, UserPlus, BookOpen, RefreshCw,
    X, CheckCircle, ClipboardCheck, AlertTriangle, CreditCard,
    Activity, TrendingDown, Clock, Calendar, Bell, ChevronRight,
    CheckSquare, AlertCircle, School, UserCircle,
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { DashboardStats } from '../../types';
import RecentNotifications from '../../components/RecentNotifications';

// ──────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ──────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-white/[0.05] rounded animate-pulse ${className}`} />
);

function TermBanner({ term }: { term: DashboardStats['current_term'] }) {
    if (!term) return null;
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    const now = new Date();
    const total = end.getTime() - start.getTime();
    const elapsed = Math.max(0, now.getTime() - start.getTime());
    const pct = Math.min(100, Math.round((elapsed / total) * 100));

    return (
        <div className="rounded-2xl border border-sky-500/20 px-5 py-3.5 flex flex-wrap items-center gap-4 justify-between"
            style={{ background: 'linear-gradient(135deg, rgba(14,30,50,0.9) 0%, rgba(10,22,40,0.9) 100%)' }}>
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400">
                    <Calendar size={16} />
                </div>
                <div>
                    <p className="text-sky-400 font-bold text-sm">{term.name} &nbsp;·&nbsp; {term.academic_year}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                        {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                        {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-[180px] max-w-xs">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sky-400 text-xs font-bold shrink-0">{pct}%</span>
            </div>
        </div>
    );
}

interface SummaryCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    subtext?: string;
    to?: string;
    alert?: boolean;
    loading?: boolean;
}

function SummaryCard({ label, value, icon, iconBg, iconColor, subtext, to, alert, loading }: SummaryCardProps) {
    const inner = (
        <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 hover:border-white/15 relative ${alert ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-white/5'}`}
            style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            {/* Status indicator */}
            <div className="absolute left-3 top-3 w-2 h-2 rounded-full" style={{ background: alert ? '#f59e0b' : '#10b981' }} />
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg} border border-white/5 flex items-center justify-center ${iconColor}`}>
                    {icon}
                </div>
                {alert && <AlertCircle size={14} className="text-amber-400" />}
                {to && !alert && <ChevronRight size={14} className="text-slate-600" />}
            </div>
            <div>
                {loading ? (
                    <>
                        <Skeleton className="h-7 w-20 mb-1" />
                        <Skeleton className="h-3 w-24" />
                    </>
                ) : (
                    <>
                        <p className="text-2xl font-black text-white">{value}</p>
                        <p className="text-slate-500 text-xs mt-0.5 font-medium">{label}</p>
                        {subtext && <p className={`text-xs mt-1 font-semibold ${alert ? 'text-amber-400' : 'text-slate-500'}`}>{subtext}</p>}
                        {/* Quick action */}
                        {!loading && to && (
                            <div className="mt-3">
                                <Link to={to} className="text-sky-400 text-xs font-semibold hover:text-sky-300">Take Action</Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
    if (to) return <Link to={to} className="block hover:scale-[1.01] active:scale-[0.99] transition-transform">{inner}</Link>;
    return inner;
}

function AttendanceWidget({ attendance, loading }: { attendance: DashboardStats['attendance_today'] | undefined; loading: boolean }) {
    if (!attendance) return null;
    const { present, absent, late, rate, classes_submitted } = attendance;
    const total = present + absent + late;
    const bars = [
        { label: 'Present', val: present, color: '#10b981', bg: 'bg-emerald-500' },
        { label: 'Absent', val: absent, color: '#ef4444', bg: 'bg-red-500' },
        { label: 'Late', val: late, color: '#f59e0b', bg: 'bg-amber-500' },
    ];
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex flex-col gap-4" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold text-sm">Today's Attendance</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-emerald-400">{loading ? '—' : `${rate}%`}</p>
                    <p className="text-slate-500 text-[10px]">Attendance Rate</p>
                </div>
            </div>
            {loading ? (
                <Skeleton className="h-2 w-full rounded-full" />
            ) : (
                <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                    {total > 0 && bars.map(b => (
                        <div key={b.label} className="h-full transition-all" style={{ width: `${(b.val / total) * 100}%`, background: b.color }} />
                    ))}
                </div>
            )}
            <div className="grid grid-cols-3 gap-2">
                {bars.map(b => (
                    <div key={b.label} className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5">
                        {loading ? <Skeleton className="h-5 w-10 mx-auto mb-1" /> : (
                            <p className="text-lg font-black" style={{ color: b.color }}>{b.val}</p>
                        )}
                        <p className="text-slate-500 text-[10px] font-medium">{b.label}</p>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-white/5 pt-3">
                <ClipboardCheck size={12} />
                <span>{loading ? '—' : classes_submitted} class(es) submitted attendance today</span>
                <Link to="/attendance" className="ml-auto text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1">
                    View All <ChevronRight size={12} />
                </Link>
            </div>
        </div>
    );
}

function FinanceWidget({ finance, loading }: { finance: DashboardStats['finance'] | undefined; loading: boolean }) {
    if (!finance) return null;
    const { outstanding_fees_count, collected_today, fee_defaulters } = finance;
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex flex-col gap-4" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold text-sm">Fee Collection</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Outstanding & Today's Collections</p>
                </div>
                <Link to="/finance" className="text-sky-400 text-xs hover:text-sky-300 font-semibold flex items-center gap-1">
                    View All <ChevronRight size={12} />
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                    {loading ? <Skeleton className="h-6 w-16 mx-auto mb-1" /> : (
                        <p className="text-xl font-black text-red-400">{outstanding_fees_count}</p>
                    )}
                    <p className="text-slate-500 text-[10px] font-medium">Outstanding Fees</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                    {loading ? <Skeleton className="h-6 w-16 mx-auto mb-1" /> : (
                        <p className="text-xl font-black text-emerald-400">₦{collected_today.toLocaleString()}</p>
                    )}
                    <p className="text-slate-500 text-[10px] font-medium">Collected Today</p>
                </div>
            </div>
            {fee_defaulters.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Fee Defaulters</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {fee_defaulters.map((d, i) => (
                            <div key={i} className="flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2">
                                <div>
                                    <p className="text-white text-xs font-semibold">{d.name}</p>
                                    <p className="text-slate-500 text-[10px]">{d.class_name} · {d.fee_type}</p>
                                </div>
                                <span className="text-red-400 text-xs font-bold">₦{d.balance.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {!loading && fee_defaulters.length === 0 && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2.5">
                    <CheckSquare size={14} />
                    <span className="font-semibold">No outstanding fee defaulters today</span>
                </div>
            )}
        </div>
    );
}

function ClassesWidget({ classes, loading }: { classes: DashboardStats['classes_overview']; loading: boolean }) {
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex flex-col gap-4" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold text-sm">Class Overview</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Active classes & pupil distribution</p>
                </div>
                <Link to="/academics" className="text-sky-400 text-xs hover:text-sky-300 font-semibold flex items-center gap-1">
                    Manage <ChevronRight size={12} />
                </Link>
            </div>
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                </div>
            ) : classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                    <School size={28} className="mb-2 opacity-40" />
                    <p className="text-xs">No classes configured yet</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {classes.map(cls => (
                        <div key={cls.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center text-sky-400 text-xs font-black">
                                    {cls.name.slice(0, 2)}
                                </div>
                                <div>
                                    <p className="text-white text-xs font-semibold">{cls.name}</p>
                                    <p className="text-slate-500 text-[10px]">{cls.teacher_name || 'No class teacher'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white text-sm font-black">{cls.pupil_count}</p>
                                <p className="text-slate-600 text-[10px]">Pupils</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AttendanceMonitor({ classes, attendance, loading }: { classes: DashboardStats['classes_overview']; attendance: DashboardStats['attendance_today'] | undefined; loading: boolean }) {
    // Expect each `cls` to optionally include `attendance_submitted: boolean`
    return (
        <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-white font-bold text-sm">Attendance Monitor</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Quick class submission status</p>
                </div>
                <div className="text-slate-500 text-xs">Today · {new Date().toLocaleDateString('en-GB')}</div>
            </div>
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {classes.map((cls) => {
                        const submitted = (cls as any).attendance_submitted;
                        const status = submitted === true ? 'submitted' : submitted === false ? 'pending' : 'unknown';
                        return (
                            <div key={cls.id} className={`p-3 rounded-xl border ${status === 'submitted' ? 'border-emerald-500/20 bg-emerald-500/5' : status === 'pending' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-white/[0.02]'} flex items-center justify-between`}>
                                <div>
                                    <p className="text-white text-sm font-semibold">{cls.name}</p>
                                    <p className="text-slate-500 text-xs">{cls.pupil_count} Pupils</p>
                                </div>
                                <div className="text-right">
                                    {status === 'submitted' && <span className="text-emerald-400 text-sm font-bold">✓ Submitted</span>}
                                    {status === 'pending' && <span className="text-amber-400 text-sm font-bold">⚠ Pending</span>}
                                    {status === 'unknown' && <span className="text-slate-500 text-sm">—</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function QuickActions() {
    const actions = [
        { label: 'Register Pupil', to: '/students' },
        { label: 'Add Teacher', to: '/teachers' },
        { label: 'Create Class', to: '/classes' },
        { label: 'Record Payment', to: '/finance/record' },
        { label: 'Publish Results', to: '/academics/results' },
        { label: 'Send Notice', to: '/notifications' },
    ];
    return (
        <div className="rounded-2xl border border-white/5 p-4 flex gap-3 flex-wrap" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            {actions.map(a => (
                <Link key={a.to} to={a.to} className="px-4 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-lg font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
                    {a.label}
                </Link>
            ))}
        </div>
    );
}

function ActivityFeed({ items, loading }: { items: DashboardStats['activity_feed']; loading: boolean }) {
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
        red: 'bg-red-500/15 text-red-400 border-red-500/20',
    };
    const dotMap: Record<string, string> = {
        emerald: 'bg-emerald-400',
        amber: 'bg-amber-400',
        sky: 'bg-sky-400',
        red: 'bg-red-400',
    };
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex flex-col gap-4" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold text-sm">School Activity</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Recent events & enrollment requests</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                    <Activity size={28} className="mb-2 opacity-40" />
                    <p className="text-xs">No recent activity</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border ${colorMap[item.color] || colorMap.sky}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotMap[item.color] || dotMap.sky}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                                <p className="text-slate-500 text-[10px] mt-0.5">{item.subtitle}</p>
                            </div>
                            {item.time && (
                                <span className="text-slate-600 text-[10px] shrink-0 mt-0.5">
                                    {new Date(item.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Enrollment tables (kept from existing implementation)
// ──────────────────────────────────────────────────────────────────────────────

function EnrollmentTable({
    enrollments,
    loading,
    onApprove,
    onDeny,
    onViewDetails
}: {
    enrollments: any[];
    loading: boolean;
    onApprove: (id: string) => void;
    onDeny: (id: string) => void;
    onViewDetails: (enrollment: any) => void;
}) {
    const pending = enrollments.filter(e => e.status === 'pending');

    if (loading || pending.length === 0) return null;

    return (
        <div className="rounded-2xl border border-amber-500/30 overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-amber-400 font-bold text-sm">⚠ Action Required: Pending Enrollment Requests</h3>
                </div>
                <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full">{pending.length} Pending</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-amber-500/10">
                            <th className="text-left px-5 py-3 text-amber-500/60 text-[10px] font-bold uppercase tracking-widest">Parent Name</th>
                            <th className="text-left px-5 py-3 text-amber-500/60 text-[10px] font-bold uppercase tracking-widest">Pupils Count</th>
                            <th className="text-left px-5 py-3 text-amber-500/60 text-[10px] font-bold uppercase tracking-widest">Submitted</th>
                            <th className="text-right px-5 py-3 text-amber-500/60 text-[10px] font-bold uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pending.map((req) => (
                            <tr key={req.id} className="border-b border-amber-500/5 hover:bg-amber-500/5 transition-colors">
                                <td className="px-5 py-4">
                                    <p className="text-amber-100 text-sm font-bold">{req.parent_first_name} {req.parent_last_name}</p>
                                    <p className="text-amber-500/60 text-xs font-mono mt-0.5">{req.parent_email}</p>
                                </td>
                                <td className="px-5 py-4 text-amber-200/80 text-sm font-semibold">
                                    {req.students_data?.length || 0} Pupil(s)
                                </td>
                                <td className="px-5 py-4 text-amber-500/60 text-xs">
                                    {new Date(req.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => onViewDetails(req)} className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-lg transition-all border border-white/5">
                                            View Details
                                        </button>
                                        <button onClick={() => onDeny(req.id)} className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-all">
                                            Deny
                                        </button>
                                        <button onClick={() => onApprove(req.id)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 text-xs font-black rounded-lg transition-all shadow-lg shadow-emerald-500/20">
                                            Verify & Enroll
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ──────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [successData, setSuccessData] = useState<any | null>(null);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [statsData, enrollData] = await Promise.all([
                api.get<DashboardStats>(endpoints.auth.dashboardStats),
                api.get<{ results: any[] }>(`${endpoints.auth.enrollment}`)
            ]);
            setStats(statsData);
            setEnrollments(Array.isArray(enrollData) ? enrollData : (enrollData as any).results || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleApprove = async (id: string) => {
        try {
            const response = await api.post<any>(`${endpoints.auth.enrollment}${id}/approve/`, {});
            setSuccessData(response);
            setIsSuccessOpen(true);
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve');
        }
    };

    const handleDeny = async (id: string) => {
        if (!window.confirm("Are you sure you want to deny this enrollment?")) return;
        try {
            await api.post(`${endpoints.auth.enrollment}${id}/deny/`, {});
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to deny');
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const pendingEnrollments = enrollments.filter(e => e.status === 'pending').length;
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Summary cards data
    const summaryCards = [
        {
            label: 'Total Pupils',
            value: stats?.total_pupils ?? 0,
            icon: <GraduationCap size={18} />,
            iconBg: 'bg-sky-500/15',
            iconColor: 'text-sky-400',
            subtext: `${stats?.active_students ?? 0} active`,
            to: '/students',
        },
        {
            label: 'Total Teachers',
            value: stats?.total_teachers ?? 0,
            icon: <UserCheck size={18} />,
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-400',
            subtext: 'On staff',
            to: '/teachers',
        },
        {
            label: 'Classes Running',
            value: stats?.active_classes ?? 0,
            icon: <BookOpen size={18} />,
            iconBg: 'bg-indigo-500/15',
            iconColor: 'text-indigo-400',
            subtext: `of ${stats?.total_classes ?? 0} total`,
            to: '/academics',
        },
        {
            label: 'Attendance Submitted',
            value: stats?.attendance_today?.classes_submitted ?? 0,
            icon: <ClipboardCheck size={18} />,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            subtext: `${stats?.attendance_today?.classes_submitted ?? 0} classes submitted`,
        },
        {
            label: 'Pending Fees',
            value: stats?.finance?.outstanding_fees_count ?? 0,
            icon: <CreditCard size={18} />,
            iconBg: 'bg-red-500/15',
            iconColor: 'text-red-400',
            subtext: 'Need collection',
            to: '/finance',
            alert: (stats?.finance?.outstanding_fees_count ?? 0) > 0,
        },
        {
            label: 'New Admissions',
            value: stats?.new_admissions ?? 0,
            icon: <UserPlus size={18} />,
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
            subtext: 'This week',
            alert: pendingEnrollments > 0,
        },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Operations Center
                        </h2>
                        {pendingEnrollments > 0 && (
                            <span className="text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle size={10} /> {pendingEnrollments} Pending
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm">{today}</p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm disabled:opacity-50">
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Term Banner */}
            {!loading && <TermBanner term={stats?.current_term ?? null} />}

            {/* Quick Actions - visible without scrolling */}
            <QuickActions />

            {/* Section 1: Today's Summary – 6 Cards */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Activity size={14} className="text-sky-400" />
                    <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">Today's School Summary</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {summaryCards.map((card) => (
                        <SummaryCard key={card.label} {...card} loading={loading} />
                    ))}
                </div>
            </div>

            {/* Section 2: Pending Enrollments (action required) */}
            <EnrollmentTable
                enrollments={enrollments}
                loading={loading}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onViewDetails={(req) => { setSelectedEnrollment(req); setIsDetailOpen(true); }}
            />

            {/* Section 3: Attendance Monitor + Finance side by side (Attendance prioritized) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <AttendanceMonitor classes={stats?.classes_overview ?? []} attendance={stats?.attendance_today} loading={loading} />
                <FinanceWidget finance={stats?.finance} loading={loading} />
            </div>

            {/* Section 4: Class Overview + Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ClassesWidget classes={stats?.classes_overview ?? []} loading={loading} />
                <ActivityFeed items={stats?.activity_feed ?? []} loading={loading} />
            </div>

            {/* Section 5: Communications / Notifications */}
            <RecentNotifications />

            {/* Modals */}
            <EnrollmentDetailModal
                enrollment={selectedEnrollment}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onApprove={handleApprove}
                onDeny={handleDeny}
            />
            <ApprovalSuccessModal
                isOpen={isSuccessOpen}
                data={successData}
                onClose={() => setIsSuccessOpen(false)}
            />
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal sub-components
// ──────────────────────────────────────────────────────────────────────────────

function EnrollmentDetailModal({
    enrollment,
    isOpen,
    onClose,
    onApprove,
    onDeny
}: {
    enrollment: any | null;
    isOpen: boolean;
    onClose: () => void;
    onApprove: (id: string) => void;
    onDeny: (id: string) => void;
}) {
    if (!isOpen || !enrollment) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-white/5 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white">Enrollment Request Details</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Submitted on {new Date(enrollment.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-300">
                    {/* Parent Info */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest border-b border-sky-500/10 pb-1.5">Parent / Guardian Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Full Name</span>
                                <span className="text-white text-sm font-semibold">{enrollment.parent_first_name} {enrollment.parent_last_name}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Relationship to Pupil</span>
                                <span className="text-white text-sm font-semibold capitalize">{enrollment.relationship_to_student}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Email Address</span>
                                <span className="text-white text-sm font-mono">{enrollment.parent_email}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Phone Number</span>
                                <span className="text-white text-sm">{enrollment.parent_phone}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Residential Address</span>
                                <span className="text-white text-sm">{enrollment.parent_address}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Employment Details</span>
                                <span className="text-white text-sm">{enrollment.employment_details || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pupils Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-500/10 pb-1.5">Enrolling Pupils ({enrollment.students_data?.length || 0})</h3>
                        {enrollment.students_data?.map((student: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                                <div className="flex items-center gap-3.5 pb-2 border-b border-white/5">
                                    <div className="w-12 h-12 rounded-lg border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center text-slate-500 select-none">
                                        <UserCircle size={20} className="opacity-40" />
                                        <span className="text-[7px] font-bold mt-0.5">PHOTO</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pupil #{idx + 1}</h4>
                                        <p className="text-[9px] text-slate-500 mt-0.5">Passport photo will be uploaded upon portal login.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">First Name</span><span className="text-white font-medium">{student.first_name}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Middle Name</span><span className="text-white font-medium">{student.middle_name || '—'}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Last Name</span><span className="text-white font-medium">{student.last_name}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Date of Birth</span><span className="text-white font-medium">{student.dob}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Gender</span><span className="text-white font-medium">{student.gender === 'M' ? 'Male' : 'Female'}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Proposed Class</span><span className="text-amber-400 font-semibold">{student.class}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">State of Origin</span><span className="text-white font-medium">{student.state_of_origin || '—'}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Place of Birth</span><span className="text-white font-medium">{student.place_of_birth || '—'}</span></div>
                                    <div><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Blood Group</span><span className="text-white font-medium">{student.blood_group || '—'}</span></div>
                                    {student.medical_conditions && (
                                        <div className="md:col-span-3"><span className="block text-[10px] text-slate-500 uppercase tracking-wider">Medical Conditions</span><span className="text-red-400 font-medium">{student.medical_conditions}</span></div>
                                    )}
                                </div>
                                {student.emergency_contact_name && (
                                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                                        <span className="block text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">Emergency Contact</span>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                            <div><span className="block text-[10px] text-slate-500">Name</span><span className="text-white font-medium">{student.emergency_contact_name}</span></div>
                                            <div><span className="block text-[10px] text-slate-500">Phone</span><span className="text-white font-medium">{student.emergency_contact_phone}</span></div>
                                            <div><span className="block text-[10px] text-slate-500">Relationship</span><span className="text-white font-medium capitalize">{student.emergency_contact_relationship}</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-950 border-t border-white/5 shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 font-bold text-sm rounded-xl transition-all">Close</button>
                    <button onClick={() => { onDeny(enrollment.id); onClose(); }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-xl transition-all">Deny Request</button>
                    <button onClick={() => { onApprove(enrollment.id); onClose(); }} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20">Verify & Enroll</button>
                </div>
            </div>
        </div>
    );
}

function ApprovalSuccessModal({
    isOpen,
    data,
    onClose
}: {
    isOpen: boolean;
    data: { parent_email: string; students: { admission_number: string; student_name: string }[] } | null;
    onClose: () => void;
}) {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-8 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Enrollment Approved!</h2>
                        <p className="text-xs text-slate-500 mt-1">Parent account and pupil profiles have been generated.</p>
                    </div>

                    <div className="text-left space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                        <div>
                            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Parent Email (Login ID)</span>
                            <span className="text-slate-200 text-sm font-semibold font-mono">{data.parent_email}</span>
                        </div>
                        <div className="border-t border-white/5 pt-2">
                            <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Generated Admission Numbers</span>
                            <div className="space-y-1.5 flex flex-col">
                                {data.students?.map((student, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-slate-300 text-xs font-medium">{student.student_name}</span>
                                        <span className="text-emerald-400 text-xs font-mono font-bold select-all">{student.admission_number}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-950 border-t border-white/5">
                    <button onClick={onClose} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
