import { useState, useEffect } from 'react';
import { Plus, GraduationCap, Calendar, Layers, BookOpen, User as UserIcon } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { AcademicYear, Term, ClassLevel, SchoolClass, Subject } from '../../types';

type Tab = 'years' | 'terms' | 'levels' | 'classes' | 'subjects';

export default function Academics() {
    const [activeTab, setActiveTab] = useState<Tab>('classes');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        years: AcademicYear[];
        terms: Term[];
        levels: ClassLevel[];
        classes: SchoolClass[];
        subjects: Subject[];
    }>({ years: [], terms: [], levels: [], classes: [], subjects: [] });

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<AcademicYear[]>(endpoints.academics.years),
            api.get<Term[]>(endpoints.academics.terms),
            api.get<ClassLevel[]>(endpoints.academics.levels),
            api.get<SchoolClass[]>(endpoints.academics.classes),
            api.get<Subject[]>(endpoints.academics.subjects),
        ]).then(([years, terms, levels, classes, subjects]) => {
            setData({ years, terms, levels, classes, subjects });
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch academics data", err);
            setLoading(false);
        });
    }, []);

    const tabs = [
        { id: 'years', label: 'Academic Years', icon: Calendar },
        { id: 'terms', label: 'Terms', icon: GraduationCap },
        { id: 'levels', label: 'Class Levels', icon: Layers },
        { id: 'classes', label: 'Classes', icon: GraduationCap },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Academics Management</h1>
                    <p className="text-slate-400 text-sm">Manage school cycles, classes, and subjects</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-semibold transition-all">
                    <Plus size={18} />
                    <span>Add New</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
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

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'years' && (
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Year Name</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Start Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">End Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.years.map(year => (
                                        <tr key={year.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                            <td className="px-6 py-4 text-sm font-medium text-white">{year.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-400">{year.start_date}</td>
                                            <td className="px-6 py-4 text-sm text-slate-400">{year.end_date}</td>
                                            <td className="px-6 py-4 text-sm">
                                                {year.is_current ? (
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg border border-green-500/20">Current</span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">Past</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'classes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.classes.map(cls => (
                                <div key={cls.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                            <GraduationCap size={24} />
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md">
                                            {cls.level_name}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">{cls.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                                        <UserIcon size={14} className="text-amber-500/60" />
                                        <span>{cls.teacher_name || 'No teacher assigned'}</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 uppercase tracking-tighter">Students: 0</span>
                                        <button className="text-xs text-amber-500 font-semibold hover:underline">Manage Class</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Placeholder for other tabs */}
                    {['terms', 'levels', 'subjects'].includes(activeTab) && (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                                {activeTab === 'terms' && <Calendar size={32} />}
                                {activeTab === 'levels' && <Layers size={32} />}
                                {activeTab === 'subjects' && <BookOpen size={32} />}
                            </div>
                            <h3 className="text-white font-bold text-lg capitalize">{activeTab} Details</h3>
                            <p className="text-slate-500 max-w-xs mt-1">Detailed management for {activeTab} will be available in the next minor update.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
