import { useEffect, useState } from 'react';
import { GraduationCap, UserCheck, Users, UserPlus, BookOpen, TrendingUp, RefreshCw, } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, } from 'recharts';
import StatsCard from '../../components/ui/StatsCard';
import { api, endpoints } from '../../utils/api';
import type { DashboardStats, User } from '../../types';



// Mockup Data 

const enrollmentData = [
    { month: 'Oct', students: 420 },
    { month: 'Nov', students: 434 },
    { month: 'Dec', students: 424 },
    { month: 'Jan', students: 460 },
    { month: 'Feb', students: 546 },
    { month: 'Mar', students: 467 },
    { month: 'Apr', students: 495 },

];

const attendanceData = [
    { day: 'Mon', present: 92, absent: 8 },
    { day: 'Tue', present: 88, absent: 12 },
    { day: 'Wed', present: 95, absent: 5 },
    { day: 'Thu', present: 90, absent: 10 },
    { day: 'Fri', present: 85, absent: 15 },
];

const PIE_COLORS = ['#f59e0b', '#10b981', '#38bdf8', '#a78bfa'];

// Custom ToolTip


const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
            <p className="text-slate-400 mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }} className="font-semibold"> {p.name}: {p.value} </p>
            ))}
        </div>
    );
};



// Recent Students Table


interface RecentStudent {
    id: string;
    full_name: string;
    email: string;
    date_joined: string;
    is_active: boolean;
}

function RecentTable({ students, loading }: { students: RecentStudent[]; loading: boolean }) {
    const skeletonRows = Array.from({ length: 5 });

    return (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-white font-semibold text-sm"> Recent Registrations </h3>
                <span className="text-xs text-slate-500">Last 7 days</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            {['Student', 'Email', 'Joined', 'Status'].map((h) => (
                                <th key={h} className="text-left px-5 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? skeletonRows.map((_, i) => (
                            <tr key={i} className="border-b border-white/5">
                                {[1, 2, 3, 4].map((j) => (
                                    <td key={j} className="px-5 py-3.5">
                                        <div className="h-3 bg-white/5 rounded animate-pulse w-24" />
                                    </td>
                                ))}
                            </tr>
                        ))
                            : students.length === 0
                                ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-sm">
                                            No recent registrations found.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((s) => (
                                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                        {s.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <span className="text-white text-xs font-medium">{s.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-400 text-xs">{s.email}</td>
                                            <td className="py-5 py-3.5 text-slate-400 text-xs">
                                                {new Date(s.date_joined).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${s.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


//Dashboard Page

export default function Dashboard() {
    const [stats, setsStats] = useState<DashboardStats | null>(null);
    const [recentStudents, setRecent] = useState<RecentStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [statsData, studentsData] = await Promise.all([
                api.get<DashboardStats>(endpoints.auth.dashboardStats),
                api.get<{ results: User[]; count: number }>(
                    `${endpoints.students.list}?ordering=-date_joined&page_size=8`
                ),
            ]);
            setsStats(statsData);
            setRecent(
                studentsData.results.map((u) => ({
                    id: u.id,
                    full_name: u.full_name,
                    email: u.email,
                    date_joined: u.date_joined,
                    is_active: u.is_active,
                }))
            );
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);

        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Pie chart data derived from students_by_class

    const classPieData = stats
        ? Object.entries(stats.students_by_class).map(([name, value]) => ({ name, value })) : [];
    const statsCards = [
        {
            label: 'Total Students',
            value: stats?.total_students ?? 0,
            icon: <GraduationCap size={18} />,
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
            trend: { value: 4.2, label: 'vs last term' },
        },

        {
            label: 'Active Students',
            value: stats?.active_students ?? 0,
            icon: <BookOpen size={18} />,
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            trend: { value: 2.1, label: 'attendance rate' },
        },
        {
            label: 'Teachers',
            value: stats?.total_teachers ?? 0,
            icon: <UserCheck size={18} />,
            iconBg: 'bg-sky-500/15',
            iconColor: 'text-sky-400',
            trend: { value: 0, label: 'no change' },
        },
        {
            label: 'Parents',
            value: stats?.total_parents ?? 0,
            icon: <Users size={18} />,
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-400',
            trend: { value: 1.5, label: 'newly registered' },
        },
        {
            label: 'New This Week',
            value: stats?.recent_registrations ?? 0,
            icon: <UserPlus size={18} />,
            iconBg: 'bg-rose-500/15',
            iconColor: 'text-rose-400',
        },

    ];

    return (
        <div className="space-y-6 max-w-screem-xl">

            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}> Overview </h2>
                    <p className="text-slate-500 text-sm mt-0.5"> Here's what's happening at your school today.</p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm disabled:opacity-50">
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>
            {/* Error */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Stats Cards */}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {statsCards.map((card) => (
                    <StatsCard key={card.label} {...card} loading={loading} />
                ))}
            </div>

            {/* Charts */}
            <div className="hrid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Enrollment trend */}
                <div className="xl:col-span-2 rounded-2xl border border-white/5 p-5"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-white font-semibold text-sm"> Enrollment Trend</h3>
                            <p className="text-slate-500 text-xs mt-0.5">Student count over the school year</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                            <TrendingUp size={12} /> +19.5%
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={enrollmentData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="students" stroke="#f569e0b" strokWidth={2} fill="url(#enrollGrad" dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />

                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                {/* Attendace bar if no class data */}
                <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%' }}>
                    <h3 className="text-white font-semibold text-sm mb-1">Students by Class</h3>
                    <p className="text-slate-500 text-xs mb-5"> Distribution across classes</p>

                    {classPieData.length > 0 ? (<>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie data={classPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" />
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 mt-3">
                            {classPieData.slice(0, 4).map((d, i) => (
                                <div key={d.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full shrink-0"
                                            style={{ background: PIE_COLORS[i] }} />
                                        <span className="text-slate-400 text-xs truncate max-w-[100px]">{d.name}</span>

                                    </div>
                                    <span className="text-white text-xs font-semibold">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                            <GraduationCap size={32} className="mb-2 opacity-40" />
                            <p className="text-xs">No class data yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance bar Chart */}

            <div className="rounded-2xl border border-white/5 p-5"
                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }} >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-white font-semibold text-sm"> Weekly Attendance </h3>
                        <p className="text-slate-500 text-xs mt-0.5"> Present vs Absent this week (%)</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Absent
                        </span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={attendanceData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barGap={4}>
                        <CartesianGrid strokesDasharray="3.3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0,]} maxBarSize={36} />
                        <Bar dataKey="absent" name="Absent" fill="#ef444460" raidus={[4, 4, 0, 0]} maxBarSize={36} />

                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Recent Students */}
            <RecentTable students={recentStudents} loading={loading} />
        </div>


    );
}
