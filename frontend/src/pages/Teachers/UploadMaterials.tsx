import { useState, useEffect, useRef } from 'react';
import {
    UploadCloud, BookOpen, Layers,
    FileText, CheckCircle, Clock, XCircle, FileDown, Plus, Trash2, Edit3, X, HelpCircle,
    RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';
import type { SchoolClass, Subject } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Material {
    id: string;
    teacher: string;
    teacher_name: string;
    school_class: string;
    class_name: string;
    subject: string;
    subject_name: string;
    week: string;
    topic: string;
    objectives: string;
    activities: string;
    evaluation: string;
    file: string | null;
    file_url: string | null;
    file_size: string | null;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
}

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

const statusStyle = (s: Material['status']) => {
    switch (s) {
        case 'approved':
            return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={11} />, label: 'Approved' };
        case 'submitted':
            return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <Clock size={11} />, label: 'Pending Review' };
        case 'rejected':
            return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: <XCircle size={11} />, label: 'Rejected' };
        default:
            return { text: 'text-slate-400', bg: 'bg-white/5 border-white/10', icon: <FileText size={11} />, label: 'Draft' };
    }
};

const WEEK_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    id: `Week ${i + 1}`,
    label: `Week ${i + 1}`,
}));

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UploadMaterials() {
    const { user } = useAuth();

    const [classes, setClasses]     = useState<SchoolClass[]>([]);
    const [subjects, setSubjects]   = useState<Subject[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving]           = useState(false);
    const [apiError, setApiError]       = useState('');
    const [showForm, setShowForm]       = useState(false);
    const [editingItem, setEditingItem] = useState<Material | null>(null);

    // Form fields
    const [classId, setClassId]         = useState('');
    const [subjectId, setSubjectId]     = useState('');
    const [week, setWeek]               = useState('Week 1');
    const [topic, setTopic]             = useState('');
    const [objectives, setObjectives]   = useState('');
    const [activities, setActivities]   = useState('');
    const [evaluation, setEvaluation]   = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Load data ──────────────────────────────────────────────────────────────
    const fetchMaterials = async () => {
        try {
            const res = await api.get<any>(endpoints.academics.materials);
            setMaterials(getList<Material>(res));
        } catch (err: any) {
            console.error('Failed to load materials', err);
        }
    };

    useEffect(() => {
        setPageLoading(true);
        Promise.allSettled([
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.subjects),
            api.get<any>(endpoints.academics.materials),
        ]).then(([classesRes, subjectsRes, matsRes]) => {
            if (classesRes.status === 'fulfilled') {
                let list = getList<SchoolClass>(classesRes.value);
                // Teachers only see their own assigned class(es)
                if (user?.role === 'teacher') {
                    list = list.filter((c: any) => c.teacher === user.id || c.teacher_name === user.full_name);
                }
                setClasses(list);
                if (list.length > 0) setClassId(list[0].id);
            }
            if (subjectsRes.status === 'fulfilled') {
                const list = getList<Subject>(subjectsRes.value);
                setSubjects(list);
                if (list.length > 0) setSubjectId(list[0].id);
            }
            if (matsRes.status === 'fulfilled') {
                setMaterials(getList<Material>(matsRes.value));
            }
        }).finally(() => setPageLoading(false));
    }, [user]);

    // ── Form helpers ───────────────────────────────────────────────────────────
    const resetForm = () => {
        setShowForm(false);
        setEditingItem(null);
        setTopic(''); setObjectives(''); setActivities(''); setEvaluation('');
        setSelectedFile(null);
        setApiError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEdit = (item: Material) => {
        setEditingItem(item);
        setClassId(item.school_class);
        setSubjectId(item.subject);
        setWeek(item.week);
        setTopic(item.topic);
        setObjectives(item.objectives);
        setActivities(item.activities || '');
        setEvaluation(item.evaluation || '');
        setSelectedFile(null);
        setApiError('');
        setShowForm(true);
    };

    // ── Save (create or update) ────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent, statusType: 'draft' | 'submitted') => {
        e.preventDefault();
        setApiError('');
        setSaving(true);

        try {
            if (selectedFile) {
                // Multipart upload
                const fd = new FormData();
                fd.append('school_class', classId);
                fd.append('subject', subjectId);
                fd.append('week', week);
                fd.append('topic', topic);
                fd.append('objectives', objectives);
                fd.append('activities', activities);
                fd.append('evaluation', evaluation);
                fd.append('status', statusType);
                fd.append('file', selectedFile);

                if (editingItem) {
                    await api.patchFormData<any>(endpoints.academics.materialDetail(editingItem.id), fd);
                } else {
                    await api.postFormData<any>(endpoints.academics.materials, fd);
                }
            } else {
                const payload = {
                    school_class: classId,
                    subject: subjectId,
                    week,
                    topic,
                    objectives,
                    activities,
                    evaluation,
                    status: statusType,
                };
                if (editingItem) {
                    await api.patch<any>(endpoints.academics.materialDetail(editingItem.id), payload);
                } else {
                    await api.post<any>(endpoints.academics.materials, payload);
                }
            }
            await fetchMaterials();
            resetForm();
        } catch (err: any) {
            setApiError(err.message || 'Failed to save lesson note.');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this lesson note permanently?')) return;
        try {
            await api.delete(endpoints.academics.materialDetail(id));
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            alert(err.message || 'Failed to delete material.');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (pageLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-64 bg-white/5 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Upload Lesson Notes & Materials</h1>
                    <p className="text-slate-500 text-sm">Submit your curriculum objectives and download teaching materials</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchMaterials}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={15} />
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black text-sm text-slate-950 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                        >
                            <Plus size={16} /> Create Lesson Note
                        </button>
                    )}
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <form
                    onSubmit={(e) => handleSave(e, 'submitted')}
                    className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6"
                >
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h2 className="text-white font-bold text-lg">
                            {editingItem ? 'Edit Lesson Note' : 'New Lesson Note'}
                        </h2>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {apiError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle size={14} /> {apiError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FilterDropdown
                            label="Class"
                            fullWidth
                            value={classId}
                            options={classes.map(c => ({ id: c.id, label: c.name }))}
                            onChange={setClassId}
                            placeholder="Select Class"
                        />
                        <FilterDropdown
                            label="Subject"
                            fullWidth
                            value={subjectId}
                            options={subjects.map(s => ({ id: s.id, label: s.name }))}
                            onChange={setSubjectId}
                            placeholder="Select Subject"
                        />
                        <FilterDropdown
                            label="Week"
                            fullWidth
                            value={week}
                            options={WEEK_OPTIONS}
                            onChange={setWeek}
                            placeholder="Select Week"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Topic *</label>
                        <input
                            type="text" required value={topic} onChange={e => setTopic(e.target.value)}
                            placeholder="e.g. Simple Additions, Photosynthesis, Reading and Alphabets…"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Lesson Objectives *</label>
                            <textarea
                                required rows={4} value={objectives} onChange={e => setObjectives(e.target.value)}
                                placeholder="What should the pupils be able to do by the end of the class?"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Activities</label>
                            <textarea
                                rows={4} value={activities} onChange={e => setActivities(e.target.value)}
                                placeholder="Step-by-step description of lesson delivery activities…"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Evaluation / Assessment Method</label>
                        <textarea
                            rows={3} value={evaluation} onChange={e => setEvaluation(e.target.value)}
                            placeholder="How will you check if pupils understood the topic?"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                            Lesson Note Document / Materials
                            {editingItem?.file_url && !selectedFile && (
                                <a
                                    href={editingItem.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-3 normal-case text-amber-400 hover:text-amber-300 font-medium"
                                >
                                    (View current file)
                                </a>
                            )}
                        </label>
                        <div
                            className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/[0.02] transition-colors relative cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                            />
                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                <UploadCloud size={32} className="text-slate-500" />
                                <p className="text-sm font-semibold text-slate-300">
                                    {selectedFile ? selectedFile.name : 'Drag & drop or click to choose file'}
                                </p>
                                <p className="text-xs text-slate-600">PDF, DOCX, PPTX, XLSX (Max 10 MB)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={(e) => handleSave(e as any, 'draft')}
                            className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50"
                        >
                            Save as Draft
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black shadow-xl shadow-amber-500/10 active:scale-95 transition-all disabled:opacity-60"
                        >
                            {saving ? <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />Saving…</> : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            )}

            {/* Materials Grid */}
            {!showForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map(item => {
                        const style = statusStyle(item.status);
                        return (
                            <div key={item.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex flex-col justify-between hover:border-white/10 transition-all">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${style.bg} ${style.text}`}>
                                            {style.icon} {style.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                            <BookOpen size={10} />{item.subject_name}
                                            <span className="text-slate-700">•</span>
                                            <Layers size={10} />{item.class_name}
                                            <span className="text-slate-700">•</span>
                                            {item.week}
                                        </div>
                                        <h3 className="text-white text-sm font-bold mt-1 leading-tight">{item.topic}</h3>
                                    </div>

                                    <p className="text-xs text-slate-400 line-clamp-2">
                                        <span className="font-semibold text-slate-300">Obj: </span>{item.objectives}
                                    </p>

                                    {item.file_url && (
                                        <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={13} className="text-amber-500 shrink-0" />
                                                <p className="text-[10px] text-slate-300 truncate font-mono">
                                                    {item.file_url.split('/').pop()}
                                                </p>
                                            </div>
                                            <span className="text-[9px] text-slate-500 shrink-0 font-mono pl-2">{item.file_size || '–'}</span>
                                        </div>
                                    )}

                                    {/* Rejection notice */}
                                    {item.status === 'rejected' && (
                                        <div className="p-2.5 bg-red-500/5 border border-red-500/15 rounded-xl text-xs text-red-400">
                                            This material was rejected. Edit and resubmit for review.
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-5">
                                    <div className="flex gap-1.5">
                                        {item.status !== 'approved' && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {item.file_url && (
                                        <a
                                            href={item.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/15 border border-amber-500/20 px-3 py-1.5 rounded-xl transition-all"
                                        >
                                            <FileDown size={12} /> Download
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {materials.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <HelpCircle size={40} className="mx-auto text-slate-700 mb-3" />
                            <p className="text-slate-500 text-sm">No lesson notes uploaded yet.</p>
                            <button onClick={() => setShowForm(true)} className="mt-4 text-xs font-bold text-amber-400 hover:underline">
                                Create your first note now
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
