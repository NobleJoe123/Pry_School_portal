import { useEffect, useState } from 'react';
import { GraduationCap, CreditCard, CalendarCheck, Bell, Heart, Plus, Trash2, Users, X, Mail, Phone, MapPin, Calendar, Droplets, AlertTriangle, BookOpen, Award } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';
import { useAuth } from '../../context/AuthContext';
import { api, endpoints } from '../../utils/api';
import RecentNotifications from '../../components/RecentNotifications';
import EnrollmentAdmissionModal from '../../components/EnrollmentAdmissionModal';
import ParentProfileCompletionModal from '../../components/ParentProfileCompletionModal';
import Modal from '../../components/ui/Modal';

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
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
    const [profileCheckDone, setProfileCheckDone] = useState(false);
    const [selectedChild, setSelectedChild] = useState<any | null>(null);
    const [childTab, setChildTab] = useState<'info' | 'academics'>('info');
    const [childScores, setChildScores] = useState<any[]>([]);
    const [childReport, setChildReport] = useState<any | null>(null);
    const [academicsLoading, setAcademicsLoading] = useState(false);

    useEffect(() => {
        if (!selectedChild) {
            setChildTab('info');
            setChildScores([]);
            setChildReport(null);
            return;
        }

        setAcademicsLoading(true);
        const childId = selectedChild.user?.id;

        Promise.all([
            api.get<any>(`${endpoints.academics.scores}?student=${childId}`),
            api.get<any>(`${endpoints.academics.reportCards}?student=${childId}`)
        ]).then(([scoresRes, reportsRes]) => {
            const getList = (val: any) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (val.results && Array.isArray(val.results)) return val.results;
                return [];
            };
            const scoresList = getList(scoresRes);
            const reportsList = getList(reportsRes);

            setChildScores(scoresList);
            const publishedReport = reportsList.find((r: any) => r.is_published);
            setChildReport(publishedReport || null);
        }).catch(err => {
            console.error("Failed to load child academics in parent dashboard", err);
        }).finally(() => {
            setAcademicsLoading(false);
        });
    }, [selectedChild]);

    const getGroupedScores = () => {
        const grouped: Record<string, {
            subjectName: string;
            assessments: { name: string; score: number; max: number }[];
            totalScore: number;
            totalMax: number;
        }> = {};

        childScores.forEach(s => {
            const assessment = s.assessment;
            if (!assessment || !assessment.subject) return;
            const subjectId = assessment.subject.id;
            const subjectName = assessment.subject.name;

            if (!grouped[subjectId]) {
                grouped[subjectId] = {
                    subjectName,
                    assessments: [],
                    totalScore: 0,
                    totalMax: 0
                };
            }

            const score = Number(s.score_obtained) || 0;
            const max = Number(assessment.assessment_type?.max_score) || 100;

            grouped[subjectId].assessments.push({
                name: assessment.assessment_type?.name || assessment.name,
                score,
                max
            });
            grouped[subjectId].totalScore += score;
            grouped[subjectId].totalMax += max;
        });

        return Object.values(grouped);
    };

    const groupedChildScores = getGroupedScores();
    const childAverage = groupedChildScores.length > 0
        ? (groupedChildScores.reduce((sum, s) => sum + (s.totalScore / s.totalMax) * 100, 0) / groupedChildScores.length).toFixed(1)
        : '0.0';

    useEffect(() => {
        const checkProfile = async () => {
            try {
                // Check enrollment / profile status from backend
                const data = await api.get<{ completed_profile?: boolean }>(endpoints.auth.parentEnrollmentStatus);
                // If the backend returns completed_profile explicitly
                if (data && typeof (data as any).completed_profile === 'boolean') {
                    setNeedsProfileCompletion(!(data as any).completed_profile);
                }
            } catch {
                // silently ignore; profile check is best-effort
            } finally {
                setProfileCheckDone(true);
                setTimeout(() => setLoading(false), 500);
            }
        };
        checkProfile();
    }, []);

    const children = user?.children || [];

    if (!profileCheckDone || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!loading && children.length === 0 && !needsProfileCompletion) {
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
            {/* Blocking profile completion overlay */}
            {needsProfileCompletion && (
                <ParentProfileCompletionModal
                    onComplete={() => {
                        setNeedsProfileCompletion(false);
                        window.location.reload();
                    }}
                />
            )}
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
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-white font-bold">My Pupils</h3>
                        <button onClick={() => setShowLinkModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10">
                            <Plus size={12} /> Link Another Pupil
                        </button>
                    </div>
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
                                
                                <button onClick={() => setSelectedChild(child)} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all">
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

                    <RecentNotifications />
                </div>
            </div>

            <EnrollmentAdmissionModal
                isOpen={showLinkModal}
                parentId={user?.id || ''}
                onSuccess={() => {
                    setShowLinkModal(false);
                    window.location.reload();
                }}
            />

            {/* Pupil Detail Drawer/Modal */}
            {selectedChild && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedChild(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-sm h-full overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200"
                        style={{ background: 'linear-gradient(180deg, #0d1b2a 0%, #070e1a 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                            <p className="text-white text-sm font-bold">Pupil Profile Details</p>
                            <button onClick={() => setSelectedChild(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center pt-8 pb-6 px-5 border-b border-white/5">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-xl ring-2 ring-amber-500/30">
                                {selectedChild.user?.profile_photo_url ? (
                                    <img src={selectedChild.user.profile_photo_url} alt={selectedChild.user?.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-black">
                                        {`${selectedChild.user?.first_name?.[0] ?? ''}${selectedChild.user?.last_name?.[0] ?? ''}`.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-white text-lg font-black text-center">{selectedChild.user?.full_name}</h2>
                            <p className="text-slate-500 text-xs mt-1 font-mono">{selectedChild.profile?.admission_number}</p>
                            <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mt-2.5">
                                {selectedChild.profile?.current_class?.name || 'Unassigned'}
                            </span>
                        </div>

                        {/* Tab Toggle */}
                        <div className="flex gap-2 px-5 py-2 border-b border-white/5 bg-white/[0.01] shrink-0">
                            <button 
                                onClick={() => setChildTab('info')}
                                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg border transition-all ${
                                    childTab === 'info' 
                                        ? 'bg-amber-500 text-slate-950 border-amber-500' 
                                        : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                            >
                                Profile Info
                            </button>
                            <button 
                                onClick={() => setChildTab('academics')}
                                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg border transition-all ${
                                    childTab === 'academics' 
                                        ? 'bg-amber-500 text-slate-950 border-amber-500' 
                                        : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                            >
                                Academic Report
                            </button>
                        </div>

                        <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
                            {childTab === 'info' ? (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2.5 py-0.5">
                                        <Mail size={13} className="text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Email Address</p>
                                            <p className="text-white text-xs font-semibold mt-0.5">{selectedChild.user?.email || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 py-0.5">
                                        <Calendar size={13} className="text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Date of Birth</p>
                                            <p className="text-white text-xs font-semibold mt-0.5">{selectedChild.user?.date_of_birth || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 py-0.5">
                                        <GraduationCap size={13} className="text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Gender</p>
                                            <p className="text-white text-xs font-semibold mt-0.5">{selectedChild.profile?.gender === 'M' ? 'Male' : selectedChild.profile?.gender === 'F' ? 'Female' : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 py-0.5">
                                        <Droplets size={13} className="text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Blood Group</p>
                                            <p className="text-white text-xs font-semibold mt-0.5">{selectedChild.profile?.blood_group || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 py-0.5">
                                        <MapPin size={13} className="text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">State of Origin</p>
                                            <p className="text-white text-xs font-semibold mt-0.5">{selectedChild.profile?.state_of_origin || '—'}</p>
                                        </div>
                                    </div>

                                    {selectedChild.profile?.emergency_contact_name && (
                                        <div className="pt-3 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Emergency Contact</p>
                                            <div className="space-y-1.5 text-xs text-slate-300">
                                                <p><span className="text-slate-500">Name:</span> {selectedChild.profile.emergency_contact_name}</p>
                                                {selectedChild.profile.emergency_contact_phone && <p><span className="text-slate-500">Phone:</span> {selectedChild.profile.emergency_contact_phone}</p>}
                                                {selectedChild.profile.emergency_contact_relationship && <p><span className="text-slate-500">Relationship:</span> <span className="capitalize">{selectedChild.profile.emergency_contact_relationship}</span></p>}
                                            </div>
                                        </div>
                                    )}

                                    {selectedChild.profile?.medical_conditions && (
                                        <div className="pt-3 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Medical Conditions</p>
                                            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2">
                                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                                <span>{selectedChild.profile.medical_conditions}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {academicsLoading ? (
                                        <div className="flex justify-center py-10">
                                            <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
                                        </div>
                                    ) : !childReport ? (
                                        <div className="p-6 text-center bg-white/5 rounded-2xl border border-white/5">
                                            <GraduationCap size={32} className="mx-auto text-slate-600 mb-2" />
                                            <p className="text-white text-xs font-bold">Report Card Pending Verification</p>
                                            <p className="text-slate-500 text-[10px] mt-1 leading-relaxed">
                                                Your child's terminal reports are currently undergoing review by the school administration and will be published shortly.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Report Card Header Card */}
                                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                                <div>
                                                    <p className="text-amber-500 text-xs font-bold">{childReport.term_name || 'Terminal Report'}</p>
                                                    <p className="text-slate-500 text-[10px] mt-0.5">Session: {childReport.academic_year_name}</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl text-xs font-black font-mono">
                                                    <Award size={13} />
                                                    <span>{childAverage}%</span>
                                                </div>
                                            </div>

                                            {/* Subjects list */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject Grades</p>
                                                {groupedChildScores.map((subj, idx) => {
                                                    const pct = (subj.totalScore / subj.totalMax) * 100;
                                                    let grade = 'F';
                                                    let color = 'text-red-400';
                                                    if (pct >= 70) { grade = 'A'; color = 'text-emerald-400'; }
                                                    else if (pct >= 60) { grade = 'B'; color = 'text-sky-400'; }
                                                    else if (pct >= 50) { grade = 'C'; color = 'text-amber-400'; }
                                                    else if (pct >= 40) { grade = 'D'; color = 'text-orange-400'; }

                                                    return (
                                                        <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                                            <div className="min-w-0">
                                                                <p className="text-white text-xs font-bold truncate">{subj.subjectName}</p>
                                                                <p className="text-slate-500 text-[9px] mt-0.5">
                                                                    {subj.assessments.map(a => `${a.name}: ${a.score}/${a.max}`).join(' • ')}
                                                                </p>
                                                            </div>
                                                            <span className={`text-base font-black font-mono ${color}`}>{grade}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Teacher's comment */}
                                            {childReport.teacher_remarks && (
                                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Class Teacher's Remark</p>
                                                    <p className="text-slate-300 text-xs italic leading-relaxed">"{childReport.teacher_remarks}"</p>
                                                </div>
                                            )}

                                            {/* Admin feedback comment */}
                                            {childReport.admin_remarks && (
                                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl mt-3">
                                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1.5">Head Teacher's / School Feedback</p>
                                                    <p className="text-slate-300 text-xs italic leading-relaxed">"{childReport.admin_remarks}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-white/5 shrink-0">
                            <button onClick={() => setSelectedChild(null)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all border border-white/10">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
