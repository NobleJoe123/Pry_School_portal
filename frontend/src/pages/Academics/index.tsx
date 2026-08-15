import { useEffect, useState } from 'react';
import { Plus, GraduationCap, Calendar, Layers, BookOpen, User as UserIcon, X, CheckCircle, Bell, DollarSign, Clock, Trash2, Filter, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { AcademicYear, Term, ClassLevel, SchoolClass, Subject } from '../../types';

type Tab = 'years' | 'terms' | 'levels' | 'classes' | 'subjects';

const getList = <T,>(res: any): T[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.results)) return res.results;
    return [];
};

export default function Academics() {
    const [activeTab, setActiveTab] = useState<Tab>('classes');
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({});
    const [activatingTerm, setActivatingTerm] = useState<Term | null>(null);
    const [resumptionDate, setResumptionDate] = useState('');
    const [activating, setActivating] = useState(false);
    const [activationSuccess, setActivationSuccess] = useState<{ message: string; notifs: number; fees: number } | null>(null);

    // Subject Deletion & Filtering State
    const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [subjectLevelFilter, setSubjectLevelFilter] = useState<string>('all');
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    const [data, setData] = useState<{
        years: AcademicYear[];
        terms: Term[];
        levels: ClassLevel[];
        classes: SchoolClass[];
        subjects: Subject[];
    }>({ years: [], terms: [], levels: [], classes: [], subjects: [] });

    const loadData = async () => {
        setLoading(true);
        try {
            const [years, terms, levels, classes, subjects] = await Promise.all([
                api.get<any>(endpoints.academics.years),
                api.get<any>(endpoints.academics.terms),
                api.get<any>(endpoints.academics.levels),
                api.get<any>(endpoints.academics.classes),
                api.get<any>(endpoints.academics.subjects),
            ]);
            setData({
                years: getList<AcademicYear>(years),
                terms: getList<Term>(terms),
                levels: getList<ClassLevel>(levels),
                classes: getList<SchoolClass>(classes),
                subjects: getList<Subject>(subjects),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const tabs = [
        { id: 'years', label: 'Academic Years', icon: Calendar },
        { id: 'terms', label: 'Terms', icon: GraduationCap },
        { id: 'levels', label: 'Class Levels', icon: Layers },
        { id: 'classes', label: 'Classes', icon: GraduationCap },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
    ] as const;

    const activeLabel = tabs.find(tab => tab.id === activeTab)?.label || 'Item';

    const openAdd = () => {
        const defaults: Record<Tab, Record<string, string>> = {
            years: { name: '', start_date: '', end_date: '' },
            terms: { academic_year: data.years.find(y => y.is_current)?.id || data.years[0]?.id || '', name: '1st Term', start_date: '', end_date: '', resumption_date: '' },
            levels: { name: '', numeric_level: '' },
            classes: { name: '', level: data.levels[0]?.id || '', academic_year: data.years.find(y => y.is_current)?.id || data.years[0]?.id || '' },
            subjects: { name: '', code: '', level: data.levels[0]?.id || '' },
        };
        setForm(defaults[activeTab]);
        setShowAdd(true);
    };

    const submitAdd = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const endpoint = {
                years: endpoints.academics.years,
                terms: endpoints.academics.terms,
                levels: endpoints.academics.levels,
                classes: endpoints.academics.classes,
                subjects: endpoints.academics.subjects,
            }[activeTab];
            const payload: Record<string, string | number | boolean> = { ...form };
            if (activeTab === 'levels') payload.numeric_level = Number(form.numeric_level);
            await api.post(endpoint, payload);
            setShowAdd(false);
            await loadData();
        } finally {
            setSaving(false);
        }
    };

    const handleActivateTermSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activatingTerm) return;
        setActivating(true);
        try {
            const res: any = await api.post(endpoints.academics.setTermCurrent(activatingTerm.id), {
                resumption_date: resumptionDate || activatingTerm.resumption_date || activatingTerm.start_date
            });
            setActivationSuccess({
                message: res.message || 'Term activated successfully.',
                notifs: res.notifications_sent || 0,
                fees: res.fees_generated || 0
            });
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to activate term.');
        } finally {
            setActivating(false);
        }
    };

    const handleDeleteSubject = async () => {
        if (!deletingSubject) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`${endpoints.academics.subjects}${deletingSubject.id}/`);
            setDeletingSubject(null);
            await loadData();
        } catch (err: any) {
            setDeleteError(err.message || 'Failed to delete subject. It may be linked to recorded assessments or scores.');
        } finally {
            setDeleting(false);
        }
    };

    const filteredLevels = subjectLevelFilter === 'all'
        ? data.levels
        : data.levels.filter(l => l.id === subjectLevelFilter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <GraduationCap className="text-amber-400" size={28} />
                        Academics Management
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Manage academic years, terms, class levels, classes, and subjects.
                    </p>
                </div>
                <button onClick={openAdd} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10">
                    <Plus size={16} />
                    Add {activeLabel}
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                isActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                            }`}>
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Add Item Modal */}
            {showAdd && (
                <form onSubmit={submitAdd} className="p-6 bg-slate-900 rounded-3xl border border-white/10 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-base font-bold text-white">Add New {activeLabel}</h3>
                        <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeTab === 'years' && (
                            <>
                                <Field label="Academic Year Name" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="2025/2026" />
                                <Field label="Start Date" type="date" value={form.start_date} onChange={value => setForm({ ...form, start_date: value })} />
                                <Field label="End Date" type="date" value={form.end_date} onChange={value => setForm({ ...form, end_date: value })} />
                            </>
                        )}
                        {activeTab === 'terms' && (
                            <>
                                <SelectField label="Academic Year" value={form.academic_year} onChange={value => setForm({ ...form, academic_year: value })} options={data.years.map(y => ({ id: y.id, label: y.name }))} />
                                <SelectField label="Term Name" value={form.name} onChange={value => setForm({ ...form, name: value })} options={[
                                    { id: '1st Term', label: 'First Term' },
                                    { id: '2nd Term', label: 'Second Term' },
                                    { id: '3rd Term', label: 'Third Term' },
                                ]} />
                                <Field label="Start Date" type="date" value={form.start_date} onChange={value => setForm({ ...form, start_date: value })} />
                                <Field label="End Date" type="date" value={form.end_date} onChange={value => setForm({ ...form, end_date: value })} />
                                <Field label="Resumption Date" type="date" value={form.resumption_date} onChange={value => setForm({ ...form, resumption_date: value })} />
                            </>
                        )}
                        {activeTab === 'levels' && (
                            <>
                                <Field label="Level Name" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="Primary 4" />
                                <Field label="Sort Level" type="number" value={form.numeric_level} onChange={value => setForm({ ...form, numeric_level: value })} placeholder="4" />
                            </>
                        )}
                        {activeTab === 'classes' && (
                            <>
                                <Field label="Class Name" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="Primary 4A" />
                                <SelectField label="Level" value={form.level} onChange={value => setForm({ ...form, level: value })} options={data.levels.map(l => ({ id: l.id, label: l.name }))} />
                                <SelectField label="Academic Year" value={form.academic_year} onChange={value => setForm({ ...form, academic_year: value })} options={data.years.map(y => ({ id: y.id, label: y.name }))} />
                            </>
                        )}
                        {activeTab === 'subjects' && (
                            <>
                                <Field label="Subject Name" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="Mathematics" />
                                <Field label="Code" value={form.code} onChange={value => setForm({ ...form, code: value.toUpperCase() })} placeholder="MTH" />
                                <SelectField label="Level" value={form.level} onChange={value => setForm({ ...form, level: value })} options={data.levels.map(l => ({ id: l.id, label: l.name }))} />
                            </>
                        )}
                    </div>
                    <button disabled={saving} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition-all">
                        {saving ? 'Saving...' : `Save ${activeLabel}`}
                    </button>
                </form>
            )}

            {/* Delete Subject Confirmation Modal */}
            {deletingSubject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Delete Subject</h3>
                                    <p className="text-xs text-slate-400">Confirm subject removal</p>
                                </div>
                            </div>
                            <button onClick={() => { setDeletingSubject(null); setDeleteError(null); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                            Are you sure you want to delete <strong className="text-white font-bold">{deletingSubject.name} ({deletingSubject.code})</strong>?
                        </p>
                        <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                            This will remove the subject from its level curriculum ({deletingSubject.level_name || 'assigned level'}).
                        </p>

                        {deleteError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                                {deleteError}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => { setDeletingSubject(null); setDeleteError(null); }}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all border border-white/5">
                                Cancel
                            </button>
                            <button type="button" onClick={handleDeleteSubject} disabled={deleting}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-500/10 flex items-center justify-center gap-2">
                                {deleting ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                                ) : (
                                    <><Trash2 size={14} /> Delete Subject</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Term Activation & Resumption Modal */}
            {activatingTerm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Clock size={18} className="text-amber-400" />
                                    Activate {activatingTerm.name}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">{activatingTerm.academic_year_name || 'Academic Session'}</p>
                            </div>
                            <button onClick={() => { setActivatingTerm(null); setActivationSuccess(null); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                                <X size={18} />
                            </button>
                        </div>

                        {activationSuccess ? (
                            <div className="p-6 space-y-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                                    <CheckCircle size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-white">Term Activated & Dispatched!</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">{activationSuccess.message}</p>
                                
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-center">
                                        <Bell size={18} className="text-amber-400 mx-auto mb-1" />
                                        <p className="text-lg font-black text-white">{activationSuccess.notifs}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Notifications Sent</p>
                                    </div>
                                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-center">
                                        <DollarSign size={18} className="text-emerald-400 mx-auto mb-1" />
                                        <p className="text-lg font-black text-white">{activationSuccess.fees}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Student Fees Refreshed</p>
                                    </div>
                                </div>

                                <button onClick={() => { setActivatingTerm(null); setActivationSuccess(null); }}
                                    className="w-full mt-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all">
                                    Done & Refresh
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleActivateTermSubmit} className="p-6 space-y-4">
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                                    <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                        <Bell size={14} /> Automated System-Wide Actions:
                                    </p>
                                    <ul className="text-[11px] text-slate-300 space-y-1 pl-4 list-disc leading-relaxed">
                                        <li>Marks <strong>{activatingTerm.name}</strong> as the current active term.</li>
                                        <li>Dispatches automated notifications to <strong>all parent and teacher portals</strong> with the resumption date.</li>
                                        <li>Auto-generates and refreshes <strong>new term school fees</strong> for all active enrolled students.</li>
                                    </ul>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
                                        School Resumption Date
                                    </label>
                                    <input type="date" required
                                        value={resumptionDate}
                                        onChange={e => setResumptionDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/50" />
                                    <p className="text-[10px] text-slate-500 mt-1">Parents and teachers will see this resumption date in their portal.</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setActivatingTerm(null)}
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all border border-white/5">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={activating}
                                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2">
                                        {activating ? (
                                            <><div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Activating...</>
                                        ) : (
                                            <><CheckCircle size={14} /> Activate & Notify Portals</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="premium-spinner" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'years' && <SimpleTable headers={['Year Name', 'Start Date', 'End Date', 'Status']} rows={data.years.map(y => [y.name, y.start_date, y.end_date, y.is_current ? 'Current' : 'Past'])} />}
                    
                    {activeTab === 'terms' && (
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Term</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Academic Year</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Resumption Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.terms.map((t) => (
                                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                            <td className="px-6 py-4 text-sm font-bold text-white">{t.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{t.academic_year_name || t.academic_year}</td>
                                            <td className="px-6 py-4 text-sm text-amber-300 font-mono">
                                                {t.resumption_date || t.start_date}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {t.is_current ? (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-max">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Term
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-500 border border-white/5 w-max block">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                {!t.is_current && (
                                                    <button onClick={() => {
                                                        setActivatingTerm(t);
                                                        setResumptionDate(t.resumption_date || t.start_date);
                                                        setActivationSuccess(null);
                                                    }} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition-all">
                                                        Activate Term & Notify
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'levels' && (
                        <div className="space-y-4">
                            <SimpleTable 
                                headers={['Class Level', 'Sort Level Order', 'Distributed Subjects Count', 'Associated Classes']} 
                                rows={data.levels.map(l => {
                                    const lvlSubjects = data.subjects.filter(s => s.level === l.id);
                                    const lvlClasses = data.classes.filter(c => c.level === l.id);
                                    const classNames = lvlClasses.length > 0 ? lvlClasses.map(c => c.name).join(', ') : 'None';
                                    return [l.name, String(l.numeric_level), `${lvlSubjects.length} subjects`, classNames];
                                })} 
                            />
                        </div>
                    )}

                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.classes.map(cls => {
                                const classSubjects = data.subjects.filter(s => s.level === cls.level);
                                const isExpanded = expandedClassId === cls.id;
                                return (
                                    <div key={cls.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                                    <GraduationCap size={24} />
                                                </div>
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                                    {cls.level_name}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">{cls.name}</h3>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                                                <UserIcon size={14} className="text-amber-500/60" />
                                                <span>{cls.teacher_name || 'No teacher assigned'}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                                                    <BookOpen size={14} />
                                                    {classSubjects.length} Subjects Distributed
                                                </span>
                                                <button 
                                                    onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[11px] font-bold text-slate-300 flex items-center gap-1 transition-all">
                                                    {isExpanded ? <>Hide <ChevronUp size={12} /></> : <>View Subjects <ChevronDown size={12} /></>}
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 animate-in fade-in zoom-in-95">
                                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/5 pb-1">
                                                        Curriculum Subjects for {cls.name}:
                                                    </p>
                                                    {classSubjects.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {classSubjects.map(sub => (
                                                                <span key={sub.id} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium rounded-md flex items-center gap-1">
                                                                    <span className="font-mono text-[9px] text-amber-500">{sub.code}:</span> {sub.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 italic">No subjects added to this class level yet.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'subjects' && (
                        <div className="space-y-6">
                            {/* Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <Filter size={16} className="text-amber-400" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Filter Subjects by Class Level:</span>
                                </div>
                                <select 
                                    value={subjectLevelFilter} 
                                    onChange={e => setSubjectLevelFilter(e.target.value)}
                                    className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-500/50">
                                    <option value="all">All Class Levels ({data.subjects.length} total subjects)</option>
                                    {data.levels.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({data.subjects.filter(s => s.level === l.id).length} subjects)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subjects Distributed by Class Level */}
                            {filteredLevels.map(level => {
                                const levelSubjects = data.subjects.filter(s => s.level === level.id);
                                const levelClasses = data.classes.filter(c => c.level === level.id);
                                return (
                                    <div key={level.id} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-lg font-bold text-white">{level.name} Level</h2>
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold rounded-md">
                                                        Level {level.numeric_level}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Distributed to {levelClasses.length} class(es): {' '}
                                                    <span className="text-amber-300 font-medium">
                                                        {levelClasses.length > 0 ? levelClasses.map(c => c.name).join(', ') : 'No classes created for this level yet'}
                                                    </span>
                                                </p>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 w-max">
                                                {levelSubjects.length} Subject{levelSubjects.length === 1 ? '' : 's'} Distributed
                                            </span>
                                        </div>

                                        {levelSubjects.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {levelSubjects.map(subject => (
                                                    <div key={subject.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between group">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                                                    <BookOpen size={18} />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                                                                        {subject.code}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => setDeletingSubject(subject)}
                                                                        title="Delete Subject"
                                                                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <h3 className="text-white font-bold text-base">{subject.name}</h3>
                                                            <p className="text-slate-400 text-xs mt-1">
                                                                Curriculum for <span className="text-amber-300">{subject.level_name || level.name}</span>
                                                            </p>
                                                        </div>

                                                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                                                            <span>Distributed to {levelClasses.length} class(es)</span>
                                                            <button 
                                                                onClick={() => setDeletingSubject(subject)}
                                                                className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 size={12} /> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-slate-400 text-xs">
                                                No subjects currently created for {level.name}. Click "Add Subjects" above to add subjects to this level.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <label className="block">
            <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">{label}</span>
            <input required type={type} value={value || ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/50" />
        </label>
    );
}

function SelectField({ label, value, onChange, options }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    options: { id: string; label: string }[];
}) {
    return (
        <label className="block">
            <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">{label}</span>
            <select required value={value || ''} onChange={event => onChange(event.target.value)} className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/50">
                <option value="">Select...</option>
                {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
        </label>
    );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                        {headers.map(header => <th key={header} className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">{header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                            {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="px-6 py-4 text-sm text-slate-300">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
