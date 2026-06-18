import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    GraduationCap, Users, BarChart2, Shield, Bell, Calendar,
    BookOpen, CreditCard, ChevronRight, CheckCircle, Star,
    ArrowRight, Menu, X, TrendingUp, Award, Heart, Zap,
    FileText, CalendarCheck, UserCheck, Globe
} from 'lucide-react';

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

// ── Feature Card ────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, delay = 0 }: {
    icon: React.ReactNode; title: string; desc: string; color: string; delay?: number;
}) {
    return (
        <div
            className="group p-6 rounded-2xl border border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)', animationDelay: `${delay}ms` }}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color} transition-transform duration-300 group-hover:scale-110`}>
                {icon}
            </div>
            <h3 className="text-white font-bold text-base mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

// ── Main Landing Page ───────────────────────────────────────────────
export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Portals', href: '#portals' },
        { label: 'Contact', href: '#contact' },
    ];

    const features = [
        {
            icon: <CalendarCheck size={22} />, title: 'Smart Attendance',
            desc: 'Teachers mark daily attendance digitally. Admins get real-time class-by-class submission status. Parents receive instant alerts.',
            color: 'bg-emerald-500/15 text-emerald-400', delay: 0
        },
        {
            icon: <BarChart2 size={22} />, title: 'Academic Performance',
            desc: 'Enter scores, generate report cards, and publish results directly to parent dashboards with admin verification.',
            color: 'bg-amber-500/15 text-amber-400', delay: 100
        },
        {
            icon: <CreditCard size={22} />, title: 'Finance Management',
            desc: 'Track school fees, manage billing by class, record payments, and generate financial reports with a click.',
            color: 'bg-sky-500/15 text-sky-400', delay: 200
        },
        {
            icon: <Bell size={22} />, title: 'Instant Notifications',
            desc: 'Broadcast important messages to parents, teachers, or the whole school. Never miss a critical update.',
            color: 'bg-violet-500/15 text-violet-400', delay: 300
        },
        {
            icon: <Calendar size={22} />, title: 'School Calendar',
            desc: 'Manage academic events, exam schedules, and holidays in a visual term-based calendar accessible to all stakeholders.',
            color: 'bg-rose-500/15 text-rose-400', delay: 400
        },
        {
            icon: <Shield size={22} />, title: 'Role-Based Security',
            desc: 'Separate, secure portals for Admins, Teachers, Parents and Students — each sees only what they need.',
            color: 'bg-orange-500/15 text-orange-400', delay: 500
        },
        {
            icon: <FileText size={22} />, title: 'Report Verification',
            desc: 'Admins verify teacher-submitted results, add comments, and publish finalized report cards to parents.',
            color: 'bg-teal-500/15 text-teal-400', delay: 600
        },
        {
            icon: <Users size={22} />, title: 'Parent & Pupil Profiles',
            desc: 'Passport photos, contact info, medical records and admission details — all organized in one secure place.',
            color: 'bg-pink-500/15 text-pink-400', delay: 700
        },
    ];

    const stats = [
        { target: 500, suffix: '+', label: 'Enrolled Pupils', icon: <GraduationCap size={20} />, color: 'text-amber-400' },
        { target: 40, suffix: '+', label: 'Teaching Staff', icon: <UserCheck size={20} />, color: 'text-emerald-400' },
        { target: 99, suffix: '%', label: 'System Uptime', icon: <TrendingUp size={20} />, color: 'text-sky-400' },
        { target: 3, suffix: ' Terms', label: 'Active Per Year', icon: <Calendar size={20} />, color: 'text-violet-400' },
    ];

    const portals = [
        {
            role: 'Administrator',
            icon: <Shield size={28} />,
            color: 'from-amber-500/20 to-amber-600/10 border-amber-500/25',
            badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            features: ['School-wide dashboard & analytics', 'Pupil, teacher & parent management', 'Attendance supervision & reports', 'Finance & billing management', 'Academic results verification', 'Notifications & announcements'],
        },
        {
            role: 'Teacher',
            icon: <BookOpen size={28} />,
            color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/25',
            badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            features: ['Class-specific attendance marking', 'Score & assessment entry', 'View assigned class roster', 'Results submission to admin', 'School calendar & events', 'Notifications inbox'],
        },
        {
            role: 'Parent / Guardian',
            icon: <Heart size={28} />,
            color: 'from-sky-500/20 to-sky-600/10 border-sky-500/25',
            badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
            features: ["Children's attendance history", 'Published academic results', 'Report card access', 'Fee payment status', 'School announcements', 'Child profile management'],
        },
    ];

    const steps = [
        { num: '01', title: 'Apply for Enrolment', desc: 'Parents submit an enrolment request online. Fill in your details and your child\'s information — takes less than 5 minutes.', icon: <FileText size={20} /> },
        { num: '02', title: 'Admin Approval', desc: 'The school administrator reviews and approves the application, assigns the child to a class, and generates login credentials.', icon: <CheckCircle size={20} /> },
        { num: '03', title: 'Access Your Portal', desc: 'Log in with your credentials. Parents, teachers, and students each get their own tailored dashboard with relevant information.', icon: <Zap size={20} /> },
        { num: '04', title: 'Stay Connected', desc: 'Receive real-time notifications, view reports, track attendance, and communicate with the school — all from one place.', icon: <Bell size={20} /> },
    ];

    return (
        <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #040d18 0%, #050f1c 100%)' }}>
            {/* ── Navbar ── */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' : ''}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform group-hover:scale-105">
                            <GraduationCap size={18} className="text-slate-950" />
                        </div>
                        <div>
                            <p className="text-white font-black text-sm leading-tight">Anyi Primary School</p>
                            <p className="text-slate-500 text-[10px] leading-tight">Smart School Portal</p>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href}
                                className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login"
                            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-all">
                            Sign In
                        </Link>
                        <Link to="/enrol"
                            className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all">
                            Enrol Now
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile Menu Drawer */}
                {menuOpen && (
                    <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-4 py-6 space-y-4">
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                                className="block text-slate-300 hover:text-white text-sm font-medium py-2">
                                {link.label}
                            </a>
                        ))}
                        <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                            <Link to="/login" onClick={() => setMenuOpen(false)}
                                className="py-3 text-center text-sm font-semibold text-slate-300 border border-white/10 rounded-xl">
                                Sign In
                            </Link>
                            <Link to="/enrol" onClick={() => setMenuOpen(false)}
                                className="py-3 text-center text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl">
                                Enrol Now
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* ── Hero Section ── */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden">
                {/* Animated background orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/3 rounded-full blur-3xl" />
                    {/* Grid dots */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-8 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Now Accepting New Enrolments — 2026/2027 Academic Session
                    </div>

                    {/* Heading */}
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight mb-6 tracking-tight"
                        style={{ fontFamily: "'DM Serif Display', serif" }}>
                        One Portal.
                        <br />
                        <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
                            Every Stakeholder.
                        </span>
                        <br />
                        Total Visibility.
                    </h1>

                    <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
                        Anyi Primary School's all-in-one management portal — connecting Administrators, Teachers, Parents, and Pupils through a seamless digital experience.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Link to="/enrol"
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-2xl text-base shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all">
                            Start Enrolment
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/login"
                            className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-base hover:bg-white/10 hover:border-white/20 transition-all">
                            Sign In to Portal
                            <ChevronRight size={18} />
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                        {stats.map(({ target, suffix, label, icon, color }) => (
                            <div key={label} className="p-4 rounded-2xl border border-white/5 text-center"
                                style={{ background: 'linear-gradient(135deg, rgba(13,27,42,0.8), rgba(10,22,40,0.8))' }}>
                                <div className={`flex items-center justify-center mb-1 ${color}`}>
                                    {icon}
                                </div>
                                <p className={`text-2xl font-black ${color}`}>
                                    <AnimatedCounter target={target} suffix={suffix} />
                                </p>
                                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features Section ── */}
            <section id="features" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 block">Platform Features</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Everything a Modern School Needs
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
                            From attendance to academics, finance to communication — our portal covers every aspect of school management in one unified platform.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {features.map(f => (
                            <FeatureCard key={f.title} {...f} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section id="how-it-works" className="py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3 block">Simple Process</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Get Started in 4 Steps
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto text-sm">
                            Joining the Anyi Primary School portal is straightforward. Here's how it works for new families.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                        {/* Connector Line (desktop) */}
                        <div className="hidden lg:block absolute top-10 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-violet-500/20" />

                        {steps.map((step, i) => (
                            <div key={step.num} className="relative group">
                                <div className="p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${i === 0 ? 'bg-amber-500/15 text-amber-400' :
                                            i === 1 ? 'bg-emerald-500/15 text-emerald-400' :
                                                i === 2 ? 'bg-sky-500/15 text-sky-400' :
                                                    'bg-violet-500/15 text-violet-400'
                                            }`}>
                                            {step.icon}
                                        </div>
                                        <span className="text-slate-700 font-black text-2xl">{step.num}</span>
                                    </div>
                                    <h3 className="text-white font-bold text-sm mb-2">{step.title}</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link to="/enrol"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/25 hover:scale-105 transition-all">
                            Begin Your Enrolment
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Portal Cards ── */}
            <section id="portals" className="py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3 block">Role-Based Access</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            A Portal for Every Role
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto text-sm">
                            Each stakeholder gets a dedicated, secure dashboard tailored to their specific needs and responsibilities.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {portals.map((portal) => (
                            <div key={portal.role}
                                className={`p-6 rounded-2xl border bg-gradient-to-br ${portal.color} backdrop-blur-sm hover:-translate-y-1 transition-all duration-300`}>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-5 ${portal.badge}`}>
                                    {portal.icon}
                                    {portal.role}
                                </div>
                                <ul className="space-y-2.5">
                                    {portal.features.map(f => (
                                        <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                                            <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials / Social Proof ── */}
            <section className="py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 block">Community Voices</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Trusted by Our School Community
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                quote: "I can check my daughter's attendance and results right from my phone. I no longer have to call the school every week to get updates.",
                                name: "Mrs. Olafemi Mirabel", role: "Parent of Primary 3 Pupil",
                                stars: 5, color: 'border-amber-500/20'
                            },
                            {
                                quote: "Marking attendance used to take 20 minutes of my teaching time. Now I do it digitally in under 2 minutes and the admin gets it instantly.",
                                name: "Mr. Emmanuel Chukwu", role: "Class Teacher — Primary 5",
                                stars: 5, color: 'border-emerald-500/20'
                            },
                            {
                                quote: "The school-wide dashboard shows me everything — which classes submitted attendance, who's absent, and the day's finances — all on one screen.",
                                name: "Mrs. Pearson Aminat", role: "School Administrator",
                                stars: 5, color: 'border-sky-500/20'
                            },
                        ].map(({ quote, name, role, stars, color }) => (
                            <div key={name} className={`p-6 rounded-2xl border ${color} hover:border-opacity-50 transition-all`}
                                style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>
                                <div className="flex gap-1 mb-4">
                                    {Array.from({ length: stars }).map((_, i) => (
                                        <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed mb-5 italic">"{quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-bold">{name}</p>
                                        <p className="text-slate-500 text-[10px]">{role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="py-24 border-t border-white/5">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="p-12 rounded-3xl border border-amber-500/20 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(10,22,40,0.9) 100%)' }}>
                        {/* Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                        <div className="absolute inset-0 pointer-events-none" style={{
                            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%)'
                        }} />

                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/40">
                                <GraduationCap size={28} className="text-slate-950" />
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                                Join Anyi Primary School Today
                            </h2>
                            <p className="text-slate-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
                                Give your child the best start. Apply for enrolment and experience a school that communicates, tracks, and cares — digitally.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link to="/enrol"
                                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-105 transition-all text-base">
                                    Apply for Enrolment
                                    <ArrowRight size={18} />
                                </Link>
                                <Link to="/login"
                                    className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/15 text-white font-bold rounded-2xl hover:bg-white/10 transition-all text-base">
                                    Sign In to Portal
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contact / Footer ── */}
            <footer id="contact" className="border-t border-white/5 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                                    <GraduationCap size={18} className="text-slate-950" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm">Anyi Primary School</p>
                                    <p className="text-slate-500 text-[10px]">Smart School Management Portal</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                Empowering every learner through technology, transparency, and trust.
                                Building the next generation — one click at a time.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-white font-bold text-sm mb-4">Quick Links</h4>
                            <ul className="space-y-2.5">
                                {[
                                    { label: 'Apply for Enrolment', to: '/enrol' },
                                    { label: 'Parent Login', to: '/login' },
                                    { label: 'Teacher Login', to: '/login' },
                                    { label: 'Admin Login', to: '/admin/login' },
                                ].map(l => (
                                    <li key={l.label}>
                                        <Link to={l.to} className="text-slate-400 hover:text-amber-400 text-xs transition-colors">
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-white font-bold text-sm mb-4">Contact</h4>
                            <ul className="space-y-2.5 text-slate-400 text-xs">
                                <li className="flex items-center gap-2">
                                    <Globe size={12} className="text-amber-400 shrink-0" />
                                    Anyi, Lagos State, Nigeria
                                </li>
                                <li className="flex items-center gap-2">
                                    <Bell size={12} className="text-amber-400 shrink-0" />
                                    admin@anyiprimaryschool.edu.ng
                                </li>
                                <li className="flex items-center gap-2">
                                    <Users size={12} className="text-amber-400 shrink-0" />
                                    +234 800 000 0000
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                        <p>© {new Date().getFullYear()} Anyi Primary School. All rights reserved.</p>
                        <div className="flex items-center gap-1">
                            <span>Built with</span>
                            <Heart size={10} className="text-rose-500 fill-rose-500 mx-1" />
                            <span>for a smarter school experience</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
