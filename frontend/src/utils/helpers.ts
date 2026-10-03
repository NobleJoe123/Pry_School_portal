/**
 * Shared helper utilities for the school portal frontend.
 * Centralises common patterns to avoid duplication across pages.
 */

/**
 * Safely extracts a list from a DRF API response.
 * Handles paginated (`{ results: T[] }`) and plain array responses.
 */
export function getList<T>(res: any): T[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    if (res.results && Array.isArray(res.results)) return res.results as T[];
    return [];
}

/**
 * Unified grade calculator used across all portal pages.
 * Thresholds: A ≥ 75 | B ≥ 55 | C ≥ 45 | D ≥ 30 | F < 30
 */
export function calculateGrade(total: number): string {
    if (total >= 75) return 'A';
    if (total >= 55) return 'B';
    if (total >= 45) return 'C';
    if (total >= 30) return 'D';
    return 'F';
}

/**
 * Returns a textual remark corresponding to a numeric score.
 * Aligned with the portal grading scale.
 */
export function getGradeRemark(score: number): string {
    if (score >= 75) return 'Excellent';
    if (score >= 55) return 'Good';
    if (score >= 45) return 'Fair';
    if (score >= 30) return 'Pass';
    return 'Poor';
}

/**
 * Returns Tailwind CSS classes for a given grade letter.
 */
export function getGradeColor(grade: string): string {
    switch (grade) {
        case 'A': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        case 'B': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
        case 'C': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
        case 'D': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        default:  return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
}
