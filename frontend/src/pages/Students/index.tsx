import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Search, RefreshCw, Pencil, UserX, ChevronLeft, ChevronRight, GraduationCap, CheckCircle, XCircle, X, Phone, Mail, MapPin, Calendar, Droplets, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StudentForm from './StudentForm';
import { api, endpoints } from '../../utils/api';
import type { User, StudentStatus } from '../../types';

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<StudentStatus, string> = {
    active: 'bg-emerald-500/15 text-emerald-400',
    graduated: 'bg-sky-500/15 text-sky-400',
    transferred: 'bg-amber-500/15 text-amber-400',
    suspended: 'bg-red-500/15 text-red-400',
};

const STATUS_DOT: Record<StudentStatus, string> = {
    active: 'bg-emerald-400',
    graduated: 'bg-sky-400',
    transferred: 'bg-amber-400',
    suspended: 'bg-red-400',
};

const classesList = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

type StudentUser = User & {
    student_profile?: {
        admission_number: string;
        current_class: string | null;
        status: StudentStatus;
        gender: string;
        blood_group?: string | null;
        state_of_origin?: string | null;
        place_of_birth?: string | null;
        emergency_contact_name?: string | null;
        emergency_contact_phone?: string | null;
        emergency_contact_relationship?: string | null;
        medical_conditions?: string | null;
        parent_name?: string | null;
    };
    profile_photo_url?: string | null;
};

interface ConfirmModalProps {
    student: StudentUser;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

function ConfirmDeactivate({ student, onConfirm, onCancel, loading }: ConfirmModalProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <UserX size={20} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">
                    This will deactivate{' '}
                    <span className="font-bold">{student.full_name}</span>'s account.
                    They will no longer be able to login.
                </p>
            </div>
            <div className="flex gap-3">
                <button onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 hover:bg-white/5 hover:text-white transition-all">
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-all disabled:opacity-50">
                    {loading ? 'Deactivating...' : 'Deactivate'}
                </button>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5 py-1">
            <span className="text-slate-500 mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-white text-xs font-medium mt-0.5 break-words">{value}</p>
            </div>
        </div>
    );
}

function PupilDetailDrawer({ student, onClose, onEdit, onDeactivate }: {
    student: StudentUser;
    onClose: () => void;
    onEdit: () => void;
    onDeactivate: () => void;
}) {
    const p = student.student_profile;
    const status: StudentStatus = p?.status ?? 'active';
    const initials = `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-sm h-full overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200"
                style={{ background: 'linear-gradient(180deg, #0d1b2a 0%, #070e1a 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <p className="text-white text-sm font-bold">Pupil Details</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex flex-col items-center pt-8 pb-6 px-5 border-b border-white/5">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-xl ring-2 ring-sky-500/30">
                        {student.profile_photo_url ? (
                            <img src={student.profile_photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-2xl font-black">
                                {initials}
                            </div>
                        )}
                    </div>
                    <h2 className="text-white text-lg font-black text-center">{student.full_name}</h2>
                    <p className="text-slate-500 text-xs mt-1 font-mono">{p?.admission_number ?? '—'}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_COLORS[status]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                            {status}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold">
                            {p?.current_class ?? 'Unassigned'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 px-5 py-4 space-y-1">
                    <InfoRow icon={<Mail size={13} />} label="Email" value={student.email ?? '—'} />
                    <InfoRow icon={<Phone size={13} />} label="Phone" value={(student as any).phone ?? '—'} />
                    <InfoRow icon={<Calendar size={13} />} label="Date of Birth" value={(student as any).date_of_birth ?? '—'} />
                    <InfoRow icon={<MapPin size={13} />} label="Address" value={(student as any).address ?? '—'} />
                    <InfoRow icon={<GraduationCap size={13} />} label="Gender" value={p?.gender === 'M' ? 'Male' : p?.gender === 'F' ? 'Female' : '—'} />
                    <InfoRow icon={<Droplets size={13} />} label="Blood Group" value={p?.blood_group ?? '—'} />
                    <InfoRow icon={<MapPin size={13} />} label="State of Origin" value={p?.state_of_origin ?? '—'} />

                    {p?.parent_name && (
                        <div className="pt-3 mt-2 border-t border-white/5">
                            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-2">Parent / Guardian</p>
                            <InfoRow icon={<GraduationCap size={13} />} label="Name" value={p.parent_name} />
                        </div>
                    )}

                    {p?.emergency_contact_name && (
                        <div className="pt-3 mt-2 border-t border-white/5">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Emergency Contact</p>
                            <InfoRow icon={<Phone size={13} />} label="Name" value={p.emergency_contact_name} />
                            <InfoRow icon={<Phone size={13} />} label="Phone" value={p.emergency_contact_phone ?? '—'} />
                            <InfoRow icon={<GraduationCap size={13} />} label="Relationship" value={p.emergency_contact_relationship ?? '—'} />
                        </div>
                    )}

                    {p?.medical_conditions && (
                        <div className="pt-3 mt-2 border-t border-white/5">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Medical Notes</p>
                            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2.5">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                <span>{p.medical_conditions}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-white/5 flex gap-3 shrink-0">
                    <button onClick={onEdit}
                        className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-all">
                        Edit Pupil
                    </button>
                    {student.is_active && (
                        <button onClick={onDeactivate}
                            className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-all border border-red-500/20">
                            Deactivate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Students() {
    const [students, setStudents] = useState<StudentUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [classes, setClasses] = useState<any[]>([]);
    const [classCounts, setClassCounts] = useState<Record<string, number>>({});
    const [selectedClass, setSelectedClass] = useState<string>('Primary 1');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatus] = useState('');
    const [page, setPage] = useState(1);

    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<StudentUser | null>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<StudentUser | null>(null);
    const [deactivating, setDeactivating] = useState(false);
    const [detailStudent, setDetailStudent] = useState<StudentUser | null>(null);

    const fetchClassesAndStats = useCallback(async () => {
        try {
            const [classesRaw, statsData] = await Promise.all([
                api.get<any>(endpoints.academics.classes),
                api.get<any>(endpoints.students.stats)
            ]);
            const classesData = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.results ?? []);
            setClasses(classesData);
            const counts: Record<string, number> = {};
            if (statsData?.by_class) {
                statsData.by_class.forEach((item: any) => {
                    const name = item.student_profile__current_class__name;
                    if (name) counts[name] = item.count;
                });
            }
            setClassCounts(counts);
        } catch (err: unknown) {
            console.error('Failed to load classes or stats', err);
        }
    }, []);

    const fetchStudents = useCallback(async () => {
        if (!selectedClass) return;
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            params.set('class', selectedClass);
            const data = await api.get<{ results: StudentUser[]; count: number }>(
                `${endpoints.students.list}?${params}`
            );
            setStudents(data.results);
            setTotal(data.count);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load students.');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, selectedClass, page]);

    useEffect(() => { fetchClassesAndStats(); }, [fetchClassesAndStats]);
    useEffect(() => { if (selectedClass) fetchStudents(); }, [selectedClass, fetchStudents]);
    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        setDeactivating(true);
        try {
            await api.delete(endpoints.students.detail(deactivateTarget.id));
            setDeactivateTarget(null);
            setDetailStudent(null);
            fetchStudents();
            fetchClassesAndStats();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to deactivate student.');
        } finally {
            setDeactivating(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const getStatus = (s: StudentUser): StudentStatus => s.student_profile?.status ?? 'active';
    const getClass = (s: StudentUser): string => s.student_profile?.current_class ?? '-';
    const getAdmissionNo = (s: StudentUser): string => s.student_profile?.admission_number ?? '-';
    const getInitials = (s: StudentUser): string =>
        `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase();

    const getClassDetails = (clsName: string) => {
        const classObj = classes.find(c => c.name?.toLowerCase().trim() === clsName.toLowerCase().trim());
        const teacherTitle = classObj?.teacher_title ? `${classObj.teacher_title}. ` : '';
        const teacherName = classObj?.teacher_name ? `${teacherTitle}${classObj.teacher_name}` : 'No teacher';
        const count = classCounts[clsName] ?? 0;
        return { teacherName, count };
    };

    return (
        <div className="space-y-5 max-w-screen-xl">
            {detailStudent && (
                <PupilDetailDrawer
                    student={detailStudent}
                    onClose={() => setDetailStudent(null)}
                    onEdit={() => { setEditTarget(detailStudent); setDetailStudent(null); }}
                    onDeactivate={() => { setDeactivateTarget(detailStudent); setDetailStudent(null); }}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-white text-2xl font-black font-serif">Academic Classes</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Select a class to view pupils and teacher details.</p>
                </div>
                <button onClick={() => setAddOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.97]">
                    <UserPlus size={16} />
                    Add Pupil
                </button>
            </div>

            {/* Class Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
                {classesList.map((clsName) => {
                    const { teacherName, count } = getClassDetails(clsName);
                    const isActive = selectedClass === clsName;
                    return (
                        <div key={clsName} onClick={() => setSelectedClass(clsName)}
                            className={`rounded-2xl p-4 border cursor-pointer flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group ${
                                isActive
                                    ? 'border-sky-500 bg-gradient-to-br from-sky-950/40 to-blue-900/40 shadow-md shadow-sky-500/10'
                                    : 'border-white/5 hover:border-sky-500/20 bg-[#0b1523]'
                            }`}>
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 group-hover:text-sky-300'}`}>
                                    <GraduationCap size={20} />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isActive ? 'text-sky-300 bg-sky-500/20' : 'text-sky-400 bg-sky-500/10'}`}>
                                    {count} {count === 1 ? 'Pupil' : 'Pupils'}
                                </span>
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm leading-snug ${isActive ? 'text-sky-300' : 'text-white group-hover:text-sky-300'}`}>{clsName}</h3>
                                <p className="text-slate-500 text-[10px] mt-1 truncate">
                                    <span className="text-slate-300 font-semibold">{teacherName}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="h-px bg-white/5 my-2" />

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-white text-lg font-bold">Pupils in {selectedClass}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Class Teacher: <span className="text-sky-400 font-semibold">{getClassDetails(selectedClass).teacherName}</span>
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-white/5 p-4 flex flex-wrap gap-3 bg-gradient-to-br from-[#0b1523] to-[#070e1a]">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Search pupils in ${selectedClass}...`}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 transition-all" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm focus:outline-none transition-all min-w-[130px]">
                    <option value="" className="bg-[#0b1523]">All Statuses</option>
                    <option value="active" className="bg-[#0b1523]">Active</option>
                    <option value="graduated" className="bg-[#0b1523]">Graduated</option>
                    <option value="transferred" className="bg-[#0b1523]">Transferred</option>
                    <option value="suspended" className="bg-[#0b1523]">Suspended</option>
                </select>
                <button onClick={fetchStudents} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-white/5 overflow-hidden bg-gradient-to-br from-[#0b1523] to-[#070e1a]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Pupil', 'Admission No.', 'Class', 'Status', 'Active', 'Joined', 'Actions'].map((h) => (
                                    <th key={h} className="text-left px-5 py-3.5 text-slate-500 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                                    <tr key={i} className="border-b border-white/[0.04]">
                                        {[1,2,3,4,5,6,7].map((j) => (
                                            <td key={j} className="px-5 py-4"><div className="h-3 bg-white/5 rounded animate-pulse w-24" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <GraduationCap size={36} className="text-sky-500/10 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">No Pupils found in {selectedClass}</p>
                                        <p className="text-slate-600 text-xs mt-1">
                                            {search || statusFilter ? 'Try adjusting your filters.' : 'Click "Add Pupil" to register a pupil to this class.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                students.map((s) => (
                                    <tr key={s.id} onClick={() => setDetailStudent(s)}
                                        className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10">
                                                    {s.profile_photo_url ? (
                                                        <img src={s.profile_photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-black">
                                                            {getInitials(s)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white text-xs font-semibold group-hover:text-sky-300 transition-colors">{s.full_name}</p>
                                                    <p className="text-slate-500 text-[11px]">{s.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{getAdmissionNo(s)}</td>
                                        <td className="px-5 py-3.5 text-slate-400 text-xs">{getClass(s)}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[getStatus(s)]}`}>
                                                <span className={`w-1 h-1 rounded-full ${STATUS_DOT[getStatus(s)]}`} />
                                                {getStatus(s)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {s.is_active ? <CheckCircle size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-red-500/60" />}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-400 text-xs">
                                            {s.date_joined ? new Date(s.date_joined).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setEditTarget(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all" title="Edit pupil">
                                                    <Pencil size={14} />
                                                </button>
                                                {s.is_active && (
                                                    <button onClick={() => setDeactivateTarget(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Deactivate pupil">
                                                        <UserX size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
                        <p className="text-slate-500 text-xs">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30">
                                <ChevronLeft size={15} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, idx, arr) => (
                                    <div key={p} className="inline-flex items-center">
                                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-600 text-xs px-1">...</span>}
                                        <button onClick={() => setPage(p)}
                                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                                            {p}
                                        </button>
                                    </div>
                                ))
                            }
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add New Pupil" subtitle="Fill in the details to register a new pupil." size="lg">
                <StudentForm
                    defaultClass={selectedClass || undefined}
                    onSuccess={() => { setAddOpen(false); fetchStudents(); fetchClassesAndStats(); }}
                    onCancel={() => setAddOpen(false)}
                />
            </Modal>

            <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Pupil" subtitle={editTarget?.full_name} size="lg">
                {editTarget && (
                    <StudentForm
                        studentId={editTarget.id}
                        onSuccess={() => { setEditTarget(null); fetchStudents(); fetchClassesAndStats(); }}
                        onCancel={() => setEditTarget(null)}
                    />
                )}
            </Modal>

            <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Deactivate Pupil" size="sm">
                {deactivateTarget && (
                    <ConfirmDeactivate
                        student={deactivateTarget}
                        onConfirm={handleDeactivate}
                        onCancel={() => setDeactivateTarget(null)}
                        loading={deactivating}
                    />
                )}
            </Modal>
        </div>
    );
}