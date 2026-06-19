import { useState, type FormEvent } from 'react';
import {
    GraduationCap, Lock, Eye, EyeOff, CheckCircle,
    AlertTriangle, ArrowRight, KeyRound, ShieldCheck
} from 'lucide-react';
import { api, endpoints } from '../utils/api';
import logo from '../assets/anyilogo.png';

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
    /** Whether the modal is visible */
    isOpen: boolean;
    /** Teacher's full name for greeting */
    teacherName: string;
    /** Teacher's email shown as their login identifier */
    teacherEmail: string;
    /** Called after the password is successfully changed */
    onSuccess: () => void;
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDot({ step, current }: { step: number; current: number }) {
    const done = current > step;
    const active = current === step;
    return (
        <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${done ? 'bg-emerald-500 text-white' :
                    active ? 'bg-amber-500 text-slate-950' :
                        'bg-white/10 text-slate-500'}`}>
                {done ? <CheckCircle size={14} /> : step}
            </div>
            {step < 2 && (
                <div className={`w-12 h-px transition-all ${done ? 'bg-emerald-500' : 'bg-white/10'}`} />
            )}
        </div>
    );
}

// ── Password strength helper ──────────────────────────────────────────────────

function passwordStrength(pw: string): { label: string; color: string; pct: number } {
    if (pw.length === 0) return { label: '', color: 'bg-white/10', pct: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map = [
        { label: 'Too short', color: 'bg-red-500', pct: 15 },
        { label: 'Weak', color: 'bg-red-400', pct: 30 },
        { label: 'Fair', color: 'bg-amber-400', pct: 60 },
        { label: 'Good', color: 'bg-sky-400', pct: 80 },
        { label: 'Strong', color: 'bg-emerald-500', pct: 100 },
    ];
    return map[score] ?? map[0];
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function TeacherFirstLoginModal({
    isOpen, teacherName, teacherEmail, onSuccess,
}: Props) {
    const [step, setStep] = useState<1 | 2>(1);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const strength = passwordStrength(newPassword);
    const firstName = teacherName.split(' ')[0] || teacherName;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.post(endpoints.auth.completeFirstLogin, {
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setSuccess(true);
            // Brief celebration then navigate
            setTimeout(() => {
                onSuccess();
            }, 1800);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update password. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* Backdrop — non-dismissible */
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(4,13,24,0.92)', backdropFilter: 'blur(12px)' }}>

            {/* Card */}
            <div className="w-full max-w-md rounded-3xl border border-white/8 overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #091525 100%)' }}>

                {/* Header stripe */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />

                <div className="px-8 pt-8 pb-10">

                    {/* Logo + school */}
                    <div className="flex items-center gap-3 mb-8">
                        <img src={logo} alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                        <div>
                            <p className="text-white font-black text-sm leading-tight">Anyi Primary School</p>
                            <p className="text-slate-500 text-[10px]">Staff Portal Onboarding</p>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center mb-8">
                        <StepDot step={1} current={step} />
                        <StepDot step={2} current={step} />
                    </div>

                    {/* ── STEP 1: Welcome / Info ── */}
                    {step === 1 && (
                        <div>
                            {/* Greeting */}
                            <div className="mb-6">
                                <h2 className="text-white text-2xl font-black mb-1"
                                    style={{ fontFamily: "'DM Serif Display', serif" }}>
                                    Welcome, {firstName}
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Your staff account has been created. Before you access your dashboard,
                                    please read your temporary credentials carefully.
                                </p>
                            </div>

                            {/* Credentials card */}
                            <div className="rounded-2xl border border-amber-500/20 p-5 mb-5"
                                style={{ background: 'rgba(245,158,11,0.06)' }}>
                                <div className="flex items-center gap-2 mb-4">
                                    <KeyRound size={14} className="text-amber-400" />
                                    <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                                        Your Login Credentials
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Email / Username</p>
                                        <p className="text-white text-sm font-semibold font-mono bg-white/5 px-3 py-2 rounded-lg">
                                            {teacherEmail}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Temporary Password</p>
                                        <p className="text-amber-300 text-sm font-semibold font-mono bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                                            Set by your administrator
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 p-4 mb-8">
                                <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                                <p className="text-rose-300 text-xs leading-relaxed">
                                    <span className="font-bold">Security notice:</span> You must set a new personal password
                                    before you can access the portal. Do not share your credentials with anyone.
                                </p>
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => setStep(2)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                    bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black
                                    text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
                                    hover:scale-[1.01] transition-all"
                            >
                                Set New Password
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: Change Password Form ── */}
                    {step === 2 && !success && (
                        <div>
                            <div className="mb-6">
                                <h2 className="text-white text-2xl font-black mb-1"
                                    style={{ fontFamily: "'DM Serif Display', serif" }}>
                                    Create Your Password
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    Choose a strong password you'll remember.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* New Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/5 border border-white/10
                                                text-white text-sm placeholder-slate-600
                                                focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                                        />
                                        <button type="button" onClick={() => setShowNew(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>

                                    {/* Strength meter */}
                                    {newPassword.length > 0 && (
                                        <div className="mt-2">
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full ${strength.color} rounded-full transition-all duration-500`}
                                                    style={{ width: `${strength.pct}%` }} />
                                            </div>
                                            <p className="text-[10px] mt-1 text-slate-500">
                                                Strength: <span className="font-semibold text-slate-300">{strength.label}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat your password"
                                            className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/5 border border-white/10
                                                text-white text-sm placeholder-slate-600
                                                focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                                        />
                                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {/* Match indicator */}
                                    {confirmPassword.length > 0 && (
                                        <p className={`text-[10px] mt-1.5 ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                        </p>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                        <AlertTriangle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                                        <p className="text-rose-400 text-xs">{error}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => { setStep(1); setError(''); }}
                                        className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400
                                            hover:text-white hover:bg-white/5 text-sm font-semibold transition-all">
                                        ← Back
                                    </button>
                                    <button type="submit" disabled={loading}
                                        className="flex-2 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                                            bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black
                                            text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35
                                            hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100">
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={14} />
                                                Set Password
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── SUCCESS STATE ── */}
                    {success && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25
                                flex items-center justify-center mx-auto mb-5 animate-pulse">
                                <ShieldCheck size={28} className="text-emerald-400" />
                            </div>
                            <h2 className="text-white text-xl font-black mb-2"
                                style={{ fontFamily: "'DM Serif Display', serif" }}>
                                Password Set!
                            </h2>
                            <p className="text-slate-400 text-sm">
                                Welcome to Anyi Primary School Portal, {firstName}.
                                <br />Redirecting to your dashboard...
                            </p>
                            <div className="mt-6 flex justify-center gap-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
