import { useState, useEffect, useMemo } from 'react';
import {
    Users, BookOpen, Award, FileText, CheckCircle,
    RefreshCw, Save, Search, Eye, X, Printer, Download, MapPin, Phone
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/anyilogo.png';
import type { SchoolClass, Term, User, StudentScore } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';



// Calaculte Position
interface GradePosition {
    studentId: string;
    totalPoints: number
}

export const calculatePosition = (
    studentId: string,
    classResults: GradePosition[]
) => {
    const sorted = [...classResults].sort(
        (a, b) => b.totalPoints - a.totalPoints
    );

    const position = sorted.findIndex((s) => s.studentId === studentId) + 1;

    return {
        position,
        classSize: sorted.length
    };


};

const formatDOB = (dobStr: string | null | undefined) => {
    if (!dobStr) return '—';
    try {
        const date = new Date(dobStr);
        if (isNaN(date.getTime())) return dobStr;
        const day = date.getDate();
        
        // Suffix helper
        let suffix = 'th';
        if (day === 1 || day === 21 || day === 31) suffix = 'st';
        else if (day === 2 || day === 22) suffix = 'nd';
        else if (day === 3 || day === 23) suffix = 'rd';
        
        const monthName = date.toLocaleDateString('en-GB', { month: 'long' });
        const year = date.getFullYear();
        
        return `${day}${suffix} ${monthName} ${year}`;
    } catch {
        return dobStr;
    }
};

interface ReportCardData {
    id?: string;
    student: string;
    term: string;
    teacher_remarks: string;
    admin_remarks: string;
    is_published: boolean;
    psychomotor?: Record<string, number>;
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
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

    // Remarks and publication states
    const [teacherRemarks, setTeacherRemarks] = useState<Record<string, string>>({});
    const [adminRemarks, setAdminRemarks] = useState<Record<string, string>>({});
    const [publishedStatus, setPublishedStatus] = useState<Record<string, boolean>>({});
    const [psychomotorRatings, setPsychomotorRatings] = useState<Record<string, Record<string, number>>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [nextTermBegin, setNextTermBegin] = useState<string>('');

    // Preview drawer/modal state
    const [previewStudent, setPreviewStudent] = useState<User | null>(null);
    const [previewTeacher, setPreviewTeacher] = useState<User | null>(null);
    const [ratingStudent, setRatingStudent] = useState<User | null>(null);

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

            // Derive next term start from Term list (sorted ascending)
            if (currentTerm) {
                const sorted = [...termList].sort((a: Term, b: Term) =>
                    new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime()
                );
                const curIdx = sorted.findIndex((t: Term) => t.id === currentTerm.id);
                const nextTerm = sorted[curIdx + 1];
                if (nextTerm && (nextTerm as any).start_date) {
                    setNextTermBegin(
                        new Date((nextTerm as any).start_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })
                    );
                }
            }
        }).catch(err => {
            console.error("Error loading initial data", err);
        }).finally(() => setLoading(false));

        // Also check school calendar events for a more specific next-term-begins event
        api.get<any>(endpoints.academics.events).then(eventsRes => {
            const eventList = getList<any>(eventsRes);
            const today = new Date();
            const nextStart = eventList
                .filter((e: any) => e.category === 'academic' && e.date && new Date(e.date) > today)
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            // Only override if a calendar event specifically exists
            if (nextStart) {
                setNextTermBegin(new Date(nextStart.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
            }
        }).catch(() => { });
    }, [user]);

    // Load detailed reports and scores data
    const loadReportData = async (silent = false) => {
        if (!selectedClassId || !selectedTermId) return;
        if (!silent) setLoading(true); else setRefreshing(true);

        try {
            const currentClass = classes.find(c => c.id === selectedClassId);
            const className = currentClass ? currentClass.name : '';

            const [studentsRes, scoresRes, reportsRes, attendanceRes] = await Promise.all([
                api.get<any>(`${endpoints.students.list}?school_class=${selectedClassId}`),
                api.get<any>(`${endpoints.academics.scores}?school_class=${selectedClassId}&term=${selectedTermId}`),
                api.get<any>(`${endpoints.academics.reportCards}?term=${selectedTermId}&school_class=${selectedClassId}`),
                api.get<any>(`${endpoints.attendance.students}?school_class=${selectedClassId}`).catch(() => ({ results: [] }))
            ]);

            const studentList = getList<User>(studentsRes);
            const scoreList = getList<StudentScore>(scoresRes);
            const reportList = getList<ReportCardData>(reportsRes);
            const attendanceList = getList<any>(attendanceRes);

            setStudents(studentList);
            setScores(scoreList);
            setReports(reportList);
            setAttendanceLogs(attendanceList);

            // Map remarks and publication states
            const tRemarksMap: Record<string, string> = {};
            const aRemarksMap: Record<string, string> = {};
            const pubMap: Record<string, boolean> = {};
            const psychomotorMap: Record<string, Record<string, number>> = {};
            studentList.forEach(s => {
                const rep = reportList.find(r => r.student === s.id);
                tRemarksMap[s.id] = rep ? (rep.teacher_remarks || '') : '';
                aRemarksMap[s.id] = rep ? (rep.admin_remarks || '') : '';
                pubMap[s.id] = rep ? !!rep.is_published : false;
                psychomotorMap[s.id] = rep && rep.psychomotor ? rep.psychomotor : {
                    punctuality: 5,
                    neatness: 5,
                    politeness: 5,
                    honesty: 5,
                    diligence: 5
                };
            });
            setTeacherRemarks(tRemarksMap);
            setAdminRemarks(aRemarksMap);
            setPublishedStatus(pubMap);
            setPsychomotorRatings(psychomotorMap);
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

    // Fetch preview teacher when preview student changes
    useEffect(() => {
        const activeClass = classes.find(c => c.id === selectedClassId);
        if (previewStudent && activeClass && activeClass.teacher) {
            api.get<User>(endpoints.teachers.detail(activeClass.teacher))
                .then(res => setPreviewTeacher(res))
                .catch(err => {
                    console.error("Failed to load preview teacher", err);
                    setPreviewTeacher({
                        full_name: activeClass.teacher_name || 'Class Teacher'
                    } as any);
                });
        } else {
            setPreviewTeacher(null);
        }
    }, [previewStudent, selectedClassId, classes]);

    // calculate single student results
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
            else if (total >= 65) grouped[subjectId].grade = 'B';
            else if (total >= 55) grouped[subjectId].grade = 'C';
            else if (total >= 45) grouped[subjectId].grade = 'D';
            else grouped[subjectId].grade = 'F';
        });






        const subjectList = Object.values(grouped);
        const totalPoints = subjectList.reduce((sum, s) => sum + s.totalScore, 0);
        const average = subjectList.length > 0 ? totalPoints / subjectList.length : 0;

        const studentAttendance = attendanceLogs.filter(a => a.student === studentId || a.student_id === studentId || (a.student && a.student.id === studentId));
        const uniqueDates = Array.from(new Set(studentAttendance.map(a => a.date)));
        const schoolDays = uniqueDates.length;
        const daysPresent = studentAttendance.filter(a => a.status === 'present' || a.status === 'late').length;

        return {
            subjects: subjectList,
            average,
            totalPoints,
            attendance: {
                school_days: schoolDays,
                days_present: daysPresent
            }
        };
    };

    // Save remarks and publication status for a pupil (teacher_remarks for teachers, admin_remarks + is_published for admins)
    const handleSaveRemarks = async (studentId: string) => {
        setSaving(true);
        setSuccess('');
        try {
            const existingReport = reports.find(r => r.student === studentId);
            const tRemark = teacherRemarks[studentId] || '';
            const aRemark = adminRemarks[studentId] || '';
            const isPub = !!publishedStatus[studentId];

            const payload: any = {};
            if (user?.role === 'teacher') {
                payload.teacher_remarks = tRemark;
                payload.psychomotor = psychomotorRatings[studentId] || {};
            } else if (user?.role === 'admin') {
                payload.admin_remarks = aRemark;
                payload.is_published = isPub;
            }

            if (existingReport && existingReport.id) {
                // Update
                await api.patch(`${endpoints.academics.reportCards}${existingReport.id}/`, payload);
            } else {
                // Create
                await api.post(endpoints.academics.reportCards, {
                    student: studentId,
                    term: selectedTermId,
                    ...payload
                });
            }

            setSuccess('Report card updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
            loadReportData(true);
        } catch (err) {
            console.error(err);
            alert("Failed to save report card details.");
        } finally {
            setSaving(false);
        }
    };

    // Bulk Publish reports (admins only)
    const handleBulkPublish = async () => {
        if (!selectedTermId || students.length === 0) return;
        if (!window.confirm("Are you sure you want to publish report cards for all students in this class?")) return;
        setSaving(true);
        try {
            const records = students.map(s => ({
                student_id: s.id,
                admin_remarks: adminRemarks[s.id] || '',
                is_published: true
            }));
            await api.post(`${endpoints.academics.reportCards}bulk_comment_and_publish/`, {
                term: selectedTermId,
                records
            });
            setSuccess('All report cards in this class published successfully!');
            setTimeout(() => setSuccess(''), 3000);
            loadReportData(true);
        } catch (err) {
            console.error(err);
            alert("Failed to bulk publish report cards.");
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Report PDF Download — defined inside component to correctly close over previewStudent state
    const handleDownloadPDF = async () => {
        const element = document.querySelector(".printable-report-card") as HTMLElement | null;
        if (!element) return;
        const html2pdf = (await import("html2pdf.js")).default;
        html2pdf(element, {
            margin: 0,
            filename: `${previewStudent?.full_name || 'student'}-report.pdf`,
            image: { type: "jpeg", quality: 1 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        } as any);
    };

    const filtered = students.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s as any).student_profile?.admission_number?.toLowerCase().includes(search.toLowerCase())
    );

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activeClass = classes.find(c => c.id === selectedClassId);

    // Student specific preview details — memoized to avoid recomputation on unrelated re-renders
    const previewData = useMemo(
        () => previewStudent ? getStudentStatsAndResults(previewStudent.id) : null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [previewStudent, scores, attendanceLogs]
    );
    const previewReportObj = previewStudent ? reports.find(r => r.student === previewStudent.id) : null;

    // Calculate total points for all students in the class to compute positions — memoized
    const classResults = useMemo<GradePosition[]>(
        () => students.map(s => ({
            studentId: s.id,
            totalPoints: getStudentStatsAndResults(s.id).totalPoints
        })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [students, scores, attendanceLogs]
    );

    // helper function for Position
    const { position, classSize } = previewStudent
        ? calculatePosition(previewStudent.id, classResults)
        : { position: 0, classSize: 0 };



    // Grade Remark — thresholds aligned with the grading scale (A≥75, B≥55, C≥45, D≥30, F<30)
    const getGradeRemark = (score: number) => {
        if (score >= 75) return "Excellent";
        if (score >= 55) return "Good";
        if (score >= 45) return "Fair";
        if (score >= 30) return "Pass";
        return "Poor";
    };

    // Derive next class name for promotion status (only meaningful when a student is selected)
    const nextClass = (() => {
        if (!activeClass) return '';
        // Try to get the numeric suffix and increment it (e.g. "Primary 3A" → "Primary 4A")
        const match = activeClass.name.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            return activeClass.name.replace(/(\d+)/, String(num + 1));
        }
        return 'Next Class';
    })();

    // Promotion status and subject analysis — only computed when previewData is available
    const promotionStatus = previewData ? (previewData.average >= 45 ? `PROMOTED TO ${nextClass || 'NEXT CLASS'}` : 'REPEAT CLASS') : '';
    const bestSubject = previewData && previewData.subjects.length > 0
        ? [...previewData.subjects].sort((a, b) => b.totalScore - a.totalScore)[0]
        : null;
    const weakSubject = previewData && previewData.subjects.length > 0
        ? [...previewData.subjects].sort((a, b) => a.totalScore - b.totalScore)[0]
        : null;

    // Psychomotor skill labels
    const PSYCHOMOTOR_KEYS: Record<string, string> = {
        punctuality: 'Punctuality',
        neatness: 'Neatness',
        politeness: 'Politeness',
        honesty: 'Honesty',
        diligence: 'Diligence',
        creativity: 'Creativity',
        teamwork: 'Teamwork',
        leadership: 'Leadership',
    };

    return (
        <div className="space-y-6 max-w-screen-xl print:p-0">
            {/* Screen Header - Hidden in Print */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Report Cards Generator</h1>
                    <p className="text-slate-500 text-sm">Generate, preview, print, and save termly report cards for pupils.</p>
                </div>
                <div className="flex items-center gap-2">
                    {user?.role === 'admin' && students.length > 0 && (
                        <button onClick={handleBulkPublish} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md">
                            <CheckCircle size={13} /> Bulk Publish Class
                        </button>
                    )}
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
            <div className="p-5 bg-white/[0.03] border border-white/[0.07] rounded-3xl print:hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(245,158,11,0.02) 100%)' }}>
                <div className="flex flex-wrap items-end gap-4">
                    {/* Class Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Users size={10} className="text-amber-500" /> Class
                        </label>
                        <FilterDropdown
                            value={selectedClassId}
                            options={classes.map(c => ({ id: c.id, label: c.name }))}
                            onChange={setSelectedClassId}
                            placeholder="Select Class"
                            colorTheme={user?.role === 'teacher' ? 'emerald' : 'amber'}
                        />
                    </div>

                    {/* Term Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <FileText size={10} className="text-amber-500" /> Term
                        </label>
                        <FilterDropdown
                            value={selectedTermId}
                            options={terms.map(t => ({ id: t.id, label: `${t.name} (${t.academic_year_name})` }))}
                            onChange={setSelectedTermId}
                            placeholder="Select Term"
                            colorTheme={user?.role === 'teacher' ? 'emerald' : 'amber'}
                        />
                    </div>

                    {/* Search */}
                    <div className="flex flex-col gap-1.5 flex-1 max-w-xs ml-auto">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Search size={10} className="text-amber-500" /> Search
                        </label>
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Name or admission no..."
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Active filter summary */}
                {(selectedClassId || selectedTermId) && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="text-slate-600">Showing:</span>
                        {activeClass && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold">{activeClass.name}</span>}
                        {activeTerm && <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full font-bold">{activeTerm.name}</span>}
                        <span className="ml-auto text-slate-600">{filtered.length} pupil{filtered.length !== 1 ? 's' : ''} found</span>
                    </div>
                )}
            </div>

            {/* Verification Table List - Hidden in Print */}
            {loading ? (
                <div className="flex justify-center items-center py-20 print:hidden">
                    <div className="premium-spinner" />
                </div>
            ) : (
                <div className="rounded-3xl border border-white/[0.07] overflow-hidden print:hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)' }}>
                    {/* Table Header Bar */}
                    <div className="px-6 py-3.5 border-b border-white/5 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.04)' }}>
                        <div className="flex items-center gap-2">
                            <Award size={14} className="text-amber-500" />
                            <span className="text-xs font-bold text-slate-300">Pupil Report Cards</span>
                            <span className="px-2 py-0.5 bg-white/5 text-slate-500 rounded-full text-[10px] font-mono">{filtered.length} records</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500/60"></span> Published
                            <span className="w-2 h-2 rounded-full bg-slate-600 ml-2"></span> Draft
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
                                    <th className="px-6 py-3.5 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.12em] border-b border-white/[0.06] whitespace-nowrap">Pupil</th>
                                    <th className="px-6 py-3.5 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.12em] border-b border-white/[0.06] text-center whitespace-nowrap">Avg Score</th>
                                    <th className="px-6 py-3.5 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.12em] border-b border-white/[0.06] whitespace-nowrap">Teacher Remark</th>
                                    <th className="px-6 py-3.5 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.12em] border-b border-white/[0.06] whitespace-nowrap">Admin Remark</th>
                                    <th className="px-6 py-3.5 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.12em] border-b border-white/[0.06] text-center whitespace-nowrap">Publish</th>
                                    <th className="px-6 py-3.5 text-[10px] font-black text-amber-500/80 uppercase tracking-[0.12em] border-b border-white/[0.06] text-center whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {filtered.map((student, rowIdx) => {
                                    const stats = getStudentStatsAndResults(student.id);
                                    const rep = reports.find(r => r.student === student.id);
                                    const tRemark = teacherRemarks[student.id] || '';
                                    const aRemark = adminRemarks[student.id] || '';
                                    const isPub = !!publishedStatus[student.id];
                                    const avgNum = stats.average;
                                    const gradeColor = avgNum >= 75 ? 'text-emerald-400' : avgNum >= 55 ? 'text-sky-400' : avgNum >= 45 ? 'text-indigo-400' : avgNum >= 30 ? 'text-amber-400' : 'text-rose-400';

                                    return (
                                        <tr key={student.id} className={`border-b border-white/[0.03] transition-all group ${isPub ? 'hover:bg-emerald-500/[0.02]' : 'hover:bg-white/[0.015]'
                                            } ${rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}`}>
                                            {/* Pupil Cell */}
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 transition-all group-hover:scale-105 ${isPub
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                                                        }`}>
                                                        {(student.first_name?.[0] || '?')}{(student.last_name?.[0] || '')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white leading-tight text-[13px]">{student.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(student as any).student_profile?.admission_number || student.username}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Avg Score */}
                                            <td className="px-6 py-3.5 text-center">
                                                {avgNum > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`font-black font-mono text-sm ${gradeColor}`}>{avgNum.toFixed(1)}%</span>
                                                        <span className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full border ${avgNum >= 75 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                            avgNum >= 55 ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                                                avgNum >= 45 ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                                                    avgNum >= 30 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                                        'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                            }`}>
                                                            {avgNum >= 75 ? 'A' : avgNum >= 55 ? 'B' : avgNum >= 45 ? 'C' : avgNum >= 30 ? 'D' : 'F'}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-slate-600 font-mono">—</span>}
                                            </td>

                                            {/* Teacher Remark */}
                                            <td className="px-6 py-3.5">
                                                {user?.role === 'teacher' ? (
                                                    <input
                                                        type="text" value={tRemark}
                                                        onChange={e => setTeacherRemarks({ ...teacherRemarks, [student.id]: e.target.value })}
                                                        placeholder="Add remark..."
                                                        disabled={rep?.is_published}
                                                        className="w-full min-w-[140px] bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                    />
                                                ) : (
                                                    <p className="text-slate-400 italic min-w-[130px] max-w-[180px] truncate text-[11px]" title={tRemark}>
                                                        {tRemark || <span className="text-slate-700 not-italic">—</span>}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Admin Remark */}
                                            <td className="px-6 py-3.5">
                                                {user?.role === 'admin' ? (
                                                    <input
                                                        type="text" value={aRemark}
                                                        onChange={e => setAdminRemarks({ ...adminRemarks, [student.id]: e.target.value })}
                                                        placeholder="Add remark..."
                                                        className="w-full min-w-[140px] bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.06] transition-all"
                                                    />
                                                ) : (
                                                    <p className="text-slate-400 italic min-w-[130px] max-w-[180px] truncate text-[11px]" title={aRemark}>
                                                        {aRemark || <span className="text-slate-700 not-italic">—</span>}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Publish Toggle */}
                                            <td className="px-6 py-3.5 text-center">
                                                {user?.role === 'admin' ? (
                                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none" title={isPub ? 'Click to unpublish' : 'Click to mark for publish'}>
                                                        {/* Custom toggle switch */}
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox" checked={isPub}
                                                                onChange={e => setPublishedStatus({ ...publishedStatus, [student.id]: e.target.checked })}
                                                                className="sr-only"
                                                            />
                                                            <div className={`w-9 h-5 rounded-full transition-all duration-300 border ${isPub
                                                                ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                                                : 'bg-slate-800 border-white/10'
                                                                }`}>
                                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-md ${isPub
                                                                    ? 'translate-x-4 bg-white'
                                                                    : 'translate-x-0.5 bg-slate-500'
                                                                    }`} />
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] font-black tracking-wide ${isPub ? 'text-emerald-400' : 'text-slate-500'
                                                            }`}>{isPub ? 'Published' : 'Draft'}</span>
                                                    </label>
                                                ) : (
                                                    isPub ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black">
                                                            <CheckCircle size={8} /> Published
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-white/[0.04] text-slate-500 border border-white/[0.08] rounded-full text-[9px] font-bold">Draft</span>
                                                    )
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    <button
                                                        onClick={() => handleSaveRemarks(student.id)}
                                                        disabled={saving || (user?.role === 'teacher' && rep?.is_published)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                                                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0c0a09', boxShadow: '0 3px 12px rgba(245,158,11,0.25)' }}
                                                        title="Save remarks & psychomotor"
                                                    >
                                                        <Save size={11} /> Save
                                                    </button>
                                                    {user?.role === 'teacher' && (
                                                        <button
                                                            onClick={() => setRatingStudent(student)}
                                                            disabled={rep?.is_published}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 rounded-xl border border-violet-500/20 transition-all text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Rate Psychomotor Skills"
                                                        >
                                                            <BookOpen size={11} /> Skills
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setPreviewStudent(student)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white rounded-xl border border-white/[0.08] transition-all text-[10px] font-bold"
                                                        title="Preview report card"
                                                    >
                                                        <Eye size={11} /> View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3 text-slate-600">
                                                <Award size={32} className="opacity-20" />
                                                <p className="text-sm font-semibold">No pupils found</p>
                                                <p className="text-xs">Try changing the class or term filter above</p>
                                            </div>
                                        </td>
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
                                {(!user || user.role !== 'teacher' || previewReportObj?.is_published) ? (
                                    <>
                                        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md">
                                            <Printer size={14} /> Print Report
                                        </button>
                                        <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-bold rounded-xl transition-all">
                                            <Download size={14} /> Download PDF
                                        </button>
                                    </>
                                ) : (
                                    <div className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-xl flex items-center gap-1.5 select-none">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Pending Admin Publication to Print/Download
                                    </div>
                                )}
                                <button onClick={() => setPreviewStudent(null)} className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Area */}
                        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900/40 p-6 flex justify-center print:bg-white print:p-0 print:overflow-visible">

                            {/* ─── A4 Page Shell ─── */}
                            <div
                                className="printable-report-card bg-white text-slate-900 relative shadow-[0_10px_30px_rgba(0,0,0,0.08)] print:shadow-none print:m-0"
                                style={{
                                    width: '210mm',
                                    minHeight: '297mm',
                                    padding: '12mm 15mm',
                                    fontFamily: "'Segoe UI', Arial, sans-serif",
                                    fontSize: '9pt',
                                    lineHeight: '1.45',
                                    boxSizing: 'border-box',
                                    margin: '0 auto',
                                }}
                            >
                                {/* Watermark */}
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', pointerEvents: 'none', zIndex: 0, opacity: 0.025
                                }}>
                                    <img src={logo} alt="" style={{ width: '280px', height: '280px', objectFit: 'contain', transform: 'rotate(-15deg)' }} />
                                </div>

                                {/* ── HEADER ── */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderBottom: '4px solid #1e3a8a', paddingBottom: '3mm', marginBottom: '5mm',
                                    position: 'relative', zIndex: 1
                                }}>
                                    {/* Left: Logo + School Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <img src={logo} alt="School Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: '15pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#1e3a8a' }}>
                                                Anyi Primary School
                                            </div>
                                            <div style={{ fontSize: '8.5pt', color: '#0f172a', marginTop: '1px', fontWeight: 700 }}>
                                                Empowering Tomorrow's Leader, Today.
                                            </div>
                                            <div style={{ display: 'flex', gap: '14px', fontSize: '7.5pt', color: '#475569', marginTop: '3px', fontWeight: 500 }}>
                                                <span>📍 123, School Road, Lagos</span>
                                                <span>📞 +234 812 691 5872</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Right: Report Card Badge */}
                                    <div style={{ textAlign: 'right', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '14px' }}>
                                        <div style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e3a8a' }}>
                                            Report Card
                                        </div>
                                        <div style={{
                                            display: 'inline-block', marginTop: '3px', padding: '3px 12px',
                                            background: '#fef3c7', border: '1px solid #f59e0b',
                                            borderRadius: '6px', fontSize: '8.5pt', fontWeight: 800, color: '#92400e'
                                        }}>
                                            {activeTerm?.name || '1st Term'}
                                        </div>
                                        <div style={{ fontSize: '7.5pt', color: '#475569', marginTop: '3px', fontWeight: 700 }}>
                                            Session: {activeTerm?.academic_year_name}
                                        </div>
                                    </div>
                                </div>

                                {/* ── PUPIL INFO ── */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr auto',
                                    gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0',
                                    borderRadius: '8px', padding: '4mm 5mm', marginBottom: '5mm',
                                    position: 'relative', zIndex: 1, alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9pt' }}>
                                        {[
                                            ['Student Name:', previewStudent.full_name],
                                            ['Class:', activeClass?.name || '—'],
                                            ['Class Teacher:', previewTeacher?.full_name || activeClass?.teacher_name || '—'],
                                            ['Date of Birth:', formatDOB(previewStudent.date_of_birth)],
                                            ['Gender:', (previewStudent as any).gender === 'M' ? 'Male' : (previewStudent as any).gender === 'F' ? 'Female' : '—'],
                                        ].map(([label, val]) => (
                                            <div key={label} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                                                <span style={{ color: '#475569', minWidth: '110px', fontWeight: 500 }}>{label}</span>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Passport */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ borderLeft: '1px solid #cbd5e1', height: '65px' }} />
                                        <div style={{
                                            width: '65px', height: '75px', border: '1px dotted #94a3b8', borderRadius: '4px',
                                            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '7pt', color: '#94a3b8', fontWeight: 700, overflow: 'hidden', flexShrink: 0
                                        }}>
                                            {(previewStudent as any).profile_photo
                                                ? <img src={(previewStudent as any).profile_photo} alt="Passport" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : 'PASSPORT'}
                                        </div>
                                    </div>
                                </div>

                                {/* ── ACADEMIC PERFORMANCE ── */}
                                <div style={{ position: 'relative', zIndex: 1, marginBottom: '4mm' }}>
                                    <div style={{
                                        fontSize: '9pt', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.08em', color: '#1e3a8a', borderBottom: '1.5px solid #1e3a8a',
                                        paddingBottom: '2px', marginBottom: '4px'
                                    }}>
                                        Academic Performance Summary
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                                        <thead>
                                            <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                                                {['Subject', 'CA (40)', 'Exam (60)', 'Total (100)', 'Grade', 'Remark'].map(h => (
                                                    <th key={h} style={{
                                                        padding: '5px 8px', textAlign: h === 'Subject' ? 'left' : 'center',
                                                        fontWeight: 700, fontSize: '8pt', letterSpacing: '0.04em'
                                                    }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.subjects.map((sub, i) => (
                                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '4px 8px', fontWeight: 600, color: '#334155' }}>{sub.subjectName}</td>
                                                    <td style={{ padding: '4px 8px', textAlign: 'center', fontFamily: 'monospace', color: '#0f172a' }}>{sub.caScore}</td>
                                                    <td style={{ padding: '4px 8px', textAlign: 'center', fontFamily: 'monospace', color: '#0f172a' }}>{sub.examScore}</td>
                                                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{sub.totalScore}</td>
                                                    <td style={{
                                                        padding: '4px 8px', textAlign: 'center', fontWeight: 900,
                                                        color: sub.grade === 'A' ? '#15803d' : sub.grade === 'B' ? '#1d4ed8' : sub.grade === 'C' ? '#7c3aed' : sub.grade === 'D' ? '#b45309' : '#dc2626'
                                                    }}>{sub.grade}</td>
                                                    <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>{getGradeRemark(sub.totalScore)}</td>
                                                </tr>
                                            ))}
                                            {previewData.subjects.length === 0 && (
                                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '12px', color: '#94a3b8' }}>No subject records available.</td></tr>
                                            )}
                                            {/* Totals row */}
                                            {previewData.subjects.length > 0 && (
                                                <tr style={{ background: '#1e3a8a', color: '#fff', fontWeight: 800 }}>
                                                    <td colSpan={3} style={{ padding: '6px 12px', fontSize: '9pt', textAlign: 'left' }}>
                                                        TOTAL: {previewData.totalPoints} pts
                                                    </td>
                                                    <td colSpan={3} style={{ padding: '6px 12px', fontSize: '9pt', textAlign: 'right' }}>
                                                        AVERAGE: {Math.round(previewData.average)} %
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── PROMOTION & NEXT TERM BADGES ── */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                                    marginBottom: '5mm', position: 'relative', zIndex: 1
                                }}>
                                    {/* Promotion Status Badge */}
                                    <div style={{
                                        padding: '5px 10px', borderRadius: '8px', fontSize: '8.5pt', fontWeight: 950,
                                        textTransform: 'uppercase', textAlign: 'center',
                                        background: previewData.average >= 45 ? '#dcfce7' : '#fee2e2',
                                        color: previewData.average >= 45 ? '#16a34a' : '#dc2626',
                                        border: `1.5px solid ${previewData.average >= 45 ? '#16a34a' : '#dc2626'}`,
                                    }}>
                                        {promotionStatus}
                                    </div>
                                    {/* Next Term Begins Badge */}
                                    {nextTermBegin && (
                                        <div style={{
                                            padding: '5px 10px', borderRadius: '8px', fontSize: '8.5pt', fontWeight: 950,
                                            textAlign: 'center',
                                            background: '#f5f3ff',
                                            color: '#6d28d9',
                                            border: '1.5px solid #6d28d9',
                                        }}>
                                            Next Term Begins: {nextTermBegin}
                                        </div>
                                    )}
                                </div>

                                {/* ── 3-COLUMN METADATA ROW: Grading Key + Attendance + Stats ── */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1.2fr auto 1fr auto 1.3fr', gap: '6px',
                                    border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4mm 5mm',
                                    background: '#f8fafc', marginBottom: '5mm', position: 'relative', zIndex: 1,
                                    alignItems: 'center'
                                }}>
                                    {/* Column 1: Grading Key */}
                                    <div style={{ paddingRight: '10px' }}>
                                        <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a', marginBottom: '4px' }}>
                                            Grading Key
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: '7.5pt', fontWeight: 700 }}>
                                            {[
                                                ['A', '75–100', '#15803d'], 
                                                ['B', '65–74', '#1d4ed8'], 
                                                ['C', '55–64', '#7c3aed'], 
                                                ['D', '45–54', '#b45309'], 
                                                ['F', 'Below 45', '#dc2626']
                                            ].map(([g, r, c]) => (
                                                <span key={g} style={{ color: c }}>{g}: {r}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Vertical divider */}
                                    <div style={{ borderLeft: '1px solid #cbd5e1', height: '60px' }} />

                                    {/* Column 2: Attendance Summary */}
                                    <div style={{ padding: '0 10px' }}>
                                        <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a', marginBottom: '4px' }}>
                                            Attendance Summary
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '7.5pt' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#475569', fontWeight: 600 }}>School Days:</span>
                                                <span style={{ fontWeight: 700, color: '#7c3aed' }}>{previewData.attendance.school_days} Days</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#475569', fontWeight: 600 }}>Days Present:</span>
                                                <span style={{ fontWeight: 700, color: '#16a34a' }}>{previewData.attendance.days_present} Days</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#475569', fontWeight: 600 }}>Days Absent:</span>
                                                <span style={{ fontWeight: 700, color: '#dc2626' }}>{Math.max(0, (previewData.attendance.school_days || 0) - (previewData.attendance.days_present || 0))} Days</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vertical divider */}
                                    <div style={{ borderLeft: '1px solid #cbd5e1', height: '60px' }} />

                                    {/* Column 3: Performance Details */}
                                    <div style={{ paddingLeft: '10px', fontSize: '8pt' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ color: '#475569', fontWeight: 600 }}>Position in Class:</span>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{position} of {classSize}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ color: '#475569', fontWeight: 600 }}>Best Subject:</span>
                                                <span style={{ fontWeight: 700, color: '#16a34a' }}>{bestSubject ? bestSubject.subjectName : '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ color: '#475569', fontWeight: 600 }}>Weakest Subject:</span>
                                                <span style={{ fontWeight: 700, color: '#dc2626' }}>{weakSubject ? weakSubject.subjectName : '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── PSYCHOMOTOR & REMARKS ROW ── */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1.2fr auto 1.4fr 1.4fr', gap: '12px',
                                    marginBottom: '6mm', position: 'relative', zIndex: 1, alignItems: 'stretch'
                                }}>
                                    {/* Psychomotor Column */}
                                    <div>
                                        <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a', marginBottom: '4px' }}>
                                            Psychomotor Skills
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {Object.keys(PSYCHOMOTOR_KEYS).map((k) => {
                                                const psycho = previewReportObj?.psychomotor || psychomotorRatings[previewStudent.id] || {};
                                                const rating = psycho[k] ?? 3;
                                                return (
                                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7pt' }}>
                                                        <span style={{ fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{PSYCHOMOTOR_KEYS[k]}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                            {[1, 2, 3, 4, 5].map(dot => (
                                                                <span key={dot} style={{
                                                                    width: '5px', height: '5px', borderRadius: '50%',
                                                                    background: dot <= rating ? '#1e3a8a' : '#cbd5e1',
                                                                    display: 'inline-block'
                                                                }} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Vertical divider */}
                                    <div style={{ borderLeft: '1px solid #e2e8f0' }} />

                                    {/* Class Teacher Remark */}
                                    <div style={{
                                        border: '1px solid #d97706', borderRadius: '8px', padding: '3mm 4mm',
                                        background: '#fffbeb', display: 'flex', flexDirection: 'column'
                                    }}>
                                        <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '3px' }}>
                                            Class Teacher's Remark
                                        </div>
                                        <div style={{ fontSize: '8.5pt', color: '#374151', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center' }}>
                                            "{previewReportObj?.teacher_remarks || 'Satisfactory'}"
                                        </div>
                                    </div>

                                    {/* Head Teacher Remark */}
                                    <div style={{
                                        border: '1px solid #2563eb', borderRadius: '8px', padding: '3mm 4mm',
                                        background: '#eff6ff', display: 'flex', flexDirection: 'column'
                                    }}>
                                        <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#1d4ed8', marginBottom: '3px' }}>
                                            Head Teacher's Remark
                                        </div>
                                        <div style={{ fontSize: '8.5pt', color: '#374151', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center' }}>
                                            "{previewReportObj?.admin_remarks || 'Good Job'}"
                                        </div>
                                    </div>
                                </div>

                                {/* ── SIGNATURES ── */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '6mm', paddingTop: '10mm', position: 'relative', zIndex: 1,
                                    alignItems: 'end'
                                }}>
                                    {/* Class Teacher */}
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px auto' }} />
                                        <div style={{ fontSize: '8.5pt', color: '#475569', fontWeight: 600 }}>Class Teacher</div>
                                    </div>
                                    {/* Official Stamp */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{
                                            width: '45px', height: '45px', borderRadius: '50%',
                                            border: '2.5px dashed #0ea5e9', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)',
                                            opacity: 0.8, marginBottom: '2px'
                                        }}>
                                            <span style={{ fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', letterSpacing: '0.04em' }}>OFFICIAL</span>
                                            <span style={{ fontSize: '6.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#0ea5e9' }}>STAMP</span>
                                        </div>
                                    </div>
                                    {/* School Administrator */}
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px auto' }} />
                                        <div style={{ fontSize: '8.5pt', color: '#475569', fontWeight: 600 }}>School Administrator</div>
                                    </div>
                                </div>

                            </div>{/* end A4 shell */}
                        </div>
                    </div>
                </div>
            )}

            {/* Psychomotor Rating Modal */}
            {ratingStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setRatingStudent(null)}>
                    <div
                        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-white font-black text-base">Psychomotor Skills Rating</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">{ratingStudent.full_name}</p>
                                </div>
                                <button onClick={() => setRatingStudent(null)} className="text-slate-500 hover:text-white transition-colors p-1">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Skill Sliders */}
                        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            {Object.keys(PSYCHOMOTOR_KEYS).map(key => {
                                const current = (psychomotorRatings[ratingStudent.id] ?? {})[key] ?? 3;
                                return (
                                    <div key={key}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-sm font-bold text-slate-300">{PSYCHOMOTOR_KEYS[key]}</label>
                                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                                                {current} / 5
                                            </span>
                                        </div>
                                        <input
                                            type="range" min={1} max={5} step={1}
                                            value={current}
                                            onChange={e => setPsychomotorRatings(prev => ({
                                                ...prev,
                                                [ratingStudent.id]: { ...(prev[ratingStudent.id] ?? {}), [key]: Number(e.target.value) }
                                            }))}
                                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                            style={{ accentColor: '#6366f1' }}
                                        />
                                        <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                                            <span>1 · Needs Work</span>
                                            <span>3 · Good</span>
                                            <span>5 · Excellent</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 pb-6 pt-4 border-t border-white/[0.07] flex items-center justify-end gap-3">
                            <button
                                onClick={() => setRatingStudent(null)}
                                className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-sm font-bold transition-all border border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await handleSaveRemarks(ratingStudent.id);
                                    setRatingStudent(null);
                                }}
                                disabled={saving}
                                className="px-6 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
                            >
                                <Save size={14} className="inline mr-1.5" />{saving ? 'Saving...' : 'Save Ratings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
// end of Reports component
