import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Search, RefreshCw, Pencil, UserX, ChevronLeft, ChevronRight, GraduationCap, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StudentForm from './StudentForm';
import { api, endpoints } from '../../utils/api';
import type { User, StudentStatus } from '../../types';



// Constants 

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<StudentStatus, string> = {
    active: 'bg-emerald-500/15 text-emerald-400',
    graduated: 'bg-sky-500/15 text-sky-400',
    transferred: 'bg-amber-500/15 text-amber-400',
    suspended: 'bg-red-500/15 text-red-400',
};

const CLASS_OPTIONS = [
    'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
    'Primary 1', 'Primary 2', 'Primary 3',
    'Primary 4', 'Primary 5', 'Primary 6',
];


type StudentUser = User & {
    student_profile?: {
        admission_number: string;
        current_class: string | null;
        status: StudentStatus;
        gender: string;
    };
};


// Deactivate dialog

interface ConfirmModalProps {
    student: StudentUser;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}


function ConfirmDeactivate({ student, onConfirm, onCancel, loading }: ConfirmModalProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 borde bprder-red-500/20">
                <UserX size={20} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">
                    This will deactivate {' '}
                    <span className="font-bold">{student.full_name}</span>'s account.
                    They will no longer be able to login.
                </p>
            </div>
            <div className="flex gap-3">
                <button onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border-white/10 hover:bg-white/5 hover:text-white transition-all">
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-all disabled:opacity-50">
                    {loading ? 'Deactivating...' : 'Deactivate'}
                </button>

            </div>
        </div>


    );
}



// Students Page

export default function Students() {
    const [students, setStudents] = useState<StudentUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch classes and stats
    const [classes, setClasses] = useState<any[]>([]);
    const [classCounts, setClassCounts] = useState<Record<string, number>>({});
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    //Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatus] = useState('');
    const [page, setPage] = useState(1);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<StudentUser | null>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<StudentUser | null>(null);
    const [deactivating, setDeactivating] = useState(false);

    // Fetch classes and class-level stats
    const fetchClassesAndStats = useCallback(async () => {
        try {
            const [classesRaw, statsData] = await Promise.all([
                api.get<any>(endpoints.academics.classes),
                api.get<any>(endpoints.students.stats)
            ]);
            // Handle both plain array and paginated { results, count } responses
            const classesData = Array.isArray(classesRaw)
                ? classesRaw
                : (classesRaw?.results ?? []);
            setClasses(classesData);
            
            const counts: Record<string, number> = {};
            if (statsData && statsData.by_class) {
                statsData.by_class.forEach((item: any) => {
                    const name = item.student_profile__current_class__name;
                    if (name) counts[name] = item.count;
                });
            }
            setClassCounts(counts);
        } catch (err: unknown) {
            console.error("Failed to load classes or stats", err);
        }
    }, []);

    // Fetch students list
    const fetchStudents = useCallback(async () => {
        if (!selectedClass) return;
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(PAGE_SIZE),
            });
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

    useEffect(() => {
        fetchClassesAndStats();
    }, [fetchClassesAndStats]);

    useEffect(() => {
        if (selectedClass) {
            fetchStudents();
        }
    }, [selectedClass, fetchStudents]);

    // Reset pagination when search or status filters change
    useEffect(() => {
        setPage(1);
    }, [search, statusFilter]);

    // Deactivate
    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        setDeactivating(true);
        try {
            await api.delete(endpoints.students.detail(deactivateTarget.id));
            setDeactivateTarget(null);
            fetchStudents();
            fetchClassesAndStats(); // Refresh counts
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to deactivate student.');
        } finally {
            setDeactivating(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const skeletonRows = Array.from({ length: PAGE_SIZE });

    // Helper formatting functions
    const getStatus = (s: StudentUser): StudentStatus =>
        s.student_profile?.status ?? 'active';

    const getClass = (s: StudentUser): string =>
        s.student_profile?.current_class ?? '-';

    const getAdmissionNo = (s: StudentUser): string =>
        s.student_profile?.admission_number ?? '-';

    const getInitials = (s: StudentUser): string =>
        `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase();

    const classesList = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

    // Find class details helper
    const getClassDetails = (clsName: string) => {
        const classObj = classes.find(c => c.name.toLowerCase().trim() === clsName.toLowerCase().trim());
        const teacherTitle = classObj?.teacher_title ? `${classObj.teacher_title}. ` : '';
        const teacherName = classObj?.teacher_name ? `${teacherTitle}${classObj.teacher_name}` : 'No teacher assigned';
        const count = classCounts[clsName] ?? 0;
        return { teacherName, count };
    };

    return (
        <div className="space-y-5 max-w-screen-xl">
            {/* 1. Classes Grid Overview */}
            {!selectedClass ? (
                <>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-white text-2xl font-black font-serif"> Academic Classes </h2>
                            <p className="text-slate-500 text-sm mt-0.5"> Select a class card to view students and teacher details. </p>
                        </div>
                        <button onClick={() => setAddOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.97]"
                        >
                            <UserPlus size={16} />
                            Add Student
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                        {classesList.map((clsName) => {
                            const { teacherName, count } = getClassDetails(clsName);
                            return (
                                <div
                                    key={clsName}
                                    onClick={() => setSelectedClass(clsName)}
                                    className="rounded-2xl p-6 border border-white/5 hover:border-sky-500/20 cursor-pointer flex flex-col justify-between gap-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/5 group"
                                    style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center transition-all group-hover:bg-sky-500/20 group-hover:text-sky-300">
                                            <GraduationCap size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-full">
                                            {count} {count === 1 ? 'Student' : 'Students'}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg leading-snug group-hover:text-sky-300 transition-colors">
                                            {clsName}
                                        </h3>
                                        <p className="text-slate-500 text-xs mt-1.5">
                                            Class Teacher: <span className="text-slate-300 font-semibold">{teacherName}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                /* 2. Detailed Class List View */
                <>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => { setSelectedClass(null); setSearch(''); }}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                title="Back to Classes"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <div>
                                <h2 className="text-white text-2xl font-black font-serif"> {selectedClass} </h2>
                                <p className="text-slate-500 text-sm mt-0.5">
                                    Class Teacher: <span className="text-sky-400 font-semibold">{getClassDetails(selectedClass).teacherName}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setAddOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.97]"
                            >
                                <UserPlus size={16} />
                                Add Student
                            </button>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="rounded-2xl border border-white/5 p-4 flex flex-wrap gap-3 bg-gradient-to-br from-[#0b1523] to-[#070e1a]">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search students in this class..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-sky-500/30 focus:border-sky-500/40 transition-all"
                            />
                        </div>

                        {/* Status filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatus(e.target.value)}
                            aria-label="Filter by status"
                            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all min-w-[130px]"
                        >
                            <option value="" className="bg-[#0b1523]">All Statuses</option>
                            <option value="active" className="bg-[#0b1523]">Active</option>
                            <option value="graduated" className="bg-[#0b1523]">Graduated</option>
                            <option value="transferred" className="bg-[#0b1523]">Transferred</option>
                            <option value="suspended" className="bg-[#0b1523]">Suspended</option>
                        </select>

                        {/* Refresh */}
                        <button
                            onClick={fetchStudents}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            title="Refresh"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Error */}
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
                                        {['Student', 'Admission No.', 'Class', 'Status', 'Active', 'Joined', 'Actions'].map((h) => (
                                            <th key={h} className="text-left px-5 py-3.5 text-slate-500 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        skeletonRows.map((_, i) => (
                                            <tr key={i} className="border-b border-white/[0.04]">
                                                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                                                    <td key={j} className="px-5 py-4">
                                                        <div className="h-3 bg-white/5 rounded animate-pulse w-24" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : students.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <GraduationCap size={36} className="text-sky-500/10 mx-auto mb-3" />
                                                <p className="text-slate-500 text-sm">No Students found in {selectedClass}</p>
                                                <p className="text-slate-600 text-xs mt-1">
                                                    {search || statusFilter ? 'Try adjusting your filters.' : 'Click "Add Student" to register a student to this class.'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((s) => (
                                            <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                {/* Profile */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                            {getInitials(s)}
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-xs font-semibold">{s.full_name}</p>
                                                            <p className="text-slate-500 text-[11px]">{s.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Admission No */}
                                                <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">
                                                    {getAdmissionNo(s)}
                                                </td>

                                                {/* class */}
                                                <td className="px-5 py-3.5 text-slate-400 text-xs">
                                                    {getClass(s)}
                                                </td>

                                                {/* Status badge */}
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[getStatus(s)]}`}>
                                                        <span className="w-1 h-1 rounded-full bg-current" />
                                                        {getStatus(s)}
                                                    </span>
                                                </td>

                                                {/* is active */}
                                                <td className="px-5 py-3.5">
                                                    {s.is_active
                                                        ? <CheckCircle size={15} className="text-emerald-500" />
                                                        : <XCircle size={15} className="text-red-500/60" />}
                                                </td>

                                                {/* Joined */}
                                                <td className="px-5 py-3.5 text-slate-400 text-xs">
                                                    {s.date_joined ? new Date(s.date_joined).toLocaleDateString() : '-'}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setEditTarget(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all" title="Edit student">
                                                            <Pencil size={14} />
                                                        </button>
                                                        {s.is_active && (
                                                            <button onClick={() => setDeactivateTarget(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Deactivate student">
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
                                <p className="text-slate-500 text-xs">
                                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        aria-label="Previous Page"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={15} aria-hidden="true" />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => p == 1 || p == totalPages || Math.abs(p - page) <= 1)
                                        .map((p, idx, arr) => (
                                            <div key={p} className="inline-flex items-center">
                                                {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                    <span className="text-slate-600 text-xs px-1">...</span>
                                                )}
                                                <button
                                                    onClick={() => setPage(p)}
                                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                                >
                                                    {p}
                                                </button>
                                            </div>
                                        ))
                                    }
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        aria-label="Next Page"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={15} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add Student Modal */}
            <Modal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                title="Add New Student"
                subtitle="Fill in the details to register a new student."
                size="lg"
            >
                <StudentForm
                    defaultClass={selectedClass || undefined}
                    onSuccess={() => { setAddOpen(false); if (selectedClass) { fetchStudents(); } fetchClassesAndStats(); }}
                    onCancel={() => setAddOpen(false)}
                />
            </Modal>

            {/* Edit Student Modal */}
            <Modal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Edit Student"
                subtitle={editTarget?.full_name}
                size="lg"
            >
                {editTarget && (
                    <StudentForm
                        studentId={editTarget.id}
                        onSuccess={() => { setEditTarget(null); if (selectedClass) { fetchStudents(); } fetchClassesAndStats(); }}
                        onCancel={() => setEditTarget(null)}
                    />
                )}
            </Modal>

            {/* Deactivate Confirm Modal */}
            <Modal
                isOpen={!!deactivateTarget}
                onClose={() => setDeactivateTarget(null)}
                title="Deactivate Student"
                size="sm"
            >
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