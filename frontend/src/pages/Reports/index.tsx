import { useState, useEffect } from 'react';
import { 
    Users, BookOpen, Award, FileText, CheckCircle, 
    RefreshCw, Save, Search, ChevronRight, Eye, X, HelpCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { SchoolClass, Term, User, StudentScore } from '../../types';

interface ReportCardData {
    id?: string;
    student: string;
    term: string;
    remarks: string;
    is_published: boolean;
}

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    
    const [students, setStudents] = useState<User[]>([]);
    const [scores, setScores] = useState<StudentScore[]>([]);
    const [reports, setReports] = useState<ReportCardData[]>([]);
    
    // Admin draft comments & publish states
    const [draftComments, setDraftComments] = useState<Record<string, string>>({});
    const [publishStates, setPublishStates] = useState<Record<string, boolean>>({});
    
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    
    // Search filter
    const [search, setSearch] = useState('');
    
    // Drawer details for verification
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

    const getList = <T,>(val: any): T[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (val.results && Array.isArray(val.results)) return val.results;
        return [];
    };

    // Load initial metadata
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.terms)
        ]).then(([classesRes, termsRes]) => {
            const classList = getList<SchoolClass>(classesRes);
            const termList = getList<Term>(termsRes);
            
            setClasses(classList);
            setTerms(termList);
            
            if (classList.length > 0) setSelectedClassId(classList[0].id);
            
            const currentTerm = termList.find((t: Term) => t.is_current);
            if (currentTerm) {
                setSelectedTermId(currentTerm.id);
            } else if (termList.length > 0) {
                setSelectedTermId(termList[0].id);
            }
        }).catch(err => {
            console.error("Error loading initial data", err);
        }).finally(() => setLoading(false));
    }, []);

    // Load students, scores, and report cards when Class or Term selection changes
    const loadReportData = async (silent = false) => {
        if (!selectedClassId || !selectedTermId) return;
        if (!silent) setLoading(true); else setRefreshing(true);
        
        try {
            const className = classes.find(c => c.id === selectedClassId)?.name || '';
            const [studentsRes, scoresRes, reportsRes] = await Promise.all([
                api.get<any>(`${endpoints.students.list}?class=${encodeURIComponent(className)}`),
                api.get<any>(`${endpoints.academics.scores}?school_class=${selectedClassId}&term=${selectedTermId}`),
                api.get<any>(`${endpoints.academics.reportCards}?term=${selectedTermId}`)
            ]);
            
            const studentList = getList<User>(studentsRes);
            const scoreList = getList<StudentScore>(scoresRes);
            const reportList = getList<ReportCardData>(reportsRes);
            
            setStudents(studentList);
            setScores(scoreList);
            setReports(reportList);
            
            // Map reports database state to drafts
            const initialComments: Record<string, string> = {};
            const initialPublish: Record<string, boolean> = {};
            
            studentList.forEach((student: User) => {
                const rep = reportList.find((r: ReportCardData) => r.student === student.id);
                initialComments[student.id] = rep ? (rep.remarks || '') : '';
                initialPublish[student.id] = rep ? rep.is_published : false;
            });
            
            setDraftComments(initialComments);
            setPublishStates(initialPublish);
        } catch (err) {
            console.error("Error loading report details", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadReportData();
    }, [selectedClassId, selectedTermId]);

    // Grouping scores helper for a specific student
    const getStudentReportData = (studentId: string) => {
        const studentScores = scores.filter(s => s.student === studentId || (s.student as any)?.id === studentId);
        
        const grouped: Record<string, {
            subjectName: string;
            assessments: { name: string; score: number; max: number }[];
            totalScore: number;
            totalMax: number;
        }> = {};

        studentScores.forEach(s => {
            const assessment = (s as any).assessment;
            if (!assessment || !assessment.subject) return;
            const subjectId = assessment.subject.id;
            const subjectName = assessment.subject.name;
            
            if (!grouped[subjectId]) {
                grouped[subjectId] = {
                    subjectName,
                    assessments: [],
                    totalScore: 0,
                    totalMax: 0
                };
            }
            
            const score = Number(s.score_obtained) || 0;
            const max = Number(assessment.assessment_type?.max_score) || 100;
            
            grouped[subjectId].assessments.push({
                name: assessment.assessment_type?.name || assessment.name,
                score,
                max
            });
            grouped[subjectId].totalScore += score;
            grouped[subjectId].totalMax += max;
        });

        const subjects = Object.values(grouped);
        
        // Term average calculation
        const average = subjects.length > 0
            ? subjects.reduce((sum, s) => sum + (s.totalScore / s.totalMax) * 100, 0) / subjects.length
            : 0;

        return {
            subjects,
            average
        };
    };

    const handleSaveAndPublish = async () => {
        setSaving(true);
        setSuccess('');
        try {
            const records = students.map(s => ({
                student_id: s.id,
                remarks: draftComments[s.id] || '',
                is_published: publishStates[s.id] || false
            }));

            await api.post(`${endpoints.academics.reportCards}bulk_comment_and_publish/`, {
                term: selectedTermId,
                records
            });
            
            setSuccess('Reports verified and updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
            loadReportData(true);
        } catch (err: any) {
            alert(err.message || 'Failed to publish reports.');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s as any).student_profile?.admission_number?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Verify & Publish Reports</h1>
                    <p className="text-slate-500 text-sm">Review pupil scores, append admin feedback, and publish report cards to parent dashboards.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadReportData(true)} disabled={refreshing}
                        className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    
                    {success && (
                        <span className="text-emerald-400 text-sm font-bold flex items-center gap-1.5 mr-2 animate-bounce">
                            <CheckCircle size={16} /> {success}
                        </span>
                    )}

                    <button 
                        onClick={handleSaveAndPublish}
                        disabled={saving || students.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <Save size={16} />
                        {saving ? 'Uploading...' : 'Save & Upload Reports'}
                    </button>
                </div>
            </div>

            {/* Selection bar */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-emerald-500/50 min-w-[150px]"
                    >
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <select 
                        value={selectedTermId} 
                        onChange={(e) => setSelectedTermId(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-emerald-500/50 min-w-[200px]"
                    >
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name} ({t.academic_year_name})</option>)}
                    </select>
                </div>

                <div className="relative flex-1 max-w-xs ml-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search pupils..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50" 
                    />
                </div>
            </div>

            {/* Verification Table */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pupil</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Avg. Score</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Comment/Feedback</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Publish</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Verify Details</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {filteredStudents.map(student => {
                                    const { average } = getStudentReportData(student.id);
                                    const comment = draftComments[student.id] || '';
                                    const isPublished = publishStates[student.id] || false;

                                    return (
                                        <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-[10px]">
                                                        {student.first_name[0]}{student.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{student.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{(student as any).student_profile?.admission_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                                                    average >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
                                                    average >= 50 ? 'bg-amber-500/10 text-amber-400' :
                                                    average > 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-slate-500'
                                                }`}>
                                                    {average > 0 ? average.toFixed(1) + '%' : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="text" value={comment}
                                                    onChange={e => setDraftComments({ ...draftComments, [student.id]: e.target.value })}
                                                    placeholder="e.g. Excellent term performance. Keep it up..."
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 placeholder-slate-700"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input 
                                                    type="checkbox" checked={isPublished}
                                                    onChange={e => setPublishStates({ ...publishStates, [student.id]: e.target.checked })}
                                                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="inline-flex items-center justify-center p-2 bg-white/5 hover:bg-emerald-500 hover:text-slate-950 text-slate-400 rounded-xl transition-all border border-white/10"
                                                    title="Verify detailed scores"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-slate-500">
                                            <HelpCircle size={36} className="mx-auto mb-2 opacity-30" />
                                            No student records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Result Verification Drawer */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedStudent(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div 
                        className="relative w-full max-w-md h-full bg-slate-900 border-l border-white/10 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                            <div>
                                <h3 className="text-white font-black text-lg">Verify Academic Scores</h3>
                                <p className="text-slate-500 text-xs mt-0.5">{selectedStudent.full_name} — Reports Check</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Subject Details */}
                        <div className="flex-1 space-y-4">
                            {getStudentReportData(selectedStudent.id).subjects.map((subj, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                            <BookOpen size={14} className="text-emerald-400" />
                                            {subj.subjectName}
                                        </h4>
                                        <span className="font-bold text-xs text-emerald-400">
                                            Total: {subj.totalScore}/{subj.totalMax} ({((subj.totalScore / subj.totalMax) * 100).toFixed(0)}%)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {subj.assessments.map((a, i) => (
                                            <div key={i} className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-center">
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{a.name}</span>
                                                <span className="text-xs font-mono text-white mt-0.5">{a.score} / {a.max}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {getStudentReportData(selectedStudent.id).subjects.length === 0 && (
                                <p className="text-slate-500 text-center text-xs py-8">No scores recorded for this pupil yet.</p>
                            )}
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center">
                            <span className="text-slate-400 text-xs">Termly Aggregated Average:</span>
                            <span className="text-white font-black text-lg font-mono">
                                {getStudentReportData(selectedStudent.id).average.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
