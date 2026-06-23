import { useState, useEffect, useCallback } from 'react';
import {
    Wallet, Receipt, CreditCard, TrendingUp, Users,
    Plus, Search, Filter, Download, CheckCircle, Clock,
    AlertCircle, DollarSign, X, ChevronDown, RefreshCw,
    FileText, ArrowUpRight, BarChart3, Banknote
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { FeeType, StudentFee, PaymentRecord, Payroll, Term } from '../../types';

type Tab = 'overview' | 'fees' | 'billing' | 'payments' | 'payroll';

const getList = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.results && Array.isArray(res.results)) return res.results;
    return [];
};

const formatCurrency = (amt: number | string) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(amt));

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Payment Modal ──────────────────────────────────────────────────────────────
interface PaymentModalProps {
    fee: StudentFee | null;
    onClose: () => void;
    onSuccess: () => void;
}

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
            await api.post(`${endpoints.finance.studentFees}${fee.id}/record_payment/`, {
                amount: Number(amount), payment_method: method, transaction_id: txnId
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Payment failed. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Record Payment</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{fee.student_name} — {fee.fee_type_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Fee Summary */}
                <div className="p-6 bg-white/[0.02] border-b border-white/5">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Total Fee</p>
                            <p className="font-bold text-white text-sm">{formatCurrency(totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Paid</p>
                            <p className="font-bold text-emerald-400 text-sm">{formatCurrency(fee.amount_paid)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Balance</p>
                            <p className="font-bold text-amber-400 text-sm">{formatCurrency(balance)}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">Amount (₦)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₦</span>
                            <input
                                type="number" min="1" max={balance} step="0.01"
                                value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder={`Max: ${formatCurrency(balance)}`}
                                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08]"
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            {[balance * 0.25, balance * 0.5, balance].map((v, i) => (
                                <button key={i} type="button"
                                    onClick={() => setAmount(String(Math.round(v)))}
                                    className="flex-1 py-1.5 text-[10px] font-bold text-slate-400 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/10 rounded-lg transition-all">
                                    {i === 0 ? '25%' : i === 1 ? '50%' : 'Full'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">Payment Method</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['cash', 'transfer', 'card', 'online'] as const).map(m => (
                                <button key={m} type="button"
                                    onClick={() => setMethod(m)}
                                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all capitalize ${method === m
                                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                                            : 'text-slate-400 border-white/10 bg-white/5 hover:border-white/20'
                                        }`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(method === 'transfer' || method === 'online') && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Transaction ID</label>
                            <input
                                type="text" value={txnId} onChange={e => setTxnId(e.target.value)}
                                placeholder="e.g. TXN-2025-0012"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>
                    )}

                    <button type="submit" disabled={submitting}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                        {submitting ? (
                            <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Processing...</>
                        ) : (
                            <><CheckCircle size={16} /> Confirm Payment</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Add Fee Type Modal ─────────────────────────────────────────────────────────
interface AddFeeModalProps {
    onClose: () => void;
    onSuccess: () => void;
    levels: { id: string; name: string }[];
}

function AddFeeModal({ onClose, onSuccess, levels }: AddFeeModalProps) {
    const [form, setForm] = useState({ name: '', amount: '', level: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.amount || !form.level) { setError('All fields are required.'); return; }
        setSubmitting(true);
        try {
            await api.post(endpoints.finance.feeTypes, {
                name: form.name, amount: Number(form.amount),
                level: form.level, description: form.description
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create fee type.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Create Fee Type</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">Fee Name</label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Tuition Fee, Development Levy..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Amount (₦)</label>
                            <input type="number" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Class Level</label>
                            <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50">
                                <option value="">Select level...</option>
                                {levels.map(l => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">Description (optional)</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Brief description..."
                            rows={2}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none" />
                    </div>
                    <button type="submit" disabled={submitting}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                        {submitting ? <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />Saving...</> : <><Plus size={16} />Create Fee Type</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Generate Payroll Modal ────────────────────────────────────────────────────
interface GeneratePayrollModalProps { onClose: () => void; onSuccess: () => void; }
function GeneratePayrollModal({ onClose, onSuccess }: GeneratePayrollModalProps) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res: any = await api.post(`${endpoints.finance.payroll}generate_monthly/`, { month, year });
            alert(res.message || 'Payroll generated!');
            onSuccess(); onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to generate payroll.');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Generate Payroll</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Month</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none">
                                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1} className="bg-slate-900">{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Year</label>
                            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none" />
                        </div>
                    </div>
                    <button type="submit" disabled={submitting}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                        {submitting ? <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : <Users size={16} />}
                        {submitting ? 'Generating...' : 'Generate Payroll'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Main Finance Component ─────────────────────────────────────────────────────
export default function Finance() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ total_outstanding: 0, total_paid: 0, collection_rate: 0 });
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [payroll, setPayroll] = useState<Payroll[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);

    // Modals
    const [paymentFee, setPaymentFee] = useState<StudentFee | null>(null);
    const [showAddFee, setShowAddFee] = useState(false);
    const [showGenPayroll, setShowGenPayroll] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const [summary, feeTypesRes, studentFeesRes, paymentsRes, payrollRes, termsRes, levelsRes] = await Promise.all([
                api.get<any>(`${endpoints.finance.studentFees}summary/`),
                api.get<any>(endpoints.finance.feeTypes),
                api.get<any>(endpoints.finance.studentFees),
                api.get<any>(endpoints.finance.payments),
                api.get<any>(endpoints.finance.payroll),
                api.get<any>(endpoints.academics.terms),
                api.get<any>(endpoints.academics.levels),
            ]);
            setStats(summary);
            setFeeTypes(getList(feeTypesRes));
            setStudentFees(getList(studentFeesRes));
            setPayments(getList(paymentsRes));
            setPayroll(getList(payrollRes));
            setTerms(getList(termsRes));
            setLevels(getList(levelsRes));
        } catch (err) {
            console.error('Failed to fetch finance data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const classOptions = Array.from(new Set(studentFees.map(f => f.class_name).filter(Boolean))) as string[];

    const filteredFees = studentFees.filter(f => {
        const matchSearch = !search ||
            (f.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (f.fee_type_name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || f.status === statusFilter;
        const matchClass = !classFilter || f.class_name === classFilter;
        return matchSearch && matchStatus && matchClass;
    });

    const handleMarkPayrollPaid = async (id: string) => {
        try {
            await api.post<any>(`${endpoints.finance.payroll}${id}/mark_paid/`, {});
            loadData(true);
        } catch (err: any) {
            alert(err.message || 'Failed to mark payroll as paid.');
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'billing', label: 'Student Billing', icon: Receipt },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'fees', label: 'Fee Structures', icon: TrendingUp },
        { id: 'payroll', label: 'Payroll', icon: Users },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Modals */}
            {paymentFee && <PaymentModal fee={paymentFee} onClose={() => setPaymentFee(null)} onSuccess={() => loadData(true)} />}
            {showAddFee && <AddFeeModal onClose={() => setShowAddFee(false)} onSuccess={() => loadData(true)} levels={levels} />}
            {showGenPayroll && <GeneratePayrollModal onClose={() => setShowGenPayroll(false)} onSuccess={() => loadData(true)} />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Finance Management</h1>
                    <p className="text-slate-500 text-sm">Monitor revenue, billing, and teacher payroll</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadData(true)} disabled={refreshing}
                        className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-all">
                        <Download size={16} /><span>Export</span>
                    </button>
                    {activeTab === 'fees' && (
                        <button onClick={() => setShowAddFee(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                            <Plus size={16} /><span>Add Fee Type</span>
                        </button>
                    )}
                    {activeTab === 'payroll' && (
                        <button onClick={() => setShowGenPayroll(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                            <Plus size={16} /><span>Generate Payroll</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><CheckCircle size={20} /></div>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Collection Rate</span>
                    </div>
                    <p className="text-3xl font-black text-white">{stats.collection_rate.toFixed(1)}%</p>
                    <p className="text-slate-500 text-xs mt-1">Revenue collected this term</p>
                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(stats.collection_rate, 100)}%` }} />
                    </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Clock size={20} /></div>
                        <ArrowUpRight size={14} className="text-amber-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(stats.total_outstanding)}</p>
                    <p className="text-slate-500 text-xs mt-1">Total outstanding balances</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/10 rounded-lg text-slate-400"><TrendingUp size={20} /></div>
                        <ArrowUpRight size={14} className="text-slate-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(stats.total_paid)}</p>
                    <p className="text-slate-500 text-xs mt-1">Total cash collected (Termly)</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button key={tab.id} id={`finance-tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}>
                        <tab.icon size={16} />{tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="premium-spinner" />
                </div>
            ) : (
                <div className="space-y-6">

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-emerald-500 opacity-5">
                                    <TrendingUp size={140} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-emerald-400" /> Financial Summary
                                </h3>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Expected Revenue</p>
                                            <p className="text-2xl font-black text-white">{formatCurrency(stats.total_paid + stats.total_outstanding)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Collected</p>
                                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.total_paid)}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pending Students</p>
                                            <p className="text-lg font-bold text-amber-400">
                                                {studentFees.filter(f => f.status !== 'paid').length} students
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Deficit</p>
                                            <p className="text-xl font-bold text-red-400">{formatCurrency(stats.total_outstanding)}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Total Transactions</p>
                                            <p className="text-lg font-bold text-white">{payments.length}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Fee Structures</p>
                                            <p className="text-lg font-bold text-white">{feeTypes.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {/* Recent Payments */}
                                <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                                    <div className="p-5 border-b border-white/5">
                                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                            <CreditCard size={16} className="text-emerald-400" /> Recent Payments
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                                        {payments.slice(0, 5).map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all">
                                                <div>
                                                    <p className="text-xs font-bold text-white">{p.student_name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                                                        {p.payment_method} • {new Date(p.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-emerald-400">{formatCurrency(p.amount)}</p>
                                            </div>
                                        ))}
                                        {payments.length === 0 && (
                                            <p className="text-slate-600 text-xs text-center py-6">No payments recorded yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Status Breakdown */}
                                <div className="bg-emerald-500 p-6 rounded-3xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 text-slate-900"><Wallet size={100} /></div>
                                    <h3 className="text-slate-950 font-black text-base mb-3">Payment Status</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Paid', value: studentFees.filter(f => f.status === 'paid').length, color: 'bg-slate-950/20' },
                                            { label: 'Partial', value: studentFees.filter(f => f.status === 'partial').length, color: 'bg-slate-950/20' },
                                            { label: 'Outstanding', value: studentFees.filter(f => f.status === 'outstanding').length, color: 'bg-slate-950/20' },
                                        ].map(s => (
                                            <div key={s.label} className={`${s.color} rounded-2xl p-3 text-center`}>
                                                <p className="text-2xl font-black text-slate-950">{s.value}</p>
                                                <p className="text-[10px] font-bold text-slate-950/70 uppercase tracking-wider">{s.label}</p>
                                            </div>
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
                                <div className="relative flex-1 max-w-xs">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input id="billing-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Search pupil or fee..."
                                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                                </div>
                                <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 focus:outline-none">
                                    <option value="" className="bg-slate-900">All Classes</option>
                                    {classOptions.map(cls => (
                                        <option key={cls} value={cls} className="bg-slate-900">{cls}</option>
                                    ))}
                                </select>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 focus:outline-none">
                                    <option value="" className="bg-slate-900">All Status</option>
                                    <option value="paid" className="bg-slate-900">Paid</option>
                                    <option value="partial" className="bg-slate-900">Partial</option>
                                    <option value="outstanding" className="bg-slate-900">Outstanding</option>
                                </select>
                                <span className="text-xs text-slate-500">{filteredFees.length} records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4">Pupil</th>
                                            <th className="px-6 py-4">Class</th>
                                            <th className="px-6 py-4">Fee Type</th>
                                            <th className="px-6 py-4">Term</th>
                                            <th className="px-6 py-4">Total</th>
                                            <th className="px-6 py-4">Paid</th>
                                            <th className="px-6 py-4">Balance</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {filteredFees.map(fee => (
                                            <tr key={fee.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-all group">
                                                <td className="px-6 py-4 text-white font-semibold">{fee.student_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-400">{fee.class_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-400">{fee.fee_type_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-500">{fee.term_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-300 font-mono">
                                                    {formatCurrency(Number(fee.amount_paid) + Number(fee.balance))}
                                                </td>
                                                <td className="px-6 py-4 text-emerald-400 font-mono">{formatCurrency(fee.amount_paid)}</td>
                                                <td className="px-6 py-4 text-red-400 font-mono">{formatCurrency(fee.balance)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${fee.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            fee.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                                'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>{fee.status}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {fee.status !== 'paid' && (
                                                        <button onClick={() => setPaymentFee(fee)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all">
                                                            <DollarSign size={11} /> Pay
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredFees.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="text-center py-16 text-slate-600">
                                                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                                                    No billing records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PAYMENTS */}
                    {activeTab === 'payments' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                                {payments.map(payment => (
                                    <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <Banknote size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{payment.student_name || 'Unknown'}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                                                    {new Date(payment.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {' • '}
                                                    <span className="capitalize">{payment.payment_method}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-400">{formatCurrency(payment.amount)}</p>
                                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{payment.transaction_id || 'CASH-REC'}</p>
                                        </div>
                                    </div>
                                ))}
                                {payments.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <CreditCard size={32} className="text-slate-600 mb-3" />
                                        <p className="text-slate-500 text-sm">No payments recorded yet.</p>
                                        <p className="text-slate-600 text-xs mt-1">Use the Student Billing tab to record payments.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FEE STRUCTURES */}
                    {activeTab === 'fees' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {feeTypes.map(ft => (
                                <div key={ft.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                            <Receipt size={18} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                            {ft.level_name || 'All Levels'}
                                        </span>
                                    </div>
                                    <p className="font-bold text-white text-base">{ft.name}</p>
                                    <p className="text-slate-500 text-xs mt-1 mb-3">{ft.description || 'No description'}</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(ft.amount)}</p>
                                </div>
                            ))}
                            {feeTypes.length === 0 && (
                                <div className="col-span-3 flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <TrendingUp size={32} className="text-slate-600 mb-3" />
                                    <p className="text-slate-500 text-sm">No fee types created yet.</p>
                                    <button onClick={() => setShowAddFee(true)}
                                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all">
                                        <Plus size={14} /> Create First Fee Type
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PAYROLL */}
                    {activeTab === 'payroll' && (
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4">Teacher</th>
                                            <th className="px-6 py-4">Period</th>
                                            <th className="px-6 py-4">Basic Salary</th>
                                            <th className="px-6 py-4">Bonuses</th>
                                            <th className="px-6 py-4">Deductions</th>
                                            <th className="px-6 py-4">Net Pay</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {payroll.map(p => (
                                            <tr key={p.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-all">
                                                <td className="px-6 py-4 text-white font-semibold">{p.teacher_name || '—'}</td>
                                                <td className="px-6 py-4 text-slate-400">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                                                <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(p.basic_salary)}</td>
                                                <td className="px-6 py-4 text-emerald-400 font-mono">{formatCurrency(p.bonuses)}</td>
                                                <td className="px-6 py-4 text-red-400 font-mono">{formatCurrency(p.deductions)}</td>
                                                <td className="px-6 py-4 text-white font-black font-mono">{formatCurrency(p.net_salary)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            p.status === 'draft' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                                                                'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>{p.status}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {p.status === 'draft' && (
                                                        <button onClick={() => handleMarkPayrollPaid(p.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-all">
                                                            <CheckCircle size={11} /> Mark Paid
                                                        </button>
                                                    )}
                                                    {p.status === 'paid' && (
                                                        <span className="text-[10px] text-slate-600">
                                                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {payroll.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="text-center py-16">
                                                    <Users size={32} className="mx-auto mb-2 text-slate-700" />
                                                    <p className="text-slate-600 text-sm">No payroll records found.</p>
                                                    <button onClick={() => setShowGenPayroll(true)}
                                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all">
                                                        <Plus size={12} /> Generate This Month's Payroll
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
