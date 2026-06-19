import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    GraduationCap, Mail, KeyRound, Lock, Eye, EyeOff,
    ArrowLeft, CheckCircle, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import { api, endpoints } from '../utils/api';
import logo from '../assets/anyilogo.png';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
    const steps = [
        { n: 1, label: 'Email' },
        { n: 2, label: 'Verify' },
        { n: 3, label: 'Reset' },
    ];
    return (
        <div className="flex items-center gap-0 mb-10">
            {steps.map((s, i) => (
                <div key={s.n} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                            ${current > s.n ? 'bg-emerald-500 text-white' :
                            current === s.n ? 'bg-amber-500 text-slate-950' :
                            'bg-white/10 text-slate-600 border border-white/10'}`}>
                            {current > s.n ? <CheckCircle size={14} /> : s.n}
                        </div>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider
                            ${current === s.n ? 'text-amber-400' : current > s.n ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {s.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-16 h-px mx-2 mb-4 transition-all ${current > s.n ? 'bg-emerald-500' : 'bg-white/10'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [debugOtp, setDebugOtp] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [success, setSuccess] = useState(false);

    const strength = passwordStrength(newPassword);
    const otpString = otp.join('');

    // OTP input: auto-advance to next box
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    // ── Step 1: Request OTP ──────────────────────────────────────────────────
    const handleRequestOtp = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.post<{ message: string; debug_otp?: string }>(
                endpoints.auth.forgotPassword, { email }
            );
            if (data.debug_otp) {
                setDebugOtp(data.debug_otp);
                // Pre-fill OTP boxes for convenience in dev
                setOtp(String(data.debug_otp).split(''));
            }
            setStep(2);
            // Start 60-second resend cooldown
            setResendCooldown(60);
            const timer = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) { clearInterval(timer); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP (just move to step 3 — verification happens on submit) ──
    const handleVerifyOtp = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (otpString.length < 6) {
            setError('Please enter the complete 6-digit code.');
            return;
        }
        setStep(3);
    };

    // ── Step 3: Reset Password ───────────────────────────────────────────────
    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            await api.post(endpoints.auth.resetPassword, {
                email,
                token: otpString,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid or expired code. Please start over.');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ───────────────────────────────────────────────────────────
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        setLoading(true);
        try {
            const data = await api.post<{ message: string; debug_otp?: string }>(
                endpoints.auth.forgotPassword, { email }
            );
            if (data.debug_otp) {
                // In dev: keep the new OTP pre-filled in the boxes
                setDebugOtp(data.debug_otp);
                setOtp(String(data.debug_otp).split(''));
            } else {
                // Production: clear boxes so user can type the emailed code
                setOtp(['', '', '', '', '', '']);
            }
            setResendCooldown(60);
            const timer = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) { clearInterval(timer); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #060d18 0%, #0a1628 60%, #0d1b30 100%)' }}>

            {/* Ambient glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)', filter: 'blur(60px)' }} />

            <div className="w-full max-w-md">

                {/* Back to login */}
                <Link to="/login"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group">
                    <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Sign In
                </Link>

                {/* Card */}
                <div className="rounded-3xl border border-white/8 overflow-hidden shadow-2xl"
                    style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #091525 100%)' }}>

                    {/* Top accent */}
                    <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400" />

                    <div className="px-8 pt-8 pb-10">

                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            <img src={logo} alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                            <div>
                                <p className="text-white font-black text-sm">Anyi Primary School</p>
                                <p className="text-slate-500 text-[10px]">Password Recovery</p>
                            </div>
                        </div>

                        {!success ? (
                            <>
                                <StepIndicator current={step} />

                                {/* ── STEP 1: Email ── */}
                                {step === 1 && (
                                    <div>
                                        <h1 className="text-white text-2xl font-black mb-2"
                                            style={{ fontFamily: "'DM Serif Display', serif" }}>
                                            Forgot Password?
                                        </h1>
                                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                            Enter your registered email and we'll send you a 6-digit reset code.
                                        </p>

                                        <form onSubmit={handleRequestOtp} className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                                                    Email Address
                                                </label>
                                                <div className="relative">
                                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        type="email"
                                                        required
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        placeholder="your@email.com"
                                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10
                                                            text-white text-sm placeholder-slate-600
                                                            focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {error && <ErrorBox message={error} />}

                                            <button type="submit" disabled={loading}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                                    bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black
                                                    text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
                                                    hover:scale-[1.01] transition-all disabled:opacity-60 disabled:scale-100">
                                                {loading ? <Spinner /> : (
                                                    <>Send Reset Code <ArrowRight size={15} /></>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* ── STEP 2: OTP Entry ── */}
                                {step === 2 && (
                                    <div>
                                        <h1 className="text-white text-2xl font-black mb-2"
                                            style={{ fontFamily: "'DM Serif Display', serif" }}>
                                            Check Your Email
                                        </h1>
                                        <p className="text-slate-400 text-sm mb-2 leading-relaxed">
                                            A 6-digit code was sent to
                                        </p>
                                        <p className="text-amber-400 text-sm font-semibold font-mono mb-8">{email}</p>

                                        {/* Debug OTP banner */}
                                        {debugOtp && (
                                            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl
                                                bg-sky-500/10 border border-sky-500/20">
                                                <KeyRound size={14} className="text-sky-400 shrink-0" />
                                                <p className="text-sky-300 text-xs">
                                                    <span className="font-bold">Dev mode — OTP:</span>{' '}
                                                    <span className="font-mono tracking-widest text-sky-200">{debugOtp}</span>
                                                </p>
                                            </div>
                                        )}

                                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                                            {/* OTP boxes */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                                                    Enter 6-digit Code
                                                </label>
                                                <div className="flex gap-2 justify-between">
                                                    {otp.map((digit, i) => (
                                                        <input
                                                            key={i}
                                                            id={`otp-${i}`}
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={1}
                                                            value={digit}
                                                            onChange={e => handleOtpChange(i, e.target.value)}
                                                            onKeyDown={e => handleOtpKeyDown(i, e)}
                                                            className={`w-12 h-14 rounded-xl text-center text-xl font-black border transition-all
                                                                focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
                                                                ${digit ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-white'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {error && <ErrorBox message={error} />}

                                            <button type="submit"
                                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                                    bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black
                                                    text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
                                                    hover:scale-[1.01] transition-all">
                                                Verify Code <ArrowRight size={15} />
                                            </button>
                                        </form>

                                        {/* Resend */}
                                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/5">
                                            <p className="text-slate-500 text-xs">Didn't receive it?</p>
                                            <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
                                                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300
                                                    disabled:text-slate-600 disabled:cursor-not-allowed transition-colors font-semibold">
                                                <RefreshCw size={12} />
                                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP 3: New Password ── */}
                                {step === 3 && (
                                    <div>
                                        <h1 className="text-white text-2xl font-black mb-2"
                                            style={{ fontFamily: "'DM Serif Display', serif" }}>
                                            Create New Password
                                        </h1>
                                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                            Choose a strong password you haven't used before.
                                        </p>

                                        <form onSubmit={handleResetPassword} className="space-y-5">
                                            {/* New password */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                                                    New Password
                                                </label>
                                                <div className="relative">
                                                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        type={showNew ? 'text' : 'password'}
                                                        required
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                        placeholder="Min. 8 characters"
                                                        className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10
                                                            text-white text-sm placeholder-slate-600
                                                            focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                                                    />
                                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </div>
                                                {newPassword.length > 0 && (
                                                    <div className="mt-2">
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full ${strength.color} rounded-full transition-all duration-500`}
                                                                style={{ width: `${strength.pct}%` }} />
                                                        </div>
                                                        <p className="text-[10px] mt-1 text-slate-500">
                                                            Strength: <span className="text-slate-300 font-semibold">{strength.label}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Confirm password */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                                                    Confirm Password
                                                </label>
                                                <div className="relative">
                                                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        type={showConfirm ? 'text' : 'password'}
                                                        required
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        placeholder="Repeat your password"
                                                        className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10
                                                            text-white text-sm placeholder-slate-600
                                                            focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                                                    />
                                                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </div>
                                                {confirmPassword.length > 0 && (
                                                    <p className={`text-[10px] mt-1.5 ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                                    </p>
                                                )}
                                            </div>

                                            {error && <ErrorBox message={error} />}

                                            <div className="flex gap-3 pt-1">
                                                <button type="button" onClick={() => { setStep(2); setError(''); }}
                                                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400
                                                        hover:text-white hover:bg-white/5 text-sm font-semibold transition-all">
                                                    ← Back
                                                </button>
                                                <button type="submit" disabled={loading}
                                                    className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl
                                                        bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black
                                                        text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35
                                                        hover:scale-[1.01] transition-all disabled:opacity-60 disabled:scale-100">
                                                    {loading ? <Spinner dark /> : (
                                                        <><ShieldCheck size={14} /> Reset Password</>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── SUCCESS ── */
                            <div className="text-center py-6">
                                <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25
                                    flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={36} className="text-emerald-400" />
                                </div>
                                <h2 className="text-white text-2xl font-black mb-3"
                                    style={{ fontFamily: "'DM Serif Display', serif" }}>
                                    Password Reset!
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    Your password has been updated successfully.
                                    <br />Redirecting you to the login page...
                                </p>
                                <div className="flex justify-center gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                                            style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-slate-600 mt-8">
                    © {new Date().getFullYear()} Jascube Technologies. All rights reserved.
                </p>
            </div>

            {/* Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-rose-400 text-sm mt-0.5">⚠</span>
            <p className="text-rose-400 text-xs leading-relaxed">{message}</p>
        </div>
    );
}

function Spinner({ dark }: { dark?: boolean }) {
    return (
        <svg className={`animate-spin w-4 h-4 ${dark ? 'text-slate-950' : 'text-slate-300'}`}
            viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );
}
