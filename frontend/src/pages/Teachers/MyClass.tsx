import { useState, useEffect } from 'react';
import {
    Users, Search, UserCircle, Phone, Mail, Calendar, MapPin,
    GraduationCap, BookOpen, CalendarCheck, Clock, Award, ShieldAlert, X, AlignLeft, CheckCircle,
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User, StudentScore } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

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

            {/* Main content grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pupil List Column */}
                <div className="lg:col-span-2 rounded-2xl border border-white/5 overflow-hidden flex flex-col bg-white/5">
                    {/* Search filter bar */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
                        <div className="relative flex-1">
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

                    {/* Scrollable list of pupil rows */}
                    <div className="divide-y divide-white/5 overflow-y-auto max-h-[600px]">
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
                                <Users size={36} className="text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">No pupils match the filter criteria.</p>
                            </div>
                        ) : (
                            filtered.map((student, idx) => {
                                const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;
                                const photoUrl = student.profile_photo_url || (student as any).profile_photo;
                                const isSelected = selectedPupil?.id === student.id;

                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => { setSelectedPupil(isSelected ? null : student); setActiveProfileTab('basic'); }}
                                        className={`flex items-center gap-3 w-full px-5 py-3.5 text-left transition-all hover:bg-white/5 relative group overflow-hidden ${isSelected ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={student.full_name} className="w-full h-full object-cover" />
                                            ) : initials || <UserCircle size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-semibold truncate group-hover:text-amber-400 transition-colors">{student.full_name}</p>
                                            <p className="text-slate-500 text-xs">{(student as any).admission_number || student.username}</p>
                                        </div>
                                        <span className="text-slate-600 text-xs font-mono">#{idx + 1}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Pupil Detail Panel Column */}
                <div className="rounded-2xl border border-white/5 p-5 h-fit flex flex-col bg-white/5">
                    {selectedPupil ? (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            {/* Panel Header */}
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-sm shrink-0">
                                    {selectedPupil.profile_photo_url || (selectedPupil as any).profile_photo ? (
                                        <img src={selectedPupil.profile_photo_url || (selectedPupil as any).profile_photo} alt={selectedPupil.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        `${selectedPupil.first_name?.[0] || ''}${selectedPupil.last_name?.[0] || ''}`
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-white font-bold text-sm leading-tight truncate">{selectedPupil.full_name}</h3>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{(selectedPupil as any).admission_number || selectedPupil.username}</p>
                                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5 mt-1.5">
                                        {currentClass?.name || 'Class Room'}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedPupil(null)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-all self-start">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Profile Tabs */}
                            <div className="flex gap-1.5 p-1 bg-slate-900 border border-white/5 rounded-xl overflow-x-auto scrollbar-none shrink-0">
                                {[
                                    { key: 'basic', label: 'Basic' },
                                    { key: 'attendance', label: 'Attendance' },
                                    { key: 'academic', label: 'Academics' },
                                    { key: 'behavior', label: 'Behavior' },
                                    { key: 'parent', label: 'Parent' }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveProfileTab(tab.key as any)}
                                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center ${activeProfileTab === tab.key
                                                ? 'bg-amber-500 text-slate-950 font-black'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Active Tab Content Area */}
                            <div className="space-y-4 text-xs text-slate-300">
                                {/* 1. Basic Details */}
                                {activeProfileTab === 'basic' && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-white border-b border-white/5 pb-1">Pupil Information</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'First Name', value: selectedPupil.first_name, icon: <UserCircle size={12} /> },
                                                { label: 'Last Name', value: selectedPupil.last_name, icon: <UserCircle size={12} /> },
                                                { label: 'Gender', value: (selectedPupil as any).gender === 'M' ? 'Male' : (selectedPupil as any).gender === 'F' ? 'Female' : '—', icon: <AlignLeft size={12} /> },
                                                { label: 'Date of Birth', value: selectedPupil.date_of_birth || 'N/A', icon: <Calendar size={12} /> },
                                                { label: 'Email', value: selectedPupil.email, icon: <Mail size={12} />, fullWidth: true },
                                                { label: 'Phone Number', value: selectedPupil.phone || 'N/A', icon: <Phone size={12} /> },
                                                { label: 'Current Address', value: selectedPupil.address || 'N/A', icon: <MapPin size={12} />, fullWidth: true }
                                            ].map((item, idx) => (
                                                <div key={idx} className={`p-2.5 bg-slate-900 rounded-lg border border-white/5 ${item.fullWidth ? 'col-span-2' : ''}`}>
                                                    <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                                                        {item.icon}
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <p className="text-white text-xs font-semibold truncate">{String(item.value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 2. Attendance History */}
                                {activeProfileTab === 'attendance' && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-white border-b border-white/5 pb-1">Attendance Summary</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-center">
                                                <p className="text-sm font-black">62</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">Present</p>
                                            </div>
                                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-center">
                                                <p className="text-sm font-black">2</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">Absent</p>
                                            </div>
                                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-center">
                                                <p className="text-sm font-black">96.8%</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">Rate</p>
                                            </div>
                                        </div>

                                        <h4 className="text-[10px] font-bold text-white mt-4">Recent Records</h4>
                                        <div className="rounded-lg border border-white/5 overflow-hidden divide-y divide-white/5">
                                            {mockAttendance.map((rec, i) => (
                                                <div key={i} className="flex justify-between items-center p-2.5 bg-slate-900">
                                                    <span className="font-mono text-[10px]">{rec.date}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${rec.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
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
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-white border-b border-white/5 pb-1">Academic Scores</h4>
                                        <div className="rounded-lg border border-white/5 overflow-hidden bg-slate-900 divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                                            {pupilScores.map(score => {
                                                const assessment = (score as any).assessment;
                                                return (
                                                    <div key={score.id} className="p-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-white font-bold text-[11px]">{assessment?.subject?.name || 'Subject'}</p>
                                                            <p className="text-[9px] text-slate-500 mt-0.5">{assessment?.assessment_type?.name || 'Assessment'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-mono font-black text-xs text-amber-400">{score.score_obtained}</span>
                                                            <span className="text-[9px] text-slate-500"> / {assessment?.assessment_type?.max_score}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {pupilScores.length === 0 && (
                                                <p className="p-6 text-center text-slate-500">No grades registered for this student yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 4. Behavior Notes */}
                                {activeProfileTab === 'behavior' && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-white border-b border-white/5 pb-1">Behavior & Conduct Log</h4>

                                        {/* Add note form */}
                                        <form onSubmit={handleAddBehaviorNote} className="p-3 bg-slate-900 rounded-lg border border-white/5 space-y-2.5">
                                            <textarea
                                                value={newBehaviorNote} onChange={e => setNewBehaviorNote(e.target.value)} required rows={2}
                                                placeholder="Write conduct observation remark..."
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
                                            />
                                            <div className="flex justify-between items-center gap-2">
                                                <FilterDropdown
                                                    value={behaviorCategory}
                                                    options={[
                                                        { id: 'positive', label: 'Positive conduct' },
                                                        { id: 'warning', label: 'Minor warning' },
                                                        { id: 'critical', label: 'Critical infraction' },
                                                    ]}
                                                    onChange={v => setBehaviorCategory(v as any)}
                                                    placeholder="Category"
                                                />
                                                <button type="submit" className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black">
                                                    Add Log
                                                </button>
                                            </div>
                                        </form>

                                        {/* Notes list */}
                                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                            {behaviorNotes.map(n => (
                                                <div key={n.id} className="p-2.5 bg-slate-900 rounded-lg border border-white/5 flex gap-2 relative justify-between">
                                                    <div className="flex gap-2">
                                                        <div className="mt-0.5 shrink-0">
                                                            {n.category === 'positive' && <CheckCircle size={12} className="text-emerald-400" />}
                                                            {n.category === 'warning' && <Clock size={12} className="text-amber-400" />}
                                                            {n.category === 'critical' && <ShieldAlert size={12} className="text-rose-400" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-xs leading-normal">{n.note}</p>
                                                            <span className="text-[8px] text-slate-500 font-mono mt-0.5 block">{n.created_at}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeleteBehaviorNote(n.id)} className="text-slate-500 hover:text-red-400 transition-colors p-0.5 self-start">
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}

                                            {behaviorNotes.length === 0 && (
                                                <p className="text-center py-4 text-slate-500">No behavior entries recorded.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 5. Parent Information */}
                                {activeProfileTab === 'parent' && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-white border-b border-white/5 pb-1">Parent / Guardian Contact</h4>

                                        {(selectedPupil as any).student_profile?.parent_name ? (
                                            <div className="space-y-2.5">
                                                {[
                                                    { label: 'Parent Name', value: (selectedPupil as any).student_profile?.parent_name, icon: <UserCircle size={12} /> },
                                                    { label: 'Parent Email', value: (selectedPupil as any).student_profile?.parent_email, icon: <Mail size={12} /> },
                                                    { label: 'Parent Phone', value: (selectedPupil as any).student_profile?.parent_phone || 'N/A', icon: <Phone size={12} /> },
                                                ].map((item, idx) => (
                                                    <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-white/5 flex items-start gap-2">
                                                        <span className="text-slate-500 shrink-0 mt-0.5">{item.icon}</span>
                                                        <div>
                                                            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">{item.label}</p>
                                                            <p className="text-white text-xs font-semibold mt-0.5">{String(item.value)}</p>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="pt-1.5">
                                                    <a
                                                        href={`mailto:${(selectedPupil as any).student_profile?.parent_email}`}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all"
                                                    >
                                                        <Mail size={12} /> Email Parent Direct
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-5 text-center border border-white/5 rounded-lg bg-slate-900">
                                                <p className="text-slate-500 text-[10px]">No linked parent account information available.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-24">
                            <UserCircle size={40} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">Select a pupil to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
