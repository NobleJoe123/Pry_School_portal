import { useEffect, useState } from 'react';
import { GraduationCap, CreditCard, CalendarCheck, BookOpen, Heart, Bell, Plus, Trash2, CheckCircle, Users } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';

function LinkStudentsForm({ onLinked }: { onLinked: () => void }) {
    const [admissionNumbers, setAdmissionNumbers] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const addField = () => setAdmissionNumbers([...admissionNumbers, '']);
    const removeField = (index: number) => {
        setAdmissionNumbers(admissionNumbers.filter((_, i) => i !== index));
    };
    const updateField = (index: number, value: string) => {
        const newArr = [...admissionNumbers];
        newArr[index] = value;
        setAdmissionNumbers(newArr);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validNumbers = admissionNumbers.filter(n => n.trim() !== '');
        if (validNumbers.length === 0) return;

        setLoading(true);
        setError('');
        try {
            await api.post(endpoints.parents.linkStudents, { admission_numbers: validNumbers });
            onLinked();
        } catch (err: any) {
            setError(err.message || 'Failed to link students');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white">Link Your Children</h2>
                    <p className="text-sm text-slate-400 mt-2">Enter the admission numbers provided in your approval email to link your children to this account.</p>
                </div>

                {error && <p className="p-4 bg-red-500/10 text-red-400 text-sm rounded-xl mb-6 border border-red-500/20">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {admissionNumbers.map((adm, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <input
                                required
                                placeholder="e.g. ADM20261234"
                                value={adm}
                                onChange={e => updateField(index, e.target.value)}
                                className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                            />
                            {admissionNumbers.length > 1 && (
                                <button type="button" onClick={() => removeField(index)} className="p-3 text-slate-500 hover:text-red-400 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                    
                    <button type="button" onClick={addField} className="flex items-center gap-2 text-amber-500 hover:text-amber-400 text-sm font-bold transition-colors">
                        <Plus size={16} /> Add another admission number
                    </button>

                    <button disabled={loading} className="w-full py-4 mt-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-amber-500/20">
                        {loading ? 'Linking...' : 'Link Students'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ParentDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 1000);
    }, []);

    const children = user?.children || [];

    if (!loading && children.length === 0) {
        return <LinkStudentsForm onLinked={() => window.location.reload()} />;
    }

    const stats = [
        { label: 'Registered Children', value: children.length, icon: <Heart size={18} />, iconBg: 'bg-rose-500/15', iconColor: 'text-rose-400' },
        { label: 'Total Paid Fees', value: '₦125,000', icon: <CreditCard size={18} />, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
        { label: 'Pending Balance', value: '₦15,000', icon: <Bell size={18} />, iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
        { label: 'Next Term Starts', value: 'Sept 15', icon: <CalendarCheck size={18} />, iconBg: 'bg-sky-500/15', iconColor: 'text-sky-400' },
    ];

    return (
        <div className="space-y-6 max-w-screen-xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'DM Serif Display', serif" }}> Parent Portal </h2>
                    <p className="text-slate-500 text-sm mt-0.5">Welcome, {user?.first_name}. Monitor your children's academic journey.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((card) => (
                    <StatsCard key={card.label} {...card} loading={loading} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Children Summary */}
                <div className="space-y-4">
                    <h3 className="text-white font-bold px-2">My Children</h3>
                    {children.map((child: any, i: number) => (
                        <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/5 flex flex-col sm:flex-row gap-6 hover:border-amber-500/20 transition-all" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                                {child.user?.profile_photo_url ? (
                                    <img src={child.user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <GraduationCap size={40} />
                                )}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{child.user?.full_name}</h4>
                                        <p className="text-slate-500 text-sm">
                                            {child.profile?.current_class?.name || 'Unassigned'} • {child.profile?.admission_number}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 uppercase">Active</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Attendance</p>
                                        <p className="text-white font-bold">N/A</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Last Result</p>
                                        <p className="text-amber-400 font-bold">Pending</p>
                                    </div>
                                </div>
                                
                                <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all">
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Notifications & Payments */}
                <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold">Recent Payments</h3>
                            <button className="text-amber-400 text-xs font-semibold hover:underline">Pay Fees</button>
                        </div>
                        <div className="space-y-3">
                            {[1, 2].map((p) => (
                                <div key={p} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <CreditCard size={14} />
                                        </div>
                                        <div>
                                            <p className="text-white text-xs font-medium">1st Term Tuition</p>
                                            <p className="text-slate-500 text-[10px]">Oct 12, 2024</p>
                                        </div>
                                    </div>
                                    <span className="text-white text-xs font-bold">₦45,000</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-500/5 rounded-2xl border border-amber-500/10 p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Bell size={18} className="text-amber-500" />
                            School Notices
                        </h3>
                        <div className="space-y-4">
                            <div className="border-l-2 border-amber-500/30 pl-4">
                                <p className="text-white text-xs font-semibold">Mid-term break starts Friday</p>
                                <p className="text-slate-500 text-[10px] mt-1">Please ensure all children are picked up by 1:00 PM.</p>
                            </div>
                            <div className="border-l-2 border-amber-500/30 pl-4">
                                <p className="text-white text-xs font-semibold">Cultural day next month</p>
                                <p className="text-slate-500 text-[10px] mt-1">Get your traditional attires ready!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
