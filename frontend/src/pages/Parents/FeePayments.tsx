import { useEffect, useState, useCallback } from 'react';
import {
    CreditCard, AlertCircle, CheckCircle, Clock, Filter,
    TrendingDown, Search, Users, X, DollarSign, Globe,
    ExternalLink, ShieldCheck, RefreshCw, BarChart3, Receipt
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';

interface StudentFee {
    id: string;
    student: string;
    student_name: string;
    class_name: string | null;
    fee_type: string;
    fee_type_name: string;
    term: string;
    term_name: string;
    status: 'paid' | 'partial' | 'outstanding';
    amount_paid: string;
    balance: string;
    fee_type_amount?: number;
}

interface PaymentRecord {
    id: string;
    student_fee: string;
    student_name: string;
    amount: string;
    payment_method: string;
    transaction_id: string | null;
    date: string;
    received_by_name: string | null;
}

const STATUS_CONFIG = {
    paid:        { label: 'Paid',        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={12} /> },
    partial:     { label: 'Partial',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',     icon: <Clock size={12} /> },
    outstanding: { label: 'Outstanding', color: 'bg-red-500/10 text-red-400 border-red-500/20',           icon: <AlertCircle size={12} /> },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Cash', transfer: 'Bank Transfer', card: 'Card', online: 'Online Gateway'
};

// ── Parent Pay Modal ─────────────────────────────────────────────────────────
interface ParentPayModalProps {
    fee: StudentFee | null;
    onClose: () => void;
}

function ParentPayModal({ fee, onClose }: ParentPayModalProps) {
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!fee) return null;
    const balance = Number(fee.balance);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const payAmount = amount ? Number(amount) : balance;
        if (payAmount <= 0) {
            setError('Amount must be greater than zero.');
            return;
        }
        if (payAmount > balance) {
            setError(`Amount cannot exceed outstanding balance of ₦${balance.toLocaleString()}`);
            return;
        }

        setSubmitting(true);
        try {
            const res: any = await api.post(endpoints.finance.paystackInitialize(fee.id), {
                amount: payAmount,
                callback_url: window.location.origin + window.location.pathname
            });
            
            if (res.authorization_url) {
                // Redirect user to Paystack payment gateway page
                window.location.href = res.authorization_url;
            } else {
                setError('Failed to get payment authorization link.');
            }
        } catch (err: any) {
            setError(err.message || 'Payment initialization failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Online Fee Payment</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{fee.student_name} — {fee.fee_type_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 bg-white/[0.02] border-b border-white/5">
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Total Outstanding Balance</p>
                        <p className="text-3xl font-black text-white mt-1">₦{balance.toLocaleString()}</p>
                    </div>
                </div>

                <form onSubmit={handlePay} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">Payment Amount (₦)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₦</span>
                            <input
                                type="number"
                                min="1"
                                max={balance}
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder={`Leave blank to pay full balance`}
                                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            {[balance * 0.25, balance * 0.5, balance].map((v, i) => (
                                <button key={i} type="button"
                                    onClick={() => setAmount(String(Math.round(v)))}
                                    className="flex-1 py-1.5 text-[10px] font-bold text-slate-400 bg-white/5 hover:bg-amber-500/10 hover:text-amber-400 border border-white/10 rounded-lg transition-all">
                                    {i === 0 ? '25%' : i === 1 ? '50%' : 'Full Amount'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                        <Globe className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            You will be redirected to Paystack secure payment checkout page. You can complete the transaction using card, bank transfer, USSD, or online banking.
                        </p>
                    </div>

                    <button type="submit" disabled={submitting}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                        {submitting ? (
                            <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Launching checkout...</>
                        ) : (
                            <><CreditCard size={16} /> Pay Online Now</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Parent Page ──────────────────────────────────────────────────────────────
export default function ParentFeePayments() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [filter, setFilter] = useState<'all' | 'outstanding' | 'partial' | 'paid'>('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'fees' | 'history'>('fees');

    // Online Payment State
    const [payFee, setPayFee] = useState<StudentFee | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const [feesRes, paymentsRes] = await Promise.all([
                api.get<any>(endpoints.finance.studentFees),
                api.get<any>(endpoints.finance.payments),
            ]);
            const feeList = Array.isArray(feesRes) ? feesRes : Array.isArray(feesRes?.results) ? feesRes.results : [];
            const paymentList = Array.isArray(paymentsRes) ? paymentsRes : Array.isArray(paymentsRes?.results) ? paymentsRes.results : [];
            setFees(feeList);
            setPayments(paymentList);
        } catch (err) {
            console.error('Failed to load fee payments data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Load data on mount
    useEffect(() => { loadData(); }, [loadData]);

    // Handle transaction callback verification
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference');
        const mockStatus = params.get('mock_status');
        const feeId = params.get('fee_id');
        const amount = params.get('amount');

        if (reference) {
            setVerifying(true);
            setVerificationResult(null);
            
            // Trigger payment verification
            api.post(endpoints.finance.paystackVerify, {
                reference,
                student_fee_id: feeId,
                amount: amount ? Number(amount) : undefined
            })
            .then((res: any) => {
                setVerificationResult({
                    success: true,
                    message: res.message || 'Online payment verified successfully! Your records have been updated.'
                });
                // Remove reference query params from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                // Reload data
                loadData(true);
            })
            .catch((err: any) => {
                setVerificationResult({
                    success: false,
                    message: err.message || 'Transaction verification failed. Please contact support.'
                });
                window.history.replaceState({}, document.title, window.location.pathname);
            })
            .finally(() => {
                setVerifying(false);
            });
        }
    }, [loadData]);

    // Summary
    const totalOutstanding = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + parseFloat(f.balance || '0'), 0);
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || '0'), 0);
    const paidCount = fees.filter(f => f.status === 'paid').length;
    const pendingCount = fees.filter(f => f.status !== 'paid').length;

    const filteredFees = fees.filter(f => {
        if (filter !== 'all' && f.status !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                f.student_name.toLowerCase().includes(q) ||
                f.fee_type_name.toLowerCase().includes(q) ||
                f.term_name.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const filteredPayments = search
        ? payments.filter(p => p.student_name.toLowerCase().includes(search.toLowerCase()))
        : payments;

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Pay Modal */}
            {payFee && <ParentPayModal fee={payFee} onClose={() => setPayFee(null)} />}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Fee Payments</h1>
                    <p className="text-slate-500 text-sm mt-1">Monitor your children's fee records and complete online payments securely</p>
                </div>
                <button onClick={() => loadData(true)} disabled={refreshing}
                    className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50">
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Verification Result Banner */}
            {verifying && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="premium-spinner" />
                        <div>
                            <p className="text-white text-sm font-bold">Verifying Transaction...</p>
                            <p className="text-slate-500 text-xs mt-0.5">Please do not close this page. Confirming payment with gateway.</p>
                        </div>
                    </div>
                </div>
            )}

            {verificationResult && (
                <div className={`p-4 rounded-2xl border flex items-start justify-between relative overflow-hidden transition-all ${
                    verificationResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    <div className="flex gap-3">
                        {verificationResult.success ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                        <div>
                            <p className="font-bold text-sm">{verificationResult.success ? 'Payment Verified!' : 'Verification Failed'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{verificationResult.message}</p>
                        </div>
                    </div>
                    <button onClick={() => setVerificationResult(null)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Total Outstanding',
                        value: `₦${totalOutstanding.toLocaleString()}`,
                        icon: <TrendingDown size={18} />,
                        color: totalOutstanding > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400',
                    },
                    {
                        label: 'Total Paid',
                        value: `₦${totalPaid.toLocaleString()}`,
                        icon: <CheckCircle size={18} />,
                        color: 'bg-emerald-500/10 text-emerald-400',
                    },
                    {
                        label: 'Pending Fees',
                        value: pendingCount,
                        icon: <Clock size={18} />,
                        color: 'bg-amber-500/10 text-amber-400',
                    },
                    {
                        label: 'Cleared Fees',
                        value: paidCount,
                        icon: <CreditCard size={18} />,
                        color: 'bg-sky-500/10 text-sky-400',
                    },
                ].map(card => (
                    <div key={card.label}
                        className="rounded-2xl border border-white/5 p-4 flex items-start gap-3 transition-all hover:border-white/10"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                            {card.icon}
                        </div>
                        <div>
                            {loading ? (
                                <>
                                    <div className="h-5 w-16 bg-white/5 rounded animate-pulse mb-1" />
                                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <p className="text-white text-lg font-black">{card.value}</p>
                                    <p className="text-slate-400 text-xs">{card.label}</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                {([
                    { key: 'fees', label: 'Fee Records' },
                    { key: 'history', label: 'Payment History' },
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.key
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by child name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    />
                </div>

                {activeTab === 'fees' && (
                    <div className="flex gap-2 flex-wrap">
                        <Filter size={14} className="text-slate-500 self-center" />
                        {(['all', 'outstanding', 'partial', 'paid'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                                    filter === f
                                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                                        : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                                }`}>
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Fee Records Table */}
            {activeTab === 'fees' && (
                <div className="rounded-3xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
                        </div>
                    ) : filteredFees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                                <CreditCard size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Fee Records Found</h3>
                            <p className="text-slate-500 text-sm max-w-sm">
                                {search || filter !== 'all' ? 'Try adjusting your filters.' : 'Fee records will appear here once assigned by the school.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4">Child</th>
                                        <th className="px-6 py-4">Fee Type</th>
                                        <th className="px-6 py-4">Term</th>
                                        <th className="px-6 py-4">Outstanding</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-white/[0.03]">
                                    {filteredFees.map(fee => {
                                        const cfg = STATUS_CONFIG[fee.status];
                                        return (
                                            <tr key={fee.id} className="hover:bg-white/[0.02] transition-all">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                                            <Users size={12} className="text-amber-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold">{fee.student_name}</p>
                                                            {fee.class_name && <p className="text-slate-500 text-[10px] mt-0.5">{fee.class_name}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300">{fee.fee_type_name}</td>
                                                <td className="px-6 py-4 text-slate-400">{fee.term_name}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-white">
                                                    {fee.status !== 'paid' ? `₦${parseFloat(fee.balance).toLocaleString()}` : <span className="text-emerald-400">₦0.00</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-xl border text-xs font-bold ${cfg.color}`}>
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {fee.status !== 'paid' ? (
                                                        <button onClick={() => setPayFee(fee)}
                                                            className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-amber-500/15">
                                                            <CreditCard size={13} /> Pay Online
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs font-semibold flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Payment Complete</span>
                                                    )}
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

            {/* Payment History */}
            {activeTab === 'history' && (
                <div className="rounded-3xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                                <CreditCard size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Payment History</h3>
                            <p className="text-slate-500 text-sm">Payment records will appear here once payments are made.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4">Child</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Transaction Reference</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-white/[0.03]">
                                    {filteredPayments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-white/[0.02] transition-all">
                                            <td className="px-6 py-4 text-white font-bold">{payment.student_name}</td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-emerald-400 font-mono font-bold">₦{parseFloat(payment.amount).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs font-semibold">
                                                    {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{payment.transaction_id || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
