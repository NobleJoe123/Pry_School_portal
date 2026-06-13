import { useState, useEffect } from 'react';
import {
    Users, Search, UserCircle, Phone, Mail, Calendar,
    GraduationCap, Filter, ChevronDown, BookOpen, CalendarCheck
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User } from '../../types';

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

export default function TeacherClass() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myClasses, setMyClasses] = useState<SchoolClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [students, setStudents] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<User | null>(null);

    useEffect(() => {
        async function loadClasses() {
            try {
                const res = await api.get<any>(endpoints.academics.classes);
                const classList = getList<SchoolClass>(res);
                const myC = classList.filter(
                    (c: any) => c.teacher === user?.id || c.teacher_name === user?.full_name
                );
                setMyClasses(myC);
                if (myC.length > 0) setSelectedClassId(myC[0].id);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadClasses();
    }, [user]);

    useEffect(() => {
        if (!selectedClassId) return;
        setLoading(true);
        api.get<any>(`${endpoints.students.list}?school_class=${selectedClassId}`)
            .then(res => setStudents(getList<User>(res)))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedClassId]);

    const filtered = students.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        ((s as any).admission_number || '').toLowerCase().includes(search.toLowerCase())
    );

    const currentClass = myClasses.find(c => c.id === selectedClassId);

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        My Class
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        View and manage your assigned pupils
                    </p>
                </div>
                {myClasses.length > 1 && (
                    <div className="flex gap-2">
                        {myClasses.map(cls => (
                            <button key={cls.id}
                                onClick={() => setSelectedClassId(cls.id)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${selectedClassId === cls.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                                }`}
                            >
                                {cls.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Pupils', value: students.length, icon: <Users size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/15' },
                    { label: 'Class', value: currentClass?.name || '—', icon: <GraduationCap size={16} />, color: 'text-sky-400', bg: 'bg-sky-500/15' },
                    { label: 'Level', value: (currentClass as any)?.level_name || 'Primary', icon: <BookOpen size={16} />, color: 'text-violet-400', bg: 'bg-violet-500/15' },
                ].map(({ label, value, icon, color, bg }) => (
                    <div key={label} className="rounded-2xl border border-white/5 p-4 flex items-center gap-3"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg} ${color} shrink-0`}>
                            {icon}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">{value}</p>
                            <p className="text-slate-500 text-xs">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pupil List */}
                <div className="lg:col-span-2 rounded-2xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name or admission number..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-32 bg-white/5 rounded" />
                                        <div className="h-2.5 w-20 bg-white/5 rounded" />
                                    </div>
                                </div>
                            ))
                        ) : filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <Users size={40} className="text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">
                                    {students.length === 0 ? 'No pupils in this class yet.' : 'No results match your search.'}
                                </p>
                            </div>
                        ) : (
                            filtered.map((student, idx) => {
                                const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;
                                const photoUrl = student.profile_photo_url || (student as any).profile_photo;
                                const isSelected = selected?.id === student.id;

                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelected(isSelected ? null : student)}
                                        className={`flex items-center gap-3 w-full px-5 py-3.5 text-left transition-all hover:bg-white/3 ${isSelected ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={student.full_name} className="w-full h-full object-cover" />
                                            ) : initials || <UserCircle size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-semibold truncate">{student.full_name}</p>
                                            <p className="text-slate-500 text-xs">{(student as any).admission_number || student.username}</p>
                                        </div>
                                        <span className="text-slate-600 text-xs">#{idx + 1}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Pupil Detail Panel */}
                <div className="rounded-2xl border border-white/5 p-5 h-fit"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    {selected ? (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-500/30 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-2xl mx-auto">
                                    {(selected as any).profile_photo_url || (selected as any).profile_photo ? (
                                        <img src={(selected as any).profile_photo_url || (selected as any).profile_photo} alt={selected.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        `${selected.first_name?.[0] || ''}${selected.last_name?.[0] || ''}`
                                    )}
                                </div>
                                <h3 className="text-white font-bold mt-3">{selected.full_name}</h3>
                                <p className="text-slate-500 text-xs mt-0.5">{(selected as any).admission_number || selected.username}</p>
                                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                    {currentClass?.name}
                                </span>
                            </div>

                            <div className="space-y-2.5 text-sm">
                                {[
                                    { label: 'Email', value: selected.email, icon: <Mail size={12} /> },
                                    { label: 'Phone', value: selected.phone || 'N/A', icon: <Phone size={12} /> },
                                    { label: 'Gender', value: (selected as any).gender === 'M' ? 'Male' : (selected as any).gender === 'F' ? 'Female' : 'N/A', icon: <UserCircle size={12} /> },
                                    { label: 'Date of Birth', value: selected.date_of_birth || 'N/A', icon: <Calendar size={12} /> },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-slate-500 shrink-0 mt-0.5">{icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-slate-500 text-xs">{label}</p>
                                            <p className="text-white text-xs font-medium truncate">{String(value)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <UserCircle size={40} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">Select a pupil to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
