import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Banknote, CalendarDays, Download, FileText, Printer, Receipt,
    ShieldCheck, TrendingDown, Award, Home, Car, Utensils, Star,
    Clock, CreditCard, ChevronDown, ChevronRight, RefreshCw,
    CheckCircle, AlertCircle, X, BarChart3
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { Payroll, PayrollDetail } from '../../types';

const getHistory = (value: any): Payroll[] => {
    if (!value?.payroll_history) return [];
    return Array.isArray(value.payroll_history) ? value.payroll_history : [];
};

const formatCurrency = (amount: number | string | undefined | null) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(amount ?? 0));

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    preview: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    approved: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    locked: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    processing: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    failed: 'bg-red-500/15 text-red-400 border-red-500/20',
    reversed: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    not_generated: 'bg-slate-700/30 text-slate-500 border-slate-600/20',
};

function StatusBadge({ status }: { status: string }) {
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>{status.replace(/_/g, ' ')}</span>;
}

// ── Payslip Print View ────────────────────────────────────────────────────────
function PayslipPrintModal({ payroll, onClose }: { payroll: PayrollDetail | Payroll; onClose: () => void }) {
    const printRef = useRef<HTMLDivElement>(null);
    const p = payroll as PayrollDetail;

    const handlePrint = () => window.print();

    const handleDownload = async () => {
        if (!printRef.current) return;
        try {
            // Use browser print dialog as the universal approach
            window.print();
        } catch {
            window.print();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-4 print:shadow-none" ref={printRef}>
                {/* Payslip Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8 rounded-t-2xl text-white print:rounded-none">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-200 text-sm font-semibold uppercase tracking-widest">{(p as any).school_name || 'Anyi Primary School'}</p>
                            <h1 className="text-2xl font-black mt-1">PAYSLIP</h1>
                            <p className="text-emerald-200 text-sm mt-1">{MONTH_FULL[p.month - 1]} {p.year}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-emerald-200 text-xs">Generated</p>
                            <p className="text-white font-semibold text-sm">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Staff Info */}
                <div className="p-6 border-b border-slate-200 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Employee</p>
                        <p className="text-slate-900 font-black text-lg">{p.staff_name || p.teacher_name}</p>
                        <p className="text-slate-500 text-sm">{(p as any).staff_department || 'Teaching'}</p>
                        <p className="text-slate-400 text-xs mt-1">ID: {p.staff_id}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Payment Details</p>
                        <p className="text-slate-700 text-sm font-semibold">{p.payment_method?.replace('_', ' ') || '—'}</p>
                        {p.payment_date && <p className="text-slate-500 text-xs mt-1">{new Date(p.payment_date).toLocaleDateString()}</p>}
                        {p.payment_reference && <p className="text-slate-400 text-xs font-mono mt-1">{p.payment_reference}</p>}
                    </div>
                </div>

                {/* Salary Table */}
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Earnings */}
                        <div>
                            <p className="font-bold text-slate-700 text-sm mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Earnings</p>
                            <div className="space-y-2 text-sm">
                                {([
                                    ['Basic Salary', p.basic_salary],
                                    ['Housing Allowance', p.housing_allowance],
                                    ['Transport Allowance', p.transport_allowance],
                                    ['Meal Allowance', p.meal_allowance],
                                    ['Responsibility Allow.', p.responsibility_allowance],
                                    ['Overtime', p.overtime],
                                    ['Bonuses', p.bonuses],
                                ] as [string, number][]).filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                                    <div key={label} className="flex justify-between">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="text-slate-800 font-semibold">{formatCurrency(val)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold text-emerald-700 border-t border-slate-200 pt-2 mt-2">
                                    <span>Gross Salary</span>
                                    <span>{formatCurrency(p.gross_salary)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div>
                            <p className="font-bold text-slate-700 text-sm mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Deductions</p>
                            <div className="space-y-2 text-sm">
                                {([
                                    ['Tax', p.tax],
                                    ['Pension', p.pension],
                                    ['Loan Repayment', p.loans],
                                    ['Other Deductions', p.other_deductions],
                                    ['Leave Adjustment', p.leave_adjustment],
                                    ['Attendance Adjust.', p.attendance_adjustment],
                                ] as [string, number][]).filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                                    <div key={label} className="flex justify-between">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="text-red-600 font-semibold">({formatCurrency(val)})</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold text-red-700 border-t border-slate-200 pt-2 mt-2">
                                    <span>Total Deductions</span>
                                    <span>({formatCurrency(p.total_deductions)})</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Pay */}
                    <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-emerald-700 text-xs uppercase tracking-widest font-bold mb-1">Net Salary Payable</p>
                            <p className="text-3xl font-black text-emerald-800">{formatCurrency(p.net_salary)}</p>
                        </div>
                        <StatusBadge status={p.status} />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 text-center text-slate-400 text-[10px] border-t border-slate-100 pt-4">
                    This is a computer-generated payslip. No signature required.
                </div>

                {/* Controls (not printed) */}
                <div className="p-4 bg-slate-900 rounded-b-2xl flex items-center justify-between print:hidden">
                    <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all"><X size={15} />Close</button>
                    <div className="flex gap-2">
                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-bold transition-all"><Download size={15} />Download PDF</button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold transition-all"><Printer size={15} />Print</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MySalary() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState<Payroll[]>([]);
    const [status, setStatus] = useState('not_generated');
    const [lastPayment, setLastPayment] = useState<Payroll | null>(null);
    const [currentPayslip, setCurrentPayslip] = useState<PayrollDetail | null>(null);
    const [viewingPayslip, setViewingPayslip] = useState<PayrollDetail | Payroll | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const loadSalary = async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const res = await api.get<any>(endpoints.finance.payrollMysalary);
            setHistory(getHistory(res));
            setStatus(res.current_salary_status || 'not_generated');
            setLastPayment(res.last_salary_payment || null);
            setCurrentPayslip(res.current_payslip || null);
        } catch (err) {
            console.error('Failed to load salary records', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadSalary(); }, []);

    const current = useMemo(() => currentPayslip || (history[0] as any) || null, [currentPayslip, history]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="premium-spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Payslip Modal */}
            {viewingPayslip && <PayslipPrintModal payroll={viewingPayslip} onClose={() => setViewingPayslip(null)} />}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">My Salary</h1>
                    <p className="text-slate-500 text-sm mt-1">Personal payroll records and payslips</p>
                </div>
                <button onClick={() => loadSalary(true)} disabled={refreshing} className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50">
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Hero Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-gradient-to-br from-emerald-500/15 to-transparent border border-emerald-500/20 rounded-2xl">
                    <ShieldCheck size={18} className="text-emerald-400 mb-3" />
                    <div className="flex items-center gap-2 mb-1"><StatusBadge status={status} /></div>
                    <p className="text-slate-500 text-xs mt-2">Current Salary Status</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-sky-500/15 to-transparent border border-sky-500/20 rounded-2xl">
                    <Banknote size={18} className="text-sky-400 mb-3" />
                    <p className="text-xl font-black text-white">{formatCurrency(lastPayment?.net_salary)}</p>
                    <p className="text-slate-500 text-xs mt-1">Last Salary Payment</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/20 rounded-2xl">
                    <CalendarDays size={18} className="text-amber-400 mb-3" />
                    <p className="text-xl font-black text-white">{lastPayment?.payment_date ? new Date(lastPayment.payment_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not paid yet'}</p>
                    <p className="text-slate-500 text-xs mt-1">Last Payment Date</p>
                </div>
            </div>

            {/* Current Payslip Full Breakdown */}
            {current && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Payslip Header Card */}
                        <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 border border-emerald-500/20 rounded-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Current Payslip</p>
                                    <p className="text-white font-black text-lg mt-0.5">{MONTH_FULL[current.month - 1]} {current.year}</p>
                                </div>
                                <StatusBadge status={current.status} />
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-white/[0.05] rounded-xl">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Basic</p>
                                    <p className="text-white font-black">{formatCurrency(current.basic_salary)}</p>
                                </div>
                                <div className="p-3 bg-white/[0.05] rounded-xl">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Gross</p>
                                    <p className="text-slate-300 font-black">{formatCurrency(current.gross_salary)}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 rounded-xl">
                                    <p className="text-emerald-400 text-[10px] uppercase tracking-wider mb-1">Net Pay</p>
                                    <p className="text-emerald-400 font-black">{formatCurrency(current.net_salary)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Earnings Breakdown */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                                <Award size={15} className="text-emerald-400" />
                                <h3 className="text-white font-bold text-sm">Earnings</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {([
                                    ['Basic Salary', current.basic_salary, 'text-white'],
                                    ['Housing Allowance', current.housing_allowance, 'text-emerald-400'],
                                    ['Transport Allowance', current.transport_allowance, 'text-emerald-400'],
                                    ['Meal Allowance', current.meal_allowance, 'text-emerald-400'],
                                    ['Responsibility Allow.', current.responsibility_allowance, 'text-emerald-400'],
                                    ['Overtime', current.overtime, 'text-emerald-400'],
                                    ['Bonuses', current.bonuses, 'text-sky-400'],
                                ] as [string, number, string][]).map(([label, val, color]) => Number(val) > 0 ? (
                                    <div key={label} className="flex justify-between items-center text-xs py-1.5 border-b border-white/[0.03]">
                                        <span className="text-slate-400">{label}</span>
                                        <span className={`${color} font-mono font-bold`}>{formatCurrency(val)}</span>
                                    </div>
                                ) : null)}
                                <div className="flex justify-between items-center text-sm font-bold pt-2">
                                    <span className="text-white">Gross Salary</span>
                                    <span className="text-white font-mono">{formatCurrency(current.gross_salary)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deductions Breakdown */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                                <TrendingDown size={15} className="text-red-400" />
                                <h3 className="text-white font-bold text-sm">Deductions</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {([
                                    ['Tax', current.tax],
                                    ['Pension Contribution', current.pension],
                                    ['Loan Repayment', current.loans],
                                    ['Other Deductions', current.other_deductions],
                                    ['Leave Adjustment', current.leave_adjustment],
                                    ['Attendance Adjustment', current.attendance_adjustment],
                                ] as [string, number][]).map(([label, val]) => Number(val) > 0 ? (
                                    <div key={label} className="flex justify-between items-center text-xs py-1.5 border-b border-white/[0.03]">
                                        <span className="text-slate-400">{label}</span>
                                        <span className="text-red-400 font-mono font-bold">({formatCurrency(val)})</span>
                                    </div>
                                ) : null)}
                                <div className="flex justify-between items-center text-sm font-bold pt-2">
                                    <span className="text-red-400">Total Deductions</span>
                                    <span className="text-red-400 font-mono">({formatCurrency(current.total_deductions)})</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay */}
                        <div className="p-5 bg-gradient-to-r from-emerald-500/15 to-sky-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-emerald-400 text-xs uppercase tracking-wider mb-1">Net Salary</p>
                                <p className="text-3xl font-black text-white">{formatCurrency(current.net_salary)}</p>
                            </div>
                            <div className="text-right text-xs">
                                {current.payment_date && <p className="text-slate-400">Paid: {new Date(current.payment_date).toLocaleDateString()}</p>}
                                {current.payment_reference && <p className="text-slate-500 font-mono mt-0.5">{current.payment_reference}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Quick Allowances + Actions */}
                    <div className="space-y-4">
                        {/* Quick Allowances */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-sky-400" />Allowance Summary</h3>
                            <div className="space-y-2">
                                {([
                                    ['Housing', current.housing_allowance, Home],
                                    ['Transport', current.transport_allowance, Car],
                                    ['Meal', current.meal_allowance, Utensils],
                                    ['Responsibility', current.responsibility_allowance, Star],
                                    ['Overtime', current.overtime, Clock],
                                ] as [string, number, any][]).map(([label, val, Icon]) => (
                                    <div key={label} className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 text-xs"><Icon size={13} className="text-slate-500" /><span className="text-slate-400">{label}</span></div>
                                        <span className="text-emerald-400 text-xs font-mono font-bold">{formatCurrency(val)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Deduction Summary */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><TrendingDown size={15} className="text-red-400" />Deduction Summary</h3>
                            <div className="space-y-2">
                                {([
                                    ['Tax', current.tax],
                                    ['Pension', current.pension],
                                    ['Loans', current.loans],
                                    ['Other', current.other_deductions],
                                ] as [string, number][]).map(([label, val]) => (
                                    <div key={label} className="flex justify-between items-center p-2.5 bg-white/[0.03] rounded-xl border border-white/5 text-xs">
                                        <span className="text-slate-400">{label}</span>
                                        <span className="text-red-400 font-mono font-bold">{formatCurrency(val)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payslip Actions */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                            <h3 className="text-white font-bold text-sm mb-4">Payslip Actions</h3>
                            <div className="space-y-2">
                                <button onClick={() => setViewingPayslip(current)} className="w-full flex items-center gap-3 p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-xl text-sm font-semibold transition-all">
                                    <FileText size={15} />View / Print Payslip
                                </button>
                                <button onClick={() => { setViewingPayslip(current); setTimeout(window.print, 300); }} className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-sm font-semibold transition-all">
                                    <Printer size={15} />Print
                                </button>
                                <button onClick={() => { setViewingPayslip(current); setTimeout(window.print, 300); }} className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-sm font-semibold transition-all">
                                    <Download size={15} />Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No Current Payslip */}
            {!current && (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Receipt size={40} className="text-slate-600 mb-4" />
                    <p className="text-white font-bold text-lg">No payroll record yet</p>
                    <p className="text-slate-500 text-sm mt-1">Your school's finance officer will generate your salary each month.</p>
                </div>
            )}

            {/* Payroll History Table */}
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-2">
                    <Receipt size={16} className="text-sky-400" />
                    <h2 className="text-white font-bold text-sm">Payroll History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">Basic</th>
                                <th className="px-6 py-4">Gross</th>
                                <th className="px-6 py-4">Deductions</th>
                                <th className="px-6 py-4">Net Pay</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Payment Date</th>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {history.map(item => (
                                <>
                                    <tr key={item.id} className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-all cursor-pointer ${expandedId === item.id ? 'bg-white/[0.03]' : ''}`} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                                        <td className="px-6 py-4 text-slate-300 flex items-center gap-2">
                                            {expandedId === item.id ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                                            {MONTH_NAMES[item.month - 1]} {item.year}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 font-mono">{formatCurrency(item.basic_salary)}</td>
                                        <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(item.gross_salary)}</td>
                                        <td className="px-6 py-4 text-red-400 font-mono">{formatCurrency(item.total_deductions)}</td>
                                        <td className="px-6 py-4 text-white font-black font-mono">{formatCurrency(item.net_salary)}</td>
                                        <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                                        <td className="px-6 py-4 text-slate-400">{item.payment_date ? new Date(item.payment_date).toLocaleDateString() : '—'}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono">{item.payment_reference || 'Pending'}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={e => { e.stopPropagation(); setViewingPayslip(item); }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/20 rounded-lg transition-all text-[10px] font-bold">
                                                <FileText size={11} />Payslip
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedId === item.id && (
                                        <tr key={`${item.id}-expanded`} className="border-b border-white/[0.02] bg-white/[0.015]">
                                            <td colSpan={9} className="px-6 py-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                    {([
                                                        ['Housing Allowance', item.housing_allowance, 'text-emerald-400'],
                                                        ['Transport Allowance', item.transport_allowance, 'text-emerald-400'],
                                                        ['Meal Allowance', item.meal_allowance, 'text-emerald-400'],
                                                        ['Responsibility Allow.', item.responsibility_allowance, 'text-emerald-400'],
                                                        ['Overtime', item.overtime, 'text-emerald-400'],
                                                        ['Bonuses', item.bonuses, 'text-sky-400'],
                                                        ['Tax', item.tax, 'text-red-400'],
                                                        ['Pension', item.pension, 'text-red-400'],
                                                        ['Loans', item.loans, 'text-red-400'],
                                                    ] as [string, number, string][]).map(([label, val, color]) => (
                                                        <div key={label} className="p-2.5 bg-white/[0.03] rounded-xl border border-white/5">
                                                            <p className="text-slate-500 text-[10px] mb-1">{label}</p>
                                                            <p className={`${color} font-mono font-bold`}>{formatCurrency(val)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                            {history.length === 0 && (
                                <tr><td colSpan={9} className="text-center py-14 text-slate-600">No salary records available yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
