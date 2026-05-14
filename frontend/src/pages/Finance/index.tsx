import { useState, useEffect } from 'react';
import { 
    Wallet, 
    Receipt, 
    CreditCard, 
    TrendingUp, 
    Users, 
    Plus, 
    Search, 
    Filter,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    DollarSign
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import type { FeeType, StudentFee, PaymentRecord, Payroll } from '../../types';

type Tab = 'overview' | 'fees' | 'billing' | 'payments' | 'payroll';

export default function Finance() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_outstanding: 0,
        total_paid: 0,
        collection_rate: 0
    });
    const [data, setData] = useState<{
        feeTypes: FeeType[];
        studentFees: StudentFee[];
        payments: PaymentRecord[];
        payroll: Payroll[];
    }>({ feeTypes: [], studentFees: [], payments: [], payroll: [] });

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(`${endpoints.finance.studentFees}summary/`),
            api.get<FeeType[]>(endpoints.finance.feeTypes),
            api.get<StudentFee[]>(endpoints.finance.studentFees),
            api.get<PaymentRecord[]>(endpoints.finance.payments),
            api.get<Payroll[]>(endpoints.finance.payroll),
        ]).then(([summary, feeTypes, studentFees, payments, payroll]) => {
            setStats(summary);
            setData({ feeTypes, studentFees, payments, payroll });
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch finance data", err);
            setLoading(false);
        });
    }, []);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Wallet },
        { id: 'billing', label: 'Student Billing', icon: Receipt },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'fees', label: 'Fee Structures', icon: TrendingUp },
        { id: 'payroll', label: 'Payroll', icon: Users },
    ];

    const formatCurrency = (amt: number | string) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(Number(amt));
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white font-serif">Finance Management</h1>
                    <p className="text-slate-500 text-sm">Monitor revenue, billing, and teacher payroll</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-all">
                        <Download size={16} />
                        <span>Export Report</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                        <Plus size={18} />
                        <span>Add Record</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <CheckCircle size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Collection Rate</span>
                    </div>
                    <p className="text-3xl font-black text-white">{stats.collection_rate.toFixed(1)}%</p>
                    <p className="text-slate-500 text-xs mt-1">Total revenue collected this term</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                            <Clock size={20} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(stats.total_outstanding)}</p>
                    <p className="text-slate-500 text-xs mt-1">Total outstanding balances</p>
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/10 rounded-lg text-slate-400">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-white">{formatCurrency(stats.total_paid)}</p>
                    <p className="text-slate-500 text-xs mt-1">Total cash inflow (Termly)</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    {activeTab === 'billing' && (
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                <div className="relative w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" placeholder="Search student or fee..." className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-slate-400 hover:text-white transition-colors"><Filter size={16} /></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4">Student</th>
                                            <th className="px-6 py-4">Fee Type</th>
                                            <th className="px-6 py-4">Total</th>
                                            <th className="px-6 py-4">Paid</th>
                                            <th className="px-6 py-4">Balance</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {data.studentFees.map(fee => (
                                            <tr key={fee.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                                                <td className="px-6 py-4 text-white font-medium">{fee.student_name}</td>
                                                <td className="px-6 py-4 text-slate-400">{fee.fee_type_name}</td>
                                                <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(fee.amount_paid + fee.balance)}</td>
                                                <td className="px-6 py-4 text-emerald-400 font-mono">{formatCurrency(fee.amount_paid)}</td>
                                                <td className="px-6 py-4 text-red-400 font-mono">{formatCurrency(fee.balance)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                        fee.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        fee.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                        {fee.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="grid grid-cols-1 gap-4">
                            {data.payments.map(payment => (
                                <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <DollarSign size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{payment.student_name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(payment.date).toLocaleDateString()} • {payment.payment_method}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-400">{formatCurrency(payment.amount)}</p>
                                        <p className="text-[10px] text-slate-600 font-mono">{payment.transaction_id || 'CASH-REC'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-emerald-500 opacity-10">
                                    <TrendingUp size={120} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-6">Financial Summary</h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Expected Revenue</p>
                                            <p className="text-2xl font-black text-white">{formatCurrency(stats.total_paid + stats.total_outstanding)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Total Collected</p>
                                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.total_paid)}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pending Invoices</p>
                                            <p className="text-lg font-bold text-amber-500">{data.studentFees.filter(f => f.status !== 'paid').length} Students</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Deficit</p>
                                            <p className="text-xl font-bold text-red-500">{formatCurrency(stats.total_outstanding)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-500 p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-6 opacity-20 text-slate-900">
                                    <AlertCircle size={100} />
                                </div>
                                <div>
                                    <h3 className="text-slate-950 font-black text-xl mb-2">Notice: Fee Deadline</h3>
                                    <p className="text-emerald-950 text-sm font-medium leading-relaxed">The 2nd Term tuition deadline is approaching. Ensure all partial payments are followed up before the exams start on June 15th.</p>
                                </div>
                                <button className="mt-8 w-full py-3 bg-slate-950 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all">
                                    Broadcast Reminders
                                </button>
                            </div>
                        </div>
                    )}

                    {['fees', 'payroll'].includes(activeTab) && (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-white font-bold text-lg capitalize">{activeTab} Interface</h3>
                            <p className="text-slate-500 max-w-xs mt-1">Advanced management for {activeTab === 'fees' ? 'fee types' : 'staff payroll'} is currently in read-only mode for this version.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
