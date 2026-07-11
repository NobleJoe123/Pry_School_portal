import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Wallet, Receipt, CreditCard, TrendingUp, Users,
    Plus, Search, Filter, Download, CheckCircle, Clock,
    AlertCircle, DollarSign, X, RefreshCw, FileText,
    ArrowUpRight, BarChart3, Banknote, Lock, ShieldCheck, RotateCcw,
    ChevronDown, ChevronRight, Eye, Edit2, Building2, UserCheck,
    Calendar, Printer, List, LayoutGrid, AlertTriangle,
    TrendingDown, PiggyBank, Car, Home, Utensils, Award,
    CircleDollarSign, FileBarChart2, BookOpen, CheckSquare, Square
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type {
    FeeType, StudentFee, PaymentRecord, Payroll, PayrollDetail,
    PayrollSummary, PayrollStaffDirectoryItem, Term,
    PayrollAuditLog, PayrollMonthlySummaryReport, PayrollSalaryRegisterReport
} from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

type Tab = 'overview' | 'fees' | 'billing' | 'payments' | 'payroll';
type PayrollSubTab = 'dashboard' | 'directory' | 'records' | 'reports' | 'audit';

const getList = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.results && Array.isArray(res.results)) return res.results;
    return [];
};

const formatCurrency = (amt: number | string | undefined | null) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(amt ?? 0));

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
    cancelled: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
    not_generated: 'bg-slate-700/30 text-slate-500 border-slate-600/20',
};

const emptyPayrollSummary: PayrollSummary = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    total_monthly_payroll: 0,
    total_basic_salary: 0,
    staff_paid: 0,
    total_staff: 0,
    pending_salary_payments: 0,
    payroll_completion: 0,
    payroll_due_date: null,
    total_deductions: 0,
    total_bonuses: 0,
    total_allowances: 0,
    payroll_processing_status: 'draft',
};

// ── Reusable Spinner ─────────────────────────────────────────────────────────
function Spinner({ size = 4 }: { size?: number }) {
    return <div className={`w-${size} h-${size} border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin`} />;
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
interface PaymentModalProps { fee: StudentFee | null; onClose: () => void; onSuccess: () => void; }
function PaymentModal({ fee, onClose, onSuccess }: PaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'cash' | 'transfer' | 'card' | 'online'>('cash');
    const [txnId, setTxnId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    if (!fee) return null;
    const balance = Number(fee.balance);
    const totalAmount = Number(fee.balance) + Number(fee.amount_paid);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
        if (Number(amount) > balance) { setError(`Amount cannot exceed balance of ${formatCurrency(balance)}`); return; }
        setSubmitting(true);
        try {
            await api.post(`${endpoints.finance.studentFees}${fee.id}/record_payment/`, { amount: Number(amount), payment_method: method, transaction_id: txnId });
            onSuccess(); onClose();
        } catch (err: any) { setError(err.message || 'Payment failed.'); }
        finally { setSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div><h2 className="text-lg font-bold text-white">Record Payment</h2><p className="text-xs text-slate-500 mt-0.5">{fee.student_name} — {fee.fee_type_name}</p></div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
                </div>
                <div className="p-6 bg-white/[0.02] border-b border-white/5">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div><p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Total Fee</p><p className="font-bold text-white text-sm">{formatCurrency(totalAmount)}</p></div>
                        <div><p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Paid</p><p className="font-bold text-emerald-400 text-sm">{formatCurrency(fee.amount_paid)}</p></div>
                        <div><p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Balance</p><p className="font-bold text-amber-400 text-sm">{formatCurrency(balance)}</p></div>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"><AlertCircle size={14} />{error}</div>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">Amount (₦)</label>
                        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₦</span>
                            <input type="number" min="1" max={balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Max: ${formatCurrency(balance)}`} className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" /></div>
                        <div className="flex gap-2 mt-2">{[balance * 0.25, balance * 0.5, balance].map((v, i) => (<button key={i} type="button" onClick={() => setAmount(String(Math.round(v)))} className="flex-1 py-1.5 text-[10px] font-bold text-slate-400 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/10 rounded-lg transition-all">{i === 0 ? '25%' : i === 1 ? '50%' : 'Full'}</button>))}</div>
                    </div>
                    <div><label className="block text-xs font-semibold text-slate-400 mb-2">Payment Method</label>
                        <div className="grid grid-cols-4 gap-2">{(['cash', 'transfer', 'card', 'online'] as const).map(m => (<button key={m} type="button" onClick={() => setMethod(m)} className={`py-2.5 text-xs font-bold rounded-xl border transition-all capitalize ${method === m ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'text-slate-400 border-white/10 bg-white/5 hover:border-white/20'}`}>{m}</button>))}</div>
                    </div>
                    {(method === 'transfer' || method === 'online') && (<div><label className="block text-xs font-semibold text-slate-400 mb-2">Transaction ID</label><input type="text" value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="e.g. TXN-2025-0012" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" /></div>)}
                    <button type="submit" disabled={submitting} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                        {submitting ? <><Spinner />Processing...</> : <><CheckCircle size={16} />Confirm Payment</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Add Fee Modal ─────────────────────────────────────────────────────────────
interface AddFeeModalProps { onClose: () => void; onSuccess: () => void; levels: { id: string; name: string }[]; }
function AddFeeModal({ onClose, onSuccess, levels }: AddFeeModalProps) {
    const [form, setForm] = useState({ name: '', amount: '', level: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.amount || !form.level) { setError('All fields are required.'); return; }
        setSubmitting(true);
        try { await api.post(endpoints.finance.feeTypes, { name: form.name, amount: Number(form.amount), level: form.level, description: form.description }); onSuccess(); onClose(); }
        catch (err: any) { setError(err.message || 'Failed to create fee type.'); }
        finally { setSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Create Fee Type</h2><button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
                    <div><label className="block text-xs font-semibold text-slate-400 mb-2">Fee Name</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tuition Fee, Development Levy..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-slate-400 mb-2">Amount (₦)</label><input type="number" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" /></div>
                        <div><label className="block text-xs font-semibold text-slate-400 mb-2">Class Level</label><select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50"><option value="">Select level...</option>{levels.map(l => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}</select></div>
                    </div>
                    <div><label className="block text-xs font-semibold text-slate-400 mb-2">Description (optional)</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." rows={2} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none" /></div>
                    <button type="submit" disabled={submitting} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">{submitting ? <><Spinner />Saving...</> : <><Plus size={16} />Create Fee Type</>}</button>
                </form>
            </div>
        </div>
    );
}

// ── Generate Payroll Modal ─────────────────────────────────────────────────────
interface GeneratePayrollModalProps { onClose: () => void; onSuccess: () => void; }
function GeneratePayrollModal({ onClose, onSuccess }: GeneratePayrollModalProps) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [dueDate, setDueDate] = useState('');
    const [includeAdmin, setIncludeAdmin] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const res: any = await api.post(endpoints.finance.payrollGenerateMonthly, { month, year, due_date: dueDate || undefined, include_admin: includeAdmin });
            alert(res.message || 'Payroll generated!'); onSuccess(); onClose();
        } catch (err: any) { setError(err.message || 'Failed to generate payroll.'); }
        finally { setSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between"><h2 className="text-lg font-bold text-white">Generate Payroll</h2><button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-slate-400 mb-2">Month</label><select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none">{MONTH_NAMES.map((m, i) => <option key={i} value={i + 1} className="bg-slate-900">{m}</option>)}</select></div>
                        <div><label className="block text-xs font-semibold text-slate-400 mb-2">Year</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none" /></div>
                    </div>
                    <div><label className="block text-xs font-semibold text-slate-400 mb-2">Due Date (optional)</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none" /></div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={includeAdmin} onChange={e => setIncludeAdmin(e.target.checked)} className="w-4 h-4 rounded" />
                        <span className="text-xs text-slate-400">Include admin staff</span>
                    </label>
                    <button type="submit" disabled={submitting} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">{submitting ? <><Spinner />Generating...</> : <><Users size={16} />Generate Payroll</>}</button>
                </form>
            </div>
        </div>
    );
}

// ── Edit Salary Modal ─────────────────────────────────────────────────────────
interface EditSalaryModalProps { payroll: Payroll; onClose: () => void; onSuccess: () => void; }
function EditSalaryModal({ payroll, onClose, onSuccess }: EditSalaryModalProps) {
    const [form, setForm] = useState({
        basic_salary: String(payroll.basic_salary),
        housing_allowance: String(payroll.housing_allowance),
        transport_allowance: String(payroll.transport_allowance),
        meal_allowance: String(payroll.meal_allowance),
        responsibility_allowance: String(payroll.responsibility_allowance),
        overtime: String(payroll.overtime),
        bonuses: String(payroll.bonuses),
        tax: String(payroll.tax),
        pension: String(payroll.pension),
        loans: String(payroll.loans),
        other_deductions: String(payroll.other_deductions),
        leave_adjustment: String(payroll.leave_adjustment),
        attendance_adjustment: String(payroll.attendance_adjustment),
        salary_grade: payroll.salary_grade || '',
        department: payroll.department || '',
        payment_schedule: payroll.payment_schedule,
        notes: payroll.notes || '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const n = (v: string) => Number(v) || 0;
    const totalAllowances = n(form.housing_allowance) + n(form.transport_allowance) + n(form.meal_allowance) + n(form.responsibility_allowance) + n(form.overtime);
    const gross = n(form.basic_salary) + totalAllowances + n(form.bonuses);
    const totalDeductions = n(form.tax) + n(form.pension) + n(form.loans) + n(form.other_deductions) + n(form.leave_adjustment) + n(form.attendance_adjustment);
    const net = gross - totalDeductions;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        try {
            await api.post(endpoints.finance.payrollAction(payroll.id, 'recalculate'), form);
            onSuccess(); onClose();
        } catch (err: any) { setError(err.message || 'Failed to save salary.'); }
        finally { setSubmitting(false); }
    };

    const field = (label: string, key: keyof typeof form, color = 'text-white') => (
        <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
            <input type="number" min="0" step="0.01" value={form[key] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className={`w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 ${color}`} />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl my-4">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div><h2 className="text-lg font-bold text-white">Edit Salary Structure</h2><p className="text-xs text-slate-500 mt-0.5">{payroll.teacher_name} · {MONTH_FULL[(payroll.month) - 1]} {payroll.year}</p></div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
                </div>

                {/* Live Calculator */}
                <div className="px-6 pt-4 pb-2">
                    <div className="grid grid-cols-4 gap-3 p-4 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border border-emerald-500/20 rounded-2xl text-center">
                        <div><p className="text-[10px] text-slate-500 mb-1">Gross</p><p className="text-white font-black text-sm">{formatCurrency(gross)}</p></div>
                        <div><p className="text-[10px] text-slate-500 mb-1">Allowances</p><p className="text-emerald-400 font-bold text-sm">{formatCurrency(totalAllowances)}</p></div>
                        <div><p className="text-[10px] text-slate-500 mb-1">Deductions</p><p className="text-red-400 font-bold text-sm">{formatCurrency(totalDeductions)}</p></div>
                        <div><p className="text-[10px] text-slate-500 mb-1">Net Pay</p><p className="text-white font-black text-base">{formatCurrency(net)}</p></div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

                    <div>
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Banknote size={14} className="text-white" />Base Salary</p>
                        {field('Basic Salary (₦)', 'basic_salary', 'text-white font-bold')}
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Award size={14} className="text-emerald-400" />Allowances</p>
                        <div className="grid grid-cols-2 gap-3">
                            {field('Housing Allowance', 'housing_allowance', 'text-emerald-400')}
                            {field('Transport Allowance', 'transport_allowance', 'text-emerald-400')}
                            {field('Meal Allowance', 'meal_allowance', 'text-emerald-400')}
                            {field('Responsibility Allowance', 'responsibility_allowance', 'text-emerald-400')}
                            {field('Overtime', 'overtime', 'text-emerald-400')}
                            {field('Bonuses', 'bonuses', 'text-sky-400')}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><TrendingDown size={14} className="text-red-400" />Deductions</p>
                        <div className="grid grid-cols-2 gap-3">
                            {field('Tax (₦)', 'tax', 'text-red-400')}
                            {field('Pension (₦)', 'pension', 'text-red-400')}
                            {field('Loan Repayment (₦)', 'loans', 'text-red-400')}
                            {field('Other Deductions (₦)', 'other_deductions', 'text-red-400')}
                            {field('Leave Adjustment (₦)', 'leave_adjustment', 'text-amber-400')}
                            {field('Attendance Adjustment (₦)', 'attendance_adjustment', 'text-amber-400')}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Salary Grade</label>
                            <input type="text" value={form.salary_grade} onChange={e => setForm(p => ({ ...p, salary_grade: e.target.value }))} placeholder="e.g. GL-08" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Payment Schedule</label>
                            <select value={form.payment_schedule} onChange={e => setForm(p => ({ ...p, payment_schedule: e.target.value as any }))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50">
                                <option value="monthly" className="bg-slate-900">Monthly</option>
                                <option value="bi_weekly" className="bg-slate-900">Bi-weekly</option>
                                <option value="weekly" className="bg-slate-900">Weekly</option>
                                <option value="contract" className="bg-slate-900">Contract-Based</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional notes..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-2 flex-grow py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">{submitting ? <><Spinner />Saving...</> : <><CheckCircle size={16} />Save & Recalculate</>}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Pay Modal ─────────────────────────────────────────────────────────────────
interface PayModalProps { payroll: Payroll | null; onClose: () => void; onSuccess: () => void; }
function PayModal({ payroll, onClose, onSuccess }: PayModalProps) {
    const [method, setMethod] = useState<'bank_transfer' | 'cash' | 'cheque' | 'gateway'>('bank_transfer');
    const [reference, setReference] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    if (!payroll) return null;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        try {
            await api.post(endpoints.finance.payrollAction(payroll.id, 'mark_paid'), { payment_method: method, payment_reference: reference });
            onSuccess(); onClose();
        } catch (err: any) { setError(err.message || 'Payment failed.'); }
        finally { setSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div><h2 className="text-lg font-bold text-white">Process Payment</h2><p className="text-xs text-slate-500 mt-0.5">{payroll.teacher_name} · {MONTH_FULL[payroll.month - 1]} {payroll.year}</p></div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
                </div>
                <div className="p-6 bg-emerald-500/5 border-b border-emerald-500/10">
                    <div className="text-center"><p className="text-sm text-slate-400">Net Salary to Pay</p><p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(payroll.net_salary)}</p></div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
                    <div><label className="block text-xs font-semibold text-slate-400 mb-2">Payment Method</label>
                        <div className="grid grid-cols-2 gap-2">{(['bank_transfer', 'cash', 'cheque', 'gateway'] as const).map(m => (<button key={m} type="button" onClick={() => setMethod(m)} className={`py-2.5 text-xs font-bold rounded-xl border transition-all capitalize ${method === m ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'text-slate-400 border-white/10 bg-white/5 hover:border-white/20'}`}>{m.replace('_', ' ')}</button>))}</div>
                    </div>
                    <div><label className="block text-xs font-semibold text-slate-400 mb-2">Payment Reference (optional)</label><input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Auto-generated if blank" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" /></div>
                    <button type="submit" disabled={submitting} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">{submitting ? <><Spinner />Processing...</> : <><CheckCircle size={16} />Confirm Payment</>}</button>
                </form>
            </div>
        </div>
    );
}

// ── Payslip Drawer ────────────────────────────────────────────────────────────
interface PayslipDrawerProps { payrollId: string | null; onClose: () => void; }
function PayslipDrawer({ payrollId, onClose }: PayslipDrawerProps) {
    const [data, setData] = useState<PayrollDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!payrollId) return;
        setLoading(true);
        api.get<PayrollDetail>(endpoints.finance.payrollPayslip(payrollId))
            .then(setData).catch(console.error).finally(() => setLoading(false));
    }, [payrollId]);

    if (!payrollId) return null;
    const d = data;

    return (
        <div className="fixed inset-0 z-50 flex" onClick={onClose}>
            <div className="flex-1 bg-black/50 backdrop-blur-sm" />
            <div className="w-full max-w-lg bg-slate-900 border-l border-white/10 overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                    <h2 className="font-bold text-white text-base">Payslip Detail</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
                </div>
                {loading ? <div className="flex items-center justify-center py-20"><div className="premium-spinner" /></div> : d ? (
                    <div className="p-6 space-y-5">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-br from-emerald-500/15 to-sky-500/10 border border-emerald-500/20 rounded-2xl">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{d.school_name}</p>
                            <h3 className="text-white font-black text-lg">{d.staff_name}</h3>
                            <p className="text-slate-400 text-xs">{d.staff_id} · {d.staff_department}</p>
                            <p className="text-slate-500 text-xs mt-1">{MONTH_FULL[(d.month) - 1]} {d.year}</p>
                        </div>

                        {/* Earnings */}
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <p className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Earnings</p>
                            <div className="p-4 space-y-2 text-sm">
                                {[
                                    ['Basic Salary', d.basic_salary],
                                    ['Housing Allowance', d.housing_allowance],
                                    ['Transport Allowance', d.transport_allowance],
                                    ['Meal Allowance', d.meal_allowance],
                                    ['Responsibility Allowance', d.responsibility_allowance],
                                    ['Overtime', d.overtime],
                                    ['Bonuses', d.bonuses],
                                ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                                    <div key={label as string} className="flex justify-between text-xs">
                                        <span className="text-slate-400">{label as string}</span>
                                        <span className="text-emerald-400 font-mono font-bold">{formatCurrency(val as number)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-2 border-t border-white/5 font-bold">
                                    <span className="text-white">Gross Salary</span>
                                    <span className="text-white font-mono">{formatCurrency(d.gross_salary)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <p className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Deductions</p>
                            <div className="p-4 space-y-2">
                                {[
                                    ['Tax', d.tax],
                                    ['Pension', d.pension],
                                    ['Loan Repayment', d.loans],
                                    ['Other Deductions', d.other_deductions],
                                    ['Leave Adjustment', d.leave_adjustment],
                                    ['Attendance Adjustment', d.attendance_adjustment],
                                ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                                    <div key={label as string} className="flex justify-between text-xs">
                                        <span className="text-slate-400">{label as string}</span>
                                        <span className="text-red-400 font-mono font-bold">({formatCurrency(val as number)})</span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-2 border-t border-white/5 font-bold text-xs">
                                    <span className="text-red-400">Total Deductions</span>
                                    <span className="text-red-400 font-mono">({formatCurrency(d.total_deductions)})</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay */}
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                            <span className="text-white font-bold">Net Salary</span>
                            <span className="text-2xl font-black text-emerald-400">{formatCurrency(d.net_salary)}</span>
                        </div>

                        {/* Status */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white/5 rounded-xl"><p className="text-slate-500 mb-1">Status</p><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[d.status] || STATUS_COLORS.draft}`}>{d.status}</span></div>
                            <div className="p-3 bg-white/5 rounded-xl"><p className="text-slate-500 mb-1">Payment Date</p><p className="text-white font-bold">{d.payment_date ? new Date(d.payment_date).toLocaleDateString() : '—'}</p></div>
                            <div className="col-span-2 p-3 bg-white/5 rounded-xl"><p className="text-slate-500 mb-1">Reference</p><p className="text-white font-mono text-xs">{d.payment_reference || 'Not yet paid'}</p></div>
                        </div>

                        {/* Audit Log */}
                        {d.audit_logs?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Audit Trail</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {d.audit_logs.map(log => (
                                        <div key={log.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-500 shrink-0" />
                                            <div>
                                                <p className="text-white text-xs font-semibold capitalize">{log.action.replace(/_/g, ' ')}</p>
                                                <p className="text-slate-500 text-[10px]">{log.user_name || 'System'} · {new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : <p className="text-center py-20 text-slate-600">Payslip not found.</p>}
            </div>
        </div>
    );
}

// ── Main Finance Component ────────────────────────────────────────────────────
export default function Finance() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [payrollSubTab, setPayrollSubTab] = useState<PayrollSubTab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ total_outstanding: 0, total_paid: 0, collection_rate: 0 });
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [payroll, setPayroll] = useState<Payroll[]>([]);
    const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>(emptyPayrollSummary);
    const [staffDirectory, setStaffDirectory] = useState<PayrollStaffDirectoryItem[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);

    // Payroll period filter
    const now = new Date();
    const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
    const [payrollYear, setPayrollYear] = useState(now.getFullYear());

    // Report state
    const [report, setReport] = useState<any>(null);
    const [reportType, setReportType] = useState<string>('monthly_summary');
    const [reportLoading, setReportLoading] = useState(false);

    // Modals
    const [paymentFee, setPaymentFee] = useState<StudentFee | null>(null);
    const [showAddFee, setShowAddFee] = useState(false);
    const [showGenPayroll, setShowGenPayroll] = useState(false);
    const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
    const [payPayroll, setPayPayroll] = useState<Payroll | null>(null);
    const [payslipId, setPayslipId] = useState<string | null>(null);

    // Bulk selection
    const [selectedPayrollIds, setSelectedPayrollIds] = useState<Set<string>>(new Set());

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [payrollSearch, setPayrollSearch] = useState('');
    const [payrollStatusFilter, setPayrollStatusFilter] = useState('');
    const [dirSearch, setDirSearch] = useState('');
    const [dirRoleFilter, setDirRoleFilter] = useState('');
    const [dirStatusFilter, setDirStatusFilter] = useState('');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const [summary, feeTypesRes, studentFeesRes, paymentsRes, payrollRes, payrollSummaryRes, staffDirectoryRes, termsRes, levelsRes] = await Promise.all([
                api.get<any>(`${endpoints.finance.studentFees}summary/`),
                api.get<any>(endpoints.finance.feeTypes),
                api.get<any>(endpoints.finance.studentFees),
                api.get<any>(endpoints.finance.payments),
                api.get<any>(`${endpoints.finance.payroll}?month=${payrollMonth}&year=${payrollYear}`),
                api.get<any>(`${endpoints.finance.payrollSummary}?month=${payrollMonth}&year=${payrollYear}`),
                api.get<any>(endpoints.finance.payrollStaffDirectory),
                api.get<any>(endpoints.academics.terms),
                api.get<any>(endpoints.academics.levels),
            ]);
            setStats(summary);
            setFeeTypes(getList(feeTypesRes));
            setStudentFees(getList(studentFeesRes));
            setPayments(getList(paymentsRes));
            setPayroll(getList(payrollRes));
            setPayrollSummary(payrollSummaryRes || emptyPayrollSummary);
            setStaffDirectory(getList(staffDirectoryRes));
            setTerms(getList(termsRes));
            setLevels(getList(levelsRes));
        } catch (err) { console.error('Failed to fetch finance data', err); }
        finally { setLoading(false); setRefreshing(false); }
    }, [payrollMonth, payrollYear]);

    useEffect(() => { loadData(); }, [loadData]);

    const classOptions = Array.from(new Set(studentFees.map(f => f.class_name).filter(Boolean))) as string[];

    const filteredFees = studentFees.filter(f => {
        const matchSearch = !search || (f.student_name || '').toLowerCase().includes(search.toLowerCase()) || (f.fee_type_name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || f.status === statusFilter;
        const matchClass = !classFilter || f.class_name === classFilter;
        return matchSearch && matchStatus && matchClass;
    });

    const filteredPayroll = payroll.filter(p => {
        const matchSearch = !payrollSearch ||
            (p.teacher_name || '').toLowerCase().includes(payrollSearch.toLowerCase()) ||
            (p.staff_id || '').toLowerCase().includes(payrollSearch.toLowerCase());
        const matchStatus = !payrollStatusFilter || p.status === payrollStatusFilter;
        return matchSearch && matchStatus;
    });

    const filteredDirectory = staffDirectory.filter(s => {
        const matchSearch = !dirSearch || s.full_name.toLowerCase().includes(dirSearch.toLowerCase()) || s.staff_id.toLowerCase().includes(dirSearch.toLowerCase());
        const matchRole = !dirRoleFilter || s.role === dirRoleFilter;
        const matchStatus = !dirStatusFilter || s.payment_status === dirStatusFilter;
        return matchSearch && matchRole && matchStatus;
    });

    const handlePayrollAction = async (id: string, action: string) => {
        try { await api.post<any>(endpoints.finance.payrollAction(id, action), {}); loadData(true); }
        catch (err: any) { alert(err.message || `Failed to ${action} payroll.`); }
    };

    const handleReversePayroll = async (id: string) => {
        const reason = window.prompt('Reason for reversing this payroll?');
        if (reason === null) return;
        try { await api.post<any>(endpoints.finance.payrollAction(id, 'reverse'), { reason }); loadData(true); }
        catch (err: any) { alert(err.message || 'Failed to reverse payroll.'); }
    };

    const handleBulkPay = async () => {
        if (!selectedPayrollIds.size) return;
        const method = window.prompt('Payment method? (bank_transfer / cash / cheque / gateway)', 'bank_transfer');
        if (!method) return;
        try {
            const res: any = await api.post(endpoints.finance.payrollBulkPay, { ids: Array.from(selectedPayrollIds), payment_method: method });
            alert(res.message); setSelectedPayrollIds(new Set()); loadData(true);
        } catch (err: any) { alert(err.message || 'Bulk pay failed.'); }
    };

    const handleBulkApprove = async () => {
        if (!selectedPayrollIds.size) return;
        try {
            const res: any = await api.post(endpoints.finance.payrollBulkApprove, { ids: Array.from(selectedPayrollIds) });
            alert(res.message); setSelectedPayrollIds(new Set()); loadData(true);
        } catch (err: any) { alert(err.message || 'Bulk approve failed.'); }
    };

    const toggleSelect = (id: string) => {
        setSelectedPayrollIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const loadReport = async () => {
        setReportLoading(true);
        try {
            const res = await api.get<any>(`${endpoints.finance.payrollReports}?month=${payrollMonth}&year=${payrollYear}&type=${reportType}`);
            setReport(res);
        } catch (err: any) { alert(err.message || 'Failed to load report.'); }
        finally { setReportLoading(false); }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'billing', label: 'Student Billing', icon: Receipt },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'fees', label: 'Fee Structures', icon: TrendingUp },
        { id: 'payroll', label: 'Payroll', icon: Users },
    ];

    const payrollSubTabs: { id: PayrollSubTab; label: string; icon: any }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'records', label: 'Payroll Records', icon: FileText },
        { id: 'directory', label: 'Staff Directory', icon: Users },
        { id: 'reports', label: 'Reports', icon: FileBarChart2 },
        { id: 'audit', label: 'Audit Log', icon: BookOpen },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Modals & Drawers */}
            {paymentFee && <PaymentModal fee={paymentFee} onClose={() => setPaymentFee(null)} onSuccess={() => loadData(true)} />}
            {showAddFee && <AddFeeModal onClose={() => setShowAddFee(false)} onSuccess={() => loadData(true)} levels={levels} />}
            {showGenPayroll && <GeneratePayrollModal onClose={() => setShowGenPayroll(false)} onSuccess={() => loadData(true)} />}
            {editPayroll && <EditSalaryModal payroll={editPayroll} onClose={() => setEditPayroll(null)} onSuccess={() => { loadData(true); setEditPayroll(null); }} />}
            {payPayroll && <PayModal payroll={payPayroll} onClose={() => setPayPayroll(null)} onSuccess={() => { loadData(true); setPayPayroll(null); }} />}
            {payslipId && <PayslipDrawer payrollId={payslipId} onClose={() => setPayslipId(null)} />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Finance Management</h1>
                    <p className="text-slate-500 text-sm">Monitor revenue, billing, and staff payroll</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadData(true)} disabled={refreshing} className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-all" onClick={() => window.print()}>
                        <Download size={16} /><span>Export</span>
                    </button>
                    {activeTab === 'fees' && <button onClick={() => setShowAddFee(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"><Plus size={16} /><span>Add Fee Type</span></button>}
                    {activeTab === 'payroll' && <button onClick={() => setShowGenPayroll(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"><Plus size={16} /><span>Generate Payroll</span></button>}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
                    <div className="flex items-center justify-between mb-4"><div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><CheckCircle size={20} /></div><span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Collection Rate</span></div>
                    <p className="text-3xl font-black text-white">{stats.collection_rate.toFixed(1)}%</p>
                    <p className="text-slate-500 text-xs mt-1">Revenue collected this term</p>
                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(stats.collection_rate, 100)}%` }} /></div>
                </div>
                <div className="p-6 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl">
                    <div className="flex items-center justify-between mb-4"><div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Clock size={20} /></div><ArrowUpRight size={14} className="text-amber-500" /></div>
                    <p className="text-3xl font-black text-white">{formatCurrency(stats.total_outstanding)}</p>
                    <p className="text-slate-500 text-xs mt-1">Total outstanding balances</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-4"><div className="p-2 bg-white/10 rounded-lg text-slate-400"><TrendingUp size={20} /></div><ArrowUpRight size={14} className="text-slate-500" /></div>
                    <p className="text-3xl font-black text-white">{formatCurrency(stats.total_paid)}</p>
                    <p className="text-slate-500 text-xs mt-1">Total cash collected (Termly)</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button key={tab.id} id={`finance-tab-${tab.id}`} onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <tab.icon size={16} />{tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-24"><div className="premium-spinner" /></div>
            ) : (
                <div className="space-y-6">

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-emerald-500 opacity-5"><TrendingUp size={140} /></div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-emerald-400" />Financial Summary</h3>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div><p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Expected Revenue</p><p className="text-2xl font-black text-white">{formatCurrency(stats.total_paid + stats.total_outstanding)}</p></div>
                                        <div className="text-right"><p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Collected</p><p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.total_paid)}</p></div>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div><p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pending Students</p><p className="text-lg font-bold text-amber-400">{studentFees.filter(f => f.status !== 'paid').length} students</p></div>
                                        <div className="text-right"><p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Deficit</p><p className="text-xl font-bold text-red-400">{formatCurrency(stats.total_outstanding)}</p></div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div><p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Total Transactions</p><p className="text-lg font-bold text-white">{payments.length}</p></div>
                                        <div className="text-right"><p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Monthly Payroll</p><p className="text-lg font-bold text-violet-400">{formatCurrency(payrollSummary.total_monthly_payroll)}</p></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                                    <div className="p-5 border-b border-white/5"><h3 className="font-bold text-white text-sm flex items-center gap-2"><CreditCard size={16} className="text-emerald-400" />Recent Payments</h3></div>
                                    <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                                        {payments.slice(0, 5).map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all">
                                                <div><p className="text-xs font-bold text-white">{p.student_name}</p><p className="text-[10px] text-slate-500 mt-0.5 capitalize">{p.payment_method} • {new Date(p.date).toLocaleDateString()}</p></div>
                                                <p className="text-sm font-bold text-emerald-400">{formatCurrency(p.amount)}</p>
                                            </div>
                                        ))}
                                        {payments.length === 0 && <p className="text-slate-600 text-xs text-center py-6">No payments recorded yet.</p>}
                                    </div>
                                </div>
                                <div className="bg-emerald-500 p-6 rounded-3xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 text-slate-900"><Wallet size={100} /></div>
                                    <h3 className="text-slate-950 font-black text-base mb-3">Payment Status</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Paid', value: studentFees.filter(f => f.status === 'paid').length },
                                            { label: 'Partial', value: studentFees.filter(f => f.status === 'partial').length },
                                            { label: 'Outstanding', value: studentFees.filter(f => f.status === 'outstanding').length },
                                        ].map(s => (
                                            <div key={s.label} className="bg-slate-950/20 rounded-2xl p-3 text-center"><p className="text-2xl font-black text-slate-950">{s.value}</p><p className="text-[10px] font-bold text-slate-950/70 uppercase tracking-wider">{s.label}</p></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BILLING */}
                    {activeTab === 'billing' && (
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/[0.01]">
                                <div className="relative flex-1 max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input id="billing-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pupil or fee..." className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50" /></div>
                                <FilterDropdown value={classFilter} options={[{ id: '', label: 'All Classes' }, ...classOptions.map(cls => ({ id: cls, label: cls }))]} onChange={setClassFilter} placeholder="All Classes" colorTheme="amber" />
                                <FilterDropdown value={statusFilter} options={[{ id: '', label: 'All Status' }, { id: 'paid', label: 'Paid' }, { id: 'partial', label: 'Partial' }, { id: 'outstanding', label: 'Outstanding' }]} onChange={setStatusFilter} placeholder="All Status" colorTheme="amber" />
                                <span className="text-xs text-slate-500">{filteredFees.length} records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead><tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]"><th className="px-6 py-4">Pupil</th><th className="px-6 py-4">Class</th><th className="px-6 py-4">Fee Type</th><th className="px-6 py-4">Term</th><th className="px-6 py-4">Total</th><th className="px-6 py-4">Paid</th><th className="px-6 py-4">Balance</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr></thead>
                                    <tbody className="text-xs">
                                        {filteredFees.map(fee => (
                                            <tr key={fee.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-all">
                                                <td className="px-6 py-4 text-white font-semibold">{fee.student_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-400">{fee.class_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-400">{fee.fee_type_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-500">{fee.term_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(Number(fee.amount_paid) + Number(fee.balance))}</td>
                                                <td className="px-6 py-4 text-emerald-400 font-mono">{formatCurrency(fee.amount_paid)}</td>
                                                <td className="px-6 py-4 text-red-400 font-mono">{formatCurrency(fee.balance)}</td>
                                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${fee.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : fee.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{fee.status}</span></td>
                                                <td className="px-6 py-4">{fee.status !== 'paid' && (<button onClick={() => setPaymentFee(fee)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all"><DollarSign size={11} />Pay</button>)}</td>
                                            </tr>
                                        ))}
                                        {filteredFees.length === 0 && <tr><td colSpan={9} className="text-center py-16 text-slate-600"><FileText size={32} className="mx-auto mb-2 opacity-30" />No billing records found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PAYMENTS */}
                    {activeTab === 'payments' && (
                        <div className="space-y-3">
                            {payments.map(payment => (
                                <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Banknote size={20} /></div>
                                        <div><p className="text-sm font-bold text-white">{payment.student_name || 'Unknown'}</p><p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{new Date(payment.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · <span className="capitalize">{payment.payment_method}</span></p></div>
                                    </div>
                                    <div className="text-right"><p className="text-sm font-black text-emerald-400">{formatCurrency(payment.amount)}</p><p className="text-[10px] text-slate-600 font-mono mt-0.5">{payment.transaction_id || 'CASH-REC'}</p></div>
                                </div>
                            ))}
                            {payments.length === 0 && <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10"><CreditCard size={32} className="text-slate-600 mb-3" /><p className="text-slate-500 text-sm">No payments recorded yet.</p></div>}
                        </div>
                    )}

                    {/* FEE STRUCTURES */}
                    {activeTab === 'fees' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {feeTypes.map(ft => (
                                <div key={ft.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                                    <div className="flex items-start justify-between mb-3"><div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Receipt size={18} /></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">{ft.level_name || 'All Levels'}</span></div>
                                    <p className="font-bold text-white text-base">{ft.name}</p>
                                    <p className="text-slate-500 text-xs mt-1 mb-3">{ft.description || 'No description'}</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(ft.amount)}</p>
                                </div>
                            ))}
                            {feeTypes.length === 0 && <div className="col-span-3 flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10"><TrendingUp size={32} className="text-slate-600 mb-3" /><p className="text-slate-500 text-sm">No fee types created yet.</p><button onClick={() => setShowAddFee(true)} className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all"><Plus size={14} />Create First Fee Type</button></div>}
                        </div>
                    )}

                    {/* ── PAYROLL ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'payroll' && (
                        <div className="space-y-5">
                            {/* Period Picker */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                                    {payrollSubTabs.map(st => (
                                        <button key={st.id} onClick={() => setPayrollSubTab(st.id)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${payrollSubTab === st.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                            <st.icon size={13} />{st.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <select value={payrollMonth} onChange={e => setPayrollMonth(Number(e.target.value))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none">
                                        {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1} className="bg-slate-900">{m}</option>)}
                                    </select>
                                    <input type="number" value={payrollYear} onChange={e => setPayrollYear(Number(e.target.value))} className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none" />
                                </div>
                            </div>

                            {/* ── Dashboard ── */}
                            {payrollSubTab === 'dashboard' && (
                                <div className="space-y-5">
                                    {/* 8 Metric Cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Monthly Payroll', value: formatCurrency(payrollSummary.total_monthly_payroll), icon: Wallet, color: 'from-emerald-500/15 border-emerald-500/20', iconColor: 'text-emerald-400' },
                                            { label: 'Staff Paid', value: `${payrollSummary.staff_paid} / ${payrollSummary.total_staff}`, icon: UserCheck, color: 'from-sky-500/15 border-sky-500/20', iconColor: 'text-sky-400' },
                                            { label: 'Pending Payments', value: String(payrollSummary.pending_salary_payments), icon: Clock, color: 'from-amber-500/15 border-amber-500/20', iconColor: 'text-amber-400' },
                                            { label: 'Completion', value: `${payrollSummary.payroll_completion}%`, icon: ShieldCheck, color: 'from-violet-500/15 border-violet-500/20', iconColor: 'text-violet-400' },
                                            { label: 'Total Allowances', value: formatCurrency(payrollSummary.total_allowances), icon: Award, color: 'from-teal-500/15 border-teal-500/20', iconColor: 'text-teal-400' },
                                            { label: 'Total Bonuses', value: formatCurrency(payrollSummary.total_bonuses), icon: CircleDollarSign, color: 'from-pink-500/15 border-pink-500/20', iconColor: 'text-pink-400' },
                                            { label: 'Total Deductions', value: formatCurrency(payrollSummary.total_deductions), icon: TrendingDown, color: 'from-red-500/15 border-red-500/20', iconColor: 'text-red-400' },
                                            { label: 'Payroll Due Date', value: payrollSummary.payroll_due_date ? new Date(payrollSummary.payroll_due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Not set', icon: Calendar, color: 'from-orange-500/15 border-orange-500/20', iconColor: 'text-orange-400' },
                                        ].map(card => (
                                            <div key={card.label} className={`p-5 bg-gradient-to-br ${card.color} border rounded-2xl`}>
                                                <card.icon size={18} className={`${card.iconColor} mb-3`} />
                                                <p className="text-xl font-black text-white">{card.value}</p>
                                                <p className="text-slate-500 text-xs mt-1">{card.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Status + Processing */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-5">
                                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-emerald-400" />Payroll Breakdown · {MONTH_FULL[payrollMonth - 1]} {payrollYear}</h3>
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'Basic Salary', value: payrollSummary.total_basic_salary, color: 'bg-white' },
                                                    { label: 'Total Allowances', value: payrollSummary.total_allowances, color: 'bg-emerald-500' },
                                                    { label: 'Total Bonuses', value: payrollSummary.total_bonuses, color: 'bg-sky-500' },
                                                    { label: 'Total Deductions', value: payrollSummary.total_deductions, color: 'bg-red-500' },
                                                    { label: 'Net Payroll', value: payrollSummary.total_monthly_payroll, color: 'bg-violet-500' },
                                                ].map(row => {
                                                    const max = Math.max(payrollSummary.total_monthly_payroll, payrollSummary.total_basic_salary, 1);
                                                    return (
                                                        <div key={row.label}>
                                                            <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{row.label}</span><span className="text-white font-mono font-bold">{formatCurrency(row.value)}</span></div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${row.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min((row.value / max) * 100, 100)}%` }} /></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><ShieldCheck size={15} className="text-violet-400" />Processing Status</h3>
                                            <div className="space-y-2 text-xs">
                                                {(['draft', 'preview', 'approved', 'locked', 'paid', 'reversed'] as const).map(s => {
                                                    const count = payroll.filter(p => p.status === s).length;
                                                    return (
                                                        <div key={s} className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-xl border border-white/5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[s]}`}>{s}</span>
                                                            <span className="text-white font-bold">{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Records ── */}
                            {payrollSubTab === 'records' && (
                                <div className="space-y-4">
                                    {/* Search & Filters */}
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <div className="relative flex-1 min-w-[200px] max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={payrollSearch} onChange={e => setPayrollSearch(e.target.value)} placeholder="Search staff..." className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50" /></div>
                                        <FilterDropdown value={payrollStatusFilter} options={[{ id: '', label: 'All Status' }, ...(['draft', 'preview', 'approved', 'locked', 'processing', 'paid', 'failed', 'reversed']).map(s => ({ id: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} onChange={setPayrollStatusFilter} placeholder="All Status" colorTheme="emerald" />

                                        {/* Bulk Actions */}
                                        {selectedPayrollIds.size > 0 && (
                                            <div className="flex items-center gap-2 ml-auto">
                                                <span className="text-xs text-slate-400">{selectedPayrollIds.size} selected</span>
                                                <button onClick={handleBulkApprove} className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/20 rounded-xl text-xs font-bold transition-all"><ShieldCheck size={13} />Approve All</button>
                                                <button onClick={handleBulkPay} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all"><CheckCircle size={13} />Pay All</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead><tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                                    <th className="px-4 py-4">
                                                        <button onClick={() => setSelectedPayrollIds(selectedPayrollIds.size === filteredPayroll.length ? new Set() : new Set(filteredPayroll.map(p => p.id)))} className="text-slate-500 hover:text-white transition-colors">
                                                            {selectedPayrollIds.size === filteredPayroll.length && filteredPayroll.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                                        </button>
                                                    </th>
                                                    <th className="px-4 py-4">Staff</th><th className="px-4 py-4">Period</th><th className="px-4 py-4">Basic</th><th className="px-4 py-4">Allowances</th><th className="px-4 py-4">Deductions</th><th className="px-4 py-4">Net Pay</th><th className="px-4 py-4">Status</th><th className="px-4 py-4 min-w-[220px]">Actions</th>
                                                </tr></thead>
                                                <tbody className="text-xs">
                                                    {filteredPayroll.map(p => (
                                                        <tr key={p.id} className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-all ${selectedPayrollIds.has(p.id) ? 'bg-emerald-500/5' : ''}`}>
                                                            <td className="px-4 py-4"><button onClick={() => toggleSelect(p.id)} className="text-slate-500 hover:text-emerald-400 transition-colors">{selectedPayrollIds.has(p.id) ? <CheckSquare size={14} className="text-emerald-400" /> : <Square size={14} />}</button></td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {p.profile_photo_url ? <img src={p.profile_photo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10" /> : <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">{(p.teacher_name || '?')[0]}</div>}
                                                                    <div><p className="text-white font-semibold">{p.teacher_name || '—'}</p><p className="text-slate-500 text-[10px]">{p.staff_id || ''} · <span className="capitalize">{p.staff_role}</span></p></div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-400">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                                                            <td className="px-4 py-4 text-slate-300 font-mono">{formatCurrency(p.basic_salary)}</td>
                                                            <td className="px-4 py-4 text-emerald-400 font-mono">{formatCurrency(p.total_allowances)}</td>
                                                            <td className="px-4 py-4 text-red-400 font-mono">{formatCurrency(p.total_deductions)}</td>
                                                            <td className="px-4 py-4 text-white font-black font-mono">{formatCurrency(p.net_salary)}</td>
                                                            <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>{p.status}</span></td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <button onClick={() => setPayslipId(p.id)} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-lg transition-all" title="View payslip"><Eye size={12} /></button>
                                                                    {!['paid', 'locked', 'reversed', 'cancelled'].includes(p.status) && <button onClick={() => setEditPayroll(p)} className="p-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/20 rounded-lg transition-all" title="Edit salary"><Edit2 size={12} /></button>}
                                                                    {p.status === 'draft' && <button onClick={() => handlePayrollAction(p.id, 'preview')} className="p-1.5 bg-slate-500/10 hover:bg-slate-500 text-slate-400 hover:text-white border border-slate-500/20 rounded-lg transition-all" title="Set to Preview"><Eye size={12} /></button>}
                                                                    {['draft', 'preview'].includes(p.status) && <button onClick={() => handlePayrollAction(p.id, 'approve')} className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-slate-950 border border-blue-500/20 rounded-lg transition-all" title="Approve"><ShieldCheck size={12} /></button>}
                                                                    {p.status === 'approved' && <button onClick={() => handlePayrollAction(p.id, 'lock')} className="p-1.5 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-slate-950 border border-violet-500/20 rounded-lg transition-all" title="Lock payroll"><Lock size={12} /></button>}
                                                                    {['approved', 'locked', 'processing'].includes(p.status) && <button onClick={() => setPayPayroll(p)} className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-lg transition-all text-[10px] font-bold" title="Process payment"><CheckCircle size={11} />Pay</button>}
                                                                    {['paid', 'failed'].includes(p.status) && <button onClick={() => handleReversePayroll(p.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg transition-all" title="Reverse"><RotateCcw size={12} /></button>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredPayroll.length === 0 && <tr><td colSpan={9} className="text-center py-16"><Users size={32} className="mx-auto mb-2 text-slate-700" /><p className="text-slate-600 text-sm">No payroll records found.</p><button onClick={() => setShowGenPayroll(true)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all"><Plus size={12} />Generate This Month's Payroll</button></td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Staff Directory ── */}
                            {payrollSubTab === 'directory' && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-3">
                                        <div className="relative flex-1 min-w-[200px] max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={dirSearch} onChange={e => setDirSearch(e.target.value)} placeholder="Search staff..." className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none" /></div>
                                        <FilterDropdown value={dirRoleFilter} options={[{ id: '', label: 'All Roles' }, { id: 'teacher', label: 'Teaching Staff' }, { id: 'admin', label: 'Admin Staff' }]} onChange={setDirRoleFilter} placeholder="All Roles" colorTheme="emerald" />
                                        <FilterDropdown value={dirStatusFilter} options={[{ id: '', label: 'All Statuses' }, ...(['draft', 'approved', 'paid', 'not_generated']).map(s => ({ id: s, label: s.replace('_', ' ') }))]} onChange={setDirStatusFilter} placeholder="Payroll Status" colorTheme="emerald" />
                                        <span className="text-xs text-slate-500 self-center">{filteredDirectory.length} staff</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {filteredDirectory.map(staff => (
                                            <div key={staff.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-3 mb-3">
                                                    {staff.profile_photo_url ? <img src={staff.profile_photo_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10" /> : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-black text-base">{staff.full_name[0]}</div>}
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{staff.full_name}</p>
                                                        <p className="text-slate-500 text-[10px]">{staff.staff_id} · {staff.department}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                    <div className="p-2 bg-white/[0.03] rounded-lg"><p className="text-slate-500 text-[10px] mb-0.5">Role</p><p className="text-white capitalize font-semibold">{staff.role}</p></div>
                                                    <div className="p-2 bg-white/[0.03] rounded-lg"><p className="text-slate-500 text-[10px] mb-0.5">Employment</p><p className="text-white capitalize font-semibold">{staff.employment_status?.replace('_', ' ')}</p></div>
                                                    <div className="p-2 bg-white/[0.03] rounded-lg"><p className="text-slate-500 text-[10px] mb-0.5">Salary Grade</p><p className="text-white font-semibold">{staff.salary_grade || 'N/A'}</p></div>
                                                    <div className="p-2 bg-white/[0.03] rounded-lg"><p className="text-slate-500 text-[10px] mb-0.5">Net Salary</p><p className="text-emerald-400 font-bold">{staff.net_salary != null ? formatCurrency(staff.net_salary) : '—'}</p></div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[staff.payment_status] || STATUS_COLORS.not_generated}`}>{staff.payment_status.replace('_', ' ')}</span>
                                            </div>
                                        ))}
                                        {filteredDirectory.length === 0 && <div className="col-span-3 text-center py-16 text-slate-600"><Users size={32} className="mx-auto mb-2 opacity-30" />No staff records found.</div>}
                                    </div>
                                </div>
                            )}

                            {/* ── Reports ── */}
                            {payrollSubTab === 'reports' && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <FilterDropdown value={reportType} options={[
                                            { id: 'monthly_summary', label: 'Monthly Summary' },
                                            { id: 'salary_register', label: 'Salary Register' },
                                            { id: 'deduction_report', label: 'Deduction Report' },
                                            { id: 'allowance_report', label: 'Allowance Report' },
                                        ]} onChange={setReportType} placeholder="Report Type" colorTheme="emerald" />
                                        <button onClick={loadReport} disabled={reportLoading} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all">
                                            {reportLoading ? <Spinner /> : <FileBarChart2 size={15} />}Generate Report
                                        </button>
                                        {report && <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-sm transition-all"><Printer size={15} />Print</button>}
                                    </div>

                                    {report && (
                                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                            <div className="p-5 border-b border-white/5">
                                                <h3 className="text-white font-bold">
                                                    {report.report_type === 'monthly_summary' && 'Monthly Payroll Summary'}
                                                    {report.report_type === 'salary_register' && 'Salary Register'}
                                                    {report.report_type === 'deduction_report' && 'Deduction Report'}
                                                    {report.report_type === 'allowance_report' && 'Allowance Report'}
                                                    {' · '}{MONTH_FULL[report.month - 1]} {report.year}
                                                </h3>
                                            </div>

                                            {report.report_type === 'monthly_summary' && (
                                                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {[
                                                        ['Total Staff', report.total_staff],
                                                        ['Staff Paid', report.staff_paid],
                                                        ['Basic Salary', formatCurrency(report.total_basic_salary)],
                                                        ['Allowances', formatCurrency(report.total_allowances)],
                                                        ['Bonuses', formatCurrency(report.total_bonuses)],
                                                        ['Total Tax', formatCurrency(report.total_tax)],
                                                        ['Total Pension', formatCurrency(report.total_pension)],
                                                        ['Deductions', formatCurrency(report.total_deductions)],
                                                        ['Net Payroll', formatCurrency(report.total_net_salary)],
                                                    ].map(([label, value]) => (
                                                        <div key={label as string} className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                                                            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
                                                            <p className="text-white font-black text-sm">{value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {(report.records) && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead><tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                                            {report.report_type === 'salary_register' && (<><th className="px-4 py-3">Staff ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Dept</th><th className="px-4 py-3">Basic</th><th className="px-4 py-3">Allowances</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Status</th></>)}
                                                            {report.report_type === 'deduction_report' && (<><th className="px-4 py-3">Name</th><th className="px-4 py-3">Tax</th><th className="px-4 py-3">Pension</th><th className="px-4 py-3">Loans</th><th className="px-4 py-3">Other</th><th className="px-4 py-3">Leave</th><th className="px-4 py-3">Total</th></>)}
                                                            {report.report_type === 'allowance_report' && (<><th className="px-4 py-3">Name</th><th className="px-4 py-3">Housing</th><th className="px-4 py-3">Transport</th><th className="px-4 py-3">Meal</th><th className="px-4 py-3">Responsibility</th><th className="px-4 py-3">Overtime</th><th className="px-4 py-3">Total</th></>)}
                                                        </tr></thead>
                                                        <tbody>
                                                            {report.records.map((r: any, i: number) => (
                                                                <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                                                                    {report.report_type === 'salary_register' && (<><td className="px-4 py-3 text-slate-400 font-mono">{r.staff_id}</td><td className="px-4 py-3 text-white font-semibold">{r.full_name}</td><td className="px-4 py-3 text-slate-400">{r.department}</td><td className="px-4 py-3 font-mono text-slate-300">{formatCurrency(r.basic_salary)}</td><td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(r.total_allowances)}</td><td className="px-4 py-3 font-mono text-slate-300">{formatCurrency(r.gross_salary)}</td><td className="px-4 py-3 font-mono text-red-400">{formatCurrency(r.total_deductions)}</td><td className="px-4 py-3 font-black font-mono text-white">{formatCurrency(r.net_salary)}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[r.status] || STATUS_COLORS.draft}`}>{r.status}</span></td></>)}
                                                                    {report.report_type === 'deduction_report' && (<><td className="px-4 py-3 text-white font-semibold">{r.full_name}</td><td className="px-4 py-3 font-mono text-red-400">{formatCurrency(r.tax)}</td><td className="px-4 py-3 font-mono text-red-400">{formatCurrency(r.pension)}</td><td className="px-4 py-3 font-mono text-red-400">{formatCurrency(r.loans)}</td><td className="px-4 py-3 font-mono text-red-400">{formatCurrency(r.other_deductions)}</td><td className="px-4 py-3 font-mono text-amber-400">{formatCurrency(r.leave_adjustment)}</td><td className="px-4 py-3 font-black font-mono text-red-400">{formatCurrency(r.total_deductions)}</td></>)}
                                                                    {report.report_type === 'allowance_report' && (<><td className="px-4 py-3 text-white font-semibold">{r.full_name}</td><td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(r.housing_allowance)}</td><td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(r.transport_allowance)}</td><td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(r.meal_allowance)}</td><td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(r.responsibility_allowance)}</td><td className="px-4 py-3 font-mono text-emerald-400">{formatCurrency(r.overtime)}</td><td className="px-4 py-3 font-black font-mono text-emerald-400">{formatCurrency(r.total_allowances)}</td></>)}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!report && !reportLoading && <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10"><FileBarChart2 size={32} className="text-slate-600 mb-3" /><p className="text-slate-500 text-sm">Select a report type and click Generate Report.</p></div>}
                                </div>
                            )}

                            {/* ── Audit Log ── */}
                            {payrollSubTab === 'audit' && (
                                <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                    <div className="p-5 border-b border-white/5"><h3 className="text-white font-bold text-sm flex items-center gap-2"><BookOpen size={15} className="text-slate-400" />Payroll Audit Trail · {MONTH_FULL[payrollMonth - 1]} {payrollYear}</h3></div>
                                    <div className="p-5 space-y-3">
                                        {payroll.flatMap(p => p.id ? [] : []).length === 0 && (
                                            <div className="text-center py-8 text-slate-600">
                                                <p className="text-sm">Audit logs are available per-payroll record.</p>
                                                <p className="text-xs mt-1">Click the eye icon on any payroll record to view its audit trail.</p>
                                            </div>
                                        )}
                                        <p className="text-slate-600 text-xs text-center">To view a payroll's full audit trail, open any payroll record and click <Eye size={11} className="inline" /> to view its payslip.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
