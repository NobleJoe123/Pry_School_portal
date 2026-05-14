import { useState, useEffect } from 'react';
import { 
    CalendarCheck, 
    Users, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Search, 
    Filter, 
    ChevronRight,
    Save,
    RotateCcw,
    AlertCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { StudentAttendance, SchoolClass, User } from '../../types';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function Attendance() {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [students, setStudents] = useState<User[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: AttendanceStatus, remarks: string }>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Fetch classes for the teacher/admin
        api.get<SchoolClass[]>(endpoints.academics.classes)
            .then(data => {
                setClasses(data);
                if (data.length > 0) setSelectedClass(data[0].id);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        setLoading(true);
        // Fetch students in the selected class
        api.get<any>(`${endpoints.students.list}?class=${classes.find(c => c.id === selectedClass)?.name}`)
            .then(data => {
                const studentList = data.results || [];
                setStudents(studentList);
                // Initialize attendance records
                const initial: Record<string, { status: AttendanceStatus, remarks: string }> = {};
                studentList.forEach((s: User) => {
                    initial[s.id] = { status: 'present', remarks: '' };
                });
                setAttendanceRecords(initial);
                setLoading(false);
            });
    }, [selectedClass, classes]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess('');
        try {
            const records = Object.entries(attendanceRecords).map(([studentId, data]) => ({
                student_id: studentId,
                status: data.status,
                remarks: data.remarks
            }));

            await api.post(`${endpoints.attendance.students}bulk_mark/`, {
                school_class: selectedClass,
                term: 'REPLACE_WITH_CURRENT_TERM_ID', // We need a way to get the current term
                date: new Date().toISOString().split('T')[0],
                records
            });
            setSuccess('Attendance recorded successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Daily Attendance</h1>
                    <p className="text-slate-500 text-sm">Mark and manage student presence</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm flex items-center gap-2 font-mono">
                        <CalendarCheck size={16} className="text-amber-500" />
                        {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Selection Bar */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest">
                    <Users size={16} />
                    <span>Select Class:</span>
                </div>
                <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 min-w-[180px]"
                >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => window.location.reload()} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] font-bold">
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{student.full_name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{(student as any).student_profile?.admission_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {[
                                                    { id: 'present', icon: CheckCircle, color: 'emerald' },
                                                    { id: 'late', icon: Clock, color: 'amber' },
                                                    { id: 'absent', icon: XCircle, color: 'red' },
                                                    { id: 'excused', icon: AlertCircle, color: 'sky' }
                                                ].map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => handleStatusChange(student.id, s.id as AttendanceStatus)}
                                                        className={`p-2 rounded-xl border transition-all ${
                                                            attendanceRecords[student.id]?.status === s.id
                                                            ? `bg-${s.color}-500/20 border-${s.color}-500/40 text-${s.color}-400 shadow-lg shadow-${s.color}-500/10 scale-110`
                                                            : 'bg-white/5 border-transparent text-slate-600 hover:text-slate-400'
                                                        }`}
                                                        title={s.id.toUpperCase()}
                                                    >
                                                        <s.icon size={18} />
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="text" 
                                                placeholder="Note..." 
                                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
                                                value={attendanceRecords[student.id]?.remarks || ''}
                                                onChange={(e) => setAttendanceRecords(prev => ({
                                                    ...prev,
                                                    [student.id]: { ...prev[student.id], remarks: e.target.value }
                                                }))}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Save */}
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {Object.values(attendanceRecords).filter(r => r.status === 'present').length} Present
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                {Object.values(attendanceRecords).filter(r => r.status === 'absent').length} Absent
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {success && (
                                <span className="text-emerald-400 text-sm font-bold flex items-center gap-2 animate-bounce">
                                    <CheckCircle size={16} /> {success}
                                </span>
                            )}
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-sm transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                            >
                                <Save size={18} />
                                {saving ? 'Submitting...' : 'Save Attendance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
