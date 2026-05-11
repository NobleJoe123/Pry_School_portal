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
    const location = useLocation();
    const title = PAGE_TITLES[location.pathname] ?? 'Portal';

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#060f1a', fontFamily: "'DM Sans', sans-serif", }}>

            {/* Sidebar */}
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar onMenuClick={() => setCollapsed((c) => !c)} title={title} />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>

            {/* Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

        </div>


    );
}
