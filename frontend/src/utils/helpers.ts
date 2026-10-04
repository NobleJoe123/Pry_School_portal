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
 * Scale:
 *   A: 75–100 (Excellent)
 *   B: 65–74  (Good)
 *   C: 55–64  (Credit)
 *   D: 45–54  (Pass)
 *   F: < 45   (Fail)
 */
export function calculateGrade(total: number): string {
    if (total >= 75) return 'A';
    if (total >= 65) return 'B';
    if (total >= 55) return 'C';
    if (total >= 45) return 'D';
    return 'F';
}

/**
 * Returns a textual remark corresponding to a numeric score.
 * Aligned with the unified portal grading scale.
 */
export function getGradeRemark(score: number): string {
    if (score >= 75) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 55) return 'Credit';
    if (score >= 45) return 'Pass';
    return 'Fail';
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
