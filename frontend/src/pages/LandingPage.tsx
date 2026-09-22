import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    GraduationCap, Users, BarChart2, Shield, Bell, Calendar,
    BookOpen, CreditCard, ChevronRight, CheckCircle, Star,
    ArrowRight, Menu, X, TrendingUp, Award, Heart, Zap,
    FileText, CalendarCheck, UserCheck, Globe, Sun, Moon,
    Sparkles, Rocket, Clock, ArrowUpRight
} from 'lucide-react';
import logo from '../assets/anyilogo.png';
import heroStudents from '../assets/landing/hero-students.png';
import parent1 from '../assets/landing/parent-1.jpg';
import parent2 from '../assets/landing/parent-2.jpg';
import parent3 from '../assets/landing/parent-3.jpg';

// ── Animated Counter ────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const duration = 1800;
                const steps = 60;
                const increment = target / steps;
                let current = 0;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        setCount(target);
                        clearInterval(timer);
                    } else {
                        setCount(Math.floor(current));
                    }
                }, duration / steps);
            }
        }, { threshold: 0.5 });

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target]);

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Main Landing Page ───────────────────────────────────────────────
export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    
    // Light & Dark theme state persisted in localStorage
    const [isDark, setIsDark] = useState<boolean>(() => {
        const saved = localStorage.getItem('portal_landing_theme');
        if (saved) return saved === 'dark';
        return true; // Default to dark mode
    });

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            localStorage.setItem('portal_landing_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Portals', href: '#portals' },
        { label: 'Community', href: '#community' },
        { label: 'Contact', href: '#contact' },
    ];

    const features = [
        {
            icon: <CalendarCheck size={22} />, title: 'Smart Attendance',
            desc: 'Daily digital roll call with instant reporting. Teachers log attendance in seconds; parents get live status updates on their mobile portal.',
            color: 'bg-emerald-500/15 text-emerald-400',
            borderHover: 'hover:border-emerald-500/40'
        },
        {
            icon: <BarChart2 size={22} />, title: 'Academic Performance',
            desc: 'Enter continuous assessments, calculate term averages, and verify report cards before publishing them securely to guardians.',
            color: 'bg-amber-500/15 text-amber-400',
            borderHover: 'hover:border-amber-500/40'
        },
        {
            icon: <CreditCard size={22} />, title: 'Finance & Tuition',
            desc: 'Track school fees, generate downloadable digital receipts, manage billing schedules by class, and reconcile outstanding balances.',
            color: 'bg-sky-500/15 text-sky-400',
            borderHover: 'hover:border-sky-500/40'
        },
        {
            icon: <Bell size={22} />, title: 'Instant Broadcasts',
            desc: 'Send timely announcements, PTA updates, and emergency school alerts directly to parents and staff dashboards without SMS friction.',
            color: 'bg-violet-500/15 text-violet-400',
            borderHover: 'hover:border-violet-500/40'
        },
        {
            icon: <Calendar size={22} />, title: 'Academic Calendar',
            desc: 'Visual term-based calendar displaying upcoming exams, mid-term breaks, open days, and extracurricular sporting activities.',
            color: 'bg-rose-500/15 text-rose-400',
            borderHover: 'hover:border-rose-500/40'
        },
        {
            icon: <Shield size={22} />, title: 'Role-Based Security',
            desc: 'Dedicated portal boundaries for Administrators, Teachers, and Parents ensuring sensitive pupil data stays strictly protected.',
            color: 'bg-orange-500/15 text-orange-400',
            borderHover: 'hover:border-orange-500/40'
        },
        {
            icon: <FileText size={22} />, title: 'Verified Report Cards',
            desc: 'Automated digital result sheets with teacher remarks, headteacher stamp of approval, and one-click PDF generation.',
            color: 'bg-teal-500/15 text-teal-400',
            borderHover: 'hover:border-teal-500/40'
        },
        {
            icon: <Users size={22} />, title: 'Pupil & Parent Profiles',
            desc: 'Comprehensive pupil records with passport photographs, emergency contacts, medical records, and enrolment history.',
            color: 'bg-pink-500/15 text-pink-400',
            borderHover: 'hover:border-pink-500/40'
        },
    ];

    const stats = [
        { target: 500, suffix: '+', label: 'Enrolled Pupils', icon: <GraduationCap size={20} />, color: 'text-amber-400' },
        { target: 40, suffix: '+', label: 'Dedicated Teachers', icon: <UserCheck size={20} />, color: 'text-emerald-400' },
        { target: 99, suffix: '%', label: 'Attendance Accuracy', icon: <TrendingUp size={20} />, color: 'text-sky-400' },
        { target: 3, suffix: ' Terms', label: 'Active Per Session', icon: <Calendar size={20} />, color: 'text-violet-400' },
    ];

    const portals = [
        {
            role: 'Administrator',
            icon: <Shield size={28} />,
            colorDark: 'from-amber-500/20 to-amber-600/5 border-amber-500/25',
            colorLight: 'from-amber-50 to-amber-100/40 border-amber-200',
            badgeDark: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            badgeLight: 'bg-amber-100 text-amber-800 border-amber-300',
            features: [
                'School-wide analytics & enrolment management',
                'Teacher assignments & class roster controls',
                'Tuition fees tracking & receipt verification',
                'Academic result moderation and sign-off',
                'Instant school-wide broadcast announcements'
            ],
            cta: 'Admin Portal',
            to: '/admin/login'
        },
        {
            role: 'Teacher',
            icon: <BookOpen size={28} />,
            colorDark: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/25',
            colorLight: 'from-emerald-50 to-emerald-100/40 border-emerald-200',
            badgeDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            badgeLight: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            features: [
                'Speedy daily class attendance recording',
                'Exam & test continuous assessment scoring',
                'Pupil progress and conduct remarks',
                'Submission of grades for admin verification',
                'Direct access to class schedule & syllabus'
            ],
            cta: 'Teacher Portal',
            to: '/login'
        },
        {
            role: 'Parent / Guardian',
            icon: <Heart size={28} />,
            colorDark: 'from-sky-500/20 to-sky-600/5 border-sky-500/25',
            colorLight: 'from-sky-50 to-sky-100/40 border-sky-200',
            badgeDark: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
            badgeLight: 'bg-sky-100 text-sky-800 border-sky-300',
            features: [
                "Real-time alerts on your child's attendance",
                'Instant view of published term report cards',
                'School fees payment history & receipts',
                'Direct messaging and school announcements',
                'Multi-child profile dashboard support'
            ],
            cta: 'Parent Portal',
            to: '/login'
        },
    ];

    const steps = [
        { num: '01', title: 'Submit Online Enrolment', desc: 'Fill out our digital enrolment form with pupil info and parent contacts in under 5 minutes.', icon: <FileText size={20} /> },
        { num: '02', title: 'Admin Verification', desc: 'The school reviews the submitted information, verifies records, and allocates the pupil to an appropriate class.', icon: <CheckCircle size={20} /> },
        { num: '03', title: 'Get Portal Credentials', desc: 'Parents receive their secure login credentials to access the personalized guardian portal.', icon: <Zap size={20} /> },
        { num: '04', title: 'Connect & Stay Informed', desc: 'Follow academic milestones, download report cards, track attendance, and stay up to date throughout each term.', icon: <Bell size={20} /> },
    ];

    const testimonials = [
        {
            quote: "I can check my daughter's daily attendance and terminal results right from my smartphone. No more queuing or waiting for physical cards to get lost in backpacks.",
            name: "Mrs. Olafemi Mirabel",
            role: "Parent of Primary 3 Pupil",
            avatar: parent1,
            stars: 5,
        },
        {
            quote: "Marking daily attendance used to take up precious teaching time. Now I do it digitally in 90 seconds, and the administration receives the report immediately.",
            name: "Mr. Emmanuel Chukwu",
            role: "Class Teacher — Primary 5",
            avatar: parent2,
            stars: 5,
        },
        {
            quote: "The unified management portal gives us 100% transparency. We can track tuition compliance, verified academic score sheets, and parent inquiries without manual hassle.",
            name: "Mrs. Pearson Aminat",
            role: "Head of Administration",
            avatar: parent3,
            stars: 5,
        },
    ];

    return (
        <div className={`min-h-screen transition-colors duration-500 font-sans-clean ${isDark ? 'bg-[#040d18] text-slate-100' : 'bg-[#faf8f5] text-slate-800'}`}>
            {/* ── Fixed Navbar ── */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled
                    ? isDark
                        ? 'bg-[#040d18]/90 backdrop-blur-xl border-b border-white/10 shadow-2xl'
                        : 'bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-md'
                    : isDark
                        ? 'bg-transparent border-b border-white/5'
                        : 'bg-transparent border-b border-slate-200/40'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
                    {/* Brand */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <img src={logo} alt="Logo" className="w-10 h-10 object-contain transition-transform group-hover:scale-110 shrink-0 drop-shadow" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                        </div>
                        <div>
                            <p className="font-display font-bold text-base leading-tight tracking-tight flex items-center gap-1.5">
                                <span>Anyi Primary</span>
                                <span className="text-xs px-2 py-0.5 rounded-full font-sans-clean font-semibold bg-amber-500/20 text-amber-500 border border-amber-500/30">Portal</span>
                            </p>
                            <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Smart School Portal · Excellence in Early Learning</p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-7">
                        {navLinks.map(link => (
                            <a
                                key={link.label}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-amber-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* Right Action Controls: Theme Switcher & Login */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Light / Dark Mode Toggle */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            className={`p-2.5 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 ${
                                isDark
                                    ? 'bg-slate-900/90 border-white/15 text-amber-400 hover:bg-slate-800 hover:border-amber-400/50 shadow-inner'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 shadow-sm'
                            }`}
                        >
                            {isDark ? (
                                <Sun size={18} className="transition-transform duration-500 rotate-0 hover:rotate-90" />
                            ) : (
                                <Moon size={18} className="transition-transform duration-500 rotate-0 hover:-rotate-12" />
                            )}
                        </button>

                        <Link
                            to="/login"
                            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                                isDark
                                    ? 'text-slate-200 border-white/15 hover:bg-white/10 hover:border-white/30'
                                    : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                            }`}
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/enrol"
                            className="px-5 py-2 text-sm font-bold bg-gradient-cta text-slate-950 rounded-xl shadow-glow hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            <span>Enrol Now</span>
                            <Sparkles size={14} />
                        </Link>
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className={`p-2 rounded-full border transition-all ${
                                isDark
                                    ? 'bg-slate-900 border-white/10 text-amber-400'
                                    : 'bg-white border-slate-200 text-slate-700'
                            }`}
                        >
                            {isDark ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-black'}`}
                        >
                            {menuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer Menu */}
                {menuOpen && (
                    <div className={`md:hidden px-4 py-6 border-t backdrop-blur-2xl space-y-4 animate-in fade-in duration-300 ${
                        isDark ? 'bg-[#040d18]/95 border-white/10' : 'bg-white/95 border-slate-200'
                    }`}>
                        {navLinks.map(link => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`block text-sm font-medium py-2 transition-colors ${
                                    isDark ? 'text-slate-300 hover:text-amber-400' : 'text-slate-700 hover:text-amber-600'
                                }`}
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="pt-4 border-t border-slate-700/20 flex flex-col gap-3">
                            <Link
                                to="/login"
                                onClick={() => setMenuOpen(false)}
                                className={`py-3 text-center text-sm font-semibold rounded-xl border ${
                                    isDark ? 'text-slate-200 border-white/15' : 'text-slate-800 border-slate-300'
                                }`}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/enrol"
                                onClick={() => setMenuOpen(false)}
                                className="py-3 text-center text-sm font-bold bg-gradient-cta text-slate-950 rounded-xl shadow-glow"
                            >
                                Enrol Now
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* ── Hero Section (Northfield 2-Column with 3D Students & Avatars) ── */}
            <section className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 overflow-hidden">
                {/* Ambient Glowing Orbs Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-12 left-10 w-96 h-96 rounded-full blur-3xl animate-glow-pulse ${
                        isDark ? 'bg-amber-500/10' : 'bg-amber-400/20'
                    }`} />
                    <div className={`absolute top-1/3 right-12 w-96 h-96 rounded-full blur-3xl animate-float-slow ${
                        isDark ? 'bg-violet-600/15' : 'bg-purple-300/25'
                    }`} />
                    <div className={`absolute -bottom-10 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl animate-glow-pulse ${
                        isDark ? 'bg-sky-500/10' : 'bg-sky-200/30'
                    }`} style={{ animationDelay: '1.5s' }} />

                    {/* Subtle grid pattern */}
                    <div
                        className="absolute inset-0 opacity-40"
                        style={{
                            backgroundImage: isDark
                                ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
                                : 'radial-gradient(circle, rgba(15,23,42,0.06) 1px, transparent 1px)',
                            backgroundSize: '36px 36px',
                        }}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                        {/* Left Column: Headlines & Actions */}
                        <div className="lg:col-span-7 text-center lg:text-left">
                            {/* Admission Pill */}
                            <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur shadow-sm border transition-all ${
                                isDark
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-amber-100/80 border-amber-300 text-amber-900'
                            }`}>
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                <span>Admissions Open · Nursery & Primary Grades K–6</span>
                            </div>

                            {/* Headline */}
                            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6">
                                Where curious kids{' '}
                                <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400">
                                    grow into their own.
                                </span>
                            </h1>

                            <p className={`text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8 ${
                                isDark ? 'text-slate-300' : 'text-slate-600'
                            }`}>
                                Anyi Primary School's unified smart portal connects Administrators, Teachers, and Parents in one seamless digital space for attendance, academics, and communication.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-9">
                                <Link
                                    to="/enrol"
                                    className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-cta text-slate-950 font-black text-sm shadow-glow transition-all hover:scale-105 active:scale-95"
                                >
                                    <span>Start Enrolment</span>
                                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    to="/login"
                                    className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border text-sm font-semibold backdrop-blur transition-all ${
                                        isDark
                                            ? 'bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/30'
                                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
                                    }`}
                                >
                                    <span>Sign In to Portal</span>
                                    <ChevronRight size={17} />
                                </Link>
                            </div>

                            {/* Social Proof: Stacked Parent Avatars */}
                            <div className="flex items-center justify-center lg:justify-start gap-3.5 text-xs sm:text-sm">
                                <div className="flex -space-x-2.5">
                                    <img
                                        src={parent1}
                                        alt="Parent Mirabel"
                                        className="h-10 w-10 rounded-full border-2 border-background object-cover transition-transform hover:scale-125 hover:z-20 cursor-pointer shadow-md"
                                    />
                                    <img
                                        src={parent2}
                                        alt="Parent Emmanuel"
                                        className="h-10 w-10 rounded-full border-2 border-background object-cover transition-transform hover:scale-125 hover:z-20 cursor-pointer shadow-md"
                                    />
                                    <img
                                        src={parent3}
                                        alt="Parent Aminat"
                                        className="h-10 w-10 rounded-full border-2 border-background object-cover transition-transform hover:scale-125 hover:z-20 cursor-pointer shadow-md"
                                    />
                                </div>
                                <div className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                                    Trusted by <strong className={isDark ? 'text-white' : 'text-slate-900'}>340+ families</strong> across the school community.
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Floating 3D Students Graphic with Floating Status Glass Badge */}
                        <div className="lg:col-span-5 relative flex justify-center">
                            {/* Ambient Glow Backing */}
                            <div className="absolute inset-4 rounded-full bg-gradient-cta opacity-25 blur-3xl animate-glow-pulse" />

                            {/* Hero Illustration Container */}
                            <div className="relative z-10 w-full max-w-[480px]">
                                <div className="animate-float">
                                    <img
                                        src={heroStudents}
                                        alt="Northfield Primary cheerful students with backpack and floating book"
                                        className="w-full h-auto object-contain drop-shadow-[0_25px_35px_rgba(15,10,60,0.3)] transition-transform duration-700 hover:scale-[1.02]"
                                    />
                                </div>

                                {/* Floating Live Session Badge Card */}
                                <div className={`absolute -bottom-3 left-2 right-2 sm:left-4 sm:right-4 flex items-center justify-between rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all shadow-xl ${
                                    isDark
                                        ? 'bg-slate-950/85 border-white/15 text-white'
                                        : 'bg-white/95 border-slate-200/90 text-slate-900'
                                }`}>
                                    <div>
                                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-amber-500">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                            <span>Active Term Highlight</span>
                                        </div>
                                        <div className="mt-0.5 font-display text-sm font-semibold">
                                            Science & Discovery Unit — 2026/2027
                                        </div>
                                    </div>
                                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-cta text-slate-950 shadow-md">
                                        <Rocket size={17} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Key Statistics Bar ── */}
            <section className={`border-y transition-colors py-10 ${
                isDark ? 'bg-slate-950/60 border-white/10' : 'bg-slate-100/70 border-slate-200'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map(({ target, suffix, label, icon, color }) => (
                            <div
                                key={label}
                                className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 ${
                                    isDark
                                        ? 'bg-[#0a1628]/80 border-white/5 hover:border-white/15'
                                        : 'bg-white border-slate-200/90 shadow-card-light'
                                }`}
                            >
                                <div className={`flex items-center gap-2 mb-2 ${color}`}>
                                    {icon}
                                    <span className="text-xs uppercase tracking-wider font-semibold opacity-80">{label}</span>
                                </div>
                                <div className="font-display text-3xl sm:text-4xl font-black">
                                    <AnimatedCounter target={target} suffix={suffix} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features Section ── */}
            <section id="features" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2 block">
                            Integrated Platform Features
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
                            Everything a modern school needs.
                        </h2>
                        <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            From daily digital attendance and grading to tuition billing and parent communication — experience seamless management.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map(f => (
                            <div
                                key={f.title}
                                className={`group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 ${
                                    isDark
                                        ? 'bg-[#0d1b2a]/70 border-white/5 shadow-card hover:shadow-glow'
                                        : 'bg-white border-slate-200 shadow-card-light hover:shadow-glow'
                                } ${f.borderHover}`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
                                    {f.icon}
                                </div>
                                <h3 className="font-display font-bold text-lg mb-2 group-hover:text-amber-500 transition-colors">
                                    {f.title}
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {f.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works Section ── */}
            <section id="how-it-works" className={`py-24 border-t transition-colors ${
                isDark ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-2 block">
                            Simple Process
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl font-black mb-3">
                            Enrol in 4 simple steps
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            We make joining our community transparent and straightforward for new families.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                        {steps.map((step) => (
                            <div
                                key={step.num}
                                className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 relative ${
                                    isDark
                                        ? 'bg-[#0d1b2a]/80 border-white/5 shadow-card hover:border-amber-500/30'
                                        : 'bg-white border-slate-200 shadow-card-light hover:border-amber-400'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                                        {step.icon}
                                    </div>
                                    <span className="font-display font-black text-2xl opacity-40">
                                        {step.num}
                                    </span>
                                </div>
                                <h3 className="font-display font-bold text-base mb-2">
                                    {step.title}
                                </h3>
                                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link
                            to="/enrol"
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-cta text-slate-950 font-black rounded-2xl shadow-glow hover:scale-105 transition-all text-sm"
                        >
                            <span>Begin Enrolment Application</span>
                            <ArrowRight size={17} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Role-Based Portals ── */}
            <section id="portals" className="py-24 border-t border-slate-700/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-2 block">
                            Tailored Experiences
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl font-black mb-3">
                            A portal for every stakeholder
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Clear views, strict permissions, and dedicated tools built for your role.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {portals.map((p) => (
                            <div
                                key={p.role}
                                className={`p-8 rounded-3xl border bg-gradient-to-br transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between ${
                                    isDark ? p.colorDark : p.colorLight
                                } ${isDark ? 'shadow-card hover:shadow-glow' : 'shadow-card-light hover:shadow-glow'}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
                                            isDark ? p.badgeDark : p.badgeLight
                                        }`}>
                                            {p.icon}
                                            <span>{p.role}</span>
                                        </span>
                                        <ArrowUpRight size={18} className="opacity-40" />
                                    </div>

                                    <h3 className="font-display text-xl font-bold mb-4">
                                        {p.role} Access
                                    </h3>

                                    <ul className="space-y-3 mb-8">
                                        {p.features.map(feat => (
                                            <li key={feat} className={`flex items-start gap-2.5 text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Link
                                    to={p.to}
                                    className={`w-full py-3 text-center text-xs font-bold rounded-xl border transition-all ${
                                        isDark
                                            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm'
                                    }`}
                                >
                                    Access {p.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Community Testimonials with Parent Avatars ── */}
            <section id="community" className={`py-24 border-t transition-colors ${
                isDark ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-xl mx-auto mb-16">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2 block">
                            Community Voices
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl font-black mb-3">
                            Trusted by teachers & parents
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Real experiences from those using the portal every school day.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {testimonials.map((t) => (
                            <div
                                key={t.name}
                                className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between ${
                                    isDark
                                        ? 'bg-[#0d1b2a]/80 border-white/10 shadow-card hover:border-amber-500/40'
                                        : 'bg-white border-slate-200 shadow-card-light hover:border-amber-400'
                                }`}
                            >
                                <div>
                                    <div className="flex gap-1 mb-4">
                                        {Array.from({ length: t.stars }).map((_, i) => (
                                            <Star key={i} size={15} className="text-amber-400 fill-amber-400" />
                                        ))}
                                    </div>
                                    <p className={`text-sm italic leading-relaxed mb-6 ${
                                        isDark ? 'text-slate-300' : 'text-slate-700'
                                    }`}>
                                        "{t.quote}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-3.5 pt-4 border-t border-slate-700/20">
                                    <img
                                        src={t.avatar}
                                        alt={t.name}
                                        className="w-11 h-11 rounded-full object-cover border-2 border-amber-500/40 shadow"
                                    />
                                    <div>
                                        <h4 className="font-bold text-sm leading-tight">
                                            {t.name}
                                        </h4>
                                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {t.role}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Call To Action Banner ── */}
            <section className="py-24 border-t border-slate-700/20 relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className={`p-10 sm:p-14 rounded-3xl border relative overflow-hidden shadow-glow ${
                        isDark
                            ? 'bg-gradient-to-br from-amber-500/10 via-[#0a1628] to-slate-900 border-amber-500/30'
                            : 'bg-gradient-to-br from-amber-100/70 via-white to-amber-50/50 border-amber-200'
                    }`}>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-cta p-2.5 mx-auto mb-6 shadow-glow flex items-center justify-center">
                            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>

                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
                            Ready for a smarter school experience?
                        </h2>

                        <p className={`text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                            Enrol your child or sign in to your dashboard to stay connected with classes, grades, and school announcements.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/enrol"
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-cta text-slate-950 font-black rounded-2xl shadow-glow hover:scale-105 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <span>Apply for Enrolment</span>
                                <ArrowRight size={17} />
                            </Link>
                            <Link
                                to="/login"
                                className={`w-full sm:w-auto px-8 py-4 rounded-2xl border font-bold text-sm transition-all ${
                                    isDark
                                        ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                Sign In to Portal
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer id="contact" className={`py-14 border-t transition-colors ${
                isDark ? 'bg-[#030912] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        {/* Brand Info */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <img src={logo} alt="Logo" className="w-9 h-9 object-contain shrink-0" />
                                <div>
                                    <p className="font-display font-bold text-base leading-tight">Anyi Primary School</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Smart Digital School Portal</p>
                                </div>
                            </div>
                            <p className={`text-xs sm:text-sm leading-relaxed max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Empowering young learners with high academic standards, creative curiosity, and seamless communication between home and classroom.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="font-display font-bold text-sm mb-4 text-amber-500">Quick Links</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <Link to="/enrol" className={`transition-colors hover:text-amber-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Apply for Enrolment
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/login" className={`transition-colors hover:text-amber-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Parent & Teacher Sign In
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/login" className={`transition-colors hover:text-amber-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Administrator Portal
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Contact Details */}
                        <div>
                            <h4 className="font-display font-bold text-sm mb-4 text-amber-500">Contact School</h4>
                            <ul className="space-y-2.5 text-xs">
                                <li className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Globe size={13} className="text-amber-500 shrink-0" />
                                    <span>Anyi, Lagos State, Nigeria</span>
                                </li>
                                <li className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Bell size={13} className="text-amber-500 shrink-0" />
                                    <span>admin@anyiprimaryschool.edu.ng</span>
                                </li>
                                <li className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Users size={13} className="text-amber-500 shrink-0" />
                                    <span>+234 800 000 0000</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Attribution */}
                    <div className={`border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
                        isDark ? 'border-white/10 text-slate-500' : 'border-slate-300/60 text-slate-500'
                    }`}>
                        <p>© {new Date().getFullYear()} Anyi Primary School. All rights reserved.</p>
                        <div className="flex items-center gap-1.5">
                            <span>Crafted with</span>
                            <Heart size={12} className="text-rose-500 fill-rose-500" />
                            <span>for modern education</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
