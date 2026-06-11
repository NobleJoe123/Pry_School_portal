import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, UserCheck, Users, UserPlus, BookOpen, TrendingUp, RefreshCw, X, CheckCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, } from 'recharts';
import StatsCard from '../../components/ui/StatsCard';
import { api, endpoints } from '../../utils/api';
import type { DashboardStats, User } from '../../types';
import RecentNotifications from '../../components/RecentNotifications';

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

const PIE_COLORS = ['#38bdf8', '#0284c7', '#6366f1', '#a5b4fc'];

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
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
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
                        )) : students.length === 0 ? (
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
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                {(s.full_name || '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
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
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${s.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
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
    
    if (loading) return null;
    if (pending.length === 0) return null; // Hide if no pending requests

    return (
        <div className="rounded-2xl border border-sky-500/30 overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-sky-500/20 bg-sky-500/5">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <h3 className="text-sky-400 font-bold text-sm">Action Required: Pending Enrollments</h3>
                </div>
                <span className="text-xs font-bold bg-sky-500/20 text-sky-400 px-2.5 py-1 rounded-full">{pending.length} Requests</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-sky-500/10">
                            <th className="text-left px-5 py-3 text-sky-500/60 text-[10px] font-bold uppercase tracking-widest">Parent Name</th>
                            <th className="text-left px-5 py-3 text-sky-500/60 text-[10px] font-bold uppercase tracking-widest">Students Count</th>
                            <th className="text-left px-5 py-3 text-sky-500/60 text-[10px] font-bold uppercase tracking-widest">Submitted</th>
                            <th className="text-right px-5 py-3 text-sky-500/60 text-[10px] font-bold uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pending.map((req) => (
                            <tr key={req.id} className="border-b border-sky-500/5 hover:bg-sky-500/5 transition-colors">
                                <td className="px-5 py-4">
                                    <p className="text-sky-100 text-sm font-bold">{req.parent_first_name} {req.parent_last_name}</p>
                                    <p className="text-sky-500/60 text-xs font-mono mt-0.5">{req.parent_email}</p>
                                </td>
                                <td className="px-5 py-4 text-sky-200/80 text-sm font-semibold">
                                    {req.students_data?.length || 0} Student(s)
                                </td>
                                <td className="px-5 py-4 text-sky-500/60 text-xs">
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
                                        <button onClick={() => onApprove(req.id)} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-sky-950 text-xs font-black rounded-lg transition-all shadow-lg shadow-sky-500/20">
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



export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentStudents, setRecent] = useState<RecentStudent[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [successData, setSuccessData] = useState<any | null>(null);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    const fetchData = async () => {
        try {
            const [statsData, studentsData, enrollData] = await Promise.all([
                api.get<DashboardStats>(endpoints.auth.dashboardStats),
                api.get<{ results: User[]; count: number }>(
                    `${endpoints.students.list}?ordering=-date_joined&page_size=8`
                ),
                api.get<{ results: any[] }>(`${endpoints.auth.enrollment}`)
            ]);
            setStats(statsData);
            setRecent(
                studentsData.results.map((u) => ({
                    id: u.id,
                    full_name: u.full_name,
                    email: u.email,
                    date_joined: u.date_joined,
                    is_active: u.is_active,
                }))
            );
            // DefaultRouter usually returns { count, next, previous, results } if paginated, 
            // or just an array if not paginated. Let's handle both.
            setEnrollments(Array.isArray(enrollData) ? enrollData : enrollData.results || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

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

    useEffect(() => { fetchData(); }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const classPieData = stats ? Object.entries(stats.students_by_class).map(([name, value]) => ({ name, value })) : [];
    
    const statsCards = [
        { label: 'Total Students', value: stats?.total_students ?? 0, icon: <GraduationCap size={18} />, iconBg: 'bg-sky-500/15', iconColor: 'text-sky-400', trend: { value: 4.2, label: 'vs last term' }, to: '/students' },
        { label: 'Total Teachers', value: stats?.total_teachers ?? 0, icon: <UserCheck size={18} />, iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400', trend: { value: 0, label: 'no change' }, to: '/teachers' },
        { label: 'Total Parents', value: stats?.total_parents ?? 0, icon: <Users size={18} />, iconBg: 'bg-indigo-500/15', iconColor: 'text-indigo-400', trend: { value: 1.5, label: 'newly registered' }, to: '/parents' },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
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
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {statsCards.map((card) => (
                    <Link key={card.label} to={card.to} className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
                        <StatsCard {...card} loading={loading} />
                    </Link>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 rounded-2xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-white font-semibold text-sm"> Enrollment Trend</h3>
                            <p className="text-slate-500 text-xs mt-0.5">Student count over the school year</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold bg-sky-500/10 px-2.5 py-1 rounded-lg">
                            <TrendingUp size={12} /> +19.5%
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={enrollmentData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="students" stroke="#38bdf8" strokeWidth={2} fill="url(#enrollGrad)" dot={false} activeDot={{ r: 4, fill: '#38bdf8' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
                    <h3 className="text-white font-semibold text-sm mb-1">Students by Class</h3>
                    <p className="text-slate-500 text-xs mb-5"> Distribution across classes</p>
                    {classPieData.length > 0 ? (
                        <>
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
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
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
            <div className="rounded-2xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }} >
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="absent" name="Absent" fill="#ef444460" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <EnrollmentTable enrollments={enrollments} loading={loading} onApprove={handleApprove} onDeny={handleDeny} onViewDetails={(req) => { setSelectedEnrollment(req); setIsDetailOpen(true); }} />
            <RecentNotifications />
            <RecentTable students={recentStudents} loading={loading} />
            
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

// Modal helper components

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
                                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Relationship to Student</span>
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

                    {/* Students Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-500/10 pb-1.5">Enrolling Students ({enrollment.students_data?.length || 0})</h3>
                        {enrollment.students_data?.map((student: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student #{idx + 1}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">First Name</span>
                                        <span className="text-white font-medium">{student.first_name}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Middle Name</span>
                                        <span className="text-white font-medium">{student.middle_name || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Last Name</span>
                                        <span className="text-white font-medium">{student.last_name}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Date of Birth</span>
                                        <span className="text-white font-medium">{student.dob}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Gender</span>
                                        <span className="text-white font-medium">{student.gender === 'M' ? 'Male' : 'Female'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Proposed Class</span>
                                        <span className="text-amber-400 font-semibold">{student.class}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">State of Origin</span>
                                        <span className="text-white font-medium">{student.state_of_origin || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Place of Birth</span>
                                        <span className="text-white font-medium">{student.place_of_birth || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Blood Group</span>
                                        <span className="text-white font-medium">{student.blood_group || '—'}</span>
                                    </div>
                                    {student.medical_conditions && (
                                        <div className="md:col-span-3">
                                            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Medical Conditions</span>
                                            <span className="text-red-400 font-medium">{student.medical_conditions}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Emergency contact if different */}
                                {student.emergency_contact_name && (
                                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                                        <span className="block text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">Emergency Contact</span>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <span className="block text-[10px] text-slate-500">Name</span>
                                                <span className="text-white font-medium">{student.emergency_contact_name}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-slate-500">Phone</span>
                                                <span className="text-white font-medium">{student.emergency_contact_phone}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-slate-500">Relationship</span>
                                                <span className="text-white font-medium capitalize">{student.emergency_contact_relationship}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-950 border-t border-white/5 shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 font-bold text-sm rounded-xl transition-all">
                        Close
                    </button>
                    <button onClick={() => { onDeny(enrollment.id); onClose(); }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-xl transition-all">
                        Deny Request
                    </button>
                    <button onClick={() => { onApprove(enrollment.id); onClose(); }} className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-sky-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-sky-500/20">
                        Verify & Enroll
                    </button>
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
                        <p className="text-xs text-slate-500 mt-1">Parent account and student profiles have been generated.</p>
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
