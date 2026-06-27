import { useState, useEffect } from 'react';
import {
    FileText, CheckCircle, Clock, XCircle, BookOpen,
    Layers, User, Eye, FileDown, Search, RotateCcw, HelpCircle, Shield
} from 'lucide-react';
import FilterDropdown from '../../components/ui/FilterDropdown';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Material {
    id: string;
    subject: string;
    subjectName: string;
    classId: string;
    className: string;
    week: string;
    topic: string;
    objectives: string;
    fileName: string;
    fileSize?: string;
    activities: string;
    evaluation: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    created_at: string;
    teacher?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { id: '', label: 'All Statuses' },
    { id: 'submitted', label: 'Pending Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'draft', label: 'Drafts' },
];

const statusStyle = (status: Material['status']) => {
    switch (status) {
        case 'approved':
            return {
                bg: 'bg-emerald-500/10 border-emerald-500/20',
                text: 'text-emerald-400',
                icon: <CheckCircle size={11} />,
                label: 'Approved',
            };
        case 'submitted':
            return {
                bg: 'bg-amber-500/10 border-amber-500/20',
                text: 'text-amber-400',
                icon: <Clock size={11} />,
                label: 'Pending',
            };
        case 'rejected':
            return {
                bg: 'bg-red-500/10 border-red-500/20',
                text: 'text-red-400',
                icon: <XCircle size={11} />,
                label: 'Rejected',
            };
        default:
            return {
                bg: 'bg-white/5 border-white/10',
                text: 'text-slate-400',
                icon: <FileText size={11} />,
                label: 'Draft',
            };
    }
};

// ─── Mock data seeded from localStorage (shared with teacher page) ─────────────

const seedMockData = (): Material[] => [
    {
        id: 'm1', subject: 'Mathematics', subjectName: 'Mathematics',
        classId: 'c1', className: 'Primary 1A', week: 'Week 1',
        topic: 'Introduction to Numbers 1–50',
        objectives: 'Pupils should identify, write and order numbers from 1 to 50.',
        fileName: 'math_numbers_lesson_note.docx', fileSize: '45 KB',
        activities: '1. Count aloud as a group.\n2. Write numbers in blocks.\n3. Number puzzle game.',
        evaluation: 'Ask pupils to write numbers as dictated.',
        status: 'submitted', created_at: new Date(Date.now() - 86400000 * 5).toLocaleDateString(),
        teacher: 'Mr. James Okafor',
    },
    {
        id: 'm2', subject: 'Basic Science', subjectName: 'Basic Science',
        classId: 'c1', className: 'Primary 1A', week: 'Week 2',
        topic: 'Living and Non-Living Things',
        objectives: 'Pupils learn to distinguish animate from inanimate objects.',
        fileName: 'science_living_things.pdf', fileSize: '1.2 MB',
        activities: 'Show charts. Ask children to identify which items grow.',
        evaluation: 'Identify 3 living and 3 non-living things in the yard.',
        status: 'approved', created_at: new Date(Date.now() - 86400000 * 3).toLocaleDateString(),
        teacher: 'Mrs. Adaeze Nweke',
    },
    {
        id: 'm3', subject: 'English Language', subjectName: 'English Language',
        classId: 'c2', className: 'Primary 2B', week: 'Week 3',
        topic: 'Parts of Speech: Nouns and Verbs',
        objectives: 'Pupils should be able to identify nouns and verbs in simple sentences.',
        fileName: 'english_parts_of_speech.pptx', fileSize: '3.5 MB',
        activities: '1. Read a short story.\n2. Underline all nouns.\n3. Circle all verbs.',
        evaluation: 'Write five sentences using one noun and one verb each.',
        status: 'submitted', created_at: new Date(Date.now() - 86400000).toLocaleDateString(),
        teacher: 'Miss Chioma Eze',
    },
    {
        id: 'm4', subject: 'Social Studies', subjectName: 'Social Studies',
        classId: 'c3', className: 'Primary 3A', week: 'Week 1',
        topic: 'Our Family and Community',
        objectives: 'Pupils understand family roles and community helpers.',
        fileName: 'social_community.docx', fileSize: '220 KB',
        activities: 'Draw your family. Identify roles of each member.',
        evaluation: 'Class discussion on community helpers.',
        status: 'draft', created_at: new Date().toLocaleDateString(),
        teacher: 'Mr. Emmanuel Bello',
    },
];

// ─── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose, onApprove, onReject }: {
    item: Material;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
}) {
    const style = statusStyle(item.status);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${style.bg} ${style.text}`}>
                                {style.icon} {style.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{item.created_at}</span>
                        </div>
                        <h2 className="text-white font-black text-xl leading-tight">{item.topic}</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                            <BookOpen size={11} /> {item.subject}
                            <span className="text-slate-700">•</span>
                            <Layers size={11} /> {item.className}
                            <span className="text-slate-700">•</span>
                            {item.week}
                        </div>
                        {item.teacher && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <User size={11} /> {item.teacher}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0 mt-1">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Content sections */}
                <div className="space-y-5">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Learning Objectives</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{item.objectives}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Activities</p>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{item.activities}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evaluation Method</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{item.evaluation}</p>
                    </div>

                    {item.fileName && (
                        <div className="p-3.5 bg-slate-950/80 border border-white/5 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-amber-500 shrink-0" />
                                <p className="text-xs text-slate-300 truncate font-mono">{item.fileName}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pl-3">
                                <span className="text-[9px] text-slate-500 font-mono">{item.fileSize || '–'}</span>
                                <button
                                    onClick={() => alert(`Downloading: ${item.fileName}`)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl transition-all"
                                >
                                    <FileDown size={11} /> Download
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                {item.status === 'submitted' && (
                    <div className="flex gap-3 mt-7 pt-5 border-t border-white/5">
                        <button
                            onClick={onReject}
                            className="flex-1 py-3 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all"
                        >
                            <XCircle size={14} className="inline mr-1.5" />
                            Reject
                        </button>
                        <button
                            onClick={onApprove}
                            className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCircle size={14} className="inline mr-1.5" />
                            Approve Material
                        </button>
                    </div>
                )}
                {item.status === 'approved' && (
                    <div className="flex gap-3 mt-7 pt-5 border-t border-white/5">
                        <button
                            onClick={onReject}
                            className="flex-1 py-3 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all"
                        >
                            <XCircle size={14} className="inline mr-1.5" />
                            Revoke Approval
                        </button>
                    </div>
                )}
                {item.status === 'rejected' && (
                    <div className="flex gap-3 mt-7 pt-5 border-t border-white/5">
                        <button
                            onClick={onApprove}
                            className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all"
                        >
                            <CheckCircle size={14} className="inline mr-1.5" />
                            Approve Instead
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMaterials() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [preview, setPreview] = useState<Material | null>(null);

    // Load from localStorage (shared with teacher UploadMaterials page)
    useEffect(() => {
        const stored = localStorage.getItem('teacher_materials');
        const base = stored ? JSON.parse(stored) : seedMockData();
        // Merge with mock data that has teacher names if missing
        const merged = seedMockData().map(seed => {
            const fromStorage = base.find((b: Material) => b.id === seed.id);
            return fromStorage ? { ...seed, ...fromStorage, teacher: fromStorage.teacher || seed.teacher } : seed;
        });
        // Also include any new items from localStorage not in seed
        const extra = base.filter((b: Material) => !merged.find(m => m.id === b.id));
        setMaterials([...merged, ...extra]);
    }, []);

    const persist = (updated: Material[]) => {
        setMaterials(updated);
        localStorage.setItem('teacher_materials', JSON.stringify(updated));
    };

    const approve = (id: string) => {
        const updated = materials.map(m => m.id === id ? { ...m, status: 'approved' as const } : m);
        persist(updated);
        if (preview?.id === id) setPreview({ ...preview, status: 'approved' });
    };

    const reject = (id: string) => {
        const updated = materials.map(m => m.id === id ? { ...m, status: 'rejected' as const } : m);
        persist(updated);
        if (preview?.id === id) setPreview({ ...preview, status: 'rejected' });
    };

    const filtered = materials.filter(m => {
        const matchSearch =
            m.topic.toLowerCase().includes(search.toLowerCase()) ||
            m.subject.toLowerCase().includes(search.toLowerCase()) ||
            m.className.toLowerCase().includes(search.toLowerCase()) ||
            (m.teacher || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || m.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Stats
    const total = materials.length;
    const pending = materials.filter(m => m.status === 'submitted').length;
    const approved = materials.filter(m => m.status === 'approved').length;
    const rejected = materials.filter(m => m.status === 'rejected').length;

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Materials Review</h1>
                    <p className="text-slate-500 text-sm">Review and approve lesson notes submitted by teachers.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Shield size={14} className="text-amber-400" />
                    <span className="text-amber-400 text-xs font-bold">Admin Review Portal</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: total, color: 'text-slate-300', bg: 'bg-white/5 border-white/5' },
                    { label: 'Pending', value: pending, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15' },
                    { label: 'Approved', value: approved, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
                    { label: 'Rejected', value: rejected, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${s.bg}`}>
                        <div className="flex-1">
                            <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-3xl flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by topic, subject, class or teacher…"
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500/40 transition-all"
                    />
                </div>
                <FilterDropdown
                    value={statusFilter}
                    options={STATUS_OPTIONS}
                    onChange={setStatusFilter}
                    placeholder="All Statuses"
                />
                <button
                    onClick={() => { setSearch(''); setStatusFilter(''); }}
                    className="ml-auto p-2.5 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    title="Clear filters"
                >
                    <RotateCcw size={15} />
                </button>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(item => {
                    const style = statusStyle(item.status);
                    return (
                        <div
                            key={item.id}
                            className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex flex-col justify-between hover:border-white/10 transition-all group"
                        >
                            <div className="space-y-4">
                                {/* Status + Date */}
                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold capitalize ${style.bg} ${style.text}`}>
                                        {style.icon} {style.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">{item.created_at}</span>
                                </div>

                                {/* Meta */}
                                <div>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                        <BookOpen size={10} />{item.subject}
                                        <span className="text-slate-700">•</span>
                                        <Layers size={10} />{item.className}
                                        <span className="text-slate-700">•</span>
                                        {item.week}
                                    </div>
                                    <h3 className="text-white text-sm font-bold mt-1 leading-tight">{item.topic}</h3>
                                    {item.teacher && (
                                        <p className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-1">
                                            <User size={9} /> {item.teacher}
                                        </p>
                                    )}
                                </div>

                                <p className="text-xs text-slate-400 line-clamp-2">
                                    <span className="font-semibold text-slate-300">Obj: </span>{item.objectives}
                                </p>

                                {/* File */}
                                {item.fileName && (
                                    <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText size={13} className="text-amber-500 shrink-0" />
                                            <p className="text-[10px] text-slate-300 truncate font-mono">{item.fileName}</p>
                                        </div>
                                        <span className="text-[9px] text-slate-500 shrink-0 font-mono pl-2">{item.fileSize || '–'}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-5">
                                {/* Preview */}
                                <button
                                    onClick={() => setPreview(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
                                >
                                    <Eye size={12} /> Preview
                                </button>

                                {item.status === 'submitted' && (
                                    <>
                                        <button
                                            onClick={() => reject(item.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                                        >
                                            <XCircle size={12} /> Reject
                                        </button>
                                        <button
                                            onClick={() => approve(item.id)}
                                            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <CheckCircle size={12} /> Approve
                                        </button>
                                    </>
                                )}

                                {item.status === 'approved' && (
                                    <button
                                        onClick={() => reject(item.id)}
                                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                                    >
                                        <XCircle size={12} /> Revoke
                                    </button>
                                )}

                                {item.status === 'rejected' && (
                                    <button
                                        onClick={() => approve(item.id)}
                                        className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-slate-950 text-xs font-black transition-all"
                                    >
                                        <CheckCircle size={12} /> Approve
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="col-span-full py-24 text-center">
                        <HelpCircle size={40} className="mx-auto text-slate-700 mb-3" />
                        <p className="text-slate-500 text-sm">No materials match your filters.</p>
                        <button
                            onClick={() => { setSearch(''); setStatusFilter(''); }}
                            className="mt-3 text-xs font-bold text-amber-400 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {preview && (
                <PreviewModal
                    item={preview}
                    onClose={() => setPreview(null)}
                    onApprove={() => { approve(preview.id); setPreview(null); }}
                    onReject={() => { reject(preview.id); setPreview(null); }}
                />
            )}
        </div>
    );
}
