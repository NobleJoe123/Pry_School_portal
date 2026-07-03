import { useEffect, useState } from 'react';
import {
    GraduationCap, FileText, Award, BookOpen, ChevronDown,
    ChevronUp, AlertCircle, TrendingUp, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';

const getList = <T,>(val: any): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.results && Array.isArray(val.results)) return val.results;
    return [];
};

function gradeInfo(pct: number) {
    if (pct >= 70) return { grade: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (pct >= 60) return { grade: 'B', color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20' };
    if (pct >= 50) return { grade: 'C', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' };
    if (pct >= 40) return { grade: 'D', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' };
    return { grade: 'F', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
}

interface ScoreEntry {
    id: string;
    score_obtained: string;
    assessment: {
        id: string;
        name: string;
        subject: { id: string; name: string };
        assessment_type?: { name: string; max_score: number };
    };
}

interface ReportCard {
    id: string;
    term_name: string;
    academic_year_name: string;
    is_published: boolean;
    student: string;
}

interface ChildData {
    user: { id: string; full_name: string; first_name: string; last_name: string; profile_photo_url?: string };
    profile: { admission_number: string; current_class?: { name: string } };
    scores: ScoreEntry[];
    report: ReportCard | null;
    loading: boolean;
}

function SubjectRow({ subject, assessments, totalScore, totalMax }: {
    subject: string;
    assessments: { name: string; score: number; max: number }[];
    totalScore: number;
    totalMax: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const pct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    const { grade, color, bg } = gradeInfo(pct);
    const barWidth = Math.min(100, pct);

    return (
        <div className="border-b border-white/[0.04] last:border-none">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-all text-left"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{subject}</p>
                    <div className="mt-1.5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${barWidth}%`,
                                background: pct >= 70 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'
                            }}
                        />
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-white text-sm font-black">{totalScore}/{totalMax}</p>
                    <p className="text-slate-500 text-xs">{pct.toFixed(1)}%</p>
                </div>
                <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${bg}`}>
                    <span className={`text-sm font-black ${color}`}>{grade}</span>
                </div>
                <div className="shrink-0 text-slate-600">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-3 space-y-1.5">
                    {assessments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.03] rounded-xl">
                            <p className="text-slate-400 text-xs">{a.name}</p>
                            <p className="text-white text-xs font-bold">{a.score} / {a.max}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ChildReportPanel({ child }: { child: ChildData }) {
    if (child.loading) {
        return (
            <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
        );
    }

    if (!child.report) {
        return (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <AlertCircle size={36} className="text-slate-700 mb-3" />
                <p className="text-white font-bold text-sm mb-1">No Published Report Card</p>
                <p className="text-slate-500 text-xs max-w-xs">
                    {child.user.first_name}'s terminal report card has not been published yet. Check back later.
                </p>
            </div>
        );
    }

    // Group scores by subject
    const grouped: Record<string, { subjectName: string; assessments: { name: string; score: number; max: number }[]; totalScore: number; totalMax: number }> = {};
    child.scores.forEach(s => {
        const assessment = s.assessment;
        if (!assessment?.subject) return;
        const sid = assessment.subject.id;
        if (!grouped[sid]) {
            grouped[sid] = { subjectName: assessment.subject.name, assessments: [], totalScore: 0, totalMax: 0 };
        }
        const score = Number(s.score_obtained) || 0;
        const max = Number(assessment.assessment_type?.max_score) || 100;
        grouped[sid].assessments.push({ name: assessment.assessment_type?.name || assessment.name, score, max });
        grouped[sid].totalScore += score;
        grouped[sid].totalMax += max;
    });

    const subjects = Object.values(grouped);
    const overall = subjects.length > 0
        ? subjects.reduce((sum, s) => sum + (s.totalScore / s.totalMax) * 100, 0) / subjects.length
        : 0;
    const { grade: overallGrade, color: overallColor } = gradeInfo(overall);

    return (
        <div>
            {/* Report header */}
            <div className="px-5 py-4 bg-amber-500/5 border-b border-amber-500/10 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">{child.report.term_name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Session: {child.report.academic_year_name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-white text-2xl font-black">{overall.toFixed(1)}%</p>
                        <p className="text-slate-500 text-xs">Overall Average</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${gradeInfo(overall).bg}`}>
                        <span className={`text-xl font-black ${overallColor}`}>{overallGrade}</span>
                    </div>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="py-10 text-center">
                    <BookOpen size={28} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">No subject scores recorded yet.</p>
                </div>
            ) : (
                <div className="divide-y divide-white/[0.04]">
                    {subjects.map(s => (
                        <SubjectRow
                            key={s.subjectName}
                            subject={s.subjectName}
                            assessments={s.assessments}
                            totalScore={s.totalScore}
                            totalMax={s.totalMax}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ParentReports() {
    const { user } = useAuth();
    const children: any[] = user?.children || [];
    const [activeChild, setActiveChild] = useState(0);
    const [childData, setChildData] = useState<ChildData[]>([]);

    useEffect(() => {
        if (children.length === 0) return;

        const initial: ChildData[] = children.map(c => ({
            user: c.user,
            profile: c.profile,
            scores: [],
            report: null,
            loading: true,
        }));
        setChildData(initial);

        children.forEach((child, idx) => {
            const childId = child.user?.id;
            Promise.allSettled([
                api.get<any>(`${endpoints.academics.scores}?student=${childId}`),
                api.get<any>(`${endpoints.academics.reportCards}?student=${childId}`),
            ]).then(([scoresRes, reportsRes]) => {
                const scores = scoresRes.status === 'fulfilled' ? getList<ScoreEntry>(scoresRes.value) : [];
                const reports = reportsRes.status === 'fulfilled' ? getList<ReportCard>(reportsRes.value) : [];
                const publishedReport = reports.find(r => r.is_published) || null;

                setChildData(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], scores, report: publishedReport, loading: false };
                    return next;
                });
            });
        });
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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

    const current = childData[activeChild];

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>
                        Report Cards
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">View your children's published terminal reports</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <TrendingUp size={14} className="text-amber-400 ml-2" />
                    <span className="text-slate-400 text-xs mr-2">{children.length} child{children.length !== 1 ? 'ren' : ''}</span>
                </div>
            </div>

            {/* Child selector */}
            {children.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {children.map((child, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveChild(idx)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                activeChild === idx
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                                    : 'text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <div className="w-6 h-6 rounded-lg bg-current/20 overflow-hidden flex items-center justify-center text-[10px] font-black">
                                {child.user?.profile_photo_url
                                    ? <img src={child.user.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                    : `${child.user?.first_name?.[0] ?? ''}${child.user?.last_name?.[0] ?? ''}`
                                }
                            </div>
                            {child.user?.first_name}
                        </button>
                    ))}
                </div>
            )}

            {/* Stats row */}
            {current && !current.loading && current.report && (() => {
                const grouped: Record<string, { totalScore: number; totalMax: number }> = {};
                current.scores.forEach(s => {
                    const sid = s.assessment?.subject?.id;
                    if (!sid) return;
                    if (!grouped[sid]) grouped[sid] = { totalScore: 0, totalMax: 0 };
                    grouped[sid].totalScore += Number(s.score_obtained) || 0;
                    grouped[sid].totalMax += Number(s.assessment?.assessment_type?.max_score) || 100;
                });
                const subjects = Object.values(grouped);
                const overall = subjects.length > 0
                    ? subjects.reduce((sum, s) => sum + (s.totalScore / s.totalMax) * 100, 0) / subjects.length
                    : 0;

                return (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Subjects', value: subjects.length, icon: <BookOpen size={16} />, color: 'bg-sky-500/15 text-sky-400' },
                            { label: 'Avg Score', value: `${overall.toFixed(1)}%`, icon: <TrendingUp size={16} />, color: 'bg-amber-500/15 text-amber-400' },
                            { label: 'Grade', value: gradeInfo(overall).grade, icon: <Award size={16} />, color: `${gradeInfo(overall).bg} ${gradeInfo(overall).color}` },
                        ].map(card => (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-white/[0.06] p-4 flex items-center gap-3"
                                style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                                    {card.icon}
                                </div>
                                <div>
                                    <p className="text-white font-black text-lg leading-none">{card.value}</p>
                                    <p className="text-slate-500 text-xs mt-0.5">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* Main report panel */}
            <div
                className="rounded-3xl border border-white/[0.06] overflow-hidden"
                style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#0a1628 100%)' }}
            >
                {/* Panel header */}
                <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText size={14} className="text-amber-400" />
                        <span className="text-white text-sm font-bold">
                            {current ? `${current.user?.first_name}'s Report` : 'Report Card'}
                        </span>
                    </div>
                    {current?.report && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                            <Download size={10} /> Published
                        </span>
                    )}
                </div>

                {current ? (
                    <ChildReportPanel child={current} />
                ) : (
                    <div className="p-6 space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
