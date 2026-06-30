import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Calendar as CalendarIcon, Clock, Plus, X, 
    Check, AlertCircle, RefreshCw, BookOpen, 
    PartyPopper, Users, Trophy, GraduationCap,
    ChevronLeft, ChevronRight, MapPin, User,
    Filter, Info, Trash2, Edit3, Eye, ShieldAlert,
    CalendarDays
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { Term } from '../../types';
import FilterDropdown from '../../components/ui/FilterDropdown';

interface CalendarEvent {
    id: string;
    title: string;
    description: string | null;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    organizer?: string | null;
    category: 'academic' | 'holiday' | 'exam' | 'meeting' | 'sports';
    audience: 'all' | 'teachers' | 'parents';
    priority: 'low' | 'medium' | 'high';
    is_published: boolean;
    is_important: boolean;
    term: string;
    term_name?: string;
    academic_year_name?: string;
}

const CATEGORY_STYLES = {
    academic: { 
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', 
        badge: 'bg-purple-500 text-slate-950', 
        dot: 'bg-purple-500',
        hoverBg: 'hover:bg-purple-500/15',
        border: 'border-purple-500/30',
        label: 'Academic Deadline',
        icon: BookOpen 
    },
    holiday: { 
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', 
        badge: 'bg-emerald-500 text-slate-950', 
        dot: 'bg-emerald-500',
        hoverBg: 'hover:bg-emerald-500/15',
        border: 'border-emerald-500/30',
        label: 'Public Holiday',
        icon: PartyPopper 
    },
    exam: { 
        bg: 'bg-red-500/10 border-red-500/20 text-red-400', 
        badge: 'bg-red-500 text-slate-950', 
        dot: 'bg-red-500',
        hoverBg: 'hover:bg-red-500/15',
        border: 'border-red-500/30',
        label: 'Examination',
        icon: GraduationCap 
    },
    meeting: { 
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', 
        badge: 'bg-blue-500 text-slate-950', 
        dot: 'bg-blue-500',
        hoverBg: 'hover:bg-blue-500/15',
        border: 'border-blue-500/30',
        label: 'PTA/Meeting',
        icon: Users 
    },
    sports: { 
        bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400', 
        badge: 'bg-orange-500 text-slate-950', 
        dot: 'bg-orange-500',
        hoverBg: 'hover:bg-orange-500/15',
        border: 'border-orange-500/30',
        label: 'Sports / Activities',
        icon: Trophy 
    },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    try {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    } catch {
        return timeStr;
    }
}

function getCountdownText(dateStr: string): { text: string; urgent: boolean; past: boolean } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: 'Today', urgent: true, past: false };
    if (diffDays === 1) return { text: 'Tomorrow', urgent: true, past: false };
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} Day(s) Ago`, urgent: false, past: true };
    return { text: `${diffDays} Day(s) Remaining`, urgent: diffDays <= 5, past: false };
}

export default function CalendarPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isParent = user?.role === 'parent';
    const colorTheme = isAdmin ? 'amber' : (user?.role === 'teacher' ? 'emerald' : 'sky');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [terms, setTerms] = useState<Term[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    
    // Filters & Selected State
    const [selectedYearName, setSelectedYearName] = useState<string>('');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
    const [currentView, setCurrentView] = useState<'month' | 'week' | 'agenda'>('month');
    
    // Active date selection for week view
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day; // start of week
        return new Date(d.setDate(diff));
    });

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    
    // Popovers / Modals State
    const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editEventId, setEditEventId] = useState<string | null>(null);
    
    // Create/Edit Event Form
    const [form, setForm] = useState({
        title: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        organizer: '',
        category: 'academic' as CalendarEvent['category'],
        audience: 'all' as CalendarEvent['audience'],
        priority: 'low' as CalendarEvent['priority'],
        is_published: true,
        is_important: false,
        term: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const getList = (val: any) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (val.results && Array.isArray(val.results)) return val.results;
        return [];
    };

    // Load initial metadata (Terms & Academic Years)
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get<any>(endpoints.academics.terms),
            api.get<any>(endpoints.academics.years)
        ]).then(([termsRes, yearsRes]) => {
            const termList = getList(termsRes) as Term[];
            const yearList = getList(yearsRes);
            
            setTerms(termList);
            setAcademicYears(yearList);
            
            const currentYearObj = yearList.find((y: any) => y.is_current) || yearList[0];
            if (currentYearObj) {
                setSelectedYearName(currentYearObj.name);
            }
            
            const currentTermObj = termList.find((t: Term) => t.is_current) || termList[0];
            if (currentTermObj) {
                setSelectedTermId(currentTermObj.id);
            }
        }).catch(err => {
            console.error("Failed to load metadata", err);
        }).finally(() => setLoading(false));
    }, []);

    // Load events from backend
    const loadEvents = async (silent = false) => {
        if (!selectedTermId) return;
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            // Admin fetches all, teacher/parent fetches only published events (handled by ViewSet role check)
            const res = await api.get<any>(`${endpoints.academics.events}?term=${selectedTermId}`);
            setEvents(getList(res));
        } catch (err) {
            console.error("Failed to load events", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [selectedTermId]);

    // Format Form date fields
    const openAddModal = (dateStr?: string) => {
        setError('');
        setSuccess('');
        setIsEditing(false);
        setEditEventId(null);
        setForm({
            title: '',
            description: '',
            date: dateStr || new Date().toISOString().split('T')[0],
            start_time: '',
            end_time: '',
            location: '',
            organizer: '',
            category: 'academic',
            audience: 'all',
            priority: 'low',
            is_published: true,
            is_important: false,
            term: selectedTermId
        });
        setShowEventModal(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        setError('');
        setSuccess('');
        setIsEditing(true);
        setEditEventId(event.id);
        setForm({
            title: event.title,
            description: event.description || '',
            date: event.date,
            start_time: event.start_time ? event.start_time.slice(0, 5) : '',
            end_time: event.end_time ? event.end_time.slice(0, 5) : '',
            location: event.location || '',
            organizer: event.organizer || '',
            category: event.category,
            audience: event.audience,
            priority: event.priority,
            is_published: event.is_published,
            is_important: event.is_important,
            term: event.term
        });
        setSelectedEventDetails(null);
        setShowEventModal(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);
        
        const payload = {
            ...form,
            start_time: form.start_time ? `${form.start_time}:00` : null,
            end_time: form.end_time ? `${form.end_time}:00` : null,
            location: form.location.trim() || null,
            organizer: form.organizer.trim() || null,
            description: form.description.trim() || null,
        };

        try {
            if (isEditing && editEventId) {
                await api.patch(`${endpoints.academics.events}${editEventId}/`, payload);
                setSuccess('Event rescheduled & updated successfully!');
            } else {
                await api.post(endpoints.academics.events, payload);
                setSuccess('Event scheduled and notifications dispatched successfully!');
            }
            setShowEventModal(false);
            loadEvents(true);
        } catch (err: any) {
            setError(err.message || 'Failed to persist event. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        try {
            await api.delete(`${endpoints.academics.events}${eventId}/`);
            setSelectedEventDetails(null);
            loadEvents(true);
        } catch (err: any) {
            alert(err.message || 'Failed to delete event');
        }
    };

    // Filter events based on active selections
    const filteredEvents = events.filter(e => {
        const catMatch = selectedCategory === 'all' || e.category === selectedCategory;
        
        // Month check if Month View is active
        const eventDate = new Date(e.date);
        const monthMatch = eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        
        return catMatch; // month mapping is handled directly inside render cells
    });

    // Generate dynamic milestones when empty
    const getTermMilestones = (term: Term) => {
        const start = new Date(term.start_date);
        const end = new Date(term.end_date);
        const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        return [
            {
                id: 'm1',
                title: 'Term Commences / Resumption',
                description: 'Classes start for all pupils. General assembly and registration.',
                date: term.start_date,
                category: 'academic' as const,
                audience: 'all' as const,
                priority: 'high' as const,
                is_published: true,
                is_important: true,
                term: term.id
            },
            {
                id: 'm2',
                title: 'First Continuous Assessment (CA 1)',
                description: 'Mid-term evaluation assessments commence across all subjects.',
                date: new Date(start.getTime() + Math.round(diffDays * 0.3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                category: 'exam' as const,
                audience: 'all' as const,
                priority: 'medium' as const,
                is_published: true,
                is_important: false,
                term: term.id
            },
            {
                id: 'm3',
                title: 'Mid-Term Break',
                description: 'Short termly rest period. School resumes the following Monday.',
                date: new Date(start.getTime() + Math.round(diffDays * 0.45) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                category: 'holiday' as const,
                audience: 'all' as const,
                priority: 'low' as const,
                is_published: true,
                is_important: false,
                term: term.id
            },
            {
                id: 'm4',
                title: 'Parent-Teacher Association Meeting',
                description: 'PTA review and termly feedback session.',
                date: new Date(start.getTime() + Math.round(diffDays * 0.65) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                category: 'meeting' as const,
                audience: 'parents' as const,
                priority: 'medium' as const,
                is_published: true,
                is_important: true,
                term: term.id
            },
            {
                id: 'm5',
                title: 'Termly Final Examinations',
                description: 'Final evaluation exams across all primary subjects.',
                date: new Date(start.getTime() + Math.round(diffDays * 0.85) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                category: 'exam' as const,
                audience: 'all' as const,
                priority: 'high' as const,
                is_published: true,
                is_important: true,
                term: term.id
            },
            {
                id: 'm6',
                title: 'Vacation Assembly & Closing',
                description: 'Pupil reports published and end of term closing assembly.',
                date: term.end_date,
                category: 'academic' as const,
                audience: 'all' as const,
                priority: 'high' as const,
                is_published: true,
                is_important: true,
                term: term.id
            }
        ];
    };

    const selectedTerm = terms.find(t => t.id === selectedTermId);
    
    // Blend backend events with milestones if none exist
    const activeTermEvents = [...filteredEvents];
    if (activeTermEvents.length === 0 && selectedTerm) {
        activeTermEvents.push(...getTermMilestones(selectedTerm) as any);
    }
    
    // Sort upcoming events chronologically (ignoring past events if future exist)
    const upcomingEventsList = [...activeTermEvents]
        .filter(e => {
            const targetDate = new Date(e.date);
            targetDate.setHours(23, 59, 59, 999);
            return targetDate.getTime() >= new Date().getTime();
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 6);

    // Month Grid Generation
    const getMonthCells = () => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const currentMonthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
        
        const cells = [];
        
        // Previous month padding
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = prevMonthDays - i;
            const m = currentMonth === 0 ? 11 : currentMonth - 1;
            const y = currentMonth === 0 ? currentYear - 1 : currentYear;
            const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({ day: d, isCurrentMonth: false, dateStr: iso });
        }
        
        // Current month days
        for (let i = 1; i <= currentMonthDays; i++) {
            const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            cells.push({ day: i, isCurrentMonth: true, dateStr: iso });
        }
        
        // Next month padding
        let nextDay = 1;
        while (cells.length < 42) {
            const m = currentMonth === 11 ? 0 : currentMonth + 1;
            const y = currentMonth === 11 ? currentYear + 1 : currentYear;
            const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
            cells.push({ day: nextDay, isCurrentMonth: false, dateStr: iso });
            nextDay++;
        }
        
        return cells;
    };

    const monthCells = getMonthCells();

    // Hover tooltip handlers
    const handleEventMouseEnter = (e: React.MouseEvent, event: CalendarEvent) => {
        if (currentView === 'agenda') return;
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverPosition({
            x: rect.left + window.scrollX + rect.width / 2,
            y: rect.top + window.scrollY - 10
        });
        setHoveredEvent(event);
    };

    const handleEventMouseLeave = () => {
        setHoveredEvent(null);
    };

    // Month Navigation
    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const setToday = () => {
        const today = new Date();
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        setSelectedWeekStart(() => {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day;
            return new Date(d.setDate(diff));
        });
    };

    // Week navigation & dates
    const getWeekDays = () => {
        const arr = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(selectedWeekStart);
            d.setDate(selectedWeekStart.getDate() + i);
            arr.push(d);
        }
        return arr;
    };

    const weekDays = getWeekDays();

    const prevWeek = () => {
        const newStart = new Date(selectedWeekStart);
        newStart.setDate(selectedWeekStart.getDate() - 7);
        setSelectedWeekStart(newStart);
        setCurrentMonth(newStart.getMonth());
        setCurrentYear(newStart.getFullYear());
    };

    const nextWeek = () => {
        const newStart = new Date(selectedWeekStart);
        newStart.setDate(selectedWeekStart.getDate() + 7);
        setSelectedWeekStart(newStart);
        setCurrentMonth(newStart.getMonth());
        setCurrentYear(newStart.getFullYear());
    };

    return (
        <div className="space-y-6 max-w-screen-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-white text-2xl font-black font-serif flex items-center gap-2">
                        <CalendarIcon className="text-sky-400" size={24} /> Academic Calendar
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Primary School Scheduling Operations & Event Hub</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadEvents(true)} disabled={refreshing}
                        className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50"
                        title="Refresh Events">
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    {isAdmin && (
                        <button onClick={() => openAddModal()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98]">
                            <Plus size={14} /> Schedule Event
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filters */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4"
                style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Session Selector */}
                    {!isParent && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Session</span>
                            <FilterDropdown
                                value={selectedYearName}
                                options={academicYears.map(y => ({ id: y.name, label: y.name }))}
                                onChange={(val) => {
                                    setSelectedYearName(val);
                                    const matched = terms.find(t => t.academic_year_name === val);
                                    if (matched) setSelectedTermId(matched.id);
                                }}
                                placeholder="Session"
                                colorTheme={colorTheme}
                            />
                        </div>
                    )}

                    {/* Term Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Term</span>
                        <FilterDropdown
                            value={selectedTermId}
                            options={terms.filter(t => isParent || t.academic_year_name === selectedYearName).map(t => ({
                                id: t.id,
                                label: `${t.name}${t.is_current ? ' (Current)' : ''}`
                            }))}
                            onChange={setSelectedTermId}
                            placeholder="Term"
                            colorTheme={colorTheme}
                        />
                    </div>

                    {/* Category Selector */}
                    {!isParent && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Category</span>
                            <FilterDropdown
                                value={selectedCategory}
                                options={[
                                    { id: 'all', label: 'All Events' },
                                    { id: 'academic', label: 'Academic Deadlines' },
                                    { id: 'holiday', label: 'Public Holidays' },
                                    { id: 'exam', label: 'Examinations' },
                                    { id: 'meeting', label: 'PTA Meetings' },
                                    { id: 'sports', label: 'Sports Activities' }
                                ]}
                                onChange={setSelectedCategory}
                                placeholder="Category"
                                colorTheme={colorTheme}
                            />
                        </div>
                    )}
                </div>

                {selectedTerm && (
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span>Resumption: <strong className="text-slate-300 font-semibold">{new Date(selectedTerm.start_date).toLocaleDateString()}</strong></span>
                        <span>Vacation: <strong className="text-slate-300 font-semibold">{new Date(selectedTerm.end_date).toLocaleDateString()}</strong></span>
                    </div>
                )}
            </div>

            {/* Dashboard Container (Sidebar + Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Side: Modern Interactive Calendar */}
                <div className="lg:col-span-3 space-y-4">
                    
                    {/* View Controls & Header Navigation */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                        {/* Month navigation */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-white text-base font-bold min-w-[120px] sm:min-w-[150px]">
                                {currentView === 'week' ? `Week of ${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]}` : `${MONTHS[currentMonth]} ${currentYear}`}
                            </h2>
                            <div className="flex items-center gap-1.5">
                                <button onClick={currentView === 'week' ? prevWeek : prevMonth}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={setToday}
                                    className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg text-xs font-bold transition-all">
                                    Today
                                </button>
                                <button onClick={currentView === 'week' ? nextWeek : nextMonth}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* View selector tabs */}
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 text-xs font-semibold">
                            {[
                                { view: 'month', label: 'Month' },
                                { view: 'week', label: 'Week' },
                                { view: 'agenda', label: 'Agenda' }
                            ].map(tab => (
                                <button
                                    key={tab.view}
                                    onClick={() => setCurrentView(tab.view as any)}
                                    className={`px-3.5 py-1.5 rounded-lg transition-all ${currentView === tab.view ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main View Area */}
                    {loading ? (
                        <div className="flex items-center justify-center py-36 bg-[#0b1523] border border-white/5 rounded-3xl">
                            <div className="premium-spinner" />
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-white/5 overflow-hidden shadow-2xl"
                            style={{ background: 'linear-gradient(180deg, #0b1523 0%, #070e1a 100%)' }}>
                            
                            {/* MONTH VIEW */}
                            {currentView === 'month' && (
                                <div className="p-4 sm:p-5">
                                    {/* Weekdays Headers */}
                                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 text-center">
                                        {WEEKDAYS.map(w => (
                                            <div key={w} className="text-slate-500 text-xs font-bold uppercase tracking-wider py-1.5">
                                                {w}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Days Grid */}
                                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                        {monthCells.map((cell, idx) => {
                                            const dayEvents = activeTermEvents.filter(e => e.date === cell.dateStr);
                                            const hasEvents = dayEvents.length > 0;
                                            
                                            // Highlight today
                                            const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;
                                            
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isAdmin) openAddModal(cell.dateStr);
                                                    }}
                                                    className={`min-h-[70px] sm:min-h-[100px] p-2 rounded-2xl border transition-all duration-150 flex flex-col justify-between group relative select-none cursor-pointer
                                                        ${cell.isCurrentMonth ? 'bg-white/[0.01]' : 'opacity-25'}
                                                        ${isToday ? 'border-sky-500 bg-sky-500/5 shadow-md shadow-sky-500/5' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.03]'}
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-lg transition-all
                                                            ${isToday ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 group-hover:text-white'}
                                                        `}>
                                                            {cell.day}
                                                        </span>
                                                        
                                                        {isAdmin && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openAddModal(cell.dateStr);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 bg-white/10 hover:bg-sky-500 hover:text-slate-950 rounded-md text-slate-400 transition-all"
                                                                title="Add Event"
                                                            >
                                                                <Plus size={10} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Day events indicator / title */}
                                                    <div className="space-y-1 mt-1">
                                                        {/* Large screens: show event pills */}
                                                        <div className="hidden sm:block space-y-1">
                                                            {dayEvents.slice(0, 3).map(event => {
                                                                const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academic;
                                                                return (
                                                                    <div
                                                                        key={event.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedEventDetails(event);
                                                                        }}
                                                                        onMouseEnter={(e) => handleEventMouseEnter(e, event)}
                                                                        onMouseLeave={handleEventMouseLeave}
                                                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-lg truncate border cursor-pointer flex items-center gap-1 ${style.bg} ${style.border} ${style.hoverBg}`}
                                                                    >
                                                                        {event.is_important && <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />}
                                                                        <span className="truncate">{event.title}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {dayEvents.length > 3 && (
                                                                <div className="text-[8px] font-black text-slate-500 pl-1">
                                                                    + {dayEvents.length - 3} more
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Mobile screens: show event indicator dots */}
                                                        <div className="flex sm:hidden items-center justify-center gap-1 flex-wrap">
                                                            {dayEvents.map(event => {
                                                                const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academic;
                                                                return (
                                                                    <span
                                                                        key={event.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedEventDetails(event);
                                                                        }}
                                                                        className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* WEEK VIEW */}
                            {currentView === 'week' && (
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-7 gap-2 min-h-[350px]">
                                        {weekDays.map((date, idx) => {
                                            const iso = date.toISOString().split('T')[0];
                                            const dayEvents = activeTermEvents.filter(e => e.date === iso);
                                            const isToday = new Date().toISOString().split('T')[0] === iso;
                                            
                                            return (
                                                <div key={idx} className={`rounded-2xl border p-3 flex flex-col gap-3 min-h-[280px]
                                                    ${isToday ? 'border-sky-500 bg-sky-500/5 shadow-md shadow-sky-500/5' : 'border-white/5 bg-white/[0.01] hover:border-white/10'}
                                                `}>
                                                    {/* Day Header */}
                                                    <div className="text-center pb-2 border-b border-white/5">
                                                        <p className="text-[10px] uppercase font-bold text-slate-500">{WEEKDAYS[date.getDay()]}</p>
                                                        <p className={`text-lg font-black mt-1 inline-flex items-center justify-center w-8 h-8 rounded-xl ${isToday ? 'bg-sky-500 text-slate-950' : 'text-white'}`}>
                                                            {date.getDate()}
                                                        </p>
                                                    </div>

                                                    {/* Week Day Events cards list */}
                                                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px]">
                                                        {dayEvents.map(event => {
                                                            const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academic;
                                                            return (
                                                                <div
                                                                    key={event.id}
                                                                    onClick={() => setSelectedEventDetails(event)}
                                                                    className={`p-2.5 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all flex flex-col gap-1.5 text-left ${style.bg} ${style.border}`}
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        {event.is_important && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                                                                        <h4 className="text-white text-[11px] font-bold leading-tight line-clamp-1">{event.title}</h4>
                                                                    </div>
                                                                    <p className="text-slate-400 text-[9px] line-clamp-2 leading-relaxed">{event.description || 'No description'}</p>
                                                                    {event.start_time && (
                                                                        <div className="flex items-center gap-1 text-[8px] text-slate-500 mt-1">
                                                                            <Clock size={9} />
                                                                            <span>{formatTime(event.start_time)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {dayEvents.length === 0 && (
                                                            <div className="h-full flex flex-col items-center justify-center py-10 opacity-30">
                                                                <CalendarIcon size={20} className="text-slate-600" />
                                                                <span className="text-[9px] font-semibold text-slate-500 mt-1">Free Day</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* AGENDA VIEW */}
                            {currentView === 'agenda' && (
                                <div className="p-5 divide-y divide-white/5">
                                    {activeTermEvents.map((event, idx) => {
                                        const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academic;
                                        const eventDate = new Date(event.date);
                                        const countdown = getCountdownText(event.date);
                                        
                                        return (
                                            <div key={event.id || idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    {/* Event Date Block */}
                                                    <div className={`w-12 h-12 rounded-2xl ${style.badge} flex flex-col items-center justify-center shrink-0`}>
                                                        <span className="text-[9px] font-bold uppercase leading-none">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                                        <span className="text-lg font-black leading-none mt-0.5">{eventDate.getDate()}</span>
                                                    </div>
                                                    
                                                    {/* Event Metadata */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
                                                                {event.is_important && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                                                                {event.title}
                                                            </h3>
                                                            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-white/5 text-slate-400">
                                                                {style.label}
                                                            </span>
                                                            {event.is_important && (
                                                                <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                                                                    Important
                                                                </span>
                                                            )}
                                                            {!event.is_published && (
                                                                <span className="text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                                                                    Draft (Unpublished)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-400 text-xs leading-relaxed max-w-xl">{event.description || 'No description provided.'}</p>
                                                        
                                                        {/* Time, location, organizer */}
                                                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-1">
                                                            {event.start_time && (
                                                                <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(event.start_time)}{event.end_time && ` - ${formatTime(event.end_time)}`}</span>
                                                            )}
                                                            {event.location && (
                                                                <span className="flex items-center gap-1"><MapPin size={11} /> {event.location}</span>
                                                            )}
                                                            {event.organizer && (
                                                                <span className="flex items-center gap-1"><User size={11} /> {event.organizer}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right sm:self-center">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5
                                                        ${countdown.past ? 'bg-slate-900 border-white/5 text-slate-600' : countdown.urgent ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}
                                                    `}>
                                                        <Clock size={10} />
                                                        {countdown.text}
                                                    </span>
                                                    {isAdmin && (
                                                        <div className="flex justify-end gap-1.5 mt-2">
                                                            <button onClick={() => openEditModal(event)} className="p-1 rounded bg-white/5 hover:bg-sky-500/20 hover:text-sky-300 text-slate-400 transition-colors" title="Edit">
                                                                <Edit3 size={11} />
                                                            </button>
                                                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1 rounded bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors" title="Delete">
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {activeTermEvents.length === 0 && (
                                        <div className="py-20 text-center text-slate-500">
                                            <CalendarIcon size={32} className="mx-auto mb-2 opacity-30" />
                                            No calendar events found for this term.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Right Side: Upcoming Events & Milestones Panel */}
                <div className="space-y-6">
                    <div className="rounded-3xl border border-white/5 p-5 space-y-4"
                        style={{ background: 'linear-gradient(135deg, #0b1523 0%, #070e1a 100%)' }}>
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                                <CalendarDays className="text-sky-400" size={16} /> Upcoming Events
                            </h3>
                            <span className="text-[10px] text-slate-500 font-bold">{upcomingEventsList.length} Upcoming</span>
                        </div>

                        <div className="space-y-3">
                            {upcomingEventsList.map((event, idx) => {
                                const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.academic;
                                const countdown = getCountdownText(event.date);
                                
                                return (
                                    <div 
                                        key={event.id || idx} 
                                        onClick={() => setSelectedEventDetails(event)}
                                        className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col gap-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-white text-xs font-bold truncate flex items-center gap-1.5">
                                                    {event.is_important && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                                                    {event.title}
                                                </p>
                                                <p className="text-slate-500 text-[10px] mt-0.5">
                                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <span className={`text-[8px] uppercase font-extrabold px-2 py-0.5 rounded-md ${style.badge}`}>
                                                {event.category}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 flex items-center gap-1">
                                                <Clock size={11} /> {event.start_time ? formatTime(event.start_time) : 'All Day'}
                                            </span>
                                            <span className={`font-bold ${countdown.urgent ? 'text-red-400 animate-pulse' : 'text-sky-400'}`}>
                                                {countdown.text}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {upcomingEventsList.length === 0 && (
                                <div className="text-center py-10 text-slate-600">
                                    <Info size={20} className="mx-auto mb-1.5 opacity-30" />
                                    <p className="text-xs">No upcoming events scheduled</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* HOVER TOOLTIP POPUP */}
            {hoveredEvent && (
                <div 
                    className="absolute z-50 p-4 bg-slate-950/90 border border-white/15 rounded-2xl shadow-2xl text-left text-xs pointer-events-none max-w-xs backdrop-blur-md animate-in fade-in duration-100"
                    style={{
                        left: hoverPosition.x,
                        top: hoverPosition.y,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <h4 className="text-white font-bold text-xs">{hoveredEvent.title}</h4>
                            <span className="text-[8px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                {hoveredEvent.category}
                            </span>
                        </div>
                        <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-3">{hoveredEvent.description || 'No description.'}</p>
                        <div className="border-t border-white/5 pt-1.5 space-y-1 text-slate-500 text-[9px]">
                            {hoveredEvent.start_time && <p>Time: {formatTime(hoveredEvent.start_time)}{hoveredEvent.end_time && ` - ${formatTime(hoveredEvent.end_time)}`}</p>}
                            {hoveredEvent.location && <p>Location: {hoveredEvent.location}</p>}
                            {hoveredEvent.organizer && <p>Organizer: {hoveredEvent.organizer}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* EVENT DETAILS FULL VIEW MODAL */}
            {selectedEventDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #070e1a 100%)' }}>
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${CATEGORY_STYLES[selectedEventDetails.category]?.dot || 'bg-slate-400'}`} />
                                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                                    {CATEGORY_STYLES[selectedEventDetails.category]?.label || selectedEventDetails.category}
                                </span>
                            </div>
                            <button onClick={() => setSelectedEventDetails(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 text-left text-slate-300 text-sm">
                            <div className="space-y-1.5">
                                <h3 className="text-white font-serif font-black text-xl leading-snug">{selectedEventDetails.title}</h3>
                                {selectedEventDetails.is_important && (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        <ShieldAlert size={10} /> Important Notice
                                    </span>
                                )}
                            </div>

                            <p className="text-slate-400 leading-relaxed text-xs">{selectedEventDetails.description || 'No description provided.'}</p>

                            <div className="space-y-3 border-t border-white/5 pt-4">
                                {[
                                    { label: 'Date', value: new Date(selectedEventDetails.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), icon: <CalendarIcon size={14} className="text-sky-400" /> },
                                    { label: 'Time', value: selectedEventDetails.start_time ? `${formatTime(selectedEventDetails.start_time)}${selectedEventDetails.end_time ? ` - ${formatTime(selectedEventDetails.end_time)}` : ''}` : 'All Day Event', icon: <Clock size={14} className="text-sky-400" /> },
                                    { label: 'Location', value: selectedEventDetails.location || 'N/A', icon: <MapPin size={14} className="text-sky-400" /> },
                                    { label: 'Organizer', value: selectedEventDetails.organizer || 'School Administration', icon: <User size={14} className="text-sky-400" /> },
                                    { label: 'Target Audience', value: selectedEventDetails.audience === 'all' ? 'All Teachers & Parents' : selectedEventDetails.audience === 'teachers' ? 'Teachers Only' : 'Parents Only', icon: <Users size={14} className="text-sky-400" /> },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="flex items-start gap-3 text-xs">
                                        <span className="mt-0.5">{icon}</span>
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold">{label}</p>
                                            <p className="text-white font-medium mt-0.5">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-4 bg-slate-950/60 border-t border-white/5 flex gap-3 justify-end">
                            <button onClick={() => setSelectedEventDetails(null)} 
                                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 font-bold text-xs rounded-xl transition-all">
                                Close
                            </button>
                            {isAdmin && (
                                <>
                                    <button onClick={() => handleDeleteEvent(selectedEventDetails.id)} 
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl transition-all">
                                        Delete
                                    </button>
                                    <button onClick={() => openEditModal(selectedEventDetails)} 
                                        className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shadow-sky-500/20">
                                        Edit / Reschedule
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT EVENT FORM MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white font-serif">{isEditing ? 'Reschedule & Edit Event' : 'Schedule Academic Event'}</h2>
                            <button onClick={() => setShowEventModal(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Event Title *</label>
                                <input 
                                    type="text" required value={form.title} 
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Annual PTA Meeting, First CA Week..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date *</label>
                                    <input 
                                        type="date" required value={form.date} 
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 focus:text-white cursor-pointer" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category *</label>
                                    <select 
                                        value={form.category} 
                                        onChange={e => setForm({ ...form, category: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
                                    >
                                        <option value="academic" className="bg-slate-900">Academic Deadlines</option>
                                        <option value="holiday" className="bg-slate-900">Public Holidays</option>
                                        <option value="exam" className="bg-slate-900">Examinations</option>
                                        <option value="meeting" className="bg-slate-900">PTA/Meetings</option>
                                        <option value="sports" className="bg-slate-900">Sports / Co-curricular</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Time</label>
                                    <input 
                                        type="time" value={form.start_time} 
                                        onChange={e => setForm({ ...form, start_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Time</label>
                                    <input 
                                        type="time" value={form.end_time} 
                                        onChange={e => setForm({ ...form, end_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Location</label>
                                    <input 
                                        type="text" value={form.location} 
                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                        placeholder="e.g. School Hall, Classroom Block..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organizer</label>
                                    <input 
                                        type="text" value={form.organizer} 
                                        onChange={e => setForm({ ...form, organizer: e.target.value })}
                                        placeholder="e.g. Sports Master, Principal..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Audience</label>
                                    <select 
                                        value={form.audience} 
                                        onChange={e => setForm({ ...form, audience: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
                                    >
                                        <option value="all" className="bg-slate-900">All (Teachers & Parents)</option>
                                        <option value="teachers" className="bg-slate-900">Teachers Only</option>
                                        <option value="parents" className="bg-slate-900">Parents Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority Level</label>
                                    <select 
                                        value={form.priority} 
                                        onChange={e => setForm({ ...form, priority: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
                                    >
                                        <option value="low" className="bg-slate-900">Low</option>
                                        <option value="medium" className="bg-slate-900">Medium</option>
                                        <option value="high" className="bg-slate-900">High</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Term Selection *</label>
                                <select 
                                    required value={form.term} 
                                    onChange={e => setForm({ ...form, term: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 cursor-pointer"
                                >
                                    <option value="" disabled className="bg-slate-900">Select Term...</option>
                                    {terms.map(t => (
                                        <option key={t.id} value={t.id} className="bg-slate-900">{t.name} ({t.academic_year_name})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                                <textarea 
                                    value={form.description} 
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Enter detailed description, expectations, dress codes, guidelines..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 resize-none" 
                                />
                            </div>

                            {/* Importance Toggle */}
                            <div className="flex items-center gap-2 py-1 select-none">
                                <input 
                                    type="checkbox" id="is_important"
                                    checked={form.is_important}
                                    onChange={e => setForm({ ...form, is_important: e.target.checked })}
                                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                                />
                                <label htmlFor="is_important" className="text-xs text-slate-300 font-medium cursor-pointer">
                                    Mark as Important Notice (Red accent and badge highlight)
                                </label>
                            </div>

                            {/* Publish Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button 
                                    type="button" 
                                    onClick={() => setShowEventModal(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                
                                <button 
                                    type="submit" 
                                    onClick={() => setForm(f => ({ ...f, is_published: false }))}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                                >
                                    Save Draft
                                </button>
                                
                                <button 
                                    type="submit" 
                                    onClick={() => setForm(f => ({ ...f, is_published: true }))}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5"
                                >
                                    {submitting ? 'Saving...' : 'Publish Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
