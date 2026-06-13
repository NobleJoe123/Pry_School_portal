import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, Users, CalendarCheck, BookOpen, Clock,
    AlertCircle, TrendingUp, CheckCircle, XCircle, Award,
    ChevronRight, RefreshCw, Star, BarChart2, Bell, UserCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User } from '../../types';

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

function StatCard({ label, value, icon, iconBg, iconColor, sub, loading }: {
    label: string; value: string | number; icon: React.ReactNode;
    iconBg: string; iconColor: string; sub?: string; loading?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex items-start gap-4 transition-all hover:border-white/10"
            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
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

export default function TeacherDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [assignedClasses, setAssignedClasses] = useState<SchoolClass[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentTerm, setCurrentTerm] = useState<any>(null);

    const totalStudents = students.length;
    const presentToday = attendanceToday.filter(a => a.status === 'present').length;
    const absentToday = attendanceToday.filter(a => a.status === 'absent').length;
    const attendancePct = totalStudents > 0
        ? Math.round((presentToday / totalStudents) * 100) : 0;

    useEffect(() => {
        async function load() {
            try {
                const [classesRes, notifRes, termsRes] = await Promise.all([
                    api.get<any>(endpoints.academics.classes),
                    api.get<any>(endpoints.auth.notifications),
                    api.get<any>(endpoints.academics.terms),
                ]);

                const classList = getList<SchoolClass>(classesRes);
                const myClasses = classList.filter((c: any) =>
                    c.teacher === user?.id || c.teacher_name === user?.full_name
                );

                setAssignedClasses(myClasses);
                setNotifications(getList(notifRes).slice(0, 5));

                const termList = getList(termsRes);
                const current = termList.find((t: any) => t.is_current) || termList[0];
                setCurrentTerm(current);

                // Load students from first assigned class
                if (myClasses.length > 0) {
                    const studentsRes = await api.get<any>(
                        `${endpoints.students.list}?school_class=${myClasses[0].id}`
                    );
                    const studentList = getList<User>(studentsRes);
                    setStudents(studentList);

                    // Load attendance for today
                    const today = new Date().toISOString().split('T')[0];
                    try {
                        const attRes = await api.get<any>(
                            `${endpoints.attendance.students}?school_class=${myClasses[0].id}&date=${today}`
                        );
                        setAttendanceToday(getList(attRes));
                    } catch {
                        setAttendanceToday([]);
                    }
                }
            } catch (err) {
                console.error('Teacher dashboard load error:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    const myClass = assignedClasses[0];

    const stats = [
        {
            label: 'My Pupils', value: loading ? '—' : totalStudents,
            icon: <GraduationCap size={18} />, iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400',
            sub: myClass ? myClass.name : 'No class assigned'
        },
        {
            label: 'Present Today', value: loading ? '—' : presentToday,
            icon: <CheckCircle size={18} />, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400',
            sub: `${attendancePct}% attendance rate`
        },
        {
            label: 'Absent Today', value: loading ? '—' : absentToday,
            icon: <XCircle size={18} />, iconBg: 'bg-red-500/15', iconColor: 'text-red-400',
            sub: absentToday > 0 ? 'Requires follow-up' : 'Full class present!'
        },
        {
            label: 'Current Term', value: loading ? '—' : (currentTerm?.name || 'N/A'),
            icon: <Clock size={18} />, iconBg: 'bg-sky-500/15', iconColor: 'text-sky-400',
            sub: currentTerm ? currentTerm.academic_year_name || '' : ''
        },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        Teacher Hub
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Welcome back, <span className="text-amber-400 font-semibold">{user?.first_name}</span>.
                        {myClass ? ` You are managing ${myClass.name}.` : ' No class assigned yet.'}
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/10 text-sm transition-all self-start"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((card) => (
                    <StatCard key={card.label} {...card} loading={loading} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Class Roster + Attendance */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Class Overview */}
                    <div className="rounded-2xl border border-white/5 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">
                                        {myClass ? myClass.name : 'My Class'}
                                    </h3>
                                    <p className="text-slate-500 text-xs">Class Roster</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/teacher/attendance')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all"
                            >
                                <CalendarCheck size={12} />
                                Mark Attendance
                            </button>
                        </div>

                        <div className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-6 py-3 animate-pulse">
                                        <div className="w-9 h-9 rounded-full bg-white/5" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-32 bg-white/5 rounded" />
                                            <div className="h-2.5 w-20 bg-white/5 rounded" />
                                        </div>
                                        <div className="h-5 w-16 bg-white/5 rounded-full" />
                                    </div>
                                ))
                            ) : students.length > 0 ? (
                                students.slice(0, 8).map((student) => {
                                    const att = attendanceToday.find(
                                        (a: any) => a.student === student.id || a.student_id === student.id
                                    );
                                    const status = att?.status;
                                    const statusMap: Record<string, { label: string; color: string }> = {
                                        present: { label: 'Present', color: 'bg-emerald-500/15 text-emerald-400' },
                                        absent: { label: 'Absent', color: 'bg-red-500/15 text-red-400' },
                                        late: { label: 'Late', color: 'bg-amber-500/15 text-amber-400' },
                                        excused: { label: 'Excused', color: 'bg-sky-500/15 text-sky-400' },
                                    };
                                    const badge = status ? statusMap[status] : null;
                                    const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;
                                    const photoUrl = student.profile_photo_url || (student as any).profile_photo;

                                    return (
                                        <div key={student.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/3 transition-all">
                                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/5 overflow-hidden flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                                                {photoUrl ? (
                                                    <img src={photoUrl} alt={student.full_name} className="w-full h-full object-cover" />
                                                ) : initials || <UserCircle size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{student.full_name}</p>
                                                <p className="text-slate-500 text-xs">{(student as any).admission_number || student.username}</p>
                                            </div>
                                            {badge ? (
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border border-transparent ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-600 px-2 py-1 rounded-full bg-white/5">
                                                    Not marked
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-6 py-10 text-center">
                                    <GraduationCap size={32} className="text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm">No pupils in assigned class</p>
                                    <p className="text-slate-600 text-xs mt-1">Contact your administrator to assign pupils</p>
                                </div>
                            )}
                        </div>

                        {students.length > 8 && (
                            <div className="px-6 py-3 border-t border-white/5 text-center">
                                <button
                                    onClick={() => navigate('/teacher/class')}
                                    className="text-amber-400 text-xs hover:text-amber-300 font-semibold"
                                >
                                    View all {students.length} pupils →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Today's Attendance Summary */}
                    {attendanceToday.length > 0 && (
                        <div className="rounded-2xl border border-white/5 p-6"
                            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                            <div className="flex items-center gap-3 mb-5">
                                <BarChart2 size={16} className="text-sky-400" />
                                <h3 className="text-white font-bold text-sm">Today's Attendance Breakdown</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Present', count: attendanceToday.filter(a => a.status === 'present').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                                    { label: 'Absent', count: attendanceToday.filter(a => a.status === 'absent').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                                    { label: 'Late', count: attendanceToday.filter(a => a.status === 'late').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                                    { label: 'Excused', count: attendanceToday.filter(a => a.status === 'excused').length, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
                                ].map(({ label, count, color, bg }) => (
                                    <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
                                        <p className={`text-2xl font-black ${color}`}>{count}</p>
                                        <p className="text-slate-400 text-xs mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Attendance bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Attendance Rate</span>
                                    <span className="text-white font-bold">{attendancePct}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                                        style={{ width: `${attendancePct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Quick Actions, Notifications, Reminders */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="rounded-2xl border border-white/5 p-5"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <h3 className="text-white font-bold text-sm mb-4">Quick Actions</h3>
                        <div className="space-y-2.5">
                            <button
                                onClick={() => navigate('/teacher/attendance')}
                                className="flex items-center gap-3 w-full p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold transition-all text-sm group"
                            >
                                <CalendarCheck size={16} />
                                <span className="flex-1 text-left">Mark Attendance</span>
                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/teacher/scores')}
                                className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all text-sm group"
                            >
                                <BookOpen size={16} />
                                <span className="flex-1 text-left">Enter Scores</span>
                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/teacher/class')}
                                className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all text-sm group"
                            >
                                <Users size={16} />
                                <span className="flex-1 text-left">View My Class</span>
                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/teacher/reports')}
                                className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all text-sm group"
                            >
                                <Award size={16} />
                                <span className="flex-1 text-left">Submit Results</span>
                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Assigned Classes */}
                    {assignedClasses.length > 0 && (
                        <div className="rounded-2xl border border-white/5 p-5"
                            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <Star size={14} className="text-amber-400" />
                                <h3 className="text-white font-bold text-sm">Assigned Classes</h3>
                            </div>
                            <div className="space-y-2">
                                {assignedClasses.map((cls) => (
                                    <div key={cls.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-white text-sm font-semibold">{cls.name}</p>
                                            <p className="text-slate-500 text-xs">{(cls as any).level_name || 'Primary'}</p>
                                        </div>
                                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full font-bold">
                                            Class Teacher
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notifications */}
                    <div className="rounded-2xl border border-white/5 p-5"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Bell size={14} className="text-sky-400" />
                                <h3 className="text-white font-bold text-sm">Notifications</h3>
                            </div>
                            <button
                                onClick={() => navigate('/notifications')}
                                className="text-sky-400 text-xs hover:text-sky-300"
                            >
                                View all
                            </button>
                        </div>
                        {notifications.length > 0 ? (
                            <div className="space-y-2">
                                {notifications.map((notif) => (
                                    <div key={notif.id} className={`p-3 rounded-xl border text-xs ${notif.is_read ? 'bg-white/3 border-white/5' : 'bg-sky-500/5 border-sky-500/15'}`}>
                                        <p className={`font-semibold ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                                            {notif.title}
                                        </p>
                                        <p className="text-slate-500 mt-0.5 line-clamp-1">{notif.message}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-600 text-xs text-center py-4">No new notifications</p>
                        )}
                    </div>

                    {/* Reminders */}
                    <div className="bg-rose-500/10 rounded-2xl border border-rose-500/20 p-5">
                        <div className="flex items-center gap-2 text-rose-400 mb-3">
                            <AlertCircle size={16} />
                            <h3 className="font-bold text-sm">Reminders</h3>
                        </div>
                        <ul className="space-y-2.5">
                            <li className="text-slate-400 text-xs flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                Submit end-of-term scores before deadline.
                            </li>
                            <li className="text-slate-400 text-xs flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                Mark today's attendance if not done.
                            </li>
                            <li className="text-slate-400 text-xs flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                Review absent pupils and update remarks.
                            </li>
                        </ul>
                    </div>

                    {/* Performance Summary */}
                    <div className="rounded-2xl border border-white/5 p-5"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={14} className="text-emerald-400" />
                            <h3 className="text-white font-bold text-sm">Attendance Trend</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { day: 'Mon', pct: 95 },
                                { day: 'Tue', pct: 88 },
                                { day: 'Wed', pct: 92 },
                                { day: 'Thu', pct: 97 },
                                { day: 'Fri', pct: attendancePct || 85 },
                            ].map(({ day, pct }) => (
                                <div key={day} className="flex items-center gap-3">
                                    <span className="text-slate-500 text-xs w-8">{day}</span>
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-slate-400 text-xs w-8 text-right">{pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
