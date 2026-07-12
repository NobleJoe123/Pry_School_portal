import { useEffect, useState, useCallback } from 'react';
import {
    GraduationCap, FileText, Download, Eye, AlertCircle,
    TrendingUp, Calendar, BookOpen, X, Printer, Loader2, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';
import logo from '../../assets/anyilogo.png';

const getList = <T,>(val: any): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.results && Array.isArray(val.results)) return val.results;
    return [];
};

function gradeInfo(avg: number) {
    if (avg >= 75) return { grade: 'A', color: '#15803d', bg: '#dcfce7', border: '#16a34a' };
    if (avg >= 65) return { grade: 'B', color: '#1d4ed8', bg: '#dbeafe', border: '#2563eb' };
    if (avg >= 55) return { grade: 'C', color: '#7c3aed', bg: '#ede9fe', border: '#7c3aed' };
    if (avg >= 45) return { grade: 'D', color: '#b45309', bg: '#fef3c7', border: '#d97706' };
    return { grade: 'F', color: '#dc2626', bg: '#fee2e2', border: '#dc2626' };
}

function getGradeRemark(score: number) {
    if (score >= 75) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 55) return 'Fair';
    if (score >= 45) return 'Pass';
    return 'Poor';
}

interface ReportCardEntry {
    id: string;
    term_name: string;
    academic_year_name: string;
    is_published: boolean;
    student: string;
    student_name: string;
    teacher_remarks: string;
    admin_remarks: string;
    psychomotor?: Record<string, number>;
    class_size?: number;
    class_position?: number;
}

interface ScoreEntry {
    id: string;
    student: string;
    score_obtained: string;
    assessment: {
        id: string;
        name: string;
        subject: { id: string; name: string; code: string };
        assessment_type?: { name: string; max_score: number; weight: number };
    };
}

interface SubjectSummary {
    subjectName: string;
    subjectCode: string;
    caScore: number;
    examScore: number;
    totalScore: number;
    grade: string;
}

function computeSubjects(scores: ScoreEntry[]): SubjectSummary[] {
    const grouped: Record<string, SubjectSummary> = {};
    scores.forEach(s => {
        const a = s.assessment;
        if (!a?.subject) return;
        const sid = a.subject.id;
        if (!grouped[sid]) {
            grouped[sid] = { subjectName: a.subject.name, subjectCode: a.subject.code || '', caScore: 0, examScore: 0, totalScore: 0, grade: 'F' };
        }
        const score = parseFloat(s.score_obtained) || 0;
        const typeName = a.assessment_type?.name?.toLowerCase() || '';
        if (typeName.includes('ca') || typeName.includes('continuous')) {
            grouped[sid].caScore = score;
        } else if (typeName.includes('exam') || typeName.includes('final')) {
            grouped[sid].examScore = score;
        } else {
            grouped[sid].caScore += score;
        }
        grouped[sid].totalScore = grouped[sid].caScore + grouped[sid].examScore;
        const t = grouped[sid].totalScore;
        grouped[sid].grade = t >= 75 ? 'A' : t >= 65 ? 'B' : t >= 55 ? 'C' : t >= 45 ? 'D' : 'F';
    });
    return Object.values(grouped);
}

const PSYCHOMOTOR_KEYS: Record<string, string> = {
    punctuality: 'Punctuality', neatness: 'Neatness', politeness: 'Politeness',
    honesty: 'Honesty', diligence: 'Diligence', creativity: 'Creativity',
    teamwork: 'Teamwork', leadership: 'Leadership',
};

// ─── A4 Preview Component ────────────────────────────────────────────────────
function ReportCardA4({
    report,
    childUser,
    childProfile,
    subjects,
    attendanceLogs,
}: {
    report: ReportCardEntry;
    childUser: any;
    childProfile: any;
    subjects: SubjectSummary[];
    attendanceLogs: any[];
}) {
    const totalPoints = subjects.reduce((s, x) => s + x.totalScore, 0);
    const average = subjects.length > 0 ? totalPoints / subjects.length : 0;
    const gi = gradeInfo(average);
    const psycho = report.psychomotor || {};

    const uniqueDates = Array.from(new Set(attendanceLogs.map(a => a.date)));
    const schoolDays = uniqueDates.length;
    const daysPresent = attendanceLogs.filter(a => a.status === 'present' || a.status === 'late').length;

    const bestSubject = subjects.length > 0 ? [...subjects].sort((a, b) => b.totalScore - a.totalScore)[0] : null;
    const weakSubject = subjects.length > 0 ? [...subjects].sort((a, b) => a.totalScore - b.totalScore)[0] : null;

    const position = report.class_position || '—';
    const classSize = report.class_size || '—';

    return (
        <div
            className="printable-report-card bg-white text-slate-900 relative shadow-[0_10px_30px_rgba(0,0,0,0.08)] print:shadow-none print:m-0"
            style={{
                width: '210mm', minHeight: '297mm', padding: '12mm 15mm',
                fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '9pt',
                lineHeight: '1.45', boxSizing: 'border-box', margin: '0 auto',
            }}
        >
            {/* Watermark */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0, opacity: 0.025 }}>
                <img src={logo} alt="" style={{ width: 280, height: 280, objectFit: 'contain', transform: 'rotate(-15deg)' }} />
            </div>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '4px solid #1e3a8a', paddingBottom: '3mm', marginBottom: '5mm', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img src={logo} alt="School Logo" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
                    <div>
                        <div style={{ fontSize: '15pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#1e3a8a' }}>Anyi Primary School</div>
                        <div style={{ fontSize: '8.5pt', color: '#0f172a', marginTop: 1, fontWeight: 700 }}>Empowering Tomorrow's Leader, Today.</div>
                        <div style={{ display: 'flex', gap: 14, fontSize: '7.5pt', color: '#475569', marginTop: 3, fontWeight: 500 }}>
                            <span>📍 123, School Road, Lagos</span>
                            <span>📞 +234 812 691 5872</span>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1.5px solid #cbd5e1', paddingLeft: 14 }}>
                    <div style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e3a8a' }}>Report Card</div>
                    <div style={{ display: 'inline-block', marginTop: 3, padding: '3px 12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, fontSize: '8.5pt', fontWeight: 800, color: '#92400e' }}>
                        {report.term_name}
                    </div>
                    <div style={{ fontSize: '7.5pt', color: '#475569', marginTop: 3, fontWeight: 700 }}>Session: {report.academic_year_name}</div>
                </div>
            </div>

            {/* PUPIL INFO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4mm 5mm', marginBottom: '5mm', position: 'relative', zIndex: 1, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '9pt' }}>
                    {[
                        ['Student Name:', childUser?.full_name || '—'],
                        ['Class:', childProfile?.current_class?.name || '—'],
                        ['Admission No.:', childProfile?.admission_number || '—'],
                        ['Gender:', childProfile?.gender === 'M' ? 'Male' : childProfile?.gender === 'F' ? 'Female' : '—'],
                    ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                            <span style={{ color: '#475569', minWidth: 110, fontWeight: 500 }}>{label}</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{val}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ borderLeft: '1px solid #cbd5e1', height: 65 }} />
                    <div style={{ width: 65, height: 75, border: '1px dotted #94a3b8', borderRadius: 4, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', color: '#94a3b8', fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                        {childUser?.profile_photo_url
                            ? <img src={childUser.profile_photo_url} alt="Passport" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : 'PASSPORT'}
                    </div>
                </div>
            </div>

            {/* ACADEMIC PERFORMANCE */}
            <div style={{ position: 'relative', zIndex: 1, marginBottom: '4mm' }}>
                <div style={{ fontSize: '9pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e3a8a', borderBottom: '1.5px solid #1e3a8a', paddingBottom: 2, marginBottom: 4 }}>
                    Academic Performance Summary
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                    <thead>
                        <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                            {['Subject', 'CA (40)', 'Exam (60)', 'Total (100)', 'Grade', 'Remark'].map(h => (
                                <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Subject' ? 'left' : 'center', fontWeight: 700, fontSize: '8pt', letterSpacing: '0.04em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((sub, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '4px 8px', fontWeight: 600, color: '#334155' }}>{sub.subjectName}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'center', fontFamily: 'monospace', color: '#0f172a' }}>{sub.caScore}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'center', fontFamily: 'monospace', color: '#0f172a' }}>{sub.examScore}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{sub.totalScore}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 900, color: sub.grade === 'A' ? '#15803d' : sub.grade === 'B' ? '#1d4ed8' : sub.grade === 'C' ? '#7c3aed' : sub.grade === 'D' ? '#b45309' : '#dc2626' }}>{sub.grade}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>{getGradeRemark(sub.totalScore)}</td>
                            </tr>
                        ))}
                        {subjects.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 12, color: '#94a3b8' }}>No subject records available.</td></tr>
                        )}
                        {subjects.length > 0 && (
                            <tr style={{ background: '#1e3a8a', color: '#fff', fontWeight: 800 }}>
                                <td colSpan={3} style={{ padding: '6px 12px', fontSize: '9pt', textAlign: 'left' }}>TOTAL: {totalPoints} pts</td>
                                <td colSpan={3} style={{ padding: '6px 12px', fontSize: '9pt', textAlign: 'right' }}>AVERAGE: {Math.round(average)} %</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PROMOTION BADGE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '5mm', position: 'relative', zIndex: 1 }}>
                <div style={{ padding: '5px 10px', borderRadius: 8, fontSize: '8.5pt', fontWeight: 950, textTransform: 'uppercase', textAlign: 'center', background: average >= 45 ? '#dcfce7' : '#fee2e2', color: average >= 45 ? '#16a34a' : '#dc2626', border: `1.5px solid ${average >= 45 ? '#16a34a' : '#dc2626'}` }}>
                    {average >= 45 ? 'PROMOTED TO NEXT CLASS' : 'REPEAT CLASS'}
                </div>
                <div style={{ padding: '5px 10px', borderRadius: 8, fontSize: '8.5pt', fontWeight: 950, textAlign: 'center', background: '#f5f3ff', color: '#6d28d9', border: '1.5px solid #6d28d9' }}>
                    Overall Grade: {gi.grade} ({Math.round(average)}%)
                </div>
            </div>

            {/* ── 3-COLUMN METADATA ROW ── */}
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
                            <span style={{ fontWeight: 700, color: '#7c3aed' }}>{schoolDays} Days</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Days Present:</span>
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>{daysPresent} Days</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Days Absent:</span>
                            <span style={{ fontWeight: 700, color: '#dc2626' }}>{Math.max(0, schoolDays - daysPresent)} Days</span>
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

            {/* PSYCHOMOTOR + REMARKS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr auto 1.4fr 1.4fr', gap: 12, marginBottom: '6mm', position: 'relative', zIndex: 1, alignItems: 'stretch' }}>
                {/* Psychomotor */}
                <div>
                    <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a', marginBottom: 4 }}>Psychomotor Skills</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {Object.keys(PSYCHOMOTOR_KEYS).map(k => {
                            const rating = psycho[k] ?? 3;
                            return (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7pt' }}>
                                    <span style={{ fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{PSYCHOMOTOR_KEYS[k]}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        {[1, 2, 3, 4, 5].map(dot => (
                                            <span key={dot} style={{ width: 5, height: 5, borderRadius: '50%', background: dot <= rating ? '#1e3a8a' : '#cbd5e1', display: 'inline-block' }} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ borderLeft: '1px solid #e2e8f0' }} />
                {/* Teacher Remark */}
                <div style={{ border: '1px solid #d97706', borderRadius: 8, padding: '3mm 4mm', background: '#fffbeb', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: 3 }}>Class Teacher's Remark</div>
                    <div style={{ fontSize: '8.5pt', color: '#374151', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center' }}>
                        "{report.teacher_remarks || 'Satisfactory'}"
                    </div>
                </div>
                {/* Admin Remark */}
                <div style={{ border: '1px solid #2563eb', borderRadius: 8, padding: '3mm 4mm', background: '#eff6ff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', color: '#1d4ed8', marginBottom: 3 }}>Head Teacher's Remark</div>
                    <div style={{ fontSize: '8.5pt', color: '#374151', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center' }}>
                        "{report.admin_remarks || 'Good Job'}"
                    </div>
                </div>
            </div>

            {/* SIGNATURES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6mm', paddingTop: '10mm', position: 'relative', zIndex: 1, alignItems: 'end' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '8.5pt', color: '#475569', fontWeight: 600 }}>Class Teacher</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 45, height: 45, borderRadius: '50%', border: '2.5px dashed #0ea5e9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)', opacity: 0.8, marginBottom: 2 }}>
                        <span style={{ fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', letterSpacing: '0.04em' }}>OFFICIAL</span>
                        <span style={{ fontSize: '6.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#0ea5e9' }}>STAMP</span>
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '8.5pt', color: '#475569', fontWeight: 600 }}>School Administrator</div>
                </div>
            </div>
        </div>
    );
}

// ─── Report Preview Modal ─────────────────────────────────────────────────────
function ReportPreviewModal({
    report,
    childUser,
    childProfile,
    onClose,
}: {
    report: ReportCardEntry;
    childUser: any;
    childProfile: any;
    onClose: () => void;
}) {
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [loadingScores, setLoadingScores] = useState(true);

    useEffect(() => {
        const childId = childUser?.id;
        if (!childId) return;
        setLoadingScores(true);
        Promise.allSettled([
            api.get<any>(`${endpoints.academics.scores}?student=${childId}`),
            api.get<any>(`${endpoints.attendance.students}?student=${childId}`),
        ]).then(([scoresRes, attendanceRes]) => {
            if (scoresRes.status === 'fulfilled') setScores(getList<ScoreEntry>(scoresRes.value));
            if (attendanceRes.status === 'fulfilled') setAttendanceLogs(getList<any>(attendanceRes.value));
        })
        .catch(() => {})
        .finally(() => setLoadingScores(false));
    }, [childUser?.id]);

    const subjects = computeSubjects(scores);

    const handleDownloadPDF = async () => {
        const element = document.querySelector('.printable-report-card') as HTMLElement | null;
        if (!element) return;
        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf(element, {
            margin: 0,
            filename: `${childUser?.full_name || 'student'}-${report.term_name}-report.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        } as any);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:relative print:p-0 print:bg-white print:backdrop-blur-none">
            <div className="relative w-full max-w-4xl h-[90vh] bg-slate-950 border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl print:w-full print:h-auto print:bg-white print:border-none print:rounded-none print:shadow-none">
                {/* Modal Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm print:hidden shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-base">Report Card Preview</h3>
                        <p className="text-slate-500 text-xs mt-0.5">{childUser?.full_name} · {report.term_name} · {report.academic_year_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md">
                            <Printer size={14} /> Print
                        </button>
                        <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-bold rounded-xl transition-all">
                            <Download size={14} /> Download PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900/40 p-6 flex justify-center print:bg-white print:p-0 print:overflow-visible">
                    {loadingScores ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 size={32} className="text-amber-400 animate-spin" />
                        </div>
                    ) : (
                        <ReportCardA4
                            report={report}
                            childUser={childUser}
                            childProfile={childProfile}
                            subjects={subjects}
                            attendanceLogs={attendanceLogs}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Report Card Card (list item) ─────────────────────────────────────────────
function ReportCardItem({
    report,
    childUser,
    childProfile,
}: {
    report: ReportCardEntry;
    childUser: any;
    childProfile: any;
}) {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <>
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-amber-500/20 transition-all"
                style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <FileText size={22} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">{report.term_name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Session: {report.academic_year_name}</p>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Published
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold rounded-xl transition-all"
                    >
                        <Eye size={13} /> Preview
                    </button>
                </div>
            </div>

            {showPreview && (
                <ReportPreviewModal
                    report={report}
                    childUser={childUser}
                    childProfile={childProfile}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
}

// ─── Child Reports Panel ──────────────────────────────────────────────────────
function ChildReportsPanel({ child }: { child: any }) {
    const childId = child.user?.id;
    const [reports, setReports] = useState<ReportCardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        if (!childId) return;
        setLoading(true);
        api.get<any>(`${endpoints.academics.reportCards}?student=${childId}`)
            .then(res => setReports(getList<ReportCardEntry>(res).filter(r => r.is_published)))
            .catch(() => setReports([]))
            .finally(() => setLoading(false));
    }, [childId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="space-y-3 p-5">
                {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                    <AlertCircle size={28} className="text-slate-600" />
                </div>
                <p className="text-white font-bold text-sm mb-1">No Published Report Cards</p>
                <p className="text-slate-500 text-xs max-w-xs">
                    {child.user?.first_name}'s report cards have not been published yet. Check back after the end of term.
                </p>
            </div>
        );
    }

    return (
        <div className="p-5 space-y-3">
            {reports.map(r => (
                <ReportCardItem
                    key={r.id}
                    report={r}
                    childUser={child.user}
                    childProfile={child.profile}
                />
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ParentReports() {
    const { user } = useAuth();
    const children: any[] = user?.children || [];
    const [activeChild, setActiveChild] = useState(0);

    if (children.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <GraduationCap size={48} className="text-slate-700 mb-4" />
                <h2 className="text-white font-black text-lg mb-2">No Children Linked</h2>
                <p className="text-slate-500 text-sm max-w-xs">
                    Link your children from the dashboard to view their report cards.
                </p>
            </div>
        );
    }

    const child = children[activeChild];

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>
                        Report Cards
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">View and download your children's published terminal reports</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <TrendingUp size={14} className="text-amber-400 ml-2" />
                    <span className="text-slate-400 text-xs mr-2">{children.length} child{children.length !== 1 ? 'ren' : ''}</span>
                </div>
            </div>

            {/* Child selector */}
            {children.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {children.map((c, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveChild(idx)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                activeChild === idx
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                                    : 'text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-black bg-white/10">
                                {c.user?.profile_photo_url
                                    ? <img src={c.user.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                    : `${c.user?.first_name?.[0] ?? ''}${c.user?.last_name?.[0] ?? ''}`}
                            </div>
                            {c.user?.first_name}
                        </button>
                    ))}
                </div>
            )}

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15">
                <BookOpen size={16} className="text-sky-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sky-300 text-xs font-bold">About Report Cards</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Published report cards can be previewed directly in your browser or downloaded as PDF. Each card shows your child's full academic performance for the term.
                    </p>
                </div>
            </div>

            {/* Report cards panel */}
            <div className="rounded-3xl border border-white/[0.06] overflow-hidden"
                style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#0a1628 100%)' }}>
                {/* Panel header */}
                <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText size={14} className="text-amber-400" />
                        <span className="text-white text-sm font-bold">
                            {child?.user?.first_name}'s Report Cards
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Calendar size={11} />
                        <span>All Terms</span>
                        <ChevronRight size={11} />
                    </div>
                </div>

                {child ? (
                    <ChildReportsPanel child={child} />
                ) : (
                    <div className="p-6 space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
