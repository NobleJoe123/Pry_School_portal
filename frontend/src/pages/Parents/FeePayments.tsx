import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    CreditCard, AlertCircle, CheckCircle, Clock, Filter,
    TrendingDown, Search, Users, X, DollarSign, Globe,
    ExternalLink, ShieldCheck, RefreshCw, BarChart3, Receipt,
    Printer, Download, Calendar, Sparkles, UserCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { api, endpoints } from '../../utils/api';

interface StudentFee {
    id: string;
    student: string;
    student_name: string;
    admission_number?: string | null;
    class_name?: string | null;
    fee_type: string;
    fee_type_name: string;
    fee_type_amount?: string | number;
    term: string;
    term_name: string;
    academic_year_name?: string | null;
    status: 'paid' | 'partial' | 'outstanding';
    amount_paid: string;
    balance: string;
}

interface PaymentRecord {
    id: string;
    student_fee: string;
    student_name: string;
    student_id?: string;
    admission_number?: string | null;
    class_name?: string | null;
    fee_type_name?: string;
    fee_type_amount?: string | number;
    term_name?: string;
    academic_year_name?: string | null;
    amount: string;
    balance_after?: string;
    fee_status?: string;
    payment_method: string;
    transaction_id: string | null;
    date: string;
    received_by_name: string | null;
    parent_name?: string | null;
    receipt_number?: string;
    is_confirmed?: boolean;
    confirmed_by_name?: string | null;
    confirmed_at?: string | null;
    notes?: string | null;
}

const STATUS_CONFIG = {
    paid:        { label: 'Paid',        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={12} /> },
    partial:     { label: 'Partial',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',     icon: <Clock size={12} /> },
    outstanding: { label: 'Outstanding', color: 'bg-red-500/10 text-red-400 border-red-500/20',           icon: <AlertCircle size={12} /> },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Cash Payment',
    transfer: 'Bank Transfer',
    card: 'POS / Debit Card',
    online: 'Online Gateway (Paystack)',
};

// ── Digital Payment Receipt Modal ────────────────────────────────────────────
interface DigitalReceiptModalProps {
    payment: PaymentRecord | null;
    onClose: () => void;
}

function DigitalReceiptModal({ payment, onClose }: DigitalReceiptModalProps) {
    if (!payment) return null;

    const receiptNo = payment.receipt_number || `REC-${payment.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const formattedDate = new Date(payment.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Official Payment Receipt</h2>
                            <p className="text-xs text-slate-400 font-mono">{receiptNo}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg hover:shadow-amber-500/20"
                        >
                            <Printer size={14} /> Print Receipt
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Content Area */}
                <div id="printable-receipt" className="p-8 space-y-6 bg-slate-900 text-slate-100 print:p-6 print:text-black print:bg-white">
                    {/* School Banner */}
                    <div className="flex items-start justify-between border-b border-white/10 pb-6 print:border-slate-300">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
                                    A
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-white uppercase tracking-wide print:text-slate-900">
                                        Anyi Primary School
                                    </h1>
                                    <p className="text-xs text-slate-400 font-medium print:text-slate-600">
                                        Excellence, Character & High Academic Standard
                                    </p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2 print:text-slate-600">
                                Official Digital Tuition & Fees Payment Voucher
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-full print:bg-emerald-50 print:text-emerald-700 print:border-emerald-200">
                                <ShieldCheck size={12} /> OFFICIAL PAID RECEIPT
                            </span>
                            <p className="text-xs text-slate-400 font-mono mt-1.5 print:text-slate-600">
                                No: <strong className="text-white print:text-slate-900">{receiptNo}</strong>
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 print:text-slate-600">{formattedDate}</p>
                        </div>
                    </div>

                    {/* Pupil & Transaction Meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 print:bg-slate-50 print:border-slate-200">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-500">Student Name</p>
                            <p className="text-sm font-bold text-white mt-0.5 print:text-slate-900">{payment.student_name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-500">Admission No.</p>
                            <p className="text-sm font-bold text-amber-400 font-mono mt-0.5 print:text-amber-700">
                                {payment.admission_number || '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-500">Class</p>
                            <p className="text-sm font-bold text-white mt-0.5 print:text-slate-900">{payment.class_name || 'Assigned Pupil'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-500">Academic Term</p>
                            <p className="text-sm font-bold text-white mt-0.5 print:text-slate-900">{payment.term_name || 'Current Term'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-500">Payment Channel</p>
                            <p className="text-sm font-bold text-white mt-0.5 print:text-slate-900">
                                {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-500">Transaction ID</p>
                            <p className="text-xs font-mono text-slate-300 truncate mt-0.5 print:text-slate-700">
                                {payment.transaction_id || receiptNo}
                            </p>
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="rounded-2xl border border-white/10 overflow-hidden print:border-slate-300">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.04] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 print:bg-slate-100 print:text-slate-600 print:border-slate-300">
                                <tr>
                                    <th className="px-5 py-3">Fee Description</th>
                                    <th className="px-5 py-3 text-right">Fee Rate (₦)</th>
                                    <th className="px-5 py-3 text-right">Amount Paid (₦)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm print:divide-slate-200">
                                <tr>
                                    <td className="px-5 py-4">
                                        <p className="font-bold text-white print:text-slate-900">{payment.fee_type_name || 'School Tuition / Levy'}</p>
                                        <p className="text-xs text-slate-400 print:text-slate-500">
                                            {payment.term_name} {payment.academic_year_name ? `• ${payment.academic_year_name}` : ''}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono text-slate-300 print:text-slate-700">
                                        {payment.fee_type_amount ? `₦${parseFloat(String(payment.fee_type_amount)).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono font-black text-emerald-400 print:text-emerald-700 text-base">
                                        ₦{parseFloat(payment.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="p-5 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-3 print:bg-slate-50 print:border-slate-300">
                            <div>
                                {payment.balance_after !== undefined && (
                                    <p className="text-xs text-slate-400 print:text-slate-600">
                                        Remaining Balance on Fee:{' '}
                                        <strong className="text-white print:text-slate-900">
                                            ₦{parseFloat(payment.balance_after || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                        </strong>
                                    </p>
                                )}
                                <p className="text-[10px] text-slate-500 mt-0.5 print:text-slate-500">
                                    {payment.received_by_name ? `Authorized By: ${payment.received_by_name}` : 'Verified via Automated School Gateway'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-slate-500">Total Paid</p>
                                <p className="text-2xl font-black text-white font-mono print:text-slate-900">
                                    ₦{parseFloat(payment.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Seal & Authorization Note */}
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/5 text-slate-500 text-xs gap-4 print:border-slate-300 print:text-slate-600">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-emerald-400 shrink-0" size={18} />
                            <span>This is a computer-generated digital receipt and requires no physical signature.</span>
                        </div>
                        <div className="text-center sm:text-right font-mono text-[10px] text-slate-400">
                            VALIDATED BY ANYI ACADEMIC PORTAL
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
                setError('Failed to get payment authorization link from Paystack.');
            }
        } catch (err: any) {
            setError(err.message || 'Payment initialization failed. Please contact the school office if this persists.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Online Fee Payment</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{fee.student_name} — {fee.fee_type_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 bg-white/[0.02] border-b border-white/5">
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Total Outstanding Balance</p>
                        <p className="text-3xl font-black text-white mt-1 font-mono">₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] text-amber-400 mt-1">{fee.term_name}</p>
                    </div>
                </div>

                <form onSubmit={handlePay} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle size={16} className="shrink-0" />
                            <span className="text-xs leading-relaxed">{error}</span>
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
                                placeholder={`Full balance: ₦${balance.toLocaleString()}`}
                                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
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
                            You will be redirected to the secure Paystack checkout portal. You can complete payment using your debit card, bank transfer, USSD, or online banking.
                        </p>
                    </div>

                    <button type="submit" disabled={submitting}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                        {submitting ? (
                            <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Connecting to Paystack...</>
                        ) : (
                            <><CreditCard size={16} /> Proceed to Pay Online</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Parent Page ──────────────────────────────────────────────────────────────
export default function ParentFeePayments() {
    const { user } = useAuth();
    const { showAlert } = useDialog();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    
    // Filters
    const [selectedChild, setSelectedChild] = useState<string>('all');
    const [selectedTerm, setSelectedTerm] = useState<string>('all');
    const [filter, setFilter] = useState<'all' | 'outstanding' | 'partial' | 'paid'>('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'fees' | 'history'>('fees');

    // Modals
    const [payFee, setPayFee] = useState<StudentFee | null>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
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

    // Handle transaction callback verification from Paystack
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference') || params.get('trxref');
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
                    message: res.message || 'Payment verified successfully! Your records have been updated.'
                });
                // Remove reference query params from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                // Reload data
                loadData(true);
            })
            .catch((err: any) => {
                setVerificationResult({
                    success: false,
                    message: err.message || 'Transaction verification failed. If your account was debited, please contact the school accountant.'
                });
                window.history.replaceState({}, document.title, window.location.pathname);
            })
            .finally(() => {
                setVerifying(false);
            });
        }
    }, [loadData]);

    // Unique children list
    const childrenList = useMemo(() => {
        const map = new Map<string, { id: string; name: string; class_name?: string }>();
        fees.forEach(f => {
            if (f.student && !map.has(f.student)) {
                map.set(f.student, {
                    id: f.student,
                    name: f.student_name,
                    class_name: f.class_name || undefined
                });
            }
        });
        return Array.from(map.values());
    }, [fees]);

    // Unique terms list
    const termsList = useMemo(() => {
        const map = new Map<string, string>();
        fees.forEach(f => {
            if (f.term && !map.has(f.term)) {
                map.set(f.term, f.term_name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [fees]);

    // Filtered Fees
    const filteredFees = useMemo(() => {
        return fees.filter(f => {
            if (selectedChild !== 'all' && f.student !== selectedChild) return false;
            if (selectedTerm !== 'all' && f.term !== selectedTerm) return false;
            if (filter !== 'all' && f.status !== filter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    f.student_name.toLowerCase().includes(q) ||
                    f.fee_type_name.toLowerCase().includes(q) ||
                    f.term_name.toLowerCase().includes(q) ||
                    (f.admission_number && f.admission_number.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [fees, selectedChild, selectedTerm, filter, search]);

    // Filtered Payments
    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            if (selectedChild !== 'all' && p.student_id && p.student_id !== selectedChild) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    p.student_name.toLowerCase().includes(q) ||
                    (p.transaction_id && p.transaction_id.toLowerCase().includes(q)) ||
                    (p.receipt_number && p.receipt_number.toLowerCase().includes(q)) ||
                    (p.fee_type_name && p.fee_type_name.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [payments, selectedChild, search]);

    // Summary calculations
    const totalOutstanding = filteredFees.filter(f => f.status !== 'paid').reduce((s, f) => s + parseFloat(f.balance || '0'), 0);
    const totalPaid = filteredPayments.filter(p => p.is_confirmed !== false).reduce((s, p) => s + parseFloat(p.amount || '0'), 0);
    const paidCount = filteredFees.filter(f => f.status === 'paid').length;
    const pendingCount = filteredFees.filter(f => f.status !== 'paid').length;

    // Helper to find or view receipt for a fee
    const openReceiptForFee = async (fee: StudentFee) => {
        const matchingPayment = payments.find(p => p.student_fee === fee.id);
        if (matchingPayment) {
            if (matchingPayment.is_confirmed === false) {
                await showAlert({
                    title: 'Payment Pending Confirmation',
                    message: `Your payment of ₦${parseFloat(matchingPayment.amount).toLocaleString()} for ${fee.fee_type_name} is currently awaiting administrative confirmation. Once confirmed by the bursar, your official receipt will be available for download.`,
                    variant: 'warning'
                });
                return;
            }
            setSelectedReceipt(matchingPayment);
        } else {
            await showAlert({
                title: 'Official Receipt Not Available',
                message: `No confirmed payment record found for ${fee.fee_type_name}. If you completed payment via bank transfer or at the school premises, please contact the administrative office to have your payment verified.`,
                variant: 'info'
            });
        }
    };

    return (
        <div className="space-y-7 max-w-screen-xl mx-auto pb-12">
            {/* Pay Modal */}
            {payFee && <ParentPayModal fee={payFee} onClose={() => setPayFee(null)} />}

            {/* Receipt Modal */}
            {selectedReceipt && <DigitalReceiptModal payment={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>
                        School Fees & Payments
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track tuition billing schedules, verify cleared records, and download official payment receipts
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        <span>Refresh Data</span>
                    </button>
                </div>
            </div>

            {/* Verification Result Banner */}
            {verifying && (
                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <div>
                            <p className="text-white text-sm font-bold">Verifying Gateway Transaction...</p>
                            <p className="text-slate-400 text-xs mt-0.5">Please do not close this window while we verify your transaction with Paystack.</p>
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
                            <p className="font-bold text-sm">{verificationResult.success ? 'Payment Verified Successfully!' : 'Verification Notice'}</p>
                            <p className="text-xs text-slate-300 mt-0.5">{verificationResult.message}</p>
                        </div>
                    </div>
                    <button onClick={() => setVerificationResult(null)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Total Outstanding',
                        value: `₦${totalOutstanding.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
                        icon: <TrendingDown size={18} />,
                        color: totalOutstanding > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    },
                    {
                        label: 'Total Paid (Verified)',
                        value: `₦${totalPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
                        icon: <CheckCircle size={18} />,
                        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    },
                    {
                        label: 'Pending Invoices',
                        value: pendingCount,
                        icon: <Clock size={18} />,
                        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    },
                    {
                        label: 'Cleared Fees',
                        value: paidCount,
                        icon: <ShieldCheck size={18} />,
                        color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                    },
                ].map(card => (
                    <div key={card.label}
                        className="rounded-2xl border border-white/5 p-5 flex items-start gap-4 transition-all hover:border-white/10"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${card.color}`}>
                            {card.icon}
                        </div>
                        <div className="min-w-0">
                            {loading ? (
                                <>
                                    <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-1" />
                                    <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <p className="text-white text-xl font-black font-mono truncate">{card.value}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Child-level Breakdown Overview (if multiple pupils exist) */}
            {childrenList.length > 1 && (
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Enrolled Pupils Summary</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {childrenList.map(child => {
                            const childFees = fees.filter(f => f.student === child.id);
                            const childOwed = childFees.filter(f => f.status !== 'paid').reduce((s, f) => s + parseFloat(f.balance || '0'), 0);
                            const childPaid = childFees.reduce((s, f) => s + parseFloat(f.amount_paid || '0'), 0);
                            const isSelected = selectedChild === child.id;

                            return (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChild(isSelected ? 'all' : child.id)}
                                    className={`p-4 rounded-xl border text-left transition-all ${
                                        isSelected
                                            ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 font-bold text-xs">
                                                {child.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-xs truncate">{child.name}</p>
                                                <p className="text-[10px] text-slate-500">{child.class_name || 'Pupil'}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                            childOwed > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                            {childOwed > 0 ? 'Pending' : 'Cleared'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] mt-3 pt-2 border-t border-white/5">
                                        <span className="text-slate-400">Balance: <strong className="text-white">₦{childOwed.toLocaleString()}</strong></span>
                                        <span className="text-slate-400">Paid: <strong className="text-emerald-400">₦{childPaid.toLocaleString()}</strong></span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                {[
                    { key: 'fees', label: 'Fee Billing Records', count: fees.length },
                    { key: 'history', label: 'Payment History & Receipts', count: payments.length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.key
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === tab.key ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-300'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search child name, fee type, receipt no..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Child Filter */}
                    {childrenList.length > 1 && (
                        <select
                            value={selectedChild}
                            onChange={e => setSelectedChild(e.target.value)}
                            aria-label="Filter by Pupil"
                            className="px-3 py-2 text-xs font-semibold bg-slate-900 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                            <option value="all">All Pupils</option>
                            {childrenList.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Term Filter */}
                    {termsList.length > 0 && (
                        <select
                            value={selectedTerm}
                            onChange={e => setSelectedTerm(e.target.value)}
                            aria-label="Filter by Academic Term"
                            className="px-3 py-2 text-xs font-semibold bg-slate-900 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                            <option value="all">All Terms</option>
                            {termsList.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Status Filter Buttons (for Fees tab) */}
                    {activeTab === 'fees' && (
                        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                            {(['all', 'outstanding', 'partial', 'paid'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                                        filter === f
                                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Fee Invoices & Records Table */}
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
                            <h3 className="text-lg font-bold text-white mb-1">No Fee Invoices Found</h3>
                            <p className="text-slate-400 text-sm max-w-sm">
                                {search || filter !== 'all' || selectedChild !== 'all'
                                    ? 'No records match the chosen filter parameters.'
                                    : 'Fee schedules assigned to your enrolled children will appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4">Pupil</th>
                                        <th className="px-6 py-4">Fee Item</th>
                                        <th className="px-6 py-4">Academic Term</th>
                                        <th className="px-6 py-4">Total Fee</th>
                                        <th className="px-6 py-4">Outstanding</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-white/[0.03]">
                                    {filteredFees.map(fee => {
                                        const cfg = STATUS_CONFIG[fee.status] || STATUS_CONFIG.outstanding;
                                        return (
                                            <tr key={fee.id} className="hover:bg-white/[0.02] transition-all">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                                            <Users size={14} className="text-amber-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold">{fee.student_name}</p>
                                                            <p className="text-slate-500 text-[11px] mt-0.5">
                                                                {fee.class_name || 'Enrolled Pupil'} {fee.admission_number ? `• ${fee.admission_number}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-200 font-semibold">{fee.fee_type_name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">
                                                    {fee.term_name}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-slate-300">
                                                    {fee.fee_type_amount ? `₦${parseFloat(String(fee.fee_type_amount)).toLocaleString()}` : '—'}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-white">
                                                    {fee.status !== 'paid' ? (
                                                        <span className="text-red-400">₦{parseFloat(fee.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                                                    ) : (
                                                        <span className="text-emerald-400 font-bold">₦0.00 (Cleared)</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-xl border text-xs font-bold ${cfg.color}`}>
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {fee.status !== 'paid' ? (
                                                        <button
                                                            onClick={() => setPayFee(fee)}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md hover:shadow-amber-500/20"
                                                        >
                                                            <CreditCard size={13} /> Pay Online
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openReceiptForFee(fee)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            <Receipt size={13} className="text-emerald-400" /> View Receipt
                                                        </button>
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

            {/* Payment History Table */}
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
                                <Receipt size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">No Payment History</h3>
                            <p className="text-slate-400 text-sm max-w-sm">
                                Verified payment transactions will appear here with downloadable official receipts.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4">Pupil</th>
                                        <th className="px-6 py-4">Receipt No.</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Amount Paid</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-white/[0.03]">
                                    {filteredPayments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-white/[0.02] transition-all">
                                            <td className="px-6 py-4">
                                                <p className="text-white font-bold">{payment.student_name}</p>
                                                <p className="text-slate-500 text-[10px]">{payment.class_name || payment.fee_type_name || 'Enrolled Pupil'}</p>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-semibold text-amber-400 text-xs">
                                                {payment.receipt_number || `REC-${payment.id.slice(0, 8).toUpperCase()}`}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-emerald-400 font-mono font-bold">
                                                ₦{parseFloat(payment.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300 text-xs font-semibold">
                                                    {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {payment.is_confirmed !== false ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle size={11} /> Confirmed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                                        <Clock size={11} /> Awaiting Review
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {payment.is_confirmed !== false ? (
                                                    <button
                                                        onClick={() => setSelectedReceipt(payment)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <Receipt size={13} /> View Receipt
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => showAlert({
                                                            title: 'Awaiting Admin Confirmation',
                                                            message: `This payment of ₦${parseFloat(payment.amount).toLocaleString()} (${payment.payment_method}) is pending verification by the school bursar. The official digital receipt will be available here immediately upon confirmation.`,
                                                            variant: 'info'
                                                        })}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all"
                                                    >
                                                        <Clock size={13} className="text-amber-400" /> Pending Review
                                                    </button>
                                                )}
                                            </td>
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
