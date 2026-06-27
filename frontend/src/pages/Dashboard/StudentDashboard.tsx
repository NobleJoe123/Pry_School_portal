import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, CalendarCheck, CreditCard, Bell, Award,
    TrendingUp, ChevronRight, GraduationCap, Clock, CheckCircle, XCircle,
    AlertCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

function StatCard({ label, value, icon, color, sub, loading }: {
    label: string; value: string | number; icon: React.ReactNode;
    color: string; sub?: string; loading?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex items-start gap-4 transition-all hover:border-white/10"
            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                {icon}
            </div>
            <div className="min-w-0">
                {loading ? (
                    <>
                        <div className="h-6 w-12 bg-white/5 rounded animate-pulse mb-1" />
                        <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                    </>
                ) : (
                    <>
                        <p className="text-white text-xl font-black">{value}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                        {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
                    </>
                )}
            </div>
        </div>
    );
}

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<any[]>([]);
    const [fees, setFees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [currentTerm, setCurrentTerm] = useState<any>(null);

    useEffect(() => {
        Promise.allSettled([
            api.get<any>(endpoints.academics.scores),
            api.get<any>(endpoints.finance.studentFees),
            api.get<any>(endpoints.attendance.students),
            api.get<any>(endpoints.auth.notifications),
            api.get<any>(endpoints.academics.terms),
        ]).then(([scoresRes, feesRes, attRes, notifRes, termsRes]) => {
            const scoreList = scoresRes.status === 'fulfilled' ? getList(scoresRes.value) : [];
            const feeList = feesRes.status === 'fulfilled' ? getList(feesRes.value) : [];
            const attList = attRes.status === 'fulfilled' ? getList(attRes.value) : [];
            const notifList = notifRes.status === 'fulfilled' ? getList(notifRes.value) : [];
            const termList = termsRes.status === 'fulfilled' ? getList(termsRes.value) : [];

            setScores(scoreList);
            setFees(feeList);
            setAttendance(attList);
            setNotifications(notifList);
            setTerms(termList);

            const ct = termList.find((t: any) => t.is_current) || termList[0] || null;
            setCurrentTerm(ct);
            setLoading(false);
        });
    }, []);

    // Compute stats
    const currentTermScores = currentTerm
        ? scores.filter(s => s.assessment?.term?.id === currentTerm.id)
        : scores;

    const avgPercent = (() => {
        if (!currentTermScores.length) return null;
        const subjectMap: Record<string, { total: number; max: number }> = {};
        currentTermScores.forEach((s: any) => {
            const key = s.assessment?.subject?.id;
            if (!key) return;
            if (!subjectMap[key]) subjectMap[key] = { total: 0, max: 0 };
            subjectMap[key].total += parseFloat(s.score_obtained) || 0;
            subjectMap[key].max += s.assessment?.assessment_type?.max_score || 100;
        });
        const subjects = Object.values(subjectMap);
        if (!subjects.length) return null;
        const avg = subjects.reduce((acc, v) => acc + (v.max > 0 ? (v.total / v.max) * 100 : 0), 0) / subjects.length;
        return avg.toFixed(1);
    })();

    const getGrade = (pct: number | null) => {
        if (pct === null) return { letter: '—', color: 'text-slate-400' };
        if (pct >= 70) return { letter: 'A', color: 'text-emerald-400' };
        if (pct >= 60) return { letter: 'B', color: 'text-sky-400' };
        if (pct >= 50) return { letter: 'C', color: 'text-amber-400' };
        if (pct >= 40) return { letter: 'D', color: 'text-orange-400' };
        return { letter: 'F', color: 'text-red-400' };
    };

    const grade = getGrade(avgPercent ? parseFloat(avgPercent) : null);

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const totalDays = presentCount + absentCount + lateCount;
    const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    const outstandingFees = fees.filter(f => f.status === 'outstanding' || f.status === 'partial');
    const totalOutstanding = outstandingFees.reduce((s: number, f: any) => s + parseFloat(f.balance || 0), 0);

    const unreadNotifs = notifications.filter((n: any) => !n.is_read);

    // Recent attendance (last 7)
    const recentAttendance = [...attendance]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">
                        Welcome back, <span className="text-amber-400">{user?.first_name}</span> 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {currentTerm ? `${currentTerm.name} · ${currentTerm.academic_year_name}` : 'Your academic overview'}
                    </p>
                </div>
                {unreadNotifs.length > 0 && (
                    <button onClick={() => navigate('/notifications')}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-all">
                        <Bell size={15} />
                        {unreadNotifs.length} new notification{unreadNotifs.length > 1 ? 's' : ''}
                    </button>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Term Average"
                    value={avgPercent ? `${avgPercent}%` : '—'}
                    icon={<TrendingUp size={18} />}
                    color="bg-emerald-500/10 text-emerald-400"
                    sub={`Grade ${grade.letter}`}
                    loading={loading}
                />
                <StatCard
                    label="Attendance Rate"
                    value={`${attendanceRate}%`}
                    icon={<CalendarCheck size={18} />}
                    color="bg-sky-500/10 text-sky-400"
                    sub={`${presentCount} days present`}
                    loading={loading}
                />
                <StatCard
                    label="Outstanding Fees"
                    value={totalOutstanding > 0 ? `₦${totalOutstanding.toLocaleString()}` : 'Cleared'}
                    icon={<CreditCard size={18} />}
                    color={totalOutstanding > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}
                    sub={outstandingFees.length > 0 ? `${outstandingFees.length} pending` : 'All paid'}
                    loading={loading}
                />
                <StatCard
                    label="Subjects Taken"
                    value={[...new Set(scores.map((s: any) => s.assessment?.subject?.id).filter(Boolean))].length || '—'}
                    icon={<BookOpen size={18} />}
                    color="bg-purple-500/10 text-purple-400"
                    sub="This term"
                    loading={loading}
                />
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Grade Summary */}
                <div className="lg:col-span-2 rounded-3xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                <Award size={16} />
                            </div>
                            <p className="text-white font-bold text-sm">Current Term Grades</p>
                        </div>
                        <button onClick={() => navigate('/student/grades')}
                            className="flex items-center gap-1 text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors">
                            View All <ChevronRight size={14} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : currentTermScores.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-3">
                                <GraduationCap size={24} />
                            </div>
                            <p className="text-slate-400 text-sm font-bold">No grades published yet</p>
                            <p className="text-slate-600 text-xs mt-1">Your teacher hasn't published scores for this term</p>
                        </div>
                    ) : (() => {
                        // Group by subject
                        const subjectMap: Record<string, { name: string; total: number; max: number }> = {};
                        currentTermScores.forEach((s: any) => {
                            const id = s.assessment?.subject?.id;
                            const name = s.assessment?.subject?.name || 'Unknown';
                            if (!id) return;
                            if (!subjectMap[id]) subjectMap[id] = { name, total: 0, max: 0 };
                            subjectMap[id].total += parseFloat(s.score_obtained) || 0;
                            subjectMap[id].max += s.assessment?.assessment_type?.max_score || 100;
                        });

                        return (
                            <div className="divide-y divide-white/[0.03]">
                                {Object.values(subjectMap).map((subj, i) => {
                                    const pct = subj.max > 0 ? (subj.total / subj.max) * 100 : 0;
                                    const { letter, color } = getGrade(pct);
                                    return (
                                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <BookOpen size={14} className="text-slate-400" />
                                                </div>
                                                <p className="text-white text-sm font-bold">{subj.name}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-white text-sm font-bold">{subj.total}/{subj.max}</p>
                                                    <p className="text-slate-500 text-[10px]">{pct.toFixed(1)}%</p>
                                                </div>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${color} border-current bg-current/10`}>
                                                    {letter}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Right panel */}
                <div className="space-y-6">
                    {/* Quick Links */}
                    <div className="rounded-3xl border border-white/5 p-5"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <p className="text-white font-bold text-sm mb-4">Quick Actions</p>
                        <div className="space-y-2">
                            {[
                                { label: 'View Grades', icon: <Award size={15} />, path: '/student/grades', color: 'text-amber-400' },
                                { label: 'My Attendance', icon: <CalendarCheck size={15} />, path: '/student/attendance', color: 'text-sky-400' },
                                { label: 'Notifications', icon: <Bell size={15} />, path: '/notifications', color: 'text-purple-400' },
                            ].map((item, i) => (
                                <button key={i} onClick={() => navigate(item.path)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group">
                                    <div className="flex items-center gap-2.5">
                                        <span className={item.color}>{item.icon}</span>
                                        <span className="text-slate-300 text-sm font-bold group-hover:text-white transition-colors">{item.label}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    <div className="rounded-3xl border border-white/5 p-5"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-white font-bold text-sm">Attendance Summary</p>
                            <button onClick={() => navigate('/student/attendance')}
                                className="text-amber-400 text-xs hover:text-amber-300 transition-colors font-bold">
                                Details →
                            </button>
                        </div>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    { label: 'Present', count: presentCount, icon: <CheckCircle size={14} />, color: 'text-emerald-400 bg-emerald-500/10' },
                                    { label: 'Absent', count: absentCount, icon: <XCircle size={14} />, color: 'text-red-400 bg-red-500/10' },
                                    { label: 'Late', count: lateCount, icon: <Clock size={14} />, color: 'text-amber-400 bg-amber-500/10' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.color}`}>
                                                {item.icon}
                                            </div>
                                            <span className="text-slate-400 text-xs">{item.label}</span>
                                        </div>
                                        <span className="text-white text-sm font-bold">{item.count} day{item.count !== 1 ? 's' : ''}</span>
                                    </div>
                                ))}
                                {totalDays === 0 && (
                                    <p className="text-slate-600 text-xs text-center">No attendance records yet</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fee Status */}
            {(loading || fees.length > 0) && (
                <div className="rounded-3xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                                <CreditCard size={16} />
                            </div>
                            <p className="text-white font-bold text-sm">Fee Status</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
                        </div>
                    ) : fees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <AlertCircle size={24} className="text-slate-600 mb-2" />
                            <p className="text-slate-500 text-sm">No fee records found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.03]">
                            {fees.map((fee: any) => {
                                const isPaid = fee.status === 'paid';
                                const isPartial = fee.status === 'partial';
                                return (
                                    <div key={fee.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all">
                                        <div>
                                            <p className="text-white text-sm font-bold">{fee.fee_type_name}</p>
                                            <p className="text-slate-500 text-xs">{fee.term_name}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                isPaid ? 'bg-emerald-500/10 text-emerald-400' :
                                                isPartial ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Outstanding'}
                                            </span>
                                            {!isPaid && (
                                                <p className="text-slate-400 text-xs">Bal: ₦{parseFloat(fee.balance).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Notifications */}
            {notifications.length > 0 && (
                <div className="rounded-3xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                <Bell size={16} />
                            </div>
                            <p className="text-white font-bold text-sm">Recent Notifications</p>
                        </div>
                        <button onClick={() => navigate('/notifications')}
                            className="text-amber-400 text-xs hover:text-amber-300 transition-colors font-bold">
                            View All →
                        </button>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                        {notifications.slice(0, 5).map((n: any) => (
                            <div key={n.id} className={`flex items-start gap-3 px-6 py-4 hover:bg-white/[0.02] transition-all ${!n.is_read ? 'bg-amber-500/[0.02]' : ''}`}>
                                {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />}
                                <div className="min-w-0 flex-1">
                                    <p className="text-white text-sm font-bold truncate">{n.title}</p>
                                    <p className="text-slate-500 text-xs truncate">{n.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
