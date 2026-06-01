import { useState, useEffect } from 'react';
import { 
    GraduationCap, 
    BookOpen,
    Calendar,
    Award
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { Term } from '../../types';

interface ScoreData {
    id: string;
    score_obtained: string;
    remarks: string;
    assessment: {
        id: string;
        name: string;
        assessment_type: { id: string; name: string; max_score: number; weight: string };
        subject: { id: string; name: string };
        term: { id: string; name: string; is_current: boolean };
    };
}

export default function StudentGrades() {
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<ScoreData[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string>('');

    useEffect(() => {
        setLoading(true);
        // Fetch terms and scores
        Promise.all([
            api.get<any>(endpoints.academics.terms),
            api.get<any>(endpoints.academics.scores)
        ]).then(([termsRes, scoresRes]) => {
            const getList = (val: any) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (val.results && Array.isArray(val.results)) return val.results;
                return [];
            };
            
            const termList = getList(termsRes);
            const scoreList = getList(scoresRes);
            
            setTerms(termList);
            setScores(scoreList);
            
            const currentTerm = termList.find((t: any) => t.is_current);
            if (currentTerm) {
                setSelectedTerm(currentTerm.id);
            } else if (termList.length > 0) {
                setSelectedTerm(termList[0].id);
            }
            
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load grades data", err);
            setLoading(false);
        });
    }, []);

    // Group scores by subject for the selected term
    const getGroupedScores = () => {
        const filtered = scores.filter(s => s.assessment?.term?.id === selectedTerm);
        
        const grouped: Record<string, {
            subjectName: string;
            assessments: Record<string, { score: number, max: number, name: string }>;
            totalScore: number;
            totalMax: number;
        }> = {};

        filtered.forEach(s => {
            if (!s.assessment || !s.assessment.subject) return;
            const subjId = s.assessment.subject.id;
            
            if (!grouped[subjId]) {
                grouped[subjId] = {
                    subjectName: s.assessment.subject.name,
                    assessments: {},
                    totalScore: 0,
                    totalMax: 0
                };
            }
            
            const typeName = s.assessment.assessment_type?.name || s.assessment.name;
            const score = parseFloat(s.score_obtained) || 0;
            const max = s.assessment.assessment_type?.max_score || 100;
            
            grouped[subjId].assessments[typeName] = { score, max, name: typeName };
            grouped[subjId].totalScore += score;
            grouped[subjId].totalMax += max;
        });

        return Object.values(grouped);
    };

    const groupedScores = getGroupedScores();

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">My Grades</h1>
                    <p className="text-slate-500 text-sm">View your academic performance report</p>
                </div>
            </div>

            {/* Selection Bar */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <select 
                        value={selectedTerm} 
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="bg-slate-900 border border-white/10 text-white text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 min-w-[200px]"
                    >
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name} ({t.academic_year_name})</option>)}
                    </select>
                </div>
                
                <div className="ml-auto flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                    <Award size={18} className="text-amber-500" />
                    <span className="text-amber-500 font-bold text-sm">
                        Term Average: {
                            groupedScores.length > 0 
                            ? (groupedScores.reduce((acc, curr) => acc + (curr.totalScore / curr.totalMax) * 100, 0) / groupedScores.length).toFixed(1) + '%'
                            : 'N/A'
                        }
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {groupedScores.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/5 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Grades Yet</h3>
                            <p className="text-slate-500 text-sm max-w-sm">
                                Your teachers have not published any grades for this term yet. Check back later!
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assessments</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedScores.map((row, idx) => {
                                        const percentage = (row.totalScore / row.totalMax) * 100;
                                        let grade = 'F';
                                        let color = 'red';
                                        if (percentage >= 70) { grade = 'A'; color = 'emerald'; }
                                        else if (percentage >= 60) { grade = 'B'; color = 'sky'; }
                                        else if (percentage >= 50) { grade = 'C'; color = 'amber'; }
                                        else if (percentage >= 40) { grade = 'D'; color = 'orange'; }

                                        return (
                                            <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                                                            <BookOpen size={18} />
                                                        </div>
                                                        <p className="text-sm font-bold text-white">{row.subjectName}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.values(row.assessments).map((a, i) => (
                                                            <div key={i} className="flex flex-col bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5">
                                                                <span className="text-[10px] text-slate-500 uppercase font-bold">{a.name}</span>
                                                                <span className="text-sm font-mono text-white">{a.score}/{a.max}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-white">{row.totalScore}</span>
                                                        <span className="text-[10px] text-slate-500">out of {row.totalMax}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center text-${color}-400 font-black text-lg border border-${color}-500/30 shadow-lg shadow-${color}-500/10`}>
                                                        {grade}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
