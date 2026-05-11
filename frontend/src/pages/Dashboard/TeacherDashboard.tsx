import { useEffect, useState } from 'react';
import { GraduationCap, Users, CalendarCheck, BookOpen, Clock, AlertCircle } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        setTimeout(() => setLoading(false), 1000);
    }, []);

    const stats = [
        { label: 'My Students', value: 32, icon: <GraduationCap size={18} />, iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
        { label: "Today's Attendance", value: '94%', icon: <CalendarCheck size={18} />, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
        { label: 'Pending Scores', value: 12, icon: <BookOpen size={18} />, iconBg: 'bg-rose-500/15', iconColor: 'text-rose-400' },
        { label: 'Upcoming Lessons', value: 4, icon: <Clock size={18} />, iconBg: 'bg-sky-500/15', iconColor: 'text-sky-400' },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}> Teacher Hub </h2>
                    <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user?.first_name}. Here's your class summary.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((card) => (
                    <StatsCard key={card.label} {...card} loading={loading} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* My Class Overview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 rounded-2xl border border-white/5 p-6" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold">Assigned Class: Primary 4A</h3>
                            <button className="text-amber-400 text-xs font-semibold hover:underline">View All Students</button>
                        </div>
                        
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                                            S{i}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Student Name {i}</p>
                                            <p className="text-slate-500 text-xs">ID: ADM-2024-00{i}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-400 text-xs font-bold">98%</p>
                                        <p className="text-slate-500 text-[10px] uppercase">Attendance</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Reminders */}
                <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button className="flex items-center gap-3 p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold transition-all text-sm">
                                <CalendarCheck size={18} />
                                Mark Attendance
                            </button>
                            <button className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all text-sm">
                                <BookOpen size={18} />
                                Record Scores
                            </button>
                        </div>
                    </div>

                    <div className="bg-rose-500/10 rounded-2xl border border-rose-500/20 p-6">
                        <div className="flex items-center gap-2 text-rose-400 mb-3">
                            <AlertCircle size={18} />
                            <h3 className="font-bold text-sm">Reminders</h3>
                        </div>
                        <ul className="space-y-3">
                            <li className="text-slate-400 text-xs flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                End of term reports due in 5 days.
                            </li>
                            <li className="text-slate-400 text-xs flex gap-2">
                                <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                Staff meeting tomorrow by 8:00 AM.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
