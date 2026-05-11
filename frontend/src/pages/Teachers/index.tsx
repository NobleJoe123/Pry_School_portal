import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Search, RefreshCw, Pencil, UserX, ChevronLeft, ChevronRight, UserCheck, XCircle, CheckCircle, } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import TeacherForm from './TeacherForm';
import { api, endpoints } from '../../utils/api';
import type { User } from '../../types';



// Types

type EmploymentStatus = 'full_time' | 'part_time' | 'contract';

type TeacherUser = User & {
    teacher_profile?: {
        staff_id: string;
        employment_status: EmploymentStatus;
        specialization: string | null;
        subjects_taught: string | null;
        is_class_teacher: boolean;
        assigned_class: string | null;
        date_of_joining: string;
    };
};


// COnstants

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<EmploymentStatus, string> = {
    full_time: 'bg-emerald-500/15 text-emerald-400',
    part_time: 'bg-amber-500/15 text-amber-400',
    contract: 'bg-sky-500/15 text-sky-400',

};

const STATUS_LABELS: Record<EmploymentStatus, string> = {
    full_time: 'FULL TIME',
    part_time: 'PART TIME',
    contract: 'CONTRACT',
};

// Confirm Deactivate

function ConfirmDeactivate({ teacher, onConfirm, onCancel, loading, }: {
    teacher: TeacherUser; onConfirm: () => void;
    onCancel: () => void; loading: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <UserX size={20} className="text-red-400 shring-0" />
                <p className="text-red-300 text-sm"> This will deactivate{' '}
                    <span className="font-bold">{teacher.full_name}</span>'s account.
                    They will no longer be able to login.
                </p>
            </div>
            <div className="flex-1 py-2.5">
                <button onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 hover:bg-white/5 hover:text-white transition-all" >
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transaction-all disabled:opacity-50">
                    {loading ? 'Deactivating...' : 'Deactivate'}

                </button>
            </div>
        </div>
    );
}


// Teachers Page

export default function Teachers() {
    const [teachers, setTeachers] = useState<TeacherUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<TeacherUser | null>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<TeacherUser | null>(null);
    const [deactivating, setDeactivating] = useState(false);

    // Fetch

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                page: String(page), page_size: String(PAGE_SIZE),

            });
            if (search) params.set('search', search);
            if (statusFilter) params.set('employment_status', statusFilter);
            const data = await api.get<{ results: TeacherUser[]; count: number }>(
                `${endpoints.teachers.list}?${params}`
            );
            setTeachers(data.results);
            setTotal(data.count);

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load teachers.');

        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
    useEffect(() => { setPage(1); }, [search, statusFilter]);

    // Deactivate

    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        setDeactivating(true);

        try {
            await api.delete(endpoints.teachers.detail(deactivateTarget.id));
            setDeactivateTarget(null);
            fetchTeachers();

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to deactivate teacher.');
        } finally {
            setDeactivating(false);
        }

    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const skeletonRows = Array.from({ length: 6 });

    const getStatus = (t: TeacherUser): EmploymentStatus =>
        t.teacher_profile?.employment_status ?? 'full_time';
    const getStaffId = (t: TeacherUser) => t.teacher_profile?.staff_id ?? '_';
    const getSubjects = (t: TeacherUser) => t.teacher_profile?.subjects_taught ?? '_';
    const getClass = (t: TeacherUser) => t.teacher_profile?.assigned_class ?? '_';
    const isClassTeacher = (t: TeacherUser) => t.teacher_profile?.is_class_teacher ?? false;
    const getInitials = (t: TeacherUser) =>
        `${t.first_name?.[0] ?? ''}${t.last_name?.[0] ?? ''}`.toUpperCase();

    return (
        <div className="space-y-5 max-w-screen-xl">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">

                <div>
                    <h2 className="text-white text-2xl font-black font-serif"> Teachers </h2>
                    <p className="text-slate-500 text-sma mt-0.5">
                        {total > 0 ? `${total} teachers on staff` : 'No teachers yet'}
                    </p>

                </div>
                <button onClick={() => setAddOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.97]"
                >
                    <UserPlus size={16} />
                    Add Teacher
                </button>
            </div>

            {/* Error */}

            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <XCircle size={16} /> {error}
                </div>

            )}

            {/* Filters */}

            <div className="rounded-2xl border border-white/5 p-4 flex flex-wrap gap-3 bg-white/5">

                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute let-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name. email, staff ID..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 transition-all" />
                </div>

                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 transition-all min-w-[140px]"
                    title="Filter by Employment Status"
                >
                    <option value="" className="bg-[#0d1b2a]">All Statuses</option>
                    <option value="full_time" className="bg-[#0d1b2a]">Full Time</option>
                    <option value="part_time" className="bg-[#0d1b2a]">Part Time</option>
                    <option value="contract" className="bg-[#0d1b2a]">Contract</option>
                </select>

                <button onClick={fetchTeachers}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Refresh">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/5 overflow-hidden bg-gradient-to-br from-[#0d1b2a] to-[#0a1628]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Teacher', 'Staff ID', 'Subjects', 'Class', 'Status', 'Active', 'Actions'].map((h) => (
                                    <th key={h} className="text-left px-5 py py-3.5 text-slate-500 text-xs font-semibold uppercase tracking-wide whitspace-nowrap">
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
                            ) : teachers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <UserCheck size={36} className="text-slate-700 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm"> No teachers found.</p>
                                        <p className="text-slate-600 text-xs mt-1">
                                            {search || statusFilter
                                                ? 'Try adjusting your filters.'
                                                : 'Click "Add Teacher" to get started.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                teachers.map((t) => (
                                    <tr key={t.id}
                                        className="border-b border-white/[0.02] transition-colors">

                                        {/* Name & Profile */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-emerald-5000 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                    {getInitials(t)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-white text-xs font-semibold">{t.full_name}</p>
                                                        {isClassTeacher(t) && (
                                                            <span className="text [9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                                                                Class Teacher
                                                            </span>
                                                        )}

                                                    </div>
                                                    <p className="text-slate-500 text-[11px]">{t.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Staff ID */}
                                        <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{getStaffId(t)}</td>
                                        <td className="px-5 py-3.5 text-slate-400 text-xs max-w-[160px] truncate">{getSubjects(t)}</td>
                                        <td className="px-5 py-3.5 text-slate-400 text-xs">{getClass(t)}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-cener gap-1 text-[10px] font-semibold px-2 -y-1 rounded-full ${STATUS_COLORS[getStatus(t)]}`}>
                                                <span className="w-1 h-1 rounded-full  bg-current" />
                                                {STATUS_LABELS[getStatus(t)]}
                                            </span>
                                        </td>

                                        <td className="px-5 py-3.5">
                                            {t.is_active ? <CheckCircle size={15} className="text-emerald-500" />
                                                : <XCircle size={15} className="text-red-500" />}
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setEditTarget(t)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all" 
                                                    title="Edit teacher"
                                                    aria-label={`Edit ${t.full_name}`}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                {t.is_active && (
                                                    <button 
                                                        onClick={() => setDeactivateTarget(t)}
                                                        className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all" 
                                                        title="Deactivate teacher"
                                                        aria-label={`Deactivate ${t.full_name}`}
                                                    >
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
                            showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} teachers
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                                disabled={page === 1}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Previous Page"
                                aria-label="Go to previous page"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all
                    ${p === page
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                                    {p}
                                </button>
                            ))}
                            <button 
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next Page"
                                aria-label="Go to next page"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Modal ── */}
            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)}
                title="Add New Teacher" subtitle="Fill in the details to add a new staff member."
                size="lg">
                <TeacherForm
                    onSuccess={() => { setAddOpen(false); fetchTeachers(); }}
                    onCancel={() => setAddOpen(false)}
                />
            </Modal>

            {/* ── Edit Modal ── */}
            <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)}
                title="Edit Teacher" subtitle={editTarget?.full_name} size="lg">
                {editTarget && (
                    <TeacherForm
                        teacherId={editTarget.id}
                        onSuccess={() => { setEditTarget(null); fetchTeachers(); }}
                        onCancel={() => setEditTarget(null)}
                    />
                )}
            </Modal>

            {/* ── Deactivate Modal ── */}
            <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)}
                title="Deactivate Teacher" size="sm">
                {deactivateTarget && (
                    <ConfirmDeactivate
                        teacher={deactivateTarget}
                        onConfirm={handleDeactivate}
                        onCancel={() => setDeactivateTarget(null)}
                        loading={deactivating}
                    />
                )}
            </Modal>
        </div>
    );
}