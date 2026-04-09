import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


interface NavbarProps {
    onMenuClick: () => void;
    title?: string;
}


export default function Navbar({ onMenuClick, title = 'Dashboard' }: NavbarProps) {
    const { user } = useAuth();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',

    });

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b border-white/5 backdrop-blur-sm"
            style={{ background: 'rgba(10, 22, 40, 0.85)' }}>

            {/* Left */}

            <div className="flex items-center gap-4">
                <button type="button" title="Toggle menu" onClick={onMenuClick} className="text-slate-400 hover:text-white transition-colors lg:hidden">
                    <Menu size={20} />
                </button>
                <div>
                    <h1 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>

                        {title}

                    </h1>
                    <p className="text-slate-500 text-xs hidden sm:block">{dateStr}</p>
                </div>
            </div>

            {/* Right */}

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input type="text" placeholder="Search students, teachers..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-x1 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:bg-white/8 transition-all w-56" />

                </div>

                {/* Notifications */}
                <button type="button" title="Notifications" className="relative p-2 rounded-x1 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Bell size={16} />
                    <span className="absplute top-1.5 rigth-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                </button>
                {/* Profile */}
                {user && (
                    <div className="flex items-center gap-2.5 pl-3 border-1 border-white/10">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to emerald-500 flex items-center justify-center text-white text-xs font-bold">
                            {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-white text-xs font-semibold leading-tight">{user.full_name}</p>
                            <p className="text-slate-500 text-[10px] capitalize">{user.role}</p>
                        </div>
                    </div>
                )}
            </div>


        </header>
    );
}