import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import {
    CalendarCheck, Users, CheckCircle, XCircle, Clock, Search, Filter,
    ChevronRight, Save, RotateCcw, AlertCircle, Bell, Send, Check,
    AlertTriangle, Smartphone, Mail, UserCheck, History, Sliders, X,
    ChevronDown, UserCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { StudentAttendance, SchoolClass, User } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_COLORS: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    absent: 'bg-red-500/15 text-red-400 border-red-500/20',
    late: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    excused: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
};

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

// ── Automated Notification Settings & Broadcast Panel ─────────────────────────
function NotificationPanel() {
    const [audience, setAudience] = useState('all_parents');
    const [title, setTitle] = useState('Daily Attendance Update');
    const [message, setMessage] = useState('');
    const [people, setPeople] = useState<User[]>([]);
    const [recipientIds, setRecipientIds] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState('');

    // Notification Toggles
    const [smsNotify, setSmsNotify] = useState(true);
    const [emailNotify, setEmailNotify] = useState(true);
    const [teacherLateNotify, setTeacherLateNotify] = useState(true);

    useEffect(() => {
        if (audience !== 'selected') return;
        Promise.all([
            api.get<any>(endpoints.teachers.list),
            api.get<any>(endpoints.parents.list),
            api.get<any>(endpoints.students.list),
        ]).then(([teachers, parents, students]) => {
            setPeople([...getList<User>(teachers), ...getList<User>(parents), ...getList<User>(students)]);
        });
    }, [audience]);

    const toggleRecipient = (id: string) => {
        setRecipientIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const sendNotice = async (event: FormEvent) => {
        event.preventDefault();
        setSending(true);
        setSent('');
        try {
            const response = await api.post<{ message: string }>(endpoints.auth.notifications, {
                audience,
                category: 'attendance',
                title,
                message,
                recipient_ids: audience === 'selected' ? recipientIds : [],
            });
            setSent(response.message || 'Notice broadcasted successfully!');
            setMessage('');
            setRecipientIds([]);
            setTimeout(() => setSent(''), 3000);
        } catch (err: any) {
            setSent(err.message || 'Failed to send broadcast.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Toggles Panel */}
            <div className="lg:col-span-1 p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-sky-400" />
                    <h3 className="text-white font-bold text-sm">Automated Alerts</h3>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">Configure when parents and staff are auto-alerted by the system.</p>
                <div className="h-px bg-white/5 my-1" />
                
                <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" checked={smsNotify} onChange={() => setSmsNotify(!smsNotify)} className="mt-1 accent-sky-500" />
                        <div>
                            <p className="text-white text-xs font-semibold group-hover:text-sky-400 transition-colors">Instant SMS on Absence</p>
                            <p className="text-slate-500 text-[10px]">Notify parent immediately if pupil is marked absent at 10:00 AM.</p>
                        </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" checked={emailNotify} onChange={() => setEmailNotify(!emailNotify)} className="mt-1 accent-sky-500" />
                        <div>
                            <p className="text-white text-xs font-semibold group-hover:text-sky-400 transition-colors">Daily Email Digest</p>
                            <p className="text-slate-500 text-[10px]">Email daily presence/lateness statistics report to parents.</p>
                        </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" checked={teacherLateNotify} onChange={() => setTeacherLateNotify(!teacherLateNotify)} className="mt-1 accent-sky-500" />
                        <div>
                            <p className="text-white text-xs font-semibold group-hover:text-sky-400 transition-colors">Staff Late-Submission Alert</p>
                            <p className="text-slate-500 text-[10px]">Warn class teachers if attendance list is not submitted by 09:30 AM.</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Notice Sender */}
            <form onSubmit={sendNotice} className="lg:col-span-2 p-5 bg-sky-500/[0.02] border border-sky-500/10 rounded-2xl flex flex-col gap-4 justify-between">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/15">
                            <Bell size={16} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Attendance Broadcast Notification</h3>
                            <p className="text-slate-500 text-xs">Send custom notice to parents, teachers, pupils, or selected people.</p>
                        </div>
                    </div>
                    {sent && <span className="text-emerald-400 text-xs font-bold animate-pulse">{sent}</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FilterDropdown
                        value={audience}
                        options={[
                            { id: 'all_parents', label: 'All Parents' },
                            { id: 'all_teachers', label: 'All Teachers' },
                            { id: 'all_students', label: 'All Pupils' },
                            { id: 'all_staff', label: 'All Staff' },
                            { id: 'selected', label: 'Specific Recipients' },
                        ]}
                        onChange={setAudience}
                        placeholder="Select Audience"
                    />
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-sky-500/50" placeholder="Notice Subject" />
                </div>

                {audience === 'selected' && (
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/50 p-2 space-y-1">
                        {people.map((person) => (
                            <label key={person.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                <input type="checkbox" checked={recipientIds.includes(person.id)} onChange={() => toggleRecipient(person.id)} />
                                <span className="text-xs text-white">{person.full_name}</span>
                                <span className="text-[9px] uppercase text-slate-500 ml-auto">{person.role}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={2} placeholder="Broadcast details here..." className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500/50 resize-none" />
                    <button disabled={sending || (audience === 'selected' && recipientIds.length === 0)} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 text-xs font-black transition-all">
                        <Send size={14} />
                        {sending ? 'Sending...' : 'Broadcast'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ── Emergency Override Form ───────────────────────────────────────────────────
interface OverrideProps {
    classId: string;
    className: string;
    date: string;
    onClose: () => void;
    onSaved: () => void;
}

function EmergencyOverridePanel({ classId, className, date, onClose, onSaved }: OverrideProps) {
    const [pupils, setPupils] = useState<User[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        // Load pupils of this class and the today's existing attendance
        Promise.all([
            api.get<{ results: User[] }>(`${endpoints.students.list}?class=${className}&page_size=100`),
            api.get<any>(`${endpoints.attendance.students}?date=${date}&school_class=${classId}`)
        ]).then(([studentsRes, attendanceRes]) => {
            const pupilList = studentsRes.results || [];
            setPupils(pupilList);

            const attendanceList = getList<any>(attendanceRes);
            const initial: Record<string, { status: AttendanceStatus; remarks: string }> = {};

            pupilList.forEach((p: User) => {
                const existing = attendanceList.find((a: any) => a.student === p.id || a.student_id === p.id || (a.student && a.student.id === p.id));
                initial[p.id] = {
                    status: existing ? existing.status : 'present',
                    remarks: existing ? (existing.remarks || '') : ''
                };
            });
            setAttendanceRecords(initial);
        }).catch((err) => {
            setError(err.message || 'Failed to load class pupils details.');
        }).finally(() => {
            setLoading(false);
        });
    }, [classId, className, date]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const records = Object.entries(attendanceRecords).map(([studentId, data]) => ({
                student_id: studentId,
                status: data.status,
                remarks: data.remarks
            }));

            await api.post(`${endpoints.attendance.students}bulk_mark/`, {
                school_class: classId,
                date: date,
                records
            });
            onSaved();
        } catch (err: any) {
            setError(err.message || 'Failed to update attendance records.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 border border-white/5 bg-[#0b1523] rounded-2xl flex items-center justify-center">
                <div className="premium-spinner" />
            </div>
        );
    }

    return (
        <div className="p-6 border border-amber-500/20 bg-gradient-to-br from-[#0c1626] to-[#08101e] rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
                    <h3 className="text-white font-bold text-sm">Emergency Override: {className}</h3>
                </div>
                <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded hover:bg-white/5 transition-all">
                    <X size={16} />
                </button>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <p>
                    <strong>Cover Mode:</strong> You are manually setting attendance for this class. Saving will overwrite any values submitted by class teachers.
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <div className="max-h-[350px] overflow-y-auto pr-1 border border-white/5 rounded-xl bg-slate-950/40">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-white/5 bg-slate-950/60 sticky top-0 z-10">
                            <th className="px-4 py-2.5 text-slate-500 font-bold uppercase tracking-wider">Pupil</th>
                            <th className="px-4 py-2.5 text-slate-500 font-bold uppercase tracking-wider text-center">Mark Status</th>
                            <th className="px-4 py-2.5 text-slate-500 font-bold uppercase tracking-wider">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pupils.map((pupil) => {
                            const initials = `${pupil.first_name?.[0] ?? ''}${pupil.last_name?.[0] ?? ''}`.toUpperCase();
                            return (
                                <tr key={pupil.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-black">
                                                {(pupil as any).profile_photo_url ? (
                                                    <img src={(pupil as any).profile_photo_url} alt={pupil.full_name} className="w-full h-full object-cover" />
                                                ) : initials}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-xs">{pupil.full_name}</p>
                                                <p className="text-[9px] text-slate-500 font-mono">{(pupil as any).student_profile?.admission_number}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {[
                                                { id: 'present', label: 'P', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                                { id: 'late', label: 'L', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                                { id: 'absent', label: 'A', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                                                { id: 'excused', label: 'E', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' }
                                            ].map(s => {
                                                const isActive = attendanceRecords[pupil.id]?.status === s.id;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => handleStatusChange(pupil.id, s.id as AttendanceStatus)}
                                                        className={`w-6 h-6 rounded-md border text-[10px] font-bold flex items-center justify-center transition-all ${
                                                            isActive ? s.color + ' scale-105 shadow-md' : 'border-transparent bg-white/5 text-slate-500 hover:text-slate-300'
                                                        }`}
                                                        title={s.id}
                                                    >
                                                        {s.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={attendanceRecords[pupil.id]?.remarks || ''}
                                            onChange={(e) => setAttendanceRecords(prev => ({
                                                ...prev,
                                                [pupil.id]: { ...prev[pupil.id], remarks: e.target.value }
                                            }))}
                                            placeholder="Remarks..."
                                            className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white/10"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-4 text-[10px] text-slate-500 font-semibold">
                    <span>Present: {Object.values(attendanceRecords).filter(r => r.status === 'present').length}</span>
                    <span>Late: {Object.values(attendanceRecords).filter(r => r.status === 'late').length}</span>
                    <span>Absent: {Object.values(attendanceRecords).filter(r => r.status === 'absent').length}</span>
                </div>
                <div className="flex gap-2.5">
                    <button type="button" onClick={onClose} className="px-3.5 py-1.5 border border-white/10 text-slate-400 font-bold rounded-lg hover:text-white transition-all text-xs">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-lg transition-all text-xs flex items-center gap-1.5">
                        <Save size={12} />
                        {saving ? 'Saving...' : 'Apply Override'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Attendance Component ──────────────────────────────────────────────────
export default function Attendance() {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [allAttendance, setAllAttendance] = useState<StudentAttendance[]>([]);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [error, setError] = useState('');

    // Override State
    const [overrideClass, setOverrideClass] = useState<{ id: string; name: string } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [classesRes, attendanceRes, studentsRes, submissionsRes] = await Promise.all([
                api.get<any>(endpoints.academics.classes),
                api.get<any>(`${endpoints.attendance.students}?date=${selectedDate}`),
                api.get<{ results: User[] }>(`${endpoints.students.list}?page_size=1000`),
                api.get<any>(`${endpoints.attendance.submissions}?date=${selectedDate}`).catch(() => []),
            ]);

            setClasses(getList<SchoolClass>(classesRes));
            setAllAttendance(getList<StudentAttendance>(attendanceRes));
            setAllStudents(studentsRes.results || []);
            setSubmissions(getList<any>(submissionsRes));
        } catch (err: any) {
            setError(err.message || 'Failed to load school-wide attendance logs.');
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate aggregated metrics
    const totalStudentsMarked = allAttendance.length;
    const presentCount = allAttendance.filter(a => a.status === 'present').length;
    const lateCount = allAttendance.filter(a => a.status === 'late').length;
    const excusedCount = allAttendance.filter(a => a.status === 'excused').length;
    const absentCount = allAttendance.filter(a => a.status === 'absent').length;

    const overallRate = totalStudentsMarked > 0
        ? Math.round(((presentCount + lateCount + excusedCount) / totalStudentsMarked) * 100)
        : 0;

    // Check submission status for each class — use submission records from API
    const submissionOverview = classes.map(c => {
        const classRecords = allAttendance.filter(a => a.school_class === c.id || (a.school_class as any).id === c.id);
        // Check if class has a locked submission record
        const submission = submissions.find((s: any) => s.school_class === c.id);
        const submitted = submission ? submission.is_locked : classRecords.length > 0;
        const clsPresent = classRecords.filter(a => a.status === 'present').length;
        const clsLate = classRecords.filter(a => a.status === 'late').length;
        const clsAbsent = classRecords.filter(a => a.status === 'absent').length;
        const clsExcused = classRecords.filter(a => a.status === 'excused').length;

        return {
            ...c,
            submitted,
            submittedBy: (submission as any)?.submitted_by_name,
            metrics: {
                present: clsPresent,
                late: clsLate,
                absent: clsAbsent,
                excused: clsExcused,
                total: classRecords.length
            }
        };
    });

    const submittedClassesCount = submissionOverview.filter(c => c.submitted).length;
    const totalClassesCount = classes.length;

    // Daily Absentees List
    const dailyAbsentees = allAttendance
        .filter(a => a.status === 'absent')
        .map(a => {
            const studentId = typeof a.student === 'object' ? (a.student as any).id : a.student;
            const fullProfile = allStudents.find(s => s.id === studentId);
            return {
                id: a.id,
                studentId,
                name: (a as any).student_name || fullProfile?.full_name || 'Unknown Student',
                className: (a as any).class_name || 'Unknown Class',
                remarks: a.remarks,
                profile: fullProfile
            };
        });

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Session Info & Date Picker Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl border border-white/5 bg-[#0b1523]">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif tracking-wide">Attendance Monitoring Center</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-slate-500 text-xs">
                        <span className="text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded">Session: 2026/2027</span>
                        <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">Term: 3rd Term</span>
                        <span>· Live School-Wide Statistics</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setOverrideClass(null);
                        }}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500/50 cursor-pointer font-mono"
                    />
                    <button
                        onClick={loadData}
                        className="p-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:text-white transition-all"
                        title="Refresh Stats"
                    >
                        <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Aggregated Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Rate Card */}
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0b1523] to-[#070e1a] flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Attendance Rate</p>
                        <h2 className="text-3xl font-black text-emerald-400 mt-1">{overallRate}%</h2>
                        <p className="text-slate-600 text-[10px] mt-1">{totalStudentsMarked} total pupils marked today</p>
                    </div>
                    <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        RATE
                    </div>
                </div>

                {/* Presence headcount card */}
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0b1523] to-[#070e1a] flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Headcounts</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-xs font-semibold">
                            <span className="text-emerald-400">Present: {presentCount}</span>
                            <span className="text-amber-400">Late: {lateCount}</span>
                            <span className="text-red-400">Absent: {absentCount}</span>
                            <span className="text-sky-400">Excused: {excusedCount}</span>
                        </div>
                    </div>
                    <Users size={16} className="text-slate-500" />
                </div>

                {/* Submission progress */}
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0b1523] to-[#070e1a] flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Submission Rate</p>
                        <h2 className="text-3xl font-black text-sky-400 mt-1">
                            {submittedClassesCount}/{totalClassesCount}
                        </h2>
                        <p className="text-slate-600 text-[10px] mt-1">Classes updated for the day</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/15">
                        <CalendarCheck size={20} />
                    </div>
                </div>

                {/* Actionable highlight */}
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-[#0b1523] to-[#070e1a] flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Action Required</p>
                        <h2 className="text-3xl font-black text-amber-500 mt-1">
                            {totalClassesCount - submittedClassesCount}
                        </h2>
                        <p className="text-slate-600 text-[10px] mt-1">Classes pending attendance logs</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/15">
                        <AlertTriangle size={20} className={totalClassesCount - submittedClassesCount > 0 ? 'animate-bounce' : ''} />
                    </div>
                </div>
            </div>

            {/* Emergency Override Panel Triggered */}
            {overrideClass && (
                <EmergencyOverridePanel
                    classId={overrideClass.id}
                    className={overrideClass.name}
                    date={selectedDate}
                    onClose={() => setOverrideClass(null)}
                    onSaved={() => {
                        setOverrideClass(null);
                        loadData();
                    }}
                />
            )}

            {/* Submission Grid & Absentees Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left side: Grid of Classes Submission Status */}
                <div className="xl:col-span-2 space-y-4">
                    <div>
                        <h3 className="text-white font-bold text-sm">Classroom Submission Status</h3>
                        <p className="text-slate-500 text-xs mt-0.5">Click "Emergency Cover" or "Override" to manage class registers.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-32 bg-white/[0.04] border border-white/5 rounded-2xl animate-pulse" />
                            ))
                        ) : submissionOverview.length === 0 ? (
                            <div className="col-span-2 p-12 border border-white/5 bg-[#0b1523] rounded-2xl text-center text-slate-600">
                                <AlertTriangle size={28} className="mx-auto mb-2 opacity-35" />
                                <p className="text-xs">No active classes found inside academics database.</p>
                            </div>
                        ) : (
                            submissionOverview.map((cls) => (
                                <div
                                    key={cls.id}
                                    className={`p-4 border rounded-2xl transition-all duration-200 hover:border-white/10 bg-gradient-to-br from-[#0b1523] to-[#070e1a] relative ${
                                        cls.submitted ? 'border-emerald-500/10' : 'border-amber-500/10'
                                    }`}
                                >
                                    <div className="absolute top-4 right-4 flex items-center">
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                            cls.submitted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                                        }`}>
                                            <span className={`w-1 h-1 rounded-full ${cls.submitted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                            {cls.submitted ? 'Submitted' : 'Pending'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-black select-none ${
                                            cls.submitted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                                        }`}>
                                            {cls.name.slice(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-xs">{cls.name}</h4>
                                            <p className="text-slate-500 text-[10px] mt-0.5">
                                                {cls.submitted && (cls as any).submittedBy
                                                    ? `Submitted by ${(cls as any).submittedBy}`
                                                    : (cls as any).teacher_name || 'No Teacher Assigned'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Small breakdown of marks */}
                                    <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                                        {cls.submitted ? (
                                            <div className="flex gap-3 text-slate-500 font-semibold">
                                                <span className="text-emerald-400 font-bold">P: {cls.metrics.present}</span>
                                                <span className="text-amber-400 font-bold">L: {cls.metrics.late}</span>
                                                <span className="text-red-400 font-bold">A: {cls.metrics.absent}</span>
                                                <span className="text-sky-400 font-bold">E: {cls.metrics.excused}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 font-semibold italic">Waiting for teacher submission</span>
                                        )}

                                        <div className="flex items-center gap-2">
                                            {cls.submitted && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.post<any>(`${endpoints.attendance.students}reopen/`, {
                                                                school_class: cls.id,
                                                                date: selectedDate,
                                                            });
                                                            loadData();
                                                        } catch (err: any) {
                                                            alert(err.message || 'Failed to reopen attendance.');
                                                        }
                                                    }}
                                                    className="text-amber-400 hover:text-amber-300 font-bold transition-colors text-[10px]"
                                                >
                                                    Reopen
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setOverrideClass({ id: cls.id, name: cls.name })}
                                                className="text-sky-400 hover:text-sky-300 font-bold transition-colors text-[10px]"
                                            >
                                                {cls.submitted ? 'Override' : 'Emergency Cover'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right side: Daily / Chronic Absentees List */}
                <div className="xl:col-span-1 space-y-4">
                    <div>
                        <h3 className="text-white font-bold text-sm">Absentees Log</h3>
                        <p className="text-slate-500 text-xs mt-0.5">List of pupils absent on {new Date(selectedDate).toLocaleDateString()}</p>
                    </div>

                    <div className="border border-white/5 rounded-2xl bg-gradient-to-br from-[#0b1523] to-[#070e1a] p-4 flex flex-col gap-3 min-h-[300px]">
                        {loading ? (
                            <div className="space-y-3 flex-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : dailyAbsentees.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-12">
                                <CheckCircle size={28} className="text-emerald-500/20 mb-2" />
                                <p className="text-xs">No absentees reported for this date.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {dailyAbsentees.map((absentee) => {
                                    const initials = absentee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                    const parentName = (absentee.profile as any)?.student_profile?.parent_name;
                                    const parentPhone = absentee.profile?.phone;
                                    const parentEmail = absentee.profile?.email;

                                    return (
                                        <div key={absentee.id} className="p-3 bg-red-500/[0.02] border border-red-500/10 rounded-xl flex items-center justify-between gap-3 group hover:border-red-500/25 transition-all">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-400 text-[10px] font-black shrink-0">
                                                    {absentee.profile?.profile_photo_url ? (
                                                        <img src={absentee.profile.profile_photo_url} alt={absentee.name} className="w-full h-full object-cover" />
                                                    ) : initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white text-xs font-semibold truncate group-hover:text-red-400 transition-colors">{absentee.name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{absentee.className}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {parentPhone && (
                                                    <a href={`tel:${parentPhone}`} className="p-1.5 bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all" title={`Call parent: ${parentName || 'Unknown'}`}>
                                                        <Smartphone size={12} />
                                                    </a>
                                                )}
                                                {parentEmail && (
                                                    <a href={`mailto:${parentEmail}?subject=Absence Notification: ${absentee.name}`} className="p-1.5 bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all" title={`Email parent`}>
                                                        <Mail size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Control & Broadcaster */}
            <div className="pt-2 border-t border-white/5">
                <NotificationPanel />
            </div>
        </div>
    );
}
