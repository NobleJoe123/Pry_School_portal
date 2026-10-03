/**
 * SessionSelector — Compact dropdown pair (Academic Year + Term) that lets
 * any page switch between historical sessions for read-only browsing.
 * Uses SessionContext. Shows a "Historical" badge when not viewing the current session.
 */
import { History, ChevronDown, RotateCcw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import type { AcademicYear, Term } from '../../types';

interface SessionSelectorProps {
    /** If true, shows only the year selector (no term selector) */
    yearOnly?: boolean;
    /** If true, shows only the term selector (no year selector) */
    termOnly?: boolean;
    className?: string;
}

export default function SessionSelector({ yearOnly, termOnly, className = '' }: SessionSelectorProps) {
    const {
        academicYears, termsForSelectedYear,
        selectedYear, selectedTerm,
        currentYear, currentTerm,
        isHistorical,
        setSelectedYear, setSelectedTerm, resetToActive,
        loading,
    } = useSession();

    if (loading) {
        return <div className="h-8 w-52 bg-white/5 rounded-xl animate-pulse" />;
    }

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const year = academicYears.find(y => y.id === e.target.value);
        if (year) setSelectedYear(year);
    };

    const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const term = termsForSelectedYear.find(t => t.id === e.target.value);
        if (term) setSelectedTerm(term);
    };

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            {isHistorical && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                    <History size={11} />
                    Historical View
                </span>
            )}

            {!termOnly && (
                <div className="relative">
                    <select
                        value={selectedYear?.id ?? ''}
                        onChange={handleYearChange}
                        className="appearance-none pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500/50 hover:border-white/20 transition-all cursor-pointer"
                    >
                        {academicYears.map(y => (
                            <option key={y.id} value={y.id} className="bg-slate-900">
                                {y.name}{y.is_current ? ' (Active)' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
            )}

            {!yearOnly && (
                <div className="relative">
                    <select
                        value={selectedTerm?.id ?? ''}
                        onChange={handleTermChange}
                        className="appearance-none pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500/50 hover:border-white/20 transition-all cursor-pointer"
                    >
                        {termsForSelectedYear.length === 0 && (
                            <option value="" className="bg-slate-900">No terms</option>
                        )}
                        {termsForSelectedYear.map(t => (
                            <option key={t.id} value={t.id} className="bg-slate-900">
                                {t.name}{t.is_current ? ' (Active)' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
            )}

            {isHistorical && (
                <button
                    onClick={resetToActive}
                    title="Return to current session"
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-xl transition-all"
                >
                    <RotateCcw size={13} />
                </button>
            )}
        </div>
    );
}
