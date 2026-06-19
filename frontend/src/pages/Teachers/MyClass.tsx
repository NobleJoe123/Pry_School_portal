import { useState, useEffect } from 'react';
import {
    Users, Search, UserCircle, Phone, Mail, Calendar, MapPin,
    GraduationCap, BookOpen, CalendarCheck, Clock, Award, ShieldAlert, X, AlignLeft, CheckCircle,
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User, StudentScore } from '../../types';

interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent' | 'late';
}

interface BehaviorNote {
    id: string;
    note: string;
    created_at: string;
    category: 'positive' | 'warning' | 'critical';
}

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

    // Selected Pupil Profile Overlay
    const [selectedPupil, setSelectedPupil] = useState<User | null>(null);
    const [activeProfileTab, setActiveProfileTab] = useState<'basic' | 'attendance' | 'academic' | 'behavior' | 'parent'>('basic');

    // Sub-data for the selected pupil
    const [pupilScores, setPupilScores] = useState<StudentScore[]>([]);
    const [behaviorNotes, setBehaviorNotes] = useState<BehaviorNote[]>([]);
    const [newBehaviorNote, setNewBehaviorNote] = useState('');
    const [behaviorCategory, setBehaviorCategory] = useState<'positive' | 'warning' | 'critical'>('positive');

    // Fetch initial classes
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

    // Fetch student lists in class
    useEffect(() => {
        if (!selectedClassId) return;
        setLoading(true);
        api.get<any>(`${endpoints.students.list}?school_class=${selectedClassId}`)
            .then(res => setStudents(getList<User>(res)))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedClassId]);

    // Fetch student scores and behavior notes when selected pupil changes
    useEffect(() => {
        if (!selectedPupil) return;

        // Fetch academic scores
        api.get<any>(`${endpoints.academics.scores}?student=${selectedPupil.id}`)
            .then(res => setPupilScores(getList<StudentScore>(res)))
            .catch(err => console.error("Error loading scores", err));

        // Load behavior notes from localStorage
        const storedNotes = localStorage.getItem(`behavior_notes_${selectedPupil.id}`);
        if (storedNotes) {
            setBehaviorNotes(JSON.parse(storedNotes));
        } else {
            const initialNotes: BehaviorNote[] = [
                {
                    id: '1',
                    note: 'Consistently helpful during clean-up and group classroom work.',
                    created_at: new Date(Date.now() - 86400000 * 4).toLocaleDateString(),
                    category: 'positive'
                }
            ];
            setBehaviorNotes(initialNotes);
            localStorage.setItem(`behavior_notes_${selectedPupil.id}`, JSON.stringify(initialNotes));
        }
    }, [selectedPupil]);

    // Add Behavior Note Action
    const handleAddBehaviorNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPupil || !newBehaviorNote.trim()) return;

        const newNote: BehaviorNote = {
            id: Math.random().toString(36).substr(2, 9),
            note: newBehaviorNote,
            created_at: new Date().toLocaleDateString(),
            category: behaviorCategory
        };

        const updated = [newNote, ...behaviorNotes];
        setBehaviorNotes(updated);
        localStorage.setItem(`behavior_notes_${selectedPupil.id}`, JSON.stringify(updated));
        setNewBehaviorNote('');
    };

    const handleDeleteBehaviorNote = (id: string) => {
        if (!selectedPupil) return;
        const updated = behaviorNotes.filter(n => n.id !== id);
        setBehaviorNotes(updated);
        localStorage.setItem(`behavior_notes_${selectedPupil.id}`, JSON.stringify(updated));
    };

    const filtered = students.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        ((s as any).admission_number || '').toLowerCase().includes(search.toLowerCase())
    );

    const currentClass = myClasses.find(c => c.id === selectedClassId);

    // Mock Attendance history stats
    const mockAttendance: AttendanceRecord[] = [
        { date: '2026-06-15', status: 'present' },
        { date: '2026-06-16', status: 'present' },
        { date: '2026-06-17', status: 'late' },
        { date: '2026-06-18', status: 'present' },
        { date: '2026-06-19', status: 'absent' },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        My Class Room
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Manage pupils cards, view details, behaviors, and academic cards.
                    </p>
                </div>
                {myClasses.length > 1 && (
                    <div className="flex gap-2">
                        {myClasses.map(cls => (
                            <button key={cls.id}
                                onClick={() => setSelectedClassId(cls.id)}
                                className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${selectedClassId === cls.id
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

            {/* Summary counters */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Pupils', value: students.length, icon: <Users size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/15' },
                    { label: 'Class Group', value: currentClass?.name || '—', icon: <GraduationCap size={16} />, color: 'text-sky-400', bg: 'bg-sky-500/15' },
                    { label: 'Academic Level', value: (currentClass as any)?.level_name || 'Primary', icon: <BookOpen size={16} />, color: 'text-violet-400', bg: 'bg-violet-500/15' },
                ].map(({ label, value, icon, color, bg }) => (
                    <div key={label} className="rounded-2xl border border-white/5 p-4 flex items-center gap-3 bg-white/5">
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

            {/* Search filter bar */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or admission number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    />
                </div>
            </div>

            {/* Pupils responsive Grid of Cards */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-44 rounded-3xl bg-white/5 border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-white/5 rounded-3xl">
                    <Users size={36} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No pupils match the filter criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filtered.map(student => {
                        const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;
                        const photoUrl = student.profile_photo_url || (student as any).profile_photo;

                        return (
                            <div
                                key={student.id}
                                onClick={() => { setSelectedPupil(student); setActiveProfileTab('basic'); }}
                                className="bg-white/5 border border-white/5 hover:border-white/15 rounded-3xl p-5 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.01] relative group overflow-hidden"
                            >
                                {/* Top colored banner inside card */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500/80 to-amber-600/80" />

                                {/* Avatar Passport */}
                                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-lg shrink-0 mb-4 mt-2">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt={student.full_name} className="w-full h-full object-cover" />
                                    ) : initials || <UserCircle size={28} />}
                                </div>

                                <h3 className="text-white text-sm font-bold group-hover:text-amber-400 transition-colors line-clamp-1">{student.full_name}</h3>
                                <p className="text-slate-500 text-[10px] font-mono mt-0.5">{(student as any).admission_number || student.username}</p>

                                <span className="inline-block mt-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                    {currentClass?.name || 'Class Room'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Complete pupil profile overlay page drawer */}
            {selectedPupil && (
                <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setSelectedPupil(null)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                    <div
                        className="relative w-full max-w-2xl h-full bg-slate-900 border-l border-white/10 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-sm shrink-0">
                                    {selectedPupil.profile_photo_url || (selectedPupil as any).profile_photo ? (
                                        <img src={selectedPupil.profile_photo_url || (selectedPupil as any).profile_photo} alt={selectedPupil.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        `${selectedPupil.first_name?.[0] || ''}${selectedPupil.last_name?.[0] || ''}`
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base leading-tight">{selectedPupil.full_name}</h3>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(selectedPupil as any).admission_number || selectedPupil.username}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPupil(null)} className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Profile Tabs */}
                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 mb-6 overflow-x-auto shrink-0">
                            {[
                                { key: 'basic', label: 'Basic Info' },
                                { key: 'attendance', label: 'Attendance' },
                                { key: 'academic', label: 'Academics' },
                                { key: 'behavior', label: 'Behavior Notes' },
                                { key: 'parent', label: 'Parent Details' }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveProfileTab(tab.key as any)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeProfileTab === tab.key
                                            ? 'bg-amber-500 text-slate-950 font-black'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Active Tab Screen Area */}
                        <div className="flex-1 space-y-6 text-xs text-slate-300">

                            {/* 1. Basic Details */}
                            {activeProfileTab === 'basic' && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Pupil Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'First Name', value: selectedPupil.first_name, icon: <UserCircle size={14} /> },
                                            { label: 'Last Name', value: selectedPupil.last_name, icon: <UserCircle size={14} /> },
                                            { label: 'Gender', value: (selectedPupil as any).gender === 'M' ? 'Male' : (selectedPupil as any).gender === 'F' ? 'Female' : '—', icon: <AlignLeft size={14} /> },
                                            { label: 'Date of Birth', value: selectedPupil.date_of_birth || 'N/A', icon: <Calendar size={14} /> },
                                            { label: 'Email', value: selectedPupil.email, icon: <Mail size={14} /> },
                                            { label: 'Phone Number', value: selectedPupil.phone || 'N/A', icon: <Phone size={14} /> },
                                            { label: 'Current Address', value: selectedPupil.address || 'N/A', icon: <MapPin size={14} />, fullWidth: true }
                                        ].map((item, idx) => (
                                            <div key={idx} className={`p-3 bg-white/5 rounded-xl border border-white/5 ${item.fullWidth ? 'col-span-2' : ''}`}>
                                                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                                    {item.icon}
                                                    <span>{item.label}</span>
                                                </div>
                                                <p className="text-white text-xs font-semibold">{String(item.value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. Attendance History */}
                            {activeProfileTab === 'attendance' && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Attendance Summary</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center">
                                            <p className="text-base font-black">62</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Days Present</p>
                                        </div>
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-center">
                                            <p className="text-base font-black">2</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Days Absent</p>
                                        </div>
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-center">
                                            <p className="text-base font-black">96.8%</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Term Rate</p>
                                        </div>
                                    </div>

                                    <h4 className="text-xs font-bold text-white mt-6">Recent Records</h4>
                                    <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                        {mockAttendance.map((rec, i) => (
                                            <div key={i} className="flex justify-between items-center p-3.5 bg-white/5">
                                                <span className="font-mono text-xs">{rec.date}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${rec.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        rec.status === 'late' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                                                    }`}>
                                                    {rec.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. Academic Performance */}
                            {activeProfileTab === 'academic' && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Academic Scores</h4>
                                    <div className="rounded-xl border border-white/5 overflow-hidden bg-white/5 divide-y divide-white/5">
                                        {pupilScores.map(score => {
                                            const assessment = (score as any).assessment;
                                            return (
                                                <div key={score.id} className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-white font-bold text-xs">{assessment?.subject?.name || 'Subject'}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{assessment?.assessment_type?.name || 'Assessment'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-mono font-black text-sm text-amber-400">{score.score_obtained}</span>
                                                        <span className="text-[10px] text-slate-500"> / {assessment?.assessment_type?.max_score}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {pupilScores.length === 0 && (
                                            <p className="p-8 text-center text-slate-500">No grades registered for this student yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 4. Behavior Notes */}
                            {activeProfileTab === 'behavior' && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Behavior & Conduct Log</h4>

                                    {/* Add note form */}
                                    <form onSubmit={handleAddBehaviorNote} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                        <textarea
                                            value={newBehaviorNote} onChange={e => setNewBehaviorNote(e.target.value)} required rows={2}
                                            placeholder="Write conduct or behavior observation remark..."
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
                                        />
                                        <div className="flex justify-between items-center">
                                            <select
                                                value={behaviorCategory}
                                                onChange={e => setBehaviorCategory(e.target.value as any)}
                                                className="bg-slate-950 border border-white/10 text-xs px-2.5 py-1.5 rounded-lg text-white outline-none"
                                            >
                                                <option value="positive">Positive conduct</option>
                                                <option value="warning">Minor warning</option>
                                                <option value="critical">Critical infraction</option>
                                            </select>
                                            <button type="submit" className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black">
                                                Add Log
                                            </button>
                                        </div>
                                    </form>

                                    {/* Notes list */}
                                    <div className="space-y-3">
                                        {behaviorNotes.map(n => (
                                            <div key={n.id} className="p-3.5 bg-white/5 rounded-xl border border-white/5 flex gap-3 relative justify-between">
                                                <div className="flex gap-2">
                                                    <div className="mt-0.5 shrink-0">
                                                        {n.category === 'positive' && <CheckCircle size={14} className="text-emerald-400" />}
                                                        {n.category === 'warning' && <Clock size={14} className="text-amber-400" />}
                                                        {n.category === 'critical' && <ShieldAlert size={14} className="text-rose-400" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-xs leading-relaxed">{n.note}</p>
                                                        <span className="text-[9px] text-slate-500 font-mono mt-1 block">{n.created_at}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteBehaviorNote(n.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1 self-start">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        {behaviorNotes.length === 0 && (
                                            <p className="text-center py-6 text-slate-500">No behavior entries recorded.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 5. Parent Information */}
                            {activeProfileTab === 'parent' && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Parent / Guardian Contact</h4>

                                    {(selectedPupil as any).student_profile?.parent_name ? (
                                        <div className="space-y-3 text-xs">
                                            {[
                                                { label: 'Parent Name', value: (selectedPupil as any).student_profile?.parent_name, icon: <UserCircle size={14} /> },
                                                { label: 'Parent Email', value: (selectedPupil as any).student_profile?.parent_email, icon: <Mail size={14} /> },
                                                { label: 'Parent Phone', value: (selectedPupil as any).student_profile?.parent_phone || 'N/A', icon: <Phone size={14} /> },
                                            ].map((item, idx) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-start gap-2.5">
                                                    <span className="text-slate-500 shrink-0 mt-0.5">{item.icon}</span>
                                                    <div>
                                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{item.label}</p>
                                                        <p className="text-white text-xs font-semibold mt-0.5">{String(item.value)}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="pt-2">
                                                <a
                                                    href={`mailto:${(selectedPupil as any).student_profile?.parent_email}`}
                                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all"
                                                >
                                                    <Mail size={14} /> Email Parent Direct
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center border border-white/5 rounded-xl bg-white/5">
                                            <p className="text-slate-500 text-xs">No linked parent account information available.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
