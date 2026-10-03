/**
 * SessionContext — Provides the active academic year and term selection
 * across the entire portal. All pages/tabs use `useSession()` to scope
 * their API requests to the currently selected session/term, defaulting
 * to the active (current) one. Selecting a past year/term lets admins
 * browse historical records.
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, endpoints } from '../utils/api';
import type { AcademicYear, Term } from '../types';
import { useAuth } from './AuthContext';

interface SessionContextValue {
    /** All academic years available */
    academicYears: AcademicYear[];
    /** All terms across all years */
    allTerms: Term[];
    /** Terms belonging to selectedYear */
    termsForSelectedYear: Term[];
    /** The currently active (is_current=true) academic year */
    currentYear: AcademicYear | null;
    /** The currently active (is_current=true) term */
    currentTerm: Term | null;
    /** The year the user has selected (defaults to currentYear) */
    selectedYear: AcademicYear | null;
    /** The term the user has selected (defaults to currentTerm) */
    selectedTerm: Term | null;
    /** True if the user is browsing a non-current year or term */
    isHistorical: boolean;
    /** Change selected year and auto-select its first/current term */
    setSelectedYear: (year: AcademicYear) => void;
    /** Change selected term */
    setSelectedTerm: (term: Term) => void;
    /** Reset to current year/term */
    resetToActive: () => void;
    /** Reload academic year + term lists */
    reload: () => Promise<void>;
    loading: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const getList = <T,>(res: any): T[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.results)) return res.results;
    return [];
};

export function SessionProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [allTerms, setAllTerms] = useState<Term[]>([]);
    const [selectedYear, setSelectedYearState] = useState<AcademicYear | null>(null);
    const [selectedTerm, setSelectedTermState] = useState<Term | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [yearsRes, termsRes] = await Promise.all([
                api.get<any>(endpoints.academics.years),
                api.get<any>(endpoints.academics.terms),
            ]);
            const years = getList<AcademicYear>(yearsRes);
            const terms = getList<Term>(termsRes);

            // Sort newest first
            years.sort((a, b) => b.start_date.localeCompare(a.start_date));
            setAcademicYears(years);
            setAllTerms(terms);

            const savedYearId = localStorage.getItem('portal_selected_year_id');
            const savedTermId = localStorage.getItem('portal_selected_term_id');

            const currentYear = years.find(y => y.is_current) ?? years[0] ?? null;
            const currentTerm = terms.find(t => t.is_current) ?? null;

            const restoredYear = (savedYearId && years.find(y => y.id === savedYearId)) || currentYear;
            const termsForYear = restoredYear ? terms.filter(t => t.academic_year === restoredYear.id) : terms;
            const restoredTerm = (savedTermId && termsForYear.find(t => t.id === savedTermId)) ||
                                 termsForYear.find(t => t.is_current) ||
                                 termsForYear[0] ||
                                 currentTerm;

            setSelectedYearState(restoredYear);
            setSelectedTermState(restoredTerm);
        } catch (err) {
            console.error('SessionContext: failed to load years/terms', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading) {
            reload();
        }
    }, [authLoading, isAuthenticated, reload]);

    const currentYear = academicYears.find(y => y.is_current) ?? academicYears[0] ?? null;
    const currentTerm = allTerms.find(t => t.is_current) ?? null;

    const termsForSelectedYear = selectedYear
        ? allTerms.filter(t => t.academic_year === selectedYear.id)
        : allTerms;

    const setSelectedYear = (year: AcademicYear) => {
        setSelectedYearState(year);
        try { localStorage.setItem('portal_selected_year_id', year.id); } catch {}
        // Auto-pick the current term of that year, or first term
        const yearTerms = allTerms.filter(t => t.academic_year === year.id);
        const active = yearTerms.find(t => t.is_current) ?? yearTerms[0] ?? null;
        setSelectedTermState(active);
        if (active) {
            try { localStorage.setItem('portal_selected_term_id', active.id); } catch {}
        }
    };

    const setSelectedTerm = (term: Term) => {
        setSelectedTermState(term);
        try { localStorage.setItem('portal_selected_term_id', term.id); } catch {}
    };

    const resetToActive = () => {
        setSelectedYearState(currentYear);
        setSelectedTermState(currentTerm);
        try {
            if (currentYear) localStorage.setItem('portal_selected_year_id', currentYear.id);
            if (currentTerm) localStorage.setItem('portal_selected_term_id', currentTerm.id);
        } catch {}
    };

    const isHistorical =
        (selectedYear !== null && currentYear !== null && selectedYear.id !== currentYear.id) ||
        (selectedTerm !== null && currentTerm !== null && selectedTerm.id !== currentTerm.id);

    return (
        <SessionContext.Provider value={{
            academicYears,
            allTerms,
            termsForSelectedYear,
            currentYear,
            currentTerm,
            selectedYear,
            selectedTerm,
            isHistorical,
            setSelectedYear,
            setSelectedTerm,
            resetToActive,
            reload,
            loading,
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession(): SessionContextValue {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
    return ctx;
}
