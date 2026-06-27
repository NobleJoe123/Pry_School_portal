import { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle, XCircle, Clock, AlertCircle, Calendar, TrendingUp, Filter } from 'lucide-react';
import { api, endpoints } from '../../utils/api';

interface AttendanceRecord {
    id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks: string | null;
    school_class: string;
    term: string;
}

const STATUS_CONFIG = {
    present:  { label: 'Present',  icon: <CheckCircle size={14} />,  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    absent:   { label: 'Absent',   icon: <XCircle size={14} />,      color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    late:     { label: 'Late',     icon: <Clock size={14} />,         color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    excused:  { label: 'Excused',  icon: <AlertCircle size={14} />,  color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
};

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentAttendancePage() {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'excused'>('all');

    useEffect(() => {
        api.get<any>(endpoints.attendance.students)
            .then(data => {
                const list: AttendanceRecord[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.results) ? data.results : [];
                // Sort newest first
                setRecords(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;
    const totalDays = records.length;
    const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

    const filtered = filter === 'all' ? records : records.filter(r => r.status === filter);

    // Group by month
    const grouped: Record<string, AttendanceRecord[]> = {};
    filtered.forEach(r => {
        const key = new Date(r.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    });

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">My Attendance</h1>
                    <p className="text-slate-500 text-sm">Track your attendance history across all terms</p>
                </div>
                {/* Attendance Rate Badge */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <TrendingUp size={16} className="text-emerald-400" />
                    <span className="text-emerald-400 font-black text-sm">{attendanceRate}% Attendance Rate</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Present', count: presentCount, icon: <CheckCircle size={18} />, color: 'bg-emerald-500/10 text-emerald-400', total: totalDays },
                    { label: 'Absent',  count: absentCount,  icon: <XCircle size={18} />,     color: 'bg-red-500/10 text-red-400',     total: totalDays },
                    { label: 'Late',    count: lateCount,    icon: <Clock size={18} />,        color: 'bg-amber-500/10 text-amber-400', total: totalDays },
                    { label: 'Excused', count: excusedCount, icon: <AlertCircle size={18} />, color: 'bg-sky-500/10 text-sky-400',     total: totalDays },
                ].map(item => (
                    <div key={item.label}
                        className="rounded-2xl border border-white/5 p-4 flex items-start gap-3 transition-all hover:border-white/10"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                            {item.icon}
                        </div>
                        <div>
                            {loading ? (
                                <>
                                    <div className="h-5 w-8 bg-white/5 rounded animate-pulse mb-1" />
                                    <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <p className="text-white text-lg font-black">{item.count}</p>
                                    <p className="text-slate-400 text-xs">{item.label} days</p>
                                    {item.total > 0 && (
                                        <p className="text-slate-600 text-[10px]">{Math.round((item.count / item.total) * 100)}%</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-slate-500" />
                {(['all', 'present', 'absent', 'late', 'excused'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                            filter === f
                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                                : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                        }`}
                    >
                        {f === 'all' ? `All (${totalDays})` : f === 'present' ? `Present (${presentCount})` :
                         f === 'absent' ? `Absent (${absentCount})` : f === 'late' ? `Late (${lateCount})` : `Excused (${excusedCount})`}
                    </button>
                ))}
            </div>

            {/* Records */}
            <div className="rounded-3xl border border-white/5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                            <CalendarCheck size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            {filter === 'all'
                                ? 'Your attendance records will appear here once your teacher starts marking attendance.'
                                : `No ${filter} attendance records found.`}
                        </p>
                    </div>
                ) : (
                    <div>
                        {Object.entries(grouped).map(([month, monthRecords]) => (
                            <div key={month}>
                                {/* Month header */}
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/[0.02] border-b border-white/5">
                                    <Calendar size={13} className="text-slate-500" />
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{month}</span>
                                    <span className="ml-auto text-slate-600 text-xs">{monthRecords.length} record{monthRecords.length !== 1 ? 's' : ''}</span>
                                </div>
                                {/* Records */}
                                {monthRecords.map((record, idx) => {
                                    const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.excused;
                                    return (
                                        <div key={record.id}
                                            className={`flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all ${idx < monthRecords.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-white text-sm font-black leading-none">
                                                        {new Date(record.date).getDate()}
                                                    </span>
                                                    <span className="text-slate-500 text-[8px] uppercase">
                                                        {new Date(record.date).toLocaleDateString('en', { weekday: 'short' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-bold">{formatDate(record.date)}</p>
                                                    {record.remarks && (
                                                        <p className="text-slate-500 text-xs italic mt-0.5">"{record.remarks}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${cfg.color}`}>
                                                {cfg.icon}
                                                {cfg.label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
