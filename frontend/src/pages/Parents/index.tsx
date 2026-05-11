import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Users, XCircle, CheckCircle, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { api, endpoints } from '../../utils/api';
import type { User } from '../../types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ParentUser = User & {
  parent_profile?: {
    relationship_to_student: string;
    occupation:              string | null;
    employer:                string | null;
    office_phone:            string | null;
    alternate_phone:         string | null;
  };
  children?: {
    id:         string;
    full_name:  string;
    email:      string;
    is_active:  boolean;
    student_profile?: {
      admission_number: string;
      current_class:    string | null;
      status:           string;
    };
  }[];
};

const PAGE_SIZE = 10;

const RELATIONSHIP_COLORS: Record<string, string> = {
  father:   'bg-sky-500/15 text-sky-400',
  mother:   'bg-violet-500/15 text-violet-400',
  guardian: 'bg-amber-500/15 text-amber-400',
  other:    'bg-slate-500/15 text-slate-400',
};

// ─── PARENT DETAIL MODAL ──────────────────────────────────────────────────────

function ParentDetail({ parent }: { parent: ParentUser }) {
  const profile  = parent.parent_profile;
  const children = parent.children ?? [];

  return (
    <div className="space-y-5">
      {/* Contact info */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Email',       value: parent.email       },
          { label: 'Phone',       value: parent.phone       },
          { label: 'Relationship',value: profile?.relationship_to_student },
          { label: 'Occupation',  value: profile?.occupation },
          { label: 'Employer',    value: profile?.employer   },
          { label: 'Office Phone',value: profile?.office_phone },
          { label: 'Alt Phone',   value: profile?.alternate_phone },
          { label: 'Address',     value: parent.address     },
        ].map(({ label, value }) => (
          <div key={label} className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold mb-1">
              {label}
            </p>
            <p className="text-white text-xs">{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* Children */}
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Children ({children.length})
        </p>
        {children.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-4">No children linked yet.</p>
        ) : (
          <div className="space-y-2">
            {children.map((child) => (
              <div key={child.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl
                           bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400
                                  to-emerald-500 flex items-center justify-center
                                  text-white text-[10px] font-bold shrink-0">
                    {child.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{child.full_name}</p>
                    <p className="text-slate-500 text-[11px]">
                      {child.student_profile?.current_class ?? 'No class'} ·{' '}
                      {child.student_profile?.admission_number ?? '—'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize
                  ${child.is_active
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'}`}>
                  {child.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PARENTS PAGE ─────────────────────────────────────────────────────────────

export default function Parents() {
  const [parents,      setParents]      = useState<ParentUser[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [viewTarget,   setViewTarget]   = useState<ParentUser | null>(null);
  const [expandedRow,  setExpandedRow]  = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchParents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page), page_size: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);

      const data = await api.get<{ results: ParentUser[]; count: number }>(
        `${endpoints.parents.list}?${params}`
      );
      setParents(data.results);
      setTotal(data.count);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load parents.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchParents(); }, [fetchParents]);
  useEffect(() => { setPage(1); }, [search]);

  const totalPages   = Math.ceil(total / PAGE_SIZE);
  const skeletonRows = Array.from({ length: 6 });

  const getRelationship = (p: ParentUser) =>
    p.parent_profile?.relationship_to_student ?? 'guardian';
  const getChildCount   = (p: ParentUser) => p.children?.length ?? 0;
  const getInitials     = (p: ParentUser) =>
    `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-5 max-w-screen-xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-white text-2xl font-black font-serif">
            Parents
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {total > 0 ? `${total} parents registered` : 'No parents yet'}
          </p>
        </div>
        {/* Parents self-register — no Add button needed */}
        <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs">
          Parents register via the portal
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
                        text-red-400 text-sm flex items-center gap-2">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="rounded-2xl border border-white/5 p-4 flex flex-wrap gap-3 bg-gradient-to-br from-[#0d1b2a] to-[#0a1628]">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                       text-white text-sm placeholder-slate-600 focus:outline-none
                       focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 transition-all" />
        </div>
        <button 
          onClick={fetchParents}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title="Refresh List"
          aria-label="Refresh parent list"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/5 overflow-hidden bg-gradient-to-br from-[#0d1b2a] to-[#0a1628]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Parent', 'Phone', 'Relationship', 'Children', 'Active', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-slate-500 text-xs
                                         font-semibold uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                skeletonRows.map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {[1,2,3,4,5,6,7].map((j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-white/5 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users size={36} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No parents found.</p>
                    <p className="text-slate-600 text-xs mt-1">
                      {search ? 'Try adjusting your search.' : 'Parents appear here after registering.'}
                    </p>
                  </td>
                </tr>
              ) : (
                parents.map((p) => (
                  <tr key={p.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">

                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400
                                        to-sky-500 flex items-center justify-center
                                        text-white text-[10px] font-bold shrink-0">
                          {getInitials(p)}
                        </div>
                        <div>
                          <p className="text-white text-xs font-semibold">{p.full_name}</p>
                          <p className="text-slate-500 text-[11px]">{p.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {p.phone ?? '—'}
                    </td>

                    {/* Relationship */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                                        px-2 py-1 rounded-full capitalize
                                        ${RELATIONSHIP_COLORS[getRelationship(p)] ?? RELATIONSHIP_COLORS.other}`}>
                        {getRelationship(p)}
                      </span>
                    </td>

                    {/* Children count */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400
                                         text-[10px] font-bold flex items-center justify-center">
                          {getChildCount(p)}
                        </span>
                        {getChildCount(p) === 1 ? 'child' : 'children'}
                      </span>
                    </td>

                    {/* Active */}
                    <td className="px-5 py-3.5">
                      {p.is_active
                        ? <CheckCircle size={15} className="text-emerald-500" />
                        : <XCircle    size={15} className="text-red-500/60" />}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(p.date_joined).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <button onClick={() => setViewTarget(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400
                                   hover:bg-sky-500/10 transition-all" title="View details">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
            <p className="text-slate-500 text-xs">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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

      {/* ── Parent Detail Modal ── */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)}
        title={viewTarget?.full_name ?? 'Parent Details'}
        subtitle={viewTarget?.email}
        size="lg">
        {viewTarget && <ParentDetail parent={viewTarget} />}
      </Modal>
    </div>
  );
}