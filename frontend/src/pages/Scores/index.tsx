import { useState, useEffect } from 'react';
import {
    Users, BookOpen, Award, Save, RotateCcw,
    CheckCircle, BarChart2, Star, TrendingUp, HelpCircle, Layers, Calendar
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { SchoolClass, User, Subject, AssessmentType, Term } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

interface StudentScoreDetail {
    caScore: string;
    examScore: string;
    caRemarks: string;
    examRemarks: string;
}

const getList = <T,>(value: any): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

export default function Scores() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Filters Meta
    const [sessions, setSessions] = useState<{ id: string; name: string; is_current: boolean }[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);

    // Selected Filters
    const [selectedSession, setSelectedSession] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');

    // Tab State
    const [activeTab, setActiveTab] = useState<'ca' | 'exam' | 'final'>('ca');

    // Scores & Students
    const [students, setStudents] = useState<User[]>([]);
    const [scoresData, setScoresData] = useState<Record<string, StudentScoreDetail>>({});

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    // Load initial metadata
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(endpoints.academics.years),
            api.get<any>(endpoints.academics.terms),
            api.get<any>(endpoints.academics.classes),
            api.get<any>(endpoints.academics.subjects),
            api.get<any>(endpoints.academics.assessmentTypes),
        ]).then(([yearsRes, termsRes, classesRes, subjectsRes, typesRes]) => {
            const sessionsList = getList<any>(yearsRes);
            const termList = getList<Term>(termsRes);
            let classList = getList<SchoolClass>(classesRes);
            const subjectList = getList<Subject>(subjectsRes);
            const typeList = getList<AssessmentType>(typesRes);

            // Filter classes for teacher role
            if (user?.role === 'teacher') {
                classList = classList.filter(
                    (c: any) => c.teacher === user?.id || c.teacher_name === user?.full_name
                );
            }

            setSessions(sessionsList);
            setTerms(termList);
            setClasses(classList);
            setSubjects(subjectList);
            setAssessmentTypes(typeList);

            // Set default selections
            const activeSession = sessionsList.find(y => y.is_current) || sessionsList[0];
            if (activeSession) setSelectedSession(activeSession.id);

            const activeTerm = termList.find(t => t.is_current) || termList[0];
            if (activeTerm) setSelectedTerm(activeTerm.id);

            if (classList.length > 0) setSelectedClass(classList[0].id);
            if (subjectList.length > 0) setSelectedSubject(subjectList[0].id);

            setLoading(false);
        }).catch(err => {
            console.error("Failed to load metadata", err);
            setLoading(false);
        });
    }, [user]);

    // Resolve specific CA and Exam Assessment Types
    const caType = assessmentTypes.find(t => t.name.toLowerCase().includes('ca') || t.name.toLowerCase().includes('continuous') || t.max_score === 40) || assessmentTypes[0];
    const examType = assessmentTypes.find(t => t.name.toLowerCase().includes('exam') || t.name.toLowerCase().includes('final') || t.max_score === 60) || assessmentTypes[1] || assessmentTypes[0];

    // Load students and scores whenever filter changes
    useEffect(() => {
        if (!selectedClass || !selectedSubject || !selectedTerm || !caType || !examType) return;
        setLoading(true);

        api.get<any>(`${endpoints.students.list}?school_class=${selectedClass}`)
            .then(async studentsRes => {
                const studentList = getList<User>(studentsRes);
                setStudents(studentList);

                try {
                    // Fetch CA scores
                    const caScoresRes = await api.get<any>(
                        `${endpoints.academics.scores}?school_class=${selectedClass}&subject=${selectedSubject}&term=${selectedTerm}&assessment_type=${caType.id}`
                    );
                    const caScores = getList<any>(caScoresRes);

                    // Fetch Exam scores
                    const examScoresRes = await api.get<any>(
                        `${endpoints.academics.scores}?school_class=${selectedClass}&subject=${selectedSubject}&term=${selectedTerm}&assessment_type=${examType.id}`
                    );
                    const examScores = getList<any>(examScoresRes);

                    // Construct combined scores state
                    const combinedData: Record<string, StudentScoreDetail> = {};
                    studentList.forEach(s => {
                        const existingCa = caScores.find(
                            c => c.student === s.id || (c.student && c.student.id === s.id) || c.student_id === s.id
                        );
                        const existingExam = examScores.find(
                            e => e.student === s.id || (e.student && e.student.id === s.id) || e.student_id === s.id
                        );

                        combinedData[s.id] = {
                            caScore: existingCa && existingCa.score_obtained !== null ? existingCa.score_obtained.toString() : '',
                            examScore: existingExam && existingExam.score_obtained !== null ? existingExam.score_obtained.toString() : '',
                            caRemarks: existingCa ? (existingCa.remarks || '') : '',
                            examRemarks: existingExam ? (existingExam.remarks || '') : ''
                        };
                    });

                    setScoresData(combinedData);
                } catch (err) {
                    console.error("Failed to fetch existing scores", err);
                } finally {
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Failed to load students", err);
                setLoading(false);
            });
    }, [selectedClass, selectedSubject, selectedTerm, selectedSession, assessmentTypes]);

    // Handle Input Changes
    const handleScoreValueChange = (studentId: string, type: 'ca' | 'exam', value: string) => {
        setScoresData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [type === 'ca' ? 'caScore' : 'examScore']: value
            }
        }));
    };

    const handleRemarksValueChange = (studentId: string, type: 'ca' | 'exam', value: string) => {
        setScoresData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [type === 'ca' ? 'caRemarks' : 'examRemarks']: value
            }
        }));
    };

    // Calculations & Metrics
    const calculateGrade = (total: number): string => {
        if (total >= 75) return 'A';
        if (total >= 55) return 'B';
        if (total >= 45) return 'C';
        if (total >= 30) return 'D';
        return 'F';
    };

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'B': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
            case 'C': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
            case 'D': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            default: return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        }
    };

    const getStats = () => {
        let totalSum = 0;
        let count = 0;
        let highest = 0;
        let lowest = 100;
        let passed = 0;

        Object.values(scoresData).forEach(detail => {
            const ca = parseFloat(detail.caScore) || 0;
            const exam = parseFloat(detail.examScore) || 0;
            const total = ca + exam;

            // Only consider statistics if at least one score is entered
            if (detail.caScore !== '' || detail.examScore !== '') {
                totalSum += total;
                count++;
                if (total > highest) highest = total;
                if (total < lowest) lowest = total;
                if (total >= 30) passed++;
            }
        });

        return {
            average: count > 0 ? (totalSum / count).toFixed(1) : '—',
            highest: count > 0 ? highest.toFixed(1) : '—',
            lowest: count > 0 ? lowest.toFixed(1) : '—',
            passRate: count > 0 ? ((passed / count) * 100).toFixed(0) + '%' : '—'
        };
    };

    const stats = getStats();

    // Bulk Save Action
    const handleBulkSave = async () => {
        if (!caType || !examType) return;
        setSaving(true);
        setSuccess('');

        try {
            // Prepare CA records
            const caRecords = Object.entries(scoresData).map(([studentId, d]) => ({
                student_id: studentId,
                score_obtained: d.caScore === '' ? null : parseFloat(d.caScore),
                remarks: d.caRemarks
            }));

            // Prepare Exam records
            const examRecords = Object.entries(scoresData).map(([studentId, d]) => ({
                student_id: studentId,
                score_obtained: d.examScore === '' ? null : parseFloat(d.examScore),
                remarks: d.examRemarks
            }));

            // Save CA scores
            await api.post(`${endpoints.academics.scores}bulk_record/`, {
                school_class: selectedClass,
                subject: selectedSubject,
                assessment_type: caType.id,
                term: selectedTerm,
                date: new Date().toISOString().split('T')[0],
                records: caRecords
            });

            // Save Exam scores
            await api.post(`${endpoints.academics.scores}bulk_record/`, {
                school_class: selectedClass,
                subject: selectedSubject,
                assessment_type: examType.id,
                term: selectedTerm,
                date: new Date().toISOString().split('T')[0],
                records: examRecords
            });

            setSuccess('All scores saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error("Bulk save error", err);
            alert("Failed to save scores. Ensure valid inputs.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white font-serif">Results & Score Management</h1>
                <p className="text-slate-500 text-sm">Record pupil assessments, view performance summary, and manage class sheets.</p>
            </div>

            {/* Selection Filters */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-3xl flex flex-wrap items-center gap-3">
                <FilterDropdown
                    icon={<Calendar size={14} />}
                    value={selectedSession}
                    options={sessions.map(s => ({ id: s.id, label: s.name }))}
                    onChange={setSelectedSession}
                    placeholder="Session"
                />

                <FilterDropdown
                    icon={<Layers size={14} />}
                    value={selectedTerm}
                    options={terms.map(t => ({ id: t.id, label: t.name }))}
                    onChange={setSelectedTerm}
                    placeholder="Term"
                />

                <FilterDropdown
                    icon={<Users size={14} />}
                    value={selectedClass}
                    options={classes.map(c => ({ id: c.id, label: c.name }))}
                    onChange={setSelectedClass}
                    placeholder="Class"
                />

                <FilterDropdown
                    icon={<BookOpen size={14} />}
                    value={selectedSubject}
                    options={subjects.map(s => ({ id: s.id, label: s.name }))}
                    onChange={setSelectedSubject}
                    placeholder="Subject"
                />

                <button onClick={() => window.location.reload()} className="ml-auto p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                    <RotateCcw size={16} />
                </button>
            </div>

            {/* Results Summary Widget */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Class Average', value: stats.average, icon: <BarChart2 size={16} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Highest Score', value: stats.highest, icon: <Star size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Lowest Score', value: stats.lowest, icon: <TrendingUp size={16} />, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { label: 'Pass Rate', value: stats.passRate, icon: <CheckCircle size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                ].map(stat => (
                    <div key={stat.label} className="rounded-2xl border border-white/5 p-4 flex items-center gap-3 bg-white/5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-white text-base font-black font-mono">{stat.value}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 max-w-lg">
                {[
                    { key: 'ca', label: 'Continuous Assessment (40)' },
                    { key: 'exam', label: 'Examination Scores (60)' },
                    { key: 'final', label: 'Final Results (100)' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Editable Grid / Loading */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="premium-spinner" />
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student Name</th>

                                        {activeTab === 'ca' && (
                                            <>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">CA Score (Max: 40)</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">CA Remarks</th>
                                            </>
                                        )}

                                        {activeTab === 'exam' && (
                                            <>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exam Score (Max: 60)</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exam Remarks</th>
                                            </>
                                        )}

                                        {activeTab === 'final' && (
                                            <>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CA (40)</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Exam (60)</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Total (100)</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Grade</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {students.map(student => {
                                        const detail = scoresData[student.id] || { caScore: '', examScore: '', caRemarks: '', examRemarks: '' };
                                        const caVal = parseFloat(detail.caScore) || 0;
                                        const examVal = parseFloat(detail.examScore) || 0;
                                        const totalVal = caVal + examVal;
                                        const hasData = detail.caScore !== '' || detail.examScore !== '';
                                        const grade = hasData ? calculateGrade(totalVal) : '—';

                                        const caInvalid = detail.caScore !== '' && (isNaN(parseFloat(detail.caScore)) || parseFloat(detail.caScore) < 0 || parseFloat(detail.caScore) > 40);
                                        const examInvalid = detail.examScore !== '' && (isNaN(parseFloat(detail.examScore)) || parseFloat(detail.examScore) < 0 || parseFloat(detail.examScore) > 60);

                                        return (
                                            <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-300 font-black text-[10px]">
                                                            {student.first_name?.[0] || '?'}{student.last_name?.[0] || ''}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white leading-tight">{student.full_name}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(student as any).student_profile?.admission_number || student.username}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {activeTab === 'ca' && (
                                                    <>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="number" step="0.5" min="0" max="40" placeholder="-"
                                                                value={detail.caScore}
                                                                onChange={e => handleScoreValueChange(student.id, 'ca', e.target.value)}
                                                                className={`w-24 bg-white/5 border rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${caInvalid ? 'border-red-500 text-red-400' : 'border-white/10 focus:border-amber-500/50'
                                                                    }`}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="text" placeholder="CA Remarks..."
                                                                value={detail.caRemarks}
                                                                onChange={e => handleRemarksValueChange(student.id, 'ca', e.target.value)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                                                            />
                                                        </td>
                                                    </>
                                                )}

                                                {activeTab === 'exam' && (
                                                    <>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="number" step="0.5" min="0" max="60" placeholder="-"
                                                                value={detail.examScore}
                                                                onChange={e => handleScoreValueChange(student.id, 'exam', e.target.value)}
                                                                className={`w-24 bg-white/5 border rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${examInvalid ? 'border-red-500 text-red-400' : 'border-white/10 focus:border-amber-500/50'
                                                                    }`}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="text" placeholder="Exam Remarks..."
                                                                value={detail.examRemarks}
                                                                onChange={e => handleRemarksValueChange(student.id, 'exam', e.target.value)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                                                            />
                                                        </td>
                                                    </>
                                                )}

                                                {activeTab === 'final' && (
                                                    <>
                                                        <td className="px-6 py-4 text-center">
                                                            <input
                                                                type="number" step="0.5" min="0" max="40"
                                                                value={detail.caScore}
                                                                onChange={e => handleScoreValueChange(student.id, 'ca', e.target.value)}
                                                                className="w-16 bg-white/5 border border-white/5 rounded-xl px-2 py-1 text-center font-mono font-bold text-white focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <input
                                                                type="number" step="0.5" min="0" max="60"
                                                                value={detail.examScore}
                                                                onChange={e => handleScoreValueChange(student.id, 'exam', e.target.value)}
                                                                className="w-16 bg-white/5 border border-white/5 rounded-xl px-2 py-1 text-center font-mono font-bold text-white focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-black font-mono text-white text-sm">
                                                            {hasData ? totalVal.toFixed(1) : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${getGradeColor(grade)}`}>
                                                                {grade}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}

                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-20 text-slate-500">
                                                <HelpCircle size={36} className="mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">No pupils found for the selected criteria.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Bulk Save Actions */}
                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
                        <span className="text-slate-500 text-xs font-bold">{students.length} pupils registered in class</span>

                        <div className="flex items-center gap-3">
                            {success && (
                                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 animate-bounce">
                                    <CheckCircle size={15} /> {success}
                                </span>
                            )}
                            <button
                                type="submit"
                                onClick={handleBulkSave} disabled={saving || students.length === 0}
                                className="flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-sm transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Bulk Save Scores'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
