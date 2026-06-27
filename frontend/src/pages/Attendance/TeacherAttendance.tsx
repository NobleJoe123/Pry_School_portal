import { useState, useEffect, useCallback } from 'react';
import {
    CalendarCheck, CheckCircle, XCircle, Clock, Search,
    Save, RotateCcw, AlertCircle, Users, Lock, Send,
    ChevronDown, ChevronUp, Info, UserCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'present', label: 'Present', icon: <CheckCircle size={14} />, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
    { value: 'absent', label: 'Absent', icon: <XCircle size={14} />, color: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25' },
    { value: 'late', label: 'Late', icon: <Clock size={14} />, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25' },
    { value: 'excused', label: 'Excused', icon: <AlertCircle size={14} />, color: 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25' },
];

const STATUS_ACTIVE: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-500 text-white border-emerald-400',
    absent: 'bg-red-500 text-white border-red-400',
    late: 'bg-amber-500 text-white border-amber-400',
    excused: 'bg-sky-500 text-white border-sky-400',
};

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

type StudentRecord = {
    student: User;
    status: AttendanceStatus | null;
    remarks: string;
};

export default function TeacherAttendance() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [assignedClasses, setAssignedClasses] = useState<SchoolClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [records, setRecords] = useState<StudentRecord[]>([]);
    const [currentTermId, setCurrentTermId] = useState<string>('');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all');
    const [expandedRemarks, setExpandedRemarks] = useState<string | null>(null);

    const today = new Date().toLocaleDateString('en-NG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const todayISO = new Date().toISOString().split('T')[0];

    // Load assigned classes
    useEffect(() => {
        async function loadClasses() {
            try {
                const [classRes, termsRes] = await Promise.all([
                    api.get<any>(endpoints.academics.classes),
                    api.get<any>(endpoints.academics.terms),
                ]);
                const classList = getList<SchoolClass>(classRes);
                const myClasses = classList.filter(
                    (c: any) => c.teacher === user?.id || c.teacher_name === user?.full_name
                );
                setAssignedClasses(myClasses);
                if (myClasses.length > 0) setSelectedClassId(myClasses[0].id);

                // Resolve the active term
                const termList = getList<any>(termsRes);
                const activeTerm = termList.find((t: any) => t.is_current) || termList[0];
                if (activeTerm) setCurrentTermId(activeTerm.id);
            } catch (err) {
                console.error('Failed to load classes:', err);
            } finally {
                setLoading(false);
            }
        }
        loadClasses();
    }, [user]);

    // Load students & existing attendance for selected class
    const loadClassData = useCallback(async (classId: string) => {
        if (!classId) return;
        setLoading(true);
        setSubmitted(false);
        setError('');

        try {
            const [studentsRes, attRes, submissionRes] = await Promise.all([
                api.get<any>(`${endpoints.students.list}?school_class=${classId}`),
                api.get<any>(`${endpoints.attendance.students}?school_class=${classId}&date=${todayISO}`).catch(() => []),
                api.get<any>(`${endpoints.attendance.students}submission_status/?school_class=${classId}&date=${todayISO}`).catch(() => ({ submitted: false, is_locked: false })),
            ]);

            const students = getList<User>(studentsRes);
            const existingAtt = getList<any>(attRes);

            // Check locked state from submission status endpoint
            const isLocked = submissionRes?.is_locked === true;
            setSubmitted(isLocked);

            const studentRecords: StudentRecord[] = students.map((student) => {
                const existing = existingAtt.find(
                    (a: any) => a.student === student.id || a.student_id === student.id
                );
                return {
                    student,
                    status: existing?.status || null,
                    remarks: existing?.remarks || '',
                };
            });

            setRecords(studentRecords);
        } catch (err: any) {
            setError(err.message || 'Failed to load class data');
        } finally {
            setLoading(false);
        }
    }, [todayISO]);

    useEffect(() => {
        if (selectedClassId) loadClassData(selectedClassId);
    }, [selectedClassId, loadClassData]);

    const setStatus = (studentId: string, status: AttendanceStatus) => {
        if (submitted) return;
        setRecords(prev =>
            prev.map(r => r.student.id === studentId ? { ...r, status } : r)
        );
    };

    const setRemarks = (studentId: string, remarks: string) => {
        if (submitted) return;
        setRecords(prev =>
            prev.map(r => r.student.id === studentId ? { ...r, remarks } : r)
        );
    };

    const markAll = (status: AttendanceStatus) => {
        if (submitted) return;
        setRecords(prev => prev.map(r => ({ ...r, status })));
    };

    const resetAll = () => {
        if (submitted) return;
        setRecords(prev => prev.map(r => ({ ...r, status: null, remarks: '' })));
    };

    const submitAttendance = async () => {
        const unmarked = records.filter(r => !r.status);
        if (unmarked.length > 0) {
            setError(`Please mark attendance for all ${unmarked.length} remaining pupil(s) before submitting.`);
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Submit using the bulk_mark endpoint
            const payload = records.map(r => ({
                student_id: r.student.id,
                status: r.status,
                remarks: r.remarks,
            }));

            await api.post<any>(`${endpoints.attendance.students}bulk_mark/`, {
                records: payload,
                school_class: selectedClassId,
                date: todayISO,
                term: currentTermId,
            });

            setSubmitted(true);
            setSuccess('Attendance submitted successfully! It has been sent to Administration.');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit attendance. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const filteredRecords = records.filter(r => {
        const nameMatch = `${r.student.first_name} ${r.student.last_name}`
            .toLowerCase().includes(search.toLowerCase());
        const statusMatch = filterStatus === 'all' || r.status === filterStatus;
        return nameMatch && statusMatch;
    });

    const markedCount = records.filter(r => r.status).length;
    const totalCount = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    const selectedClass = assignedClasses.find(c => c.id === selectedClassId);

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div>
                <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Mark Attendance
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">{today}</p>
            </div>

            {/* Class Selector (if multiple) */}
            {assignedClasses.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {assignedClasses.map(cls => (
                        <button
                            key={cls.id}
                            onClick={() => setSelectedClassId(cls.id)}
                            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${selectedClassId === cls.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                                }`}
                        >
                            {cls.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Status Banner */}
            {submitted && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <Lock size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-emerald-400 font-bold text-sm">Attendance Submitted & Locked</p>
                        <p className="text-slate-400 text-xs mt-0.5">
                            Today's attendance for <strong className="text-white">{selectedClass?.name}</strong> has been submitted.
                            Contact the Administrator to reopen it if changes are needed.
                        </p>
                    </div>
                </div>
            )}

            {success && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-emerald-400 text-sm font-medium">{success}</p>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                    <button onClick={() => setError('')} className="text-slate-500 hover:text-white">✕</button>
                </div>
            )}

            {/* Progress Summary */}
            {!loading && totalCount > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Pupils', count: totalCount, color: 'text-white', bg: 'bg-white/5 border-white/10' },
                        { label: 'Marked', count: markedCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Present', count: presentCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Absent', count: absentCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    ].map(({ label, count, color, bg }) => (
                        <div key={label} className={`rounded-2xl border p-4 text-center ${bg}`}
                            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                            <p className={`text-2xl font-black ${color}`}>{count}</p>
                            <p className="text-slate-400 text-xs mt-1">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Progress Bar */}
            {!loading && totalCount > 0 && (
                <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>Marking Progress</span>
                        <span className="text-white font-bold">{markedCount}/{totalCount} marked</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: totalCount > 0 ? `${(markedCount / totalCount) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="rounded-2xl border border-white/5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2 flex-1">
                        <Users size={16} className="text-amber-400 shrink-0" />
                        <span className="text-white font-bold text-sm">
                            {selectedClass?.name || 'My Class'} — Pupil Roster
                        </span>
                    </div>

                    {/* Bulk Actions */}
                    {!submitted && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-slate-500 self-center">Mark all as:</span>
                            {STATUS_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => markAll(opt.value)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${opt.color}`}>
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            ))}
                            <button onClick={resetAll}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 font-semibold">
                                <RotateCcw size={12} />
                                Reset
                            </button>
                        </div>
                    )}
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 px-5 py-3 border-b border-white/5 bg-white/2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search pupil by name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                        />
                    </div>
                    <FilterDropdown
                            value={filterStatus}
                            options={[
                                { id: 'all', label: 'All Pupils' },
                                { id: 'present', label: 'Present Only' },
                                { id: 'absent', label: 'Absent Only' },
                                { id: 'late', label: 'Late Only' },
                                { id: 'excused', label: 'Excused Only' },
                            ]}
                            onChange={v => setFilterStatus(v as any)}
                            placeholder="All Pupils"
                        />
                </div>

                {/* Student List */}
                <div className="divide-y divide-white/5">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-32 bg-white/5 rounded" />
                                    <div className="h-2.5 w-20 bg-white/5 rounded" />
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(n => (
                                        <div key={n} className="h-8 w-20 bg-white/5 rounded-lg" />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : filteredRecords.length === 0 ? (
                        <div className="py-16 text-center">
                            <Users size={40} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">
                                {records.length === 0
                                    ? 'No pupils found in this class. Ask the Administrator to assign pupils.'
                                    : 'No results match your filter.'}
                            </p>
                        </div>
                    ) : (
                        filteredRecords.map((record, idx) => {
                            const { student, status, remarks } = record;
                            const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;
                            const photoUrl = student.profile_photo_url || (student as any).profile_photo;
                            const isExpanded = expandedRemarks === student.id;

                            return (
                                <div key={student.id}
                                    className={`px-5 py-4 transition-all ${status === 'absent' ? 'bg-red-500/3' : ''}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        {/* Avatar + Info */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xs">
                                                    {photoUrl ? (
                                                        <img src={photoUrl} alt={student.full_name} className="w-full h-full object-cover" />
                                                    ) : initials || <UserCircle size={18} />}
                                                </div>
                                                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                    {idx + 1}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white text-sm font-semibold truncate">{student.full_name}</p>
                                                <p className="text-slate-500 text-xs">
                                                    {(student as any).admission_number || student.username}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status Buttons */}
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {STATUS_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setStatus(student.id, opt.value)}
                                                    disabled={submitted}
                                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${status === opt.value
                                                            ? STATUS_ACTIVE[opt.value]
                                                            : `${opt.color} ${submitted ? 'opacity-50 cursor-not-allowed' : ''}`
                                                        }`}
                                                >
                                                    {opt.icon}
                                                    <span className="hidden sm:inline">{opt.label}</span>
                                                </button>
                                            ))}

                                            {/* Remarks toggle */}
                                            <button
                                                onClick={() => setExpandedRemarks(isExpanded ? null : student.id)}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${remarks
                                                        ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                                                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                                                    } ${submitted ? 'cursor-default' : ''}`}
                                            >
                                                <Info size={12} />
                                                <span className="hidden sm:inline">Note</span>
                                                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remarks Textarea */}
                                    {isExpanded && (
                                        <div className="mt-3 ml-0 sm:ml-[52px]">
                                            <textarea
                                                value={remarks}
                                                onChange={e => setRemarks(student.id, e.target.value)}
                                                disabled={submitted}
                                                placeholder="Add a remark about this pupil's attendance..."
                                                rows={2}
                                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Submit Footer */}
                {!loading && records.length > 0 && (
                    <div className="px-5 py-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Info size={12} />
                            {submitted
                                ? 'Attendance locked. Contact Admin to reopen.'
                                : `${totalCount - markedCount} pupil(s) not yet marked`}
                        </div>
                        <div className="flex gap-3">
                            {!submitted && (
                                <>
                                    <button
                                        onClick={resetAll}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all"
                                    >
                                        <RotateCcw size={14} />
                                        Reset
                                    </button>
                                    <button
                                        onClick={submitAttendance}
                                        disabled={saving || markedCount !== totalCount}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 disabled:cursor-not-allowed text-sm font-bold transition-all"
                                    >
                                        {saving ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={14} />
                                                Submit Attendance
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                            {submitted && (
                                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">
                                    <Lock size={14} />
                                    Attendance Locked
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Info box for teachers */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10">
                <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-1">
                    <p><strong className="text-sky-400">Attendance Guidelines:</strong></p>
                    <p>• Mark every pupil before submitting. Once submitted, attendance is locked.</p>
                    <p>• For corrections after submission, contact the Administrator to reopen.</p>
                    <p>• Add remarks for absent or late pupils to help the admin review.</p>
                    <p>• Submissions are automatically visible to the Administration dashboard.</p>
                </div>
            </div>
        </div>
    );
}
