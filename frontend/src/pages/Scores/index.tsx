import { useState, useEffect } from 'react';
import { 
    Users, 
    BookOpen, 
    Award, 
    Save, 
    RotateCcw,
    CheckCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User, Subject, AssessmentType } from '../../types';

export default function Scores() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
    
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>('');
    
    const [students, setStudents] = useState<User[]>([]);
    const [scores, setScores] = useState<Record<string, { score: string, remarks: string }>>({});
    
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    // Fetch initial meta data (Classes, Subjects, AssessmentTypes)
    // For teachers: filter classes to their assigned class only
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.subjects),
            api.get<any>(endpoints.academics.assessmentTypes)
        ]).then(([classesRes, subjectsRes, typesRes]) => {
            const getList = (val: any) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (val.results && Array.isArray(val.results)) return val.results;
                return [];
            };
            
            let classList = getList(classesRes);
            // If logged-in user is a teacher, only show their assigned class(es)
            if (user?.role === 'teacher') {
                classList = classList.filter(
                    (c: any) => c.teacher === user?.id || c.teacher_name === user?.full_name
                );
            }
            const subjectList = getList(subjectsRes);
            const typeList = getList(typesRes);
            
            setClasses(classList);
            setSubjects(subjectList);
            setAssessmentTypes(typeList);
            
            if (classList.length > 0) setSelectedClass(classList[0].id);
            if (subjectList.length > 0) setSelectedSubject(subjectList[0].id);
            if (typeList.length > 0) setSelectedAssessmentType(typeList[0].id);
            
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load initial data", err);
            setLoading(false);
        });
    }, []);

    // Fetch students and existing scores when selection changes
    useEffect(() => {
        if (!selectedClass || !selectedSubject || !selectedAssessmentType) return;
        setLoading(true);
        
        api.get<any>(`${endpoints.students.list}?school_class=${selectedClass}`)
            .then(async data => {
                const getList = (val: any) => {
                    if (!val) return [];
                    if (Array.isArray(val)) return val;
                    if (val.results && Array.isArray(val.results)) return val.results;
                    return [];
                };
                const studentList = getList(data);
                setStudents(studentList);
                
                try {
                    // Fetch existing scores
                    const scoresRes = await api.get<any>(`${endpoints.academics.scores}?school_class=${selectedClass}&subject=${selectedSubject}&assessment_type=${selectedAssessmentType}&term=REPLACE_WITH_CURRENT_TERM_ID`);
                    const existingScores = getList(scoresRes);
                    
                    const initial: Record<string, { score: string, remarks: string }> = {};
                    studentList.forEach((s: User) => {
                        const existing = existingScores.find((sc: any) => sc.student === s.id || (sc.student && sc.student.id === s.id) || sc.student_id === s.id);
                        initial[s.id] = { 
                            score: existing && existing.score_obtained !== null ? existing.score_obtained.toString() : '', 
                            remarks: existing ? (existing.remarks || '') : '' 
                        };
                    });
                    setScores(initial);
                } catch (err) {
                    console.error("Error fetching existing scores", err);
                    const initial: Record<string, { score: string, remarks: string }> = {};
                    studentList.forEach((s: User) => {
                        initial[s.id] = { score: '', remarks: '' };
                    });
                    setScores(initial);
                }
                
                setLoading(false);
            });
    }, [selectedClass, selectedSubject, selectedAssessmentType, classes]);

    const handleScoreChange = (studentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], score: val }
        }));
    };
    
    const handleRemarkChange = (studentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], remarks: val }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess('');
        try {
            const records = Object.entries(scores)
                // Filter out empty score strings unless they are intentionally being cleared
                .map(([studentId, data]) => ({
                    student_id: studentId,
                    score_obtained: data.score === '' ? null : parseFloat(data.score),
                    remarks: data.remarks
                }));

            await api.post(`${endpoints.academics.scores}bulk_record/`, {
                school_class: selectedClass,
                subject: selectedSubject,
                assessment_type: selectedAssessmentType,
                term: 'REPLACE_WITH_CURRENT_TERM_ID',
                date: new Date().toISOString().split('T')[0],
                records
            });
            setSuccess('Scores recorded successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const selectedTypeMax = assessmentTypes.find(t => t.id === selectedAssessmentType)?.max_score || 100;

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Record Scores</h1>
                    <p className="text-slate-500 text-sm">Input and manage student assessments</p>
                </div>
            </div>

            {/* Selection Bar */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <select 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 min-w-[140px]"
                    >
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-slate-400" />
                    <select 
                        value={selectedSubject} 
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 min-w-[140px]"
                    >
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <Award size={16} className="text-slate-400" />
                    <select 
                        value={selectedAssessmentType} 
                        onChange={(e) => setSelectedAssessmentType(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 min-w-[140px]"
                    >
                        {assessmentTypes.map(t => <option key={t.id} value={t.id}>{t.name} (Max: {t.max_score})</option>)}
                    </select>
                </div>
                
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => window.location.reload()} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score (Max: {selectedTypeMax})</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => {
                                    const val = scores[student.id]?.score || '';
                                    const isInvalid = val !== '' && (isNaN(parseFloat(val)) || parseFloat(val) < 0 || parseFloat(val) > selectedTypeMax);
                                    
                                    return (
                                        <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] font-bold">
                                                        {student.first_name[0]}{student.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{student.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{(student as any).student_profile?.admission_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    min="0"
                                                    max={selectedTypeMax}
                                                    placeholder="-" 
                                                    className={`w-24 bg-white/5 border rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none transition-colors ${isInvalid ? 'border-red-500 text-red-400 focus:border-red-500' : 'border-white/5 focus:border-amber-500/50'}`}
                                                    value={val}
                                                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add note..." 
                                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
                                                    value={scores[student.id]?.remarks || ''}
                                                    onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500 text-sm">
                                            No students found in this class.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Save */}
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{students.length} Total Students</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {success && (
                                <span className="text-emerald-400 text-sm font-bold flex items-center gap-2 animate-bounce">
                                    <CheckCircle size={16} /> {success}
                                </span>
                            )}
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-sm transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Scores'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
