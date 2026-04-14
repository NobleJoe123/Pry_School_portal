import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import hero from '../assets/Hero1.jpg'

// Role Mapping

const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/dashboard',
  teacher: '/teacher',
  parent: '/parent',
  student: '/student',

};


// Background

function LeftPanel() {
  const roles: { label: string; color: string }[] = [
    { label: 'Admin', color: 'bg-amber-500/20 text-amber-300 border-amber-500' },
    { label: 'Teacher', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500' },
    { label: 'Parent', color: 'bg-sky-500/20 text-sky-300 border-sky-500' },
    { label: 'Student', color: 'bg-violet-500/20 text-violet-300 border-violet-500' },
  ];

  const stats: { num: string; label: string }[] = [
    { num: '500+', label: 'Students' },
    { num: '40+', label: 'Teachers' },
    { num: '90%', label: 'Uptime' },
  ];

  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-panel-dark">
      <img src={hero} alt="Login hero" className="absolute inset-0 w-full h-full object-cover" />

      <div className="absolute inset-0 bg-black/50" />

      {/* Grid texture */}

      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)`, backgroundSize: '40px 40px',
        }} />

      {/* light */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />

      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <GraduationCap size={28} />
        </div>
        <div>
          <p className="text-white font-semibold text-lg leading-tight">Anyi</p>
          <p className="text-slate-400 text-xs"> Primary School Portal</p>
        </div>
      </div>
      {/* Hero */}
      <div className="relative z-10">
        <h1 className="text-5xl font-black text-white leading-tight mb-6"
          style={{ fontFamily: " 'DM Serif Display', serif", letterSpacing: '1px' }}> Hi <br />
          <span className="text-gradient-brand"> Tomorrow's </span>
          <br />  Leaders.
        </h1>
        <p className="text-slate-400 text-sm text-white leading-relaxed max-w-sm"> A unified portal for everything your primary school needs in one place. </p> 
          <p className="text-slate-400 text-sm text-white leading-relaxed max-w-sm"> let's get the portal started....</p>
        <div className="flex flex-wrap gap-2 mt-8">
          {roles.map((r) => (
            <span key={r.label} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${r.color}`}> {r.label} </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 flex gap-10">{stats.map(({ num, label }) => (
        <div key={label}>
          <p className="text-white font-bold text-2xl">{num}</p>
          <p className="text-slate-500 text-xs mt-0.5">{label}</p>
        </div>
      ))}
      </div>

    </div>
  );

}

// Login page

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });

      const { user } = useAuth ();
      const destination = from || ROLE_ROUTES[user?.role ?? 'student'];
      navigate(destination, { replace: true });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* Right panel */}

      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f7f4]">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="p-2 rounded-xl text-amber-500 bg-[#0f1923]">
              <GraduationCap size={28} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-lg"> Anyi </p>
              <p className="text-slate-400 text-xs"> Primary School Portal </p>

            </div>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Sign in
            </h2>
            <p className="text-slate-500 text-sm"> Enter your credentials to continue.</p>
          </div>


          {/* Form */}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2"> Email Address
              </label>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="stan@school.com"
                className="w-full px-4 py-3.5 rounded-xl border text-slate-800 text-sm bg-white border-slate-200 placeholder-slate-300
                focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all duration-200"/>

            </div>

            {/* Password */}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Password

                </label>
                <Link to="/forgot-password" className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"> Forgot password</Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="......."
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border text-slate-800 text-sm bg-white border-slate-200
                  placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-4 transition-all duration-200" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400
                        hover:text-slate-600 transition-colors" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}

            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                <span className="text-red-500 text-sm mt-0.5">⚠</span>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-[#0f1923] hover:bg-[#1e3a5f]"
              style={{
                boxShadow: loading ? 'none' : '0 4px 24px rgba(15,25,35,0.25)',
              }}>
              {loading ? (<span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />

                </svg>
                Signing in.....
              </span>
              ) : ('Sign In')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-slate-200" />
            <p className="text-xs text-slate-400 font-medium">OR</p>
            <div className="flex-1 h-px bg-slate-200" />

          </div>

          {/* Register */}
          <p className="text-sm text-slate-500 text-center"> Don't have an account? <a href="/register" className="text-amber-600 hover:text-amber-700 font-semibold transition-colors"> Register </a> </p>

          <p className="text-center text-xs text-slate-400 mt-12"> &copy; {new Date().getFullYear()} Jascube Technologies . All rights reserved.</p>
        </div>


      </div>

      {/* Google Fonts */}

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
    </div>
  );
}