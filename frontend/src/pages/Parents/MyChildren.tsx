import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, CreditCard, CalendarCheck, ChevronRight, AlertCircle, UserCircle, Award, MapPin, Droplets, Phone } from 'lucide-react';
import { api, endpoints } from '../../utils/api';

interface ChildData {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
    date_of_birth: string | null;
    student_profile?: {
        admission_number: string;
        current_class: string | null;
        current_class_name?: string;
        gender: string;
        blood_group: string | null;
        status: string;
        state_of_origin: string | null;
        medical_conditions: string | null;
    };
}

interface FeeRecord {
    id: string;
    student: string;
    fee_type_name: string;
    term_name: string;
    status: string;
    balance: string;
}

interface AttendanceRecord {
    id: string;
    student: string;
    date: string;
    status: string;
}

function GenderBadge({ gender }: { gender: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${gender === 'M' ? 'bg-sky-500/10 text-sky-400' : 'bg-pink-500/10 text-pink-400'}`}>
            {gender === 'M' ? 'Male' : 'Female'}
        </span>
    );
}

export default function ParentChildren() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [children, setChildren] = useState<ChildData[]>([]);
    const [fees, setFees] = useState<FeeRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [selectedChild, setSelectedChild] = useState<string | null>(null);

    useEffect(() => {
        Promise.allSettled([
            api.get<any>(endpoints.students.list),
            api.get<any>(endpoints.finance.studentFees),
            api.get<any>(endpoints.attendance.students),
        ]).then(([studentsRes, feesRes, attRes]) => {
            if (studentsRes.status === 'fulfilled') {
                const list = Array.isArray(studentsRes.value)
                    ? studentsRes.value
                    : Array.isArray(studentsRes.value?.results) ? studentsRes.value.results : [];
                setChildren(list);
                if (list.length > 0) setSelectedChild(list[0].id);
            }
            if (feesRes.status === 'fulfilled') {
                const list = Array.isArray(feesRes.value)
                    ? feesRes.value
                    : Array.isArray(feesRes.value?.results) ? feesRes.value.results : [];
                setFees(list);
            }
            if (attRes.status === 'fulfilled') {
                const list = Array.isArray(attRes.value)
                    ? attRes.value
                    : Array.isArray(attRes.value?.results) ? attRes.value.results : [];
                setAttendance(list);
            }
            setLoading(false);
        });
    }, []);

    const child = children.find(c => c.id === selectedChild) || null;

    const childFees = fees.filter(f => f.student === selectedChild);
    const childAttendance = attendance.filter(a => a.student === selectedChild);
    const presentCount = childAttendance.filter(a => a.status === 'present').length;
    const totalDays = childAttendance.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
    const outstandingFees = childFees.filter(f => f.status !== 'paid');
    const totalOwed = outstandingFees.reduce((s, f) => s + parseFloat(f.balance || '0'), 0);

    if (loading) {
        return (
            <div className="space-y-6 max-w-screen-xl mx-auto">
                <div className="h-8 w-48 bg-white/5 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
                    <div className="lg:col-span-2 h-64 bg-white/5 rounded-3xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (children.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6">
                    <Users size={40} />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">No Children Linked</h2>
                <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                    Your children will appear here once they are linked to your account. Contact the school admin if you believe this is an error.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white font-serif">My Children</h1>
                <p className="text-slate-500 text-sm">Overview of your children's academic progress</p>
            </div>

            {/* Child Selector tabs */}
            {children.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {children.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedChild(c.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                selectedChild === c.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                            }`}>
                            {c.profile_photo_url ? (
                                <img src={c.profile_photo_url} alt={c.full_name}
                                    className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                    <UserCircle size={12} />
                                </div>
                            )}
                            {c.first_name}
                        </button>
                    ))}
                </div>
            )}

            {child && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Child Profile Card */}
                    <div className="rounded-3xl border border-white/5 p-6 flex flex-col items-center text-center"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                        {/* Photo */}
                        <div className="relative mb-4">
                            {child.profile_photo_url ? (
                                <img src={child.profile_photo_url} alt={child.full_name}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-amber-500/30" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-amber-500/10 border-4 border-amber-500/20 flex items-center justify-center">
                                    <GraduationCap size={40} className="text-amber-400" />
                                </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${
                                child.student_profile?.status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'
                            }`} />
                        </div>

                        <h2 className="text-white font-black text-lg">{child.full_name}</h2>
                        {child.student_profile && (
                            <>
                                <p className="text-slate-400 text-xs mt-1 font-mono">{child.student_profile.admission_number}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                                    <GenderBadge gender={child.student_profile.gender} />
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        child.student_profile.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-slate-500/10 text-slate-400'
                                    }`}>
                                        {child.student_profile.status}
                                    </span>
                                </div>
                            </>
                        )}

                        <div className="w-full mt-5 space-y-3 text-left">
                            {child.student_profile?.current_class_name && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <BookOpen size={14} className="text-amber-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Class</p>
                                        <p className="text-white text-sm font-bold">{child.student_profile.current_class_name}</p>
                                    </div>
                                </div>
                            )}
                            {child.date_of_birth && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <CalendarCheck size={14} className="text-sky-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Date of Birth</p>
                                        <p className="text-white text-sm font-bold">
                                            {new Date(child.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {child.student_profile?.blood_group && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <Droplets size={14} className="text-red-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Blood Group</p>
                                        <p className="text-white text-sm font-bold">{child.student_profile.blood_group}</p>
                                    </div>
                                </div>
                            )}
                            {child.student_profile?.state_of_origin && (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <MapPin size={14} className="text-purple-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">State of Origin</p>
                                        <p className="text-white text-sm font-bold">{child.student_profile.state_of_origin}</p>
                                    </div>
                                </div>
                            )}
                            {child.student_profile?.medical_conditions && (
                                <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-red-400 uppercase font-bold">Medical Note</p>
                                        <p className="text-slate-300 text-xs">{child.student_profile.medical_conditions}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Quick stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-white/5 p-4"
                                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <CalendarCheck size={14} className="text-sky-400" />
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Attendance</p>
                                </div>
                                <p className="text-white text-2xl font-black">{attendanceRate}%</p>
                                <p className="text-slate-500 text-[10px]">{presentCount} of {totalDays} days</p>
                            </div>
                            <div className="rounded-2xl border border-white/5 p-4"
                                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard size={14} className={totalOwed > 0 ? 'text-red-400' : 'text-emerald-400'} />
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Fees Owed</p>
                                </div>
                                <p className={`text-2xl font-black ${totalOwed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {totalOwed > 0 ? `₦${totalOwed.toLocaleString()}` : 'Cleared'}
                                </p>
                                <p className="text-slate-500 text-[10px]">{outstandingFees.length} pending</p>
                            </div>
                            <div className="rounded-2xl border border-white/5 p-4"
                                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Award size={14} className="text-amber-400" />
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Fee Records</p>
                                </div>
                                <p className="text-white text-2xl font-black">{childFees.length}</p>
                                <p className="text-slate-500 text-[10px]">this period</p>
                            </div>
                        </div>

                        {/* Fee Summary */}
                        <div className="rounded-3xl border border-white/5 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={15} className="text-sky-400" />
                                    <p className="text-white text-sm font-bold">Fee Records</p>
                                </div>
                                <button onClick={() => navigate('/parent/fees')}
                                    className="flex items-center gap-1 text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors">
                                    View All <ChevronRight size={13} />
                                </button>
                            </div>
                            {childFees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <AlertCircle size={24} className="text-slate-600 mb-2" />
                                    <p className="text-slate-500 text-sm">No fee records found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {childFees.slice(0, 5).map(fee => {
                                        const isPaid = fee.status === 'paid';
                                        const isPartial = fee.status === 'partial';
                                        return (
                                            <div key={fee.id}
                                                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all">
                                                <div>
                                                    <p className="text-white text-sm font-bold">{fee.fee_type_name}</p>
                                                    <p className="text-slate-500 text-xs">{fee.term_name}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isPaid ? 'bg-emerald-500/10 text-emerald-400' :
                                                        isPartial ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Outstanding'}
                                                    </span>
                                                    {!isPaid && (
                                                        <p className="text-slate-500 text-xs">₦{parseFloat(fee.balance).toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Attendance Summary */}
                        <div className="rounded-3xl border border-white/5 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <CalendarCheck size={15} className="text-emerald-400" />
                                    <p className="text-white text-sm font-bold">Recent Attendance</p>
                                </div>
                            </div>
                            {childAttendance.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <CalendarCheck size={24} className="text-slate-600 mb-2" />
                                    <p className="text-slate-500 text-sm">No attendance records yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {[...childAttendance]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 7)
                                        .map(rec => {
                                            const isPresent = rec.status === 'present';
                                            const isAbsent = rec.status === 'absent';
                                            return (
                                                <div key={rec.id}
                                                    className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-all">
                                                    <p className="text-slate-300 text-sm">
                                                        {new Date(rec.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </p>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isPresent ? 'bg-emerald-500/10 text-emerald-400' :
                                                        isAbsent ? 'bg-red-500/10 text-red-400' :
                                                        'bg-amber-500/10 text-amber-400'
                                                    }`}>
                                                        {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
