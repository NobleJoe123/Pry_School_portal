import { useEffect, useState } from 'react';
import {
    Users, GraduationCap, BookOpen, CreditCard, CalendarCheck,
    Plus, UserCircle, ChevronRight, AlertCircle, Droplets, MapPin,
    Phone, Mail, Calendar, Award, FileText, X, CheckCircle, Clock, TrendingUp,
    Download, Eye, Loader2, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';
import EnrollmentAdmissionModal from '../../components/EnrollmentAdmissionModal';

type ProfileTab = 'overview' | 'attendance' | 'academics' | 'fees' | 'documents';

const getList = <T,>(val: any): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val.results && Array.isArray(val.results)) return val.results;
    return [];
};

function PupilAvatar({ user, size = 'w-14 h-14', textSize = 'text-base' }: { user: any; size?: string; textSize?: string }) {
    const [failed, setFailed] = useState(false);
    const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || 'P';

    return (
        <div className={`${size} rounded-xl overflow-hidden flex items-center justify-center font-black shrink-0 border-2 border-white/5`}>
            {user?.profile_photo_url && !failed ? (
                <img
                    src={user.profile_photo_url}
                    alt=""
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className={`w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white ${textSize} font-black`}>
                    {initials}
                </div>
            )}
        </div>
    );
}

function TabButton({ tab, active, onClick, icon, label, count }: {
    tab: ProfileTab; active: ProfileTab; onClick: (t: ProfileTab) => void;
    icon: React.ReactNode; label: string; count?: number;
}) {
    const isActive = tab === active;
    return (
        <button
            onClick={() => onClick(tab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border
                ${isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
                }`}
        >
            {icon}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-slate-950/30 text-amber-950' : 'bg-white/10 text-slate-300'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function OverviewTab({ child }: { child: any }) {
    const profile = child.profile || {};
    const user = child.user || {};

    const rows = [
        { label: 'Full Name', value: user.full_name },
        { label: 'Admission No.', value: profile.admission_number },
        { label: 'Class', value: profile.current_class?.name || profile.current_class || 'Unassigned' },
        { label: 'Gender', value: profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : '—' },
        { label: 'Date of Birth', value: user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
        { label: 'Blood Group', value: profile.blood_group || '—' },
        { label: 'Status', value: profile.status || 'Active' },
        { label: 'Email', value: user.email || '—' },
        { label: 'Phone', value: user.phone || '—' },
        { label: 'State of Origin', value: profile.state_of_origin || '—' },
        { label: 'Place of Birth', value: profile.place_of_birth || '—' },
        { label: 'Address', value: user.address || '—' },
    ];

    return (
        <div className="space-y-5">
            {/* Photo + name hero */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 rounded-2xl border border-white/5"
                style={{ background: 'linear-gradient(135deg,#0f2235 0%,#0a1628 100%)' }}>
                <PupilAvatar user={user} size="w-24 h-24" textSize="text-2xl" />
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-white text-xl font-black">{user.full_name}</h3>
                    <p className="text-slate-500 text-xs font-mono mt-1">{profile.admission_number}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                        <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold rounded-lg border border-sky-500/20">
                            {profile.current_class?.name || profile.current_class || 'Unassigned'}
                        </span>
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${profile.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                            {profile.status || 'Active'}
                        </span>
                        {profile.gender && (
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${profile.gender === 'M'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                }`}>
                                {profile.gender === 'M' ? 'Male' : 'Female'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map(({ label, value }) => (
                    <div key={label} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">{label}</p>
                        <p className="text-white text-sm font-semibold break-words">{value || '—'}</p>
                    </div>
                ))}
            </div>

            {/* Emergency contact */}
            {profile.emergency_contact_name && (
                <div className="p-4 rounded-2xl border border-amber-500/10 bg-amber-500/[0.03]">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Emergency Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div><p className="text-slate-500 text-[10px]">Name</p><p className="text-white font-semibold mt-0.5">{profile.emergency_contact_name}</p></div>
                        {profile.emergency_contact_phone && <div><p className="text-slate-500 text-[10px]">Phone</p><p className="text-white font-semibold mt-0.5">{profile.emergency_contact_phone}</p></div>}
                        {profile.emergency_contact_relationship && <div><p className="text-slate-500 text-[10px]">Relationship</p><p className="text-white font-semibold capitalize mt-0.5">{profile.emergency_contact_relationship}</p></div>}
                    </div>
                </div>
            )}

            {/* Medical conditions */}
            {profile.medical_conditions && (
                <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/10 bg-red-500/[0.03]">
                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Medical Conditions</p>
                        <p className="text-red-300 text-xs leading-relaxed">{profile.medical_conditions}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function AttendanceTab({ childId }: { childId: string }) {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<any[]>([]);

    useEffect(() => {
        api.get<any>(`${endpoints.attendance.students}?student=${childId}`)
            .then(res => setRecords(getList<any>(res)))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [childId]);

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const rate = records.length > 0 ? ((present + late) / records.length * 100).toFixed(1) : '0.0';

    const statusCfg: Record<string, { label: string; cls: string }> = {
        present: { label: 'Present', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        absent: { label: 'Absent', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
        late: { label: 'Late', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Present', val: present, color: 'bg-emerald-500/10 text-emerald-400' },
                    { label: 'Absent', val: absent, color: 'bg-red-500/10 text-red-400' },
                    { label: 'Rate', val: `${rate}%`, color: 'bg-sky-500/10 text-sky-400' },
                ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center border border-white/5`}>
                        <p className="text-xl font-black">{loading ? '…' : s.val}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{s.label}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-11 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : records.length === 0 ? (
                <div className="py-12 text-center"><CalendarCheck size={32} className="text-slate-700 mx-auto mb-3" /><p className="text-slate-500 text-sm">No attendance records</p></div>
            ) : (
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/[0.02] border-b border-white/5 px-4 py-2.5">
                        <span>Date</span><span>Day</span><span>Status</span>
                    </div>
                    <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
                        {records.slice().reverse().map((r, i) => {
                            const cfg = statusCfg[r.status] || statusCfg.absent;
                            const d = new Date(r.date);
                            return (
                                <div key={i} className="grid grid-cols-3 items-center px-4 py-2.5 hover:bg-white/[0.02]">
                                    <span className="text-white text-xs font-mono">{d.toLocaleDateString('en-GB')}</span>
                                    <span className="text-slate-500 text-xs">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${cfg.cls}`}>{cfg.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function AcademicsTab({ childId }: { childId: string }) {
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [selectedTerm, setSelectedTerm] = useState('');

    useEffect(() => {
        Promise.allSettled([
            api.get<any>(`${endpoints.academics.scores}?student=${childId}`),
            api.get<any>(endpoints.academics.terms),
        ]).then(([scoresRes, termsRes]) => {
            if (scoresRes.status === 'fulfilled') setScores(getList<any>(scoresRes.value));
            if (termsRes.status === 'fulfilled') {
                const termList = getList<any>(termsRes.value);
                setTerms(termList);
                if (termList.length > 0) setSelectedTerm(termList[termList.length - 1].id);
            }
        }).finally(() => setLoading(false));
    }, [childId]);

    const filtered = selectedTerm ? scores.filter((s: any) => s.assessment?.term === selectedTerm || s.assessment?.term?.id === selectedTerm) : scores;

    const grouped: Record<string, { name: string; scores: any[] }> = {};
    filtered.forEach((s: any) => {
        const subj = s.assessment?.subject;
        if (!subj) return;
        if (!grouped[subj.id]) grouped[subj.id] = { name: subj.name, scores: [] };
        grouped[subj.id].scores.push(s);
    });
    const subjects = Object.values(grouped);

    const totalObtained = filtered.reduce((sum: number, s: any) => sum + (Number(s.score_obtained) || 0), 0);
    const totalMax = filtered.reduce((sum: number, s: any) => sum + (Number(s.assessment?.assessment_type?.max_score) || 100), 0);
    const avg = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';

    const getGrade = (pct: number) => {
        if (pct >= 70) return { g: 'A', cls: 'text-emerald-400' };
        if (pct >= 60) return { g: 'B', cls: 'text-sky-400' };
        if (pct >= 50) return { g: 'C', cls: 'text-amber-400' };
        if (pct >= 40) return { g: 'D', cls: 'text-orange-400' };
        return { g: 'F', cls: 'text-red-400' };
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
                <select
                    value={selectedTerm}
                    onChange={e => setSelectedTerm(e.target.value)}
                    className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/50"
                >
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name} — {t.year?.name || t.year}</option>)}
                </select>
                {!loading && subjects.length > 0 && (
                    <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                        Average: {avg}%
                    </div>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : subjects.length === 0 ? (
                <div className="py-12 text-center"><BookOpen size={32} className="text-slate-700 mx-auto mb-3" /><p className="text-slate-500 text-sm">No scores for this term</p></div>
            ) : (
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/[0.02] border-b border-white/5 px-4 py-2.5">
                        <span className="col-span-5">Subject</span>
                        <span className="col-span-2 text-center">Score</span>
                        <span className="col-span-2 text-center">Max</span>
                        <span className="col-span-2 text-center">%</span>
                        <span className="col-span-1 text-center">Grade</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                        {subjects.map(subj => {
                            const total = subj.scores.reduce((s: number, sc: any) => s + (Number(sc.score_obtained) || 0), 0);
                            const max = subj.scores.reduce((s: number, sc: any) => s + (Number(sc.assessment?.assessment_type?.max_score) || 100), 0);
                            const pct = max > 0 ? (total / max) * 100 : 0;
                            const { g, cls } = getGrade(pct);
                            return (
                                <div key={subj.name} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/[0.02]">
                                    <span className="col-span-5 text-white text-xs font-semibold">{subj.name}</span>
                                    <span className="col-span-2 text-center text-white text-xs font-bold">{total}</span>
                                    <span className="col-span-2 text-center text-slate-500 text-xs">{max}</span>
                                    <span className="col-span-2 text-center text-white text-xs">{pct.toFixed(1)}%</span>
                                    <span className={`col-span-1 text-center text-xs font-black ${cls}`}>{g}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-12 items-center px-4 py-3 bg-white/[0.03] border-t border-white/5">
                        <span className="col-span-5 text-white text-xs font-black uppercase tracking-wide">Total / Avg</span>
                        <span className="col-span-2 text-center text-white text-xs font-black">{totalObtained}</span>
                        <span className="col-span-2 text-center text-slate-500 text-xs">{totalMax}</span>
                        <span className="col-span-2 text-center text-amber-400 text-xs font-black">{avg}%</span>
                        <span className={`col-span-1 text-center text-xs font-black ${getGrade(Number(avg)).cls}`}>{getGrade(Number(avg)).g}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeesTab({ childId, childName }: { childId: string; childName: string }) {
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        Promise.allSettled([
            api.get<any>(endpoints.finance.studentFees),
            api.get<any>(endpoints.finance.payments),
        ]).then(([feesRes, paymentsRes]) => {
            if (feesRes.status === 'fulfilled') {
                setFees(getList<any>(feesRes.value).filter((f: any) => f.student === childId || f.student_name?.toLowerCase().includes(childName.toLowerCase())));
            }
            if (paymentsRes.status === 'fulfilled') {
                setPayments(getList<any>(paymentsRes.value));
            }
        }).finally(() => setLoading(false));
    }, [childId, childName]);

    const outstanding = fees.filter(f => f.status !== 'paid');
    const paid = fees.filter(f => f.status === 'paid');
    const totalOwed = outstanding.reduce((s, f) => s + parseFloat(f.balance || '0'), 0);
    const totalPaid = fees.reduce((s, f) => s + parseFloat(f.amount_paid || '0'), 0);

    const statusCfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
        paid: { label: 'Paid', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={10} /> },
        partial: { label: 'Partial', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Clock size={10} /> },
        outstanding: { label: 'Outstanding', cls: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <AlertCircle size={10} /> },
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-red-500/10 bg-red-500/[0.03]">
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Outstanding</p>
                    <p className="text-white text-xl font-black mt-1">₦{totalOwed.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{outstanding.length} pending invoice{outstanding.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03]">
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Amount Paid</p>
                    <p className="text-white text-xl font-black mt-1">₦{totalPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{paid.length} invoice{paid.length !== 1 ? 's' : ''} cleared</p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : fees.length === 0 ? (
                <div className="py-12 text-center"><CreditCard size={32} className="text-slate-700 mx-auto mb-3" /><p className="text-slate-500 text-sm">No fee records found</p></div>
            ) : (
                <div className="space-y-2.5">
                    {fees.map(f => {
                        const cfg = statusCfg[f.status] || statusCfg.outstanding;
                        return (
                            <div key={f.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                                <CreditCard size={14} className="text-slate-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-semibold truncate">{f.fee_type_name}</p>
                                    <p className="text-slate-500 text-[11px]">{f.term_name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-white text-xs font-bold">₦{parseFloat(f.balance || '0').toLocaleString()}</p>
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border mt-0.5 ${cfg.cls}`}>
                                        {cfg.icon} {cfg.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface ReportCardDoc {
    id: string;
    term_name: string;
    academic_year_name: string;
    is_published: boolean;
    teacher_remarks: string;
    admin_remarks: string;
    psychomotor?: Record<string, number>;
    student: string;
    student_name: string;
}

function DocumentsTab({ child }: { child: any }) {
    const birthCertUrl: string | null = child.profile?.birth_certificate_url || null;
    const [reports, setReports] = useState<ReportCardDoc[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [previewReport, setPreviewReport] = useState<ReportCardDoc | null>(null);

    useEffect(() => {
        const childId = child.user?.id;
        if (!childId) { setLoadingReports(false); return; }
        api.get<any>(`${endpoints.academics.reportCards}?student=${childId}`)
            .then(res => {
                const list: ReportCardDoc[] = Array.isArray(res) ? res : (res?.results || []);
                setReports(list.filter((r: ReportCardDoc) => r.is_published));
            })
            .catch(() => setReports([]))
            .finally(() => setLoadingReports(false));
    }, [child.user?.id]);

    return (
        <div className="space-y-5">
            {/* Birth Certificate */}
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <ShieldCheck size={11} /> Identity Documents
                </p>
                {birthCertUrl ? (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-sky-500/20 transition-all"
                        style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Ward's Birth Certificate</p>
                                <p className="text-slate-500 text-xs mt-0.5">Uploaded identity document</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href={birthCertUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold rounded-xl transition-all">
                                <Eye size={13} /> View
                            </a>
                            <a href={birthCertUrl} download
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-xs font-bold rounded-xl transition-all">
                                <Download size={13} /> Download
                            </a>
                        </div>
                    </div>
) : (
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-slate-600">
                        <AlertCircle size={16} />
                        <p className="text-xs">Birth certificate not uploaded yet. Complete the profile to upload.</p>
                    </div>
                )}
            </div>

            {/* Report Cards */}
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Award size={11} /> Published Report Cards
                </p>
                {loadingReports ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-slate-600">
                        <AlertCircle size={16} />
                        <p className="text-xs">No published report cards yet. Check back after end of term.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map(r => (
                            <div key={r.id}
                                className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-amber-500/20 transition-all"
                                style={{ background: 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{r.term_name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{r.academic_year_name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewReport(r)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl transition-all shrink-0">
                                    <Eye size={13} /> Preview
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick link to full reports page */}
            <a href="/parent/reports"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl border border-sky-500/15 text-sky-400 text-xs font-bold hover:bg-sky-500/5 transition-all">
                <TrendingUp size={13} /> Go to Full Reports Page
                <ChevronRight size={13} />
            </a>

            {/* Simple inline preview modal */}
            {previewReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewReport(null)}>
                    <div className="relative w-full max-w-2xl bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-white font-bold text-sm">{previewReport.term_name} Report Card</p>
                                <p className="text-slate-500 text-xs">{previewReport.academic_year_name}</p>
                            </div>
                            <button onClick={() => setPreviewReport(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <FileText size={40} className="text-amber-400 mx-auto mb-3" />
                            <p className="text-white font-bold mb-1">{child.user?.full_name}</p>
                            <p className="text-slate-400 text-xs mb-5">{previewReport.term_name} · {previewReport.academic_year_name}</p>
                            <a href="/parent/reports"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black rounded-xl transition-all shadow-lg shadow-amber-500/20">
                                <Eye size={15} /> View Full Report Card
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ParentChildren() {
    const { user } = useAuth();
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedChildIdx, setSelectedChildIdx] = useState(0);
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

    const children: any[] = user?.children || [];
    const child = children[selectedChildIdx] ?? null;

    // Reset tab when child changes
    useEffect(() => { setActiveTab('overview'); }, [selectedChildIdx]);

    const tabs: { tab: ProfileTab; label: string; icon: React.ReactNode }[] = [
        { tab: 'overview', label: 'Overview', icon: <UserCircle size={12} /> },
        { tab: 'attendance', label: 'Attendance', icon: <CalendarCheck size={12} /> },
        { tab: 'academics', label: 'Academics', icon: <BookOpen size={12} /> },
        { tab: 'fees', label: 'Fees', icon: <CreditCard size={12} /> },
        { tab: 'documents', label: 'Documents', icon: <FileText size={12} /> },
    ];

    if (children.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6">
                    <Users size={40} />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">No Children Linked</h2>
                <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">
                    Link your children using admission numbers from the school's approval email.
                </p>
                <button
                    onClick={() => setShowLinkModal(true)}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
                >
                    Link a Pupil
                </button>
                <EnrollmentAdmissionModal isOpen={showLinkModal} parentId={user?.id || ''} onSuccess={() => { setShowLinkModal(false); window.location.reload(); }} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Serif Display',serif" }}>My Children</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{children.length} enrolled pupil{children.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setShowLinkModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-amber-500/20"
                >
                    <Plus size={13} /> Link Pupil
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Left: Child selector cards ── */}
                <div className="lg:col-span-4 space-y-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Select a Child</p>
                    {children.map((c: any, i: number) => {
                        const profile = c.profile || {};
                        const u = c.user || {};
                        const isSelected = i === selectedChildIdx;
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedChildIdx(i)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all
                                    ${isSelected
                                        ? 'border-amber-500/40 shadow-lg shadow-amber-500/10'
                                        : 'border-white/5 hover:border-white/10'
                                    }`}
                                style={{ background: isSelected ? 'linear-gradient(135deg,#1c1202 0%,#0d1b2a 100%)' : 'linear-gradient(135deg,#0d1b2a 0%,#0a1628 100%)' }}
                            >
                                <div className={isSelected ? 'ring-2 ring-amber-500/40 rounded-xl' : ''}>
                                    <PupilAvatar user={u} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm truncate ${isSelected ? 'text-amber-400' : 'text-white'}`}>{u.full_name}</p>
                                    <p className="text-slate-500 text-xs mt-0.5 font-mono truncate">{profile.admission_number}</p>
                                    <p className="text-slate-600 text-[11px] mt-0.5">{profile.current_class?.name || profile.current_class || 'Unassigned'}</p>
                                </div>
                                {isSelected && <ChevronRight size={14} className="text-amber-400 shrink-0" />}
                            </button>
                        );
                    })}
                </div>

                {/* ── Right: Detail panel ── */}
                {child && (
                    <div className="lg:col-span-8">
                        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
                            style={{ background: 'linear-gradient(180deg,#0d1b2a 0%,#070e1a 100%)' }}>

                            {/* Tab bar */}
                            <div className="px-5 py-3 border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-none">
                                {tabs.map(t => (
                                    <TabButton key={t.tab} tab={t.tab} active={activeTab} onClick={setActiveTab} icon={t.icon} label={t.label} />
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="p-5 overflow-y-auto max-h-[calc(100vh-18rem)]">
                                {activeTab === 'overview' && <OverviewTab child={child} />}
                                {activeTab === 'attendance' && <AttendanceTab childId={child.user?.id} />}
                                {activeTab === 'academics' && <AcademicsTab childId={child.user?.id} />}
                                {activeTab === 'fees' && <FeesTab childId={child.user?.id} childName={child.user?.full_name || ''} />}
                                {activeTab === 'documents' && <DocumentsTab child={child} />}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <EnrollmentAdmissionModal
                isOpen={showLinkModal}
                parentId={user?.id || ''}
                onSuccess={() => { setShowLinkModal(false); window.location.reload(); }}
            />
        </div>
    );
}
