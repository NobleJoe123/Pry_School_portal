import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Search, RefreshCw, Pencil, UserX, ChevronLeft, ChevronRight, GraduationCap, CheckCircle, XCircle, } from 'lucide-react';
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

    //Filters

    const [search, setSearch] = useState('');
    const [statusFilter, setStatus] = useState('');
    const [classFilter, setClass] = useState('');
    const [page, setPage] = useState(1);

    // Modals

    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<StudentUser | null>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<StudentUser | null>(null);
    const [deactivating, setDeactivating] = useState(false);

    // Fetch
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(PAGE_SIZE),

            });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (classFilter) params.set('class', classFilter);

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
    }, [search, statusFilter, classFilter, page]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    // Debounce search 

    useEffect(() => {
        setPage(1);

    }, [search, statusFilter, classFilter]);

    // Deactivate

    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        setDeactivating(true);
        try {
            await api.delete(endpoints.students.detail(deactivateTarget.id));
            setDeactivateTarget(null);
            fetchStudents();

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to deactivate student.');

        } finally {
            setDeactivating(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const skeletonRows = Array.from({ length: PAGE_SIZE });

    // Helps

    const getStatus = (s: StudentUser): StudentStatus =>
        s.student_profile?.status ?? 'active';

    const getClass = (s: StudentUser): string =>
        s.student_profile?.current_class ?? '-';

    const getAdmissionNo = (s: StudentUser): string =>
        s.student_profile?.admission_number ?? '-';

    const getInitials = (s: StudentUser): string =>
        `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase();

    return (
        <div className="space-y-5 max-w-screen-xl">
            {/* Page Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-white text-2xl font-black font-serif"> Students </h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {total > 0 ? `${total} students registered` : 'No students yet'}
                    </p>
                </div>
                <button onClick={() => setAddOpen(true)}
                    className="flex items-center gap-2 px-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25"
                >
                    <UserPlus size={16} />
                    Add Student
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border text-red-400 text-sm flex items-center gap-2">
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* Filters Bar */}

            <div className="rounded-2xl border border-white/5 p-4 flex flex-wrap gap-3 bg-gradient-to-br from-[#0d1b2a] to-[#0a1628]">

                {/* Search */}

                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, admission no..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-amber-500/30 focus:border-amber-500/40 transition-all" />

                </div>

                {/* Status filter */}

                <select
                    value={statusFilter} 
                    onChange={(e) => setStatus(e.target.value)}
                    aria-label="Filter by status"
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all min-w-[130px]"
                >
                    <option value="" className="bg-[#0d1b2a]"> All Statuses</option>
                    <option value="active" className="bg-[#0d1b2a]"> Active </option>
                    <option value="graduated" className="bg-[#0d1b2a]"> Graduated </option>
                    <option value="transferred" className="bg-[#0d1b2a]"> Transferred </option>
                    <option value="suspended" className="bg-[#0d1b2a]"> Suspended </option>  
                </select>

                <select 
                    value={classFilter}
                    onChange={(e) => setClass(e.target.value)}
                    aria-label="Filter by class"
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all min-w-[130px]"
                >
                    <option value="" className="bg-[#0d1b2a]"> All Classes</option>
                    {CLASS_OPTIONS.map((c) => (
                        <option key={c} value={c} className="bg-[#0d1b2a]">{c}</option>
                    ))}
                </select>

                {/* Refresh */}

                <button
                    onClick={fetchStudents}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Refresh">

                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />

                </button>



            </div>

            {/* Table */}

            <div
                className="rounded-2xl border border-white/5 overflow-hidden bg-gradient-to-br from-[#0d1b2a] to-[#0a1628]"
            >

                <div className="overflow-x-auto">

                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Student', 'Admission No.', 'Class', 'Status', 'Active', 'Joined', 'Actions'].map((h) => (
                                    <th key={h}
                                        className="text-left px-5 py-3.5 text-slate-500 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
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
                                        <GraduationCap size={36} className="text-slate-700 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">No Students found</p>
                                        <p className="text-slate-600 text-xs mt-1">
                                            {search || statusFilter || classFilter ? 'Try adjusting your filters.' : 'Click "Add Student" to get started.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                students.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">

                                        {/* Profile */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
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

                                        {/* Actions */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">

                                                <button
                                                    onClick={() => setEditTarget(s)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                                                    title="Edit student">

                                                    <Pencil size={14} />

                                                </button>

                                                {s.is_active && (
                                                    <button
                                                        onClick={() => setDeactivateTarget(s)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="Deactivate student">

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
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                <ChevronLeft size={15} aria-hidden="true" />

                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p == 1 || p == totalPages || Math.abs(p - page) <= 1)
                                .map((p, idx, arr) => (
                                    <>
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span key={`ellipsis-${p}`} className="text-slate-600 text-xs px-1">...</span>
                                        )}
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                                            {p}
                                        </button>
                                    </>
                                ))
                            }
                            <button 
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                aria-label="Next Page"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                <ChevronRight size={15} aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                )}

            </div>

            <Modal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                title="Add New Student"
                subtitle="Fill in the details to register a new student."
                size="lg">

                <StudentForm
                    onSuccess={() => { setAddOpen(false); fetchStudents(); }}
                    onCancel={() => setAddOpen(false)}
                />
            </Modal>

            {/* Edit Student Modal */}
            <Modal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Edit Student"
                subtitle={editTarget?.full_name}
                size="lg">

                {editTarget && (
                    <StudentForm
                        studentId={editTarget.id}
                        onSuccess={() => { setEditTarget(null); fetchStudents(); }}
                        onCancel={() => setEditTarget(null)} />
                )}

            </Modal>

            {/* Deactivate Confirm Modal */}

            <Modal
                isOpen={!!deactivateTarget}
                onClose={() => setDeactivateTarget(null)}
                title="Deactivate Student"
                size="sm">

                {deactivateTarget && (
                    <ConfirmDeactivate
                        student={deactivateTarget}
                        onConfirm={handleDeactivate}
                        onCancel={() => setDeactivateTarget(null)}
                        loading={deactivating} />

                )}

            </Modal>

        </div>
    )
}