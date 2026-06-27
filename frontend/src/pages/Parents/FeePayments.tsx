import { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Clock, Filter, TrendingDown, Search, Users } from 'lucide-react';
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
    cash: 'Cash', transfer: 'Bank Transfer', card: 'Card', online: 'Online'
};

export default function ParentFeePayments() {
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [filter, setFilter] = useState<'all' | 'outstanding' | 'partial' | 'paid'>('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'fees' | 'history'>('fees');

    useEffect(() => {
        Promise.allSettled([
            api.get<any>(endpoints.finance.studentFees),
            api.get<any>(endpoints.finance.payments),
        ]).then(([feesRes, paymentsRes]) => {
            if (feesRes.status === 'fulfilled') {
                const list = Array.isArray(feesRes.value)
                    ? feesRes.value
                    : Array.isArray(feesRes.value?.results) ? feesRes.value.results : [];
                setFees(list);
            }
            if (paymentsRes.status === 'fulfilled') {
                const list = Array.isArray(paymentsRes.value)
                    ? paymentsRes.value
                    : Array.isArray(paymentsRes.value?.results) ? paymentsRes.value.results : [];
                setPayments(list);
            }
            setLoading(false);
        });
    }, []);

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
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white font-serif">Fee Payments</h1>
                <p className="text-slate-500 text-sm">Monitor your children's fee records and payment history</p>
            </div>

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
                {/* Search */}
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
                        <div>
                            {/* Table header */}
                            <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                                {['Child', 'Fee Type', 'Term', 'Amount Due', 'Status'].map(h => (
                                    <span key={h} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</span>
                                ))}
                            </div>
                            <div className="divide-y divide-white/[0.03]">
                                {filteredFees.map(fee => {
                                    const cfg = STATUS_CONFIG[fee.status];
                                    return (
                                        <div key={fee.id}
                                            className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all items-center">
                                            {/* Child */}
                                            <div className="flex items-center gap-2 sm:block">
                                                <div className="w-7 h-7 sm:hidden rounded-full bg-amber-500/10 flex items-center justify-center">
                                                    <Users size={12} className="text-amber-400" />
                                                </div>
                                                <p className="text-white text-sm font-bold">{fee.student_name}</p>
                                                {fee.class_name && <p className="text-slate-500 text-xs sm:mt-0.5">{fee.class_name}</p>}
                                            </div>
                                            {/* Fee Type */}
                                            <p className="text-slate-300 text-sm">{fee.fee_type_name}</p>
                                            {/* Term */}
                                            <p className="text-slate-400 text-sm">{fee.term_name}</p>
                                            {/* Amount */}
                                            <div>
                                                {fee.status !== 'paid' ? (
                                                    <>
                                                        <p className="text-white text-sm font-bold">₦{parseFloat(fee.balance).toLocaleString()}</p>
                                                        <p className="text-slate-600 text-xs">balance</p>
                                                    </>
                                                ) : (
                                                    <p className="text-emerald-400 text-sm font-bold">Cleared</p>
                                                )}
                                            </div>
                                            {/* Status */}
                                            <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-xl border text-xs font-bold ${cfg.color}`}>
                                                {cfg.icon}
                                                {cfg.label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                        <div>
                            <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                                {['Child', 'Date', 'Amount', 'Method', 'Transaction ID'].map(h => (
                                    <span key={h} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</span>
                                ))}
                            </div>
                            <div className="divide-y divide-white/[0.03]">
                                {filteredPayments.map(payment => (
                                    <div key={payment.id}
                                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all items-center">
                                        <p className="text-white text-sm font-bold">{payment.student_name}</p>
                                        <p className="text-slate-400 text-sm">
                                            {new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <p className="text-emerald-400 text-sm font-bold">₦{parseFloat(payment.amount).toLocaleString()}</p>
                                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs w-fit">
                                            {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                        </span>
                                        <p className="text-slate-500 text-xs font-mono truncate">{payment.transaction_id || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
