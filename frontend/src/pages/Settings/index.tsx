import { useState, useEffect } from 'react';
import { 
    User, Lock, Calendar, Check, Save, 
    AlertCircle, RefreshCw, Eye, EyeOff, CheckCircle
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { Term } from '../../types';

type Tab = 'profile' | 'password' | 'academic';

export default function Settings() {
    const { user, login } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Profile State
    const [profileForm, setProfileForm] = useState({
        first_name: user?.first_name || '',
        middle_name: user?.middle_name || '',
        last_name: user?.last_name || '',
        phone: user?.phone || '',
        date_of_birth: user?.date_of_birth || '',
        address: user?.address || '',
    });

    // Password State
    const [pwdForm, setPwdForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showOldPwd, setShowOldPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);

    // Terms State (for admin)
    const [terms, setTerms] = useState<Term[]>([]);
    const [refreshingTerms, setRefreshingTerms] = useState(false);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (isAdmin && activeTab === 'academic') {
            fetchTerms();
        }
    }, [activeTab, isAdmin]);

    const fetchTerms = async () => {
        setRefreshingTerms(true);
        try {
            const res = await api.get<any>(endpoints.academics.terms);
            const getList = (val: any) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (val.results && Array.isArray(val.results)) return val.results;
                return [];
            };
            setTerms(getList(res));
        } catch (err: any) {
            console.error(err);
        } finally {
            setRefreshingTerms(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await api.patch(endpoints.auth.profile, profileForm);
            setSuccess('Profile updated successfully!');
            // Refresh user session context
            const freshProfile: any = await api.get(endpoints.auth.profile);
            if (freshProfile && freshProfile.user) {
                // If context exposes a reload/update function or we manually log in again
                // Here we just trigger session refresh or set a success delay
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (pwdForm.new_password !== pwdForm.confirm_password) {
            setError('New passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await api.post(endpoints.auth.changepassword, {
                old_password: pwdForm.old_password,
                new_password: pwdForm.new_password
            });
            setSuccess('Password changed successfully!');
            setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err: any) {
            setError(err.message || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetActiveTerm = async (termId: string) => {
        setError('');
        setSuccess('');
        try {
            await api.patch(`${endpoints.academics.terms}${termId}/`, { is_current: true });
            setSuccess('Active term updated successfully!');
            fetchTerms();
        } catch (err: any) {
            setError(err.message || 'Failed to set active term.');
        }
    };

    return (
        <div className="space-y-6 max-w-screen-md mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white font-serif">Account Settings</h1>
                <p className="text-slate-500 text-sm">Configure profile preferences, security settings, and portal variables</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        activeTab === 'profile'
                            ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <User size={16} />Profile
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        activeTab === 'password'
                            ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Lock size={16} />Security
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('academic')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                            activeTab === 'academic'
                                ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Calendar size={16} />Academic Term
                    </button>
                )}
            </div>

            {/* Notifications panel */}
            {error && (
                <div className="flex items-center gap-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm">
                    <CheckCircle size={16} className="shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                    <h3 className="text-white font-bold text-base border-b border-white/5 pb-3">Personal Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-2">First Name</label>
                            <input
                                type="text"
                                required
                                value={profileForm.first_name}
                                onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-2">Last Name</label>
                            <input
                                type="text"
                                required
                                value={profileForm.last_name}
                                onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-2">Middle Name (Optional)</label>
                            <input
                                type="text"
                                value={profileForm.middle_name}
                                onChange={e => setProfileForm({ ...profileForm, middle_name: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 font-semibold mb-2">Phone Number</label>
                            <input
                                type="text"
                                value={profileForm.phone}
                                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-2">Date of Birth</label>
                        <input
                            type="date"
                            value={profileForm.date_of_birth}
                            onChange={e => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-2">Address</label>
                        <textarea
                            value={profileForm.address}
                            onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                            rows={3}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40 resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                    >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Profile Details'}
                    </button>
                </form>
            )}

            {/* Security Tab */}
            {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                    <h3 className="text-white font-bold text-base border-b border-white/5 pb-3">Update Password</h3>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-2">Current Password</label>
                        <div className="relative">
                            <input
                                type={showOldPwd ? 'text' : 'password'}
                                required
                                value={pwdForm.old_password}
                                onChange={e => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPwd(!showOldPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-2">New Password</label>
                        <div className="relative">
                            <input
                                type={showNewPwd ? 'text' : 'password'}
                                required
                                value={pwdForm.new_password}
                                onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPwd(!showNewPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-2">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            value={pwdForm.confirm_password}
                            onChange={e => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500/40"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                    >
                        <Lock size={16} />
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            )}

            {/* Academic Term Configuration (Admin only) */}
            {activeTab === 'academic' && isAdmin && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-white font-bold text-base">Academic Terms</h3>
                        <button onClick={fetchTerms} disabled={refreshingTerms} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5">
                            <RefreshCw size={14} className={refreshingTerms ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {terms.map(term => (
                            <div 
                                key={term.id} 
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                    term.is_current 
                                        ? 'bg-sky-500/10 border-sky-500/30' 
                                        : 'bg-white/5 border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-bold text-sm">{term.name}</p>
                                        {term.is_current && (
                                            <span className="px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black uppercase">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 text-xs mt-1">Session: {term.academic_year_name}</p>
                                </div>

                                {!term.is_current && (
                                    <button
                                        onClick={() => handleSetActiveTerm(term.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-sky-500 hover:text-slate-950 text-slate-300 text-xs font-bold rounded-xl transition-all border border-white/10"
                                    >
                                        <Check size={12} /> Set Active
                                    </button>
                                )}
                            </div>
                        ))}

                        {terms.length === 0 && !refreshingTerms && (
                            <p className="text-slate-500 text-center py-6 text-sm">No academic terms configured.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
