import { useEffect, useState } from 'react';
import { Plus, GraduationCap, Calendar, Layers, BookOpen, User as UserIcon, X } from 'lucide-react';
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
            terms: { academic_year: data.years.find(y => y.is_current)?.id || data.years[0]?.id || '', name: '1st Term', start_date: '', end_date: '' },
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Academics Management</h1>
                    <p className="text-slate-400 text-sm">Manage school cycles, classes, and subjects</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-semibold transition-all">
                    <Plus size={18} />
                    <span>Add {activeLabel.replace('Academic ', '').replace('Class ', '')}</span>
                </button>
            </div>

            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {showAdd && (
                <form onSubmit={submitAdd} className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white text-sm font-bold">Add {activeLabel}</h3>
                        <button type="button" onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {activeTab === 'years' && (
                            <>
                                <Field label="Year Name" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="2026/2027" />
                                <Field label="Start Date" type="date" value={form.start_date} onChange={value => setForm({ ...form, start_date: value })} />
                                <Field label="End Date" type="date" value={form.end_date} onChange={value => setForm({ ...form, end_date: value })} />
                            </>
                        )}
                        {activeTab === 'terms' && (
                            <>
                                <SelectField label="Academic Year" value={form.academic_year} onChange={value => setForm({ ...form, academic_year: value })} options={data.years.map(y => ({ id: y.id, label: y.name }))} />
                                <SelectField label="Term" value={form.name} onChange={value => setForm({ ...form, name: value })} options={['1st Term', '2nd Term', '3rd Term'].map(t => ({ id: t, label: t }))} />
                                <Field label="Resumption Date" type="date" value={form.start_date} onChange={value => setForm({ ...form, start_date: value })} />
                                <Field label="Vacation Date" type="date" value={form.end_date} onChange={value => setForm({ ...form, end_date: value })} />
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

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="premium-spinner" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'years' && <SimpleTable headers={['Year Name', 'Start Date', 'End Date', 'Status']} rows={data.years.map(y => [y.name, y.start_date, y.end_date, y.is_current ? 'Current' : 'Past'])} />}
                    {activeTab === 'terms' && <SimpleTable headers={['Term', 'Academic Year', 'Resumption', 'Vacation', 'Status']} rows={data.terms.map(t => [t.name, t.academic_year_name || t.academic_year, t.start_date, t.end_date, t.is_current ? 'Current' : 'Past'])} />}
                    {activeTab === 'levels' && <SimpleTable headers={['Level', 'Sort Order', 'Subjects']} rows={data.levels.map(l => [l.name, String(l.numeric_level), String(data.subjects.filter(s => s.level === l.id).length)])} />}
                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.classes.map(cls => (
                                <div key={cls.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                            <GraduationCap size={24} />
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md">{cls.level_name}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">{cls.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                                        <UserIcon size={14} className="text-amber-500/60" />
                                        <span>{cls.teacher_name || 'No teacher assigned'}</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 uppercase tracking-tighter">{data.subjects.filter(s => s.level === cls.level).length} subjects</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'subjects' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.subjects.map(subject => (
                                <div key={subject.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <BookOpen size={22} className="text-amber-400" />
                                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-lg">{subject.code}</span>
                                    </div>
                                    <h3 className="text-white font-bold">{subject.name}</h3>
                                    <p className="text-slate-500 text-xs mt-1">Current subject for {subject.level_name || 'assigned level'}</p>
                                </div>
                            ))}
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
