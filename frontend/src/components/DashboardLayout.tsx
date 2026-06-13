import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// Map route for paging titles

const PAGE_TITLES: Record<string, string> = {
    '/dashboard': 'Overview',
    '/students': 'Students',
    '/teachers': 'Teachers',
    '/parents': 'Parents',
    '/academics': 'Academics',
    '/finance': 'Finance',
    '/attendance': 'Attendance',
    '/settings': 'Settings',
    '/notifications': 'Notifications',
    '/teacher': 'Teacher Dashboard',
    '/teacher/class': 'My Class',
    '/teacher/attendance': 'Class Attendance',
    '/teacher/scores': 'Enter Scores',
    '/parent': 'Parent Portal',
    '/parent/children': 'My Children',
    '/parent/fees': 'Fee Payments',
};

export default function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const title = PAGE_TITLES[location.pathname] ?? 'Portal';

    const handleMenuClick = () => {
        if (window.innerWidth >= 1024) {
            setCollapsed(false);
        } else {
            setMobileOpen(true);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#060f1a', fontFamily: "'DM Sans', sans-serif", }}>

            {/* Sidebar backdrop for mobile */}
            <div 
                className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar container with responsive positioning */}
            <div 
                className={`fixed lg:relative inset-y-0 left-0 z-50 transform lg:transform-none transition-all duration-300 shrink-0 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } ${
                    collapsed ? 'lg:w-0 lg:overflow-hidden lg:-translate-x-full' : 'lg:w-[240px]'
                }`}
            >
                <Sidebar 
                    collapsed={collapsed} 
                    onToggle={() => setCollapsed((c) => !c)} 
                    onLinkClick={() => setMobileOpen(false)} 
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar onMenuClick={handleMenuClick} title={title} showMenuIcon={collapsed} />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>

            {/* Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

        </div>
    );
}

