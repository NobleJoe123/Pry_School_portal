import { useState, useEffect } from 'react';
import { 
    Users, BookOpen, Award, FileText, CheckCircle, 
    RefreshCw, Save, Search, Eye, X, Printer, Download, GraduationCap, MapPin, Phone, Mail
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/anyilogo.png';
import type { SchoolClass, Term, User, StudentScore } from '../../types';

interface ReportCardData {
    id?: string;
    student: string;
    term: string;
    remarks: string;
    is_published: boolean;
}

const getList = <T,>(val: any): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.results && Array.isArray(val.results)) return val.results;
    return [];
};

export default function Reports() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Meta Filters
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    
    // Data List
    const [students, setStudents] = useState<User[]>([]);
    const [scores, setScores] = useState<StudentScore[]>([]);
    const [reports, setReports] = useState<ReportCardData[]>([]);
    
    // Remarks inputs
    const [teacherRemarks, setTeacherRemarks] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    
    // Preview drawer/modal state
    const [previewStudent, setPreviewStudent] = useState<User | null>(null);

    // Fetch initial metadata
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.terms)
        ]).then(([classesRes, termsRes]) => {
            let classList = getList<SchoolClass>(classesRes);
            const termList = getList<Term>(termsRes);

            // Filter classes for teacher
            if (user?.role === 'teacher') {
                classList = classList.filter(
                    (c: any) => c.teacher === user?.id || c.teacher_name === user?.full_name
                );
            }
            
            setClasses(classList);
            setTerms(termList);
            
            if (classList.length > 0) setSelectedClassId(classList[0].id);
            
            const currentTerm = termList.find((t: Term) => t.is_current) || termList[0];
            if (currentTerm) setSelectedTermId(currentTerm.id);
        }).catch(err => {
            console.error("Error loading initial data", err);
        }).finally(() => setLoading(false));
    }, [user]);

    // Load detailed reports and scores data
    const loadReportData = async (silent = false) => {
        if (!selectedClassId || !selectedTermId) return;
        if (!silent) setLoading(true); else setRefreshing(true);
        
        try {
            const currentClass = classes.find(c => c.id === selectedClassId);
            const className = currentClass ? currentClass.name : '';
            
            const [studentsRes, scoresRes, reportsRes] = await Promise.all([
                api.get<any>(`${endpoints.students.list}?school_class=${selectedClassId}`),
                api.get<any>(`${endpoints.academics.scores}?school_class=${selectedClassId}&term=${selectedTermId}`),
                api.get<any>(`${endpoints.academics.reportCards}?term=${selectedTermId}`)
            ]);
            
            const studentList = getList<User>(studentsRes);
            const scoreList = getList<StudentScore>(scoresRes);
            const reportList = getList<ReportCardData>(reportsRes);
            
            setStudents(studentList);
            setScores(scoreList);
            setReports(reportList);
            
            // Map remarks to states
            const remarksMap: Record<string, string> = {};
            studentList.forEach(s => {
                const rep = reportList.find(r => r.student === s.id);
                remarksMap[s.id] = rep ? (rep.remarks || '') : '';
            });
            setTeacherRemarks(remarksMap);
        } catch (err) {
            console.error("Error loading report details", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadReportData();
    }, [selectedClassId, selectedTermId, classes]);

    // Helper: calculate single student results
    const getStudentStatsAndResults = (studentId: string) => {
        const studentScores = scores.filter(s => s.student === studentId || (s.student as any)?.id === studentId);
        
        const grouped: Record<string, {
            subjectName: string;
            subjectCode: string;
            caScore: number;
            examScore: number;
            totalScore: number;
            grade: string;
        }> = {};

        studentScores.forEach(s => {
            const assessment = (s as any).assessment;
            if (!assessment || !assessment.subject) return;
            const subjectId = assessment.subject.id;
            const subjectName = assessment.subject.name;
            const subjectCode = assessment.subject.code || 'SUBJ';
            
            if (!grouped[subjectId]) {
                grouped[subjectId] = {
                    subjectName,
                    subjectCode,
                    caScore: 0,
                    examScore: 0,
                    totalScore: 0,
                    grade: 'F'
                };
            }

            const score = parseFloat(s.score_obtained as any) || 0;
            const typeName = assessment.assessment_type?.name?.toLowerCase() || '';

            if (typeName.includes('ca') || typeName.includes('continuous')) {
                grouped[subjectId].caScore = score;
            } else if (typeName.includes('exam') || typeName.includes('final')) {
                grouped[subjectId].examScore = score;
            } else {
                // Default fallback
                grouped[subjectId].caScore = score;
            }

            grouped[subjectId].totalScore = grouped[subjectId].caScore + grouped[subjectId].examScore;
            
            // Calculate Grade
            const total = grouped[subjectId].totalScore;
            if (total >= 75) grouped[subjectId].grade = 'A';
            else if (total >= 55) grouped[subjectId].grade = 'B';
            else if (total >= 45) grouped[subjectId].grade = 'C';
            else if (total >= 30) grouped[subjectId].grade = 'D';
            else grouped[subjectId].grade = 'F';
        });

        const subjectList = Object.values(grouped);
        const totalPoints = subjectList.reduce((sum, s) => sum + s.totalScore, 0);
        const average = subjectList.length > 0 ? totalPoints / subjectList.length : 0;

        return {
            subjects: subjectList,
            average,
            totalPoints
        };
    };

    // Save Remark for a pupil
    const handleSaveRemarks = async (studentId: string) => {
        setSaving(true);
        setSuccess('');
        try {
            const existingReport = reports.find(r => r.student === studentId);
            const remarkText = teacherRemarks[studentId] || '';

            if (existingReport && existingReport.id) {
                // Update
                await api.patch(`${endpoints.academics.reportCards}${existingReport.id}/`, {
                    remarks: remarkText
                });
            } else {
                // Create
                await api.post(endpoints.academics.reportCards, {
                    student: studentId,
                    term: selectedTermId,
                    remarks: remarkText,
                    is_published: false
                });
            }

            setSuccess('Remarks updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
            loadReportData(true);
        } catch (err) {
            console.error(err);
            alert("Failed to save remarks.");
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filtered = students.filter(s => 
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s as any).student_profile?.admission_number?.toLowerCase().includes(search.toLowerCase())
    );

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activeClass = classes.find(c => c.id === selectedClassId);

    // Student specific preview details
    const previewData = previewStudent ? getStudentStatsAndResults(previewStudent.id) : null;
    const previewReportObj = previewStudent ? reports.find(r => r.student === previewStudent.id) : null;

    return (
        <div className="space-y-6 max-w-screen-xl print:p-0">
            {/* Screen Header - Hidden in Print */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Report Cards Generator</h1>
                    <p className="text-slate-500 text-sm">Generate, preview, print, and save termly report cards for pupils.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadReportData(true)} disabled={refreshing}
                        className="p-2.5 text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-all">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    {success && (
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5 mr-2 animate-bounce">
                            <CheckCircle size={14} /> {success}
                        </span>
                    )}
                </div>
            </div>

            {/* Selection Filters - Hidden in Print */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-3xl flex flex-wrap items-center gap-4 print:hidden">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <select 
                        value={selectedClassId} 
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500/50"
                    >
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <select 
                        value={selectedTermId} 
                        onChange={e => setSelectedTermId(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500/50"
                    >
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name} ({t.academic_year_name})</option>)}
                    </select>
                </div>

                <div className="relative flex-1 max-w-xs ml-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search pupils..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50" 
                    />
                </div>
            </div>

            {/* Verification Table List - Hidden in Print */}
            {loading ? (
                <div className="flex justify-center items-center py-20 print:hidden">
                    <div className="w-9 h-9 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden print:hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pupil</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Avg Score</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Teacher Remark</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {filtered.map(student => {
                                    const stats = getStudentStatsAndResults(student.id);
                                    const rep = reports.find(r => r.student === student.id);
                                    const remark = teacherRemarks[student.id] || '';

                                    return (
                                        <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                                                        {student.first_name[0]}{student.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-tight">{student.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(student as any).student_profile?.admission_number || student.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-white font-mono">{stats.average > 0 ? stats.average.toFixed(1) + '%' : '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" value={remark}
                                                        onChange={e => setTeacherRemarks({ ...teacherRemarks, [student.id]: e.target.value })}
                                                        placeholder="Add teacher comment..."
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                                                    />
                                                    <button onClick={() => handleSaveRemarks(student.id)} className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all font-bold">
                                                        <Save size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {rep?.is_published ? (
                                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold">Published</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-white/5 text-slate-400 border border-white/10 rounded-full text-[9px] font-bold">Draft</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => setPreviewStudent(student)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-xl border border-white/10 transition-all text-[11px] font-semibold"
                                                >
                                                    <Eye size={12} /> Preview
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-slate-500">No student records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print/Preview Overlay Modal */}
            {previewStudent && previewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:relative print:p-0 print:bg-white print:backdrop-blur-none">
                    {/* Modal container */}
                    <div className="relative w-full max-w-4xl h-[90vh] bg-slate-950 border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl print:w-full print:h-auto print:bg-white print:border-none print:rounded-none print:shadow-none">
                        
                        {/* Header options inside Modal - Hidden in Print */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm print:hidden shrink-0">
                            <div>
                                <h3 className="text-white font-bold text-base">Report Card Preview</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Verify and output pupil report sheet.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md">
                                    <Printer size={13} /> Print Report
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-bold rounded-xl transition-all">
                                    <Download size={13} /> Download PDF
                                </button>
                                <button onClick={() => setPreviewStudent(null)} className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Area */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-950 font-sans print:overflow-visible print:p-0">
                            <div className="max-w-3xl mx-auto space-y-6 relative border-4 border-double border-slate-300 p-8 rounded-2xl print:border-none print:p-0 print:rounded-none">
                                
                                {/* Watermark stamp background - Visual styling */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                                    <img src={logo} alt="Watermark" className="w-[300px] h-[300px] object-contain" />
                                </div>

                                {/* Report Card Header */}
                                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-5 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <img src={logo} alt="School Logo" className="w-16 h-16 object-contain shrink-0" />
                                        <div>
                                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Anyi Primary School</h2>
                                            <p className="text-xs text-slate-600 font-medium">Empowering tomorrow's leaders, today.</p>
                                            <div className="flex gap-4 text-[10px] text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><MapPin size={10} /> 12 School Road, Lagos</span>
                                                <span className="flex items-center gap-1"><Phone size={10} /> +234 800 123 4567</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right border-l pl-5 border-slate-300">
                                        <h3 className="text-lg font-black uppercase text-slate-800 tracking-wider">Report Card</h3>
                                        <p className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded mt-1">{activeTerm?.name || '1st Term'}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Session: {activeTerm?.academic_year_name}</p>
                                    </div>
                                </div>

                                {/* Pupil Info Block */}
                                <div className="grid grid-cols-3 gap-6 bg-slate-50 border rounded-xl p-4 text-xs relative z-10">
                                    <div className="col-span-2 space-y-2 border-r pr-6 border-slate-200">
                                        <div className="grid grid-cols-2 gap-y-1">
                                            <p className="text-slate-500">Student Full Name:</p>
                                            <p className="font-bold text-slate-900">{previewStudent.full_name}</p>
                                            
                                            <p className="text-slate-500">Admission Number:</p>
                                            <p className="font-mono font-bold text-slate-900">{(previewStudent as any).student_profile?.admission_number || 'ADM/2026/012'}</p>
                                            
                                            <p className="text-slate-500">Class:</p>
                                            <p className="font-bold text-slate-900">{activeClass?.name || 'Primary 1A'}</p>

                                            <p className="text-slate-500">Gender:</p>
                                            <p className="font-bold text-slate-900">{(previewStudent as any).gender === 'M' ? 'Male' : (previewStudent as any).gender === 'F' ? 'Female' : '—'}</p>
                                        </div>
                                    </div>

                                    {/* Passport area & QR code */}
                                    <div className="flex items-center justify-between pl-2">
                                        {/* Passport mock box */}
                                        <div className="w-16 h-16 rounded border bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0 overflow-hidden">
                                            {(previewStudent as any).profile_photo ? (
                                                <img src={(previewStudent as any).profile_photo} alt="Passport" className="w-full h-full object-cover" />
                                            ) : 'PASSPORT'}
                                        </div>

                                        {/* QR verification */}
                                        <div className="w-14 h-14 border border-slate-200 p-1 flex items-center justify-center shrink-0" title="QR Verification Code">
                                            {/* Simulated QR block code */}
                                            <div className="grid grid-cols-5 gap-[1px] w-full h-full opacity-60">
                                                {Array.from({ length: 25 }).map((_, idx) => (
                                                    <div key={idx} className={`w-full h-full ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-white'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Results Table */}
                                <div className="space-y-2 relative z-10">
                                    <h4 className="text-sm font-black text-slate-900 border-b pb-1">Academic Performance Summary</h4>
                                    <table className="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                                                <th className="px-4 py-2.5">Subject Code</th>
                                                <th className="px-4 py-2.5">Subject Description</th>
                                                <th className="px-4 py-2.5 text-center">CA (40)</th>
                                                <th className="px-4 py-2.5 text-center">Exam (60)</th>
                                                <th className="px-4 py-2.5 text-center">Total (100)</th>
                                                <th className="px-4 py-2.5 text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.subjects.map((sub, i) => (
                                                <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                                                    <td className="px-4 py-2 font-mono font-bold">{sub.subjectCode}</td>
                                                    <td className="px-4 py-2 font-semibold text-slate-800">{sub.subjectName}</td>
                                                    <td className="px-4 py-2 text-center font-mono">{sub.caScore}</td>
                                                    <td className="px-4 py-2 text-center font-mono">{sub.examScore}</td>
                                                    <td className="px-4 py-2 text-center font-mono font-bold">{sub.totalScore}</td>
                                                    <td className="px-4 py-2 text-center font-black">
                                                        <span className="px-1.5 py-0.5 rounded">{sub.grade}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {previewData.subjects.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-6 text-slate-500">No subject records available.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Aggregate & Attendance row */}
                                <div className="grid grid-cols-2 gap-4 text-xs relative z-10 border-t pt-4">
                                    <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                                        <p className="font-bold text-slate-800">Termly Averages:</p>
                                        <div className="grid grid-cols-2 text-[11px] mt-1">
                                            <span className="text-slate-500">Total Score obtained:</span>
                                            <span className="font-bold font-mono">{previewData.totalPoints} pts</span>
                                            <span className="text-slate-500">Aggregate Average:</span>
                                            <span className="font-black text-sm font-mono text-indigo-600">{previewData.average.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                                        <p className="font-bold text-slate-800">Attendance Summary:</p>
                                        <div className="grid grid-cols-2 text-[11px] mt-1">
                                            <span className="text-slate-500">Total School Days:</span>
                                            <span className="font-bold">64 Days</span>
                                            <span className="text-slate-500">Days Present:</span>
                                            <span className="font-bold text-emerald-600">62 Days</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Remarks section */}
                                <div className="space-y-3 relative z-10">
                                    <div className="p-3.5 border rounded-xl bg-slate-50 text-xs">
                                        <p className="font-black text-slate-900 uppercase text-[9px] tracking-wider mb-1">Class Teacher's Remark</p>
                                        <p className="text-slate-700 italic">"{previewReportObj?.remarks || 'Joshua is very cooperative and shows tremendous improvement in spelling and reading activities.'}"</p>
                                    </div>
                                    
                                    <div className="p-3.5 border rounded-xl bg-slate-50 text-xs">
                                        <p className="font-black text-slate-900 uppercase text-[9px] tracking-wider mb-1">Head Teacher / Administrator Remark</p>
                                        <p className="text-slate-700 italic">"An encouraging term result. Keep up the consistent focus and progress next term."</p>
                                    </div>
                                </div>

                                {/* Signatures and Official Stamp */}
                                <div className="grid grid-cols-3 gap-6 pt-10 text-xs relative z-10">
                                    <div className="text-center border-t border-slate-300 pt-2">
                                        <p className="font-bold text-slate-800">Mrs. Adams J.</p>
                                        <p className="text-[10px] text-slate-500">Class Teacher</p>
                                    </div>
                                    
                                    {/* Official School Stamp Mock Area */}
                                    <div className="flex flex-col items-center justify-center -mt-4 relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-sky-400 text-sky-500 flex flex-col items-center justify-center font-bold rotate-12 scale-90 opacity-70">
                                            <span className="text-[7px] uppercase tracking-widest">OFFICIAL</span>
                                            <span className="text-[8px] uppercase font-black">STAMP</span>
                                            <span className="text-[7px]">ANYI SCH.</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1">School Seal</p>
                                    </div>

                                    <div className="text-center border-t border-slate-300 pt-2">
                                        <p className="font-bold text-slate-800">Dr. Alao S. A.</p>
                                        <p className="text-[10px] text-slate-500">School Administrator</p>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
