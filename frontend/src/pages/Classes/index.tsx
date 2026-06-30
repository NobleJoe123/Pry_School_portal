import { useEffect, useState } from 'react';
import { GraduationCap, Plus, Search, Users, BookOpen, UserCircle, Edit3, X, Save, ChevronDown, Trash2 } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import FilterDropdown from '../../components/ui/FilterDropdown';

interface SchoolClass {
    id: string;
    name: string;
    level: string;
    level_name: string;
    teacher: string | null;
    teacher_name: string | null;
    student_count: number;
    subjects?: string[];
}

interface ClassLevel {
    id: string;
    name: string;
}

interface Teacher {
    id: string;
    full_name: string;
    email: string;
}

interface ClassFormData {
    name: string;
    level: string;
    teacher: string;
}

function ClassCard({ schoolClass, teachers, onEdit, onDelete }: {
    schoolClass: SchoolClass;
    teachers: Teacher[];
    onEdit: (c: SchoolClass) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="rounded-2xl border border-white/5 p-5 flex flex-col gap-4 transition-all hover:border-white/10 group"
            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-base">{schoolClass.name}</h3>
                        <p className="text-slate-500 text-xs">{schoolClass.level_name}</p>
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                    <button onClick={() => onEdit(schoolClass)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        title="Edit class">
                        <Edit3 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(schoolClass.id); }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        title="Delete class">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
                    <Users size={13} className="text-sky-400 shrink-0" />
                    <div>
                        <p className="text-white text-sm font-black">{schoolClass.student_count}</p>
                        <p className="text-slate-500 text-[10px]">Pupils</p>
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 flex items-center gap-2 overflow-hidden">
                    <UserCircle size={13} className="text-purple-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-white text-xs font-bold truncate">
                            {schoolClass.teacher_name || 'Unassigned'}
                        </p>
                        <p className="text-slate-500 text-[10px]">Teacher</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ClassFormModal({
    mode,
    initialData,
    levels,
    teachers,
    onSave,
    onClose
}: {
    mode: 'create' | 'edit';
    initialData?: SchoolClass;
    levels: ClassLevel[];
    teachers: Teacher[];
    onSave: (data: ClassFormData, id?: string) => Promise<void>;
    onClose: () => void;
}) {
    const [form, setForm] = useState<ClassFormData>({
        name: initialData?.name || '',
        level: initialData?.level || (levels[0]?.id || ''),
        teacher: initialData?.teacher || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.level) {
            setError('Class name and level are required.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSave(form, initialData?.id);
        } catch (err: any) {
            setError(err.message || 'Failed to save class');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #080f1a 100%)' }}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white">{mode === 'create' ? 'Create Class' : 'Edit Class'}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Class Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Primary 1A"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Class Level *</label>
                        <div className="relative">
                            <select
                                value={form.level}
                                onChange={e => setForm({ ...form, level: e.target.value })}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none">
                                <option value="">Select level...</option>
                                {levels.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assign Teacher</label>
                        <div className="relative">
                            <select
                                value={form.teacher}
                                onChange={e => setForm({ ...form, teacher: e.target.value })}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none">
                                <option value="">No teacher assigned</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.full_name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 border border-white/10 text-slate-400 rounded-xl text-sm font-bold hover:bg-white/5 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-black transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={14} />
                                    {mode === 'create' ? 'Create Class' : 'Save Changes'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ClassesPage() {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [levels, setLevels] = useState<ClassLevel[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterTeacher, setFilterTeacher] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<SchoolClass | undefined>(undefined);

    const fetchData = () => {
        setLoading(true);
        Promise.allSettled([
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.levels),
            api.get<any>(endpoints.teachers.list),
        ]).then(([classesRes, levelsRes, teachersRes]) => {
            if (classesRes.status === 'fulfilled') {
                const list = Array.isArray(classesRes.value)
                    ? classesRes.value
                    : Array.isArray(classesRes.value?.results) ? classesRes.value.results : [];
                setClasses(list);
            }
            if (levelsRes.status === 'fulfilled') {
                const list = Array.isArray(levelsRes.value)
                    ? levelsRes.value
                    : Array.isArray(levelsRes.value?.results) ? levelsRes.value.results : [];
                setLevels(list);
            }
            if (teachersRes.status === 'fulfilled') {
                const list = Array.isArray(teachersRes.value)
                    ? teachersRes.value
                    : Array.isArray(teachersRes.value?.results) ? teachersRes.value.results : [];
                setTeachers(list);
            }
            setLoading(false);
        });
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (data: ClassFormData, id?: string) => {
        const payload: Record<string, any> = {
            name: data.name,
            level: data.level,
        };
        if (data.teacher) payload.teacher = data.teacher;
        else payload.teacher = null;

        if (id) {
            await api.patch<any>(endpoints.academics.classes + `${id}/`, payload);
        } else {
            await api.post<any>(endpoints.academics.classes, payload);
        }

        setShowModal(false);
        setEditingClass(undefined);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;
        try {
            await api.delete(endpoints.academics.classes + `${id}/`);
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete class. It may have students enrolled.');
        }
    };

    const filtered = classes.filter(c => {
        if (filterLevel && c.level !== filterLevel) return false;
        if (filterTeacher && c.teacher !== filterTeacher) return false;
        if (search) {
            const q = search.toLowerCase();
            return c.name.toLowerCase().includes(q) ||
                (c.teacher_name || '').toLowerCase().includes(q) ||
                (c.level_name || '').toLowerCase().includes(q);
        }
        return true;
    });

    const totalStudents = classes.reduce((s, c) => s + (c.student_count || 0), 0);
    const assignedClasses = classes.filter(c => c.teacher).length;
    const unassignedClasses = classes.filter(c => !c.teacher).length;

    const levelOptions = [
        { id: '', label: 'All Levels' },
        ...levels.map(l => ({ id: l.id, label: l.name }))
    ];

    const teacherOptions = [
        { id: '', label: 'All Teachers' },
        ...teachers.map(t => ({ id: t.id, label: t.full_name }))
    ];

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Classes</h1>
                    <p className="text-slate-500 text-sm">Manage all school classes and teacher assignments</p>
                </div>
                <button
                    onClick={() => { setEditingClass(undefined); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20">
                    <Plus size={16} />
                    Create Class
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Classes', value: classes.length, icon: <GraduationCap size={18} />, color: 'bg-amber-500/10 text-amber-400' },
                    { label: 'Total Pupils', value: totalStudents, icon: <Users size={18} />, color: 'bg-sky-500/10 text-sky-400' },
                    { label: 'With Teacher', value: assignedClasses, icon: <UserCircle size={18} />, color: 'bg-emerald-500/10 text-emerald-400' },
                    { label: 'Unassigned', value: unassignedClasses, icon: <BookOpen size={18} />, color: 'bg-red-500/10 text-red-400' },
                ].map(card => (
                    <div key={card.label}
                        className="rounded-2xl border border-white/5 p-4 flex items-start gap-3"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                            {card.icon}
                        </div>
                        <div>
                            {loading ? (
                                <>
                                    <div className="h-5 w-8 bg-white/5 rounded animate-pulse mb-1" />
                                    <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <p className="text-white text-lg font-black">{card.value}</p>
                                    <p className="text-slate-400 text-xs">{card.label}</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search classes..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <FilterDropdown
                        value={filterLevel}
                        options={levelOptions}
                        onChange={setFilterLevel}
                        placeholder="All Levels"
                        colorTheme="amber"
                    />
                    <FilterDropdown
                        value={filterTeacher}
                        options={teacherOptions}
                        onChange={setFilterTeacher}
                        placeholder="All Teachers"
                        colorTheme="amber"
                    />
                </div>
            </div>

            {/* Classes Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border border-white/5"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                        <GraduationCap size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Classes Found</h3>
                    <p className="text-slate-500 text-sm max-w-sm mb-6">
                        {search || filterLevel ? 'Try adjusting your filters.' : 'Get started by creating your first class.'}
                    </p>
                    {!search && !filterLevel && (
                        <button
                            onClick={() => { setEditingClass(undefined); setShowModal(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20">
                            <Plus size={16} />
                            Create First Class
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(c => (
                        <ClassCard
                            key={c.id}
                            schoolClass={c}
                            teachers={teachers}
                            onEdit={cls => { setEditingClass(cls); setShowModal(true); }}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <ClassFormModal
                    mode={editingClass ? 'edit' : 'create'}
                    initialData={editingClass}
                    levels={levels}
                    teachers={teachers}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingClass(undefined); }}
                />
            )}
        </div>
    );
}
