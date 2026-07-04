import { useEffect, useMemo, useState } from 'react';
import {
    BookOpen, CheckCircle, Clock, Eye, FileDown, FileText,
    HelpCircle, Layers, RefreshCw, RotateCcw, Search, Shield,
    Trash2, User, XCircle
} from 'lucide-react';
import FilterDropdown from '../../components/ui/FilterDropdown';
import { api, endpoints } from '../../utils/api';
import type { ClassLevel, SchoolClass } from '../../types';

interface Material {
    id: string;
    teacher_name?: string;
    school_class: string;
    class_name: string;
    subject: string;
    subject_name: string;
    week: string;
    topic: string;
    objectives: string;
    activities?: string | null;
    evaluation?: string | null;
    file_url?: string | null;
    file_size?: string | null;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    created_at: string;
}

const STATUS_OPTIONS = [
    { id: '', label: 'All Statuses' },
    { id: 'submitted', label: 'Pending Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'draft', label: 'Drafts' },
];

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

const statusStyle = (status: Material['status']) => {
    switch (status) {
        case 'approved':
            return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle size={11} />, label: 'Approved' };
        case 'submitted':
            return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', icon: <Clock size={11} />, label: 'Pending' };
        case 'rejected':
            return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: <XCircle size={11} />, label: 'Rejected' };
        default:
            return { bg: 'bg-white/5 border-white/10', text: 'text-slate-400', icon: <FileText size={11} />, label: 'Draft' };
    }
};

function PreviewModal({ item, onClose, onApprove, onReject }: {
    item: Material;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
}) {
    const style = statusStyle(item.status);
    const fileName = item.file_url?.split('/').pop();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${style.bg} ${style.text}`}>
                                {style.icon} {style.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <h2 className="text-white font-black text-xl leading-tight">{item.topic}</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                            <BookOpen size={11} /> {item.subject_name}
                            <span className="text-slate-700">-</span>
                            <Layers size={11} /> {item.class_name}
                            <span className="text-slate-700">-</span>
                            {item.week}
                        </div>
                        {item.teacher_name && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <User size={11} /> {item.teacher_name}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0 mt-1">
                        <XCircle size={20} />
                    </button>
                </div>

                <div className="space-y-5">
                    {[
                        ['Learning Objectives', item.objectives],
                        ['Activities', item.activities || 'No activities provided.'],
                        ['Evaluation Method', item.evaluation || 'No evaluation method provided.'],
                    ].map(([label, value]) => (
                        <div key={label} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{value}</p>
                        </div>
                    ))}

                    {item.file_url && (
                        <div className="p-3.5 bg-slate-950/80 border border-white/5 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-amber-500 shrink-0" />
                                <p className="text-xs text-slate-300 truncate font-mono">{fileName}</p>
                            </div>
                            <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl transition-all"
                            >
                                <FileDown size={11} /> Download
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-7 pt-5 border-t border-white/5">
                    {item.status !== 'rejected' && (
                        <button onClick={onReject} className="flex-1 py-3 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all">
                            <XCircle size={14} className="inline mr-1.5" />
                            {item.status === 'approved' ? 'Revoke Approval' : 'Reject'}
                        </button>
                    )}
                    {item.status !== 'approved' && (
                        <button onClick={onApprove} className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20">
                            <CheckCircle size={14} className="inline mr-1.5" />
                            Approve Material
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminMaterials() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [levels, setLevels] = useState<ClassLevel[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [preview, setPreview] = useState<Material | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [materialsRes, levelsRes, classesRes] = await Promise.all([
                api.get<any>(endpoints.academics.materials),
                api.get<any>(endpoints.academics.levels),
                api.get<any>(endpoints.academics.classes),
            ]);
            setMaterials(getList<Material>(materialsRes));
            setLevels(getList<ClassLevel>(levelsRes));
            setClasses(getList<SchoolClass>(classesRes));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const classLevelMap = useMemo(() => {
        const map: Record<string, string> = {};
        classes.forEach((cls) => { map[cls.id] = cls.level; });
        return map;
    }, [classes]);

    const classOptions = useMemo(() => {
        const filteredClasses = levelFilter ? classes.filter((cls) => cls.level === levelFilter) : classes;
        return [{ id: '', label: 'All Classes' }, ...filteredClasses.map((cls) => ({ id: cls.id, label: cls.name }))];
    }, [classes, levelFilter]);

    const updateStatus = async (id: string, nextStatus: Material['status']) => {
        const updated = await api.patch<Material>(endpoints.academics.materialSetStatus(id), { status: nextStatus });
        setMaterials((current) => current.map((item) => item.id === id ? updated : item));
        setPreview((current) => current?.id === id ? updated : current);
    };

    const deleteMaterial = async (id: string) => {
        if (!window.confirm('Delete this material permanently?')) return;
        await api.delete(endpoints.academics.materialDetail(id));
        setMaterials((current) => current.filter((item) => item.id !== id));
        if (preview?.id === id) setPreview(null);
    };

    const filtered = materials.filter((item) => {
        const q = search.toLowerCase();
        const matchesSearch =
            item.topic.toLowerCase().includes(q) ||
            item.subject_name.toLowerCase().includes(q) ||
            item.class_name.toLowerCase().includes(q) ||
            (item.teacher_name || '').toLowerCase().includes(q);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesLevel = !levelFilter || classLevelMap[item.school_class] === levelFilter;
        const matchesClass = !classFilter || item.school_class === classFilter;
        return matchesSearch && matchesStatus && matchesLevel && matchesClass;
    });

    const totals = {
        total: materials.length,
        pending: materials.filter((item) => item.status === 'submitted').length,
        approved: materials.filter((item) => item.status === 'approved').length,
        rejected: materials.filter((item) => item.status === 'rejected').length,
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Materials Review</h1>
                    <p className="text-slate-500 text-sm">Review and approve lesson notes submitted by teachers.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all" title="Refresh">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Shield size={14} className="text-amber-400" />
                        <span className="text-amber-400 text-xs font-bold">Admin Review Portal</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: totals.total, color: 'text-slate-300', bg: 'bg-white/5 border-white/5' },
                    { label: 'Pending', value: totals.pending, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15' },
                    { label: 'Approved', value: totals.approved, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
                    { label: 'Rejected', value: totals.rejected, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15' },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${stat.bg}`}>
                        <div className="flex-1">
                            <p className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-3xl flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by topic, subject, class or teacher..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500/40 transition-all"
                    />
                </div>
                <FilterDropdown value={levelFilter} options={[{ id: '', label: 'All Levels' }, ...levels.map((level) => ({ id: level.id, label: level.name }))]} onChange={(value) => { setLevelFilter(value); setClassFilter(''); }} placeholder="All Levels" colorTheme="amber" />
                <FilterDropdown value={classFilter} options={classOptions} onChange={setClassFilter} placeholder="All Classes" colorTheme="amber" />
                <FilterDropdown value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} placeholder="All Statuses" colorTheme="amber" />
                <button
                    onClick={() => { setSearch(''); setStatusFilter(''); setLevelFilter(''); setClassFilter(''); }}
                    className="ml-auto p-2.5 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    title="Clear filters"
                >
                    <RotateCcw size={15} />
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((item) => <div key={item} className="h-64 bg-white/5 rounded-3xl animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((item) => {
                        const style = statusStyle(item.status);
                        const fileName = item.file_url?.split('/').pop();
                        return (
                            <div key={item.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex flex-col justify-between hover:border-white/10 transition-all group">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${style.bg} ${style.text}`}>
                                            {style.icon} {style.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                            <BookOpen size={10} />{item.subject_name}
                                            <span className="text-slate-700">-</span>
                                            <Layers size={10} />{item.class_name}
                                            <span className="text-slate-700">-</span>
                                            {item.week}
                                        </div>
                                        <h3 className="text-white text-sm font-bold mt-1 leading-tight">{item.topic}</h3>
                                        {item.teacher_name && (
                                            <p className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-1">
                                                <User size={9} /> {item.teacher_name}
                                            </p>
                                        )}
                                    </div>

                                    <p className="text-xs text-slate-400 line-clamp-2">
                                        <span className="font-semibold text-slate-300">Obj: </span>{item.objectives}
                                    </p>

                                    {item.file_url && (
                                        <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={13} className="text-amber-500 shrink-0" />
                                                <p className="text-[10px] text-slate-300 truncate font-mono">{fileName}</p>
                                            </div>
                                            <span className="text-[9px] text-slate-500 shrink-0 font-mono pl-2">{item.file_size || '-'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-5">
                                    <button onClick={() => setPreview(item)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all">
                                        <Eye size={12} /> Preview
                                    </button>
                                    {item.status !== 'rejected' && (
                                        <button onClick={() => updateStatus(item.id, 'rejected')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all">
                                            <XCircle size={12} /> {item.status === 'approved' ? 'Revoke' : 'Reject'}
                                        </button>
                                    )}
                                    {item.status !== 'approved' && (
                                        <button onClick={() => updateStatus(item.id, 'approved')} className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/20">
                                            <CheckCircle size={12} /> Approve
                                        </button>
                                    )}
                                    <button onClick={() => deleteMaterial(item.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete material permanently">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="col-span-full py-24 text-center">
                            <HelpCircle size={40} className="mx-auto text-slate-700 mb-3" />
                            <p className="text-slate-500 text-sm">No materials match your filters.</p>
                        </div>
                    )}
                </div>
            )}

            {preview && (
                <PreviewModal
                    item={preview}
                    onClose={() => setPreview(null)}
                    onApprove={() => updateStatus(preview.id, 'approved')}
                    onReject={() => updateStatus(preview.id, 'rejected')}
                />
            )}
        </div>
    );
}
