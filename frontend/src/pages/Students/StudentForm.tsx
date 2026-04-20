import { useState } from 'react';
import { api, endpoints } from '../../utils/api';
import type { Student, Gender, StudentStatus, CreateStudentRequest } from '../../types';

interface StudentFormProps {
    student?: Student;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function StudentForm({ student, onSuccess, onCancel }: StudentFormProps) {
    const isEdit = !!student;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<Partial<CreateStudentRequest & { admission_number: string }>>({
        email: student?.user.email || '',
        username: student?.user.username || '',
        first_name: student?.user.first_name || '',
        last_name: student?.user.last_name || '',
        phone: student?.user.phone || '',
        date_of_birth: student?.user.date_of_birth || '',
        address: student?.user.address || '',
        admission_number: student?.student_profile.admission_number || '',
        current_class: student?.student_profile.current_class || '',
        gender: student?.student_profile.gender || 'M',
        blood_group: student?.student_profile.blood_group || '',
        emergency_contact_name: student?.student_profile.emergency_contact_name || '',
        emergency_contact_phone: student?.student_profile.emergency_contact_phone || '',
        emergency_contact_relationship: student?.student_profile.emergency_contcat_relationship || '', 
        medical_conditions: student?.student_profile.medical_codintion || '', 
        status: student?.student_profile.status || 'active',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEdit) {
                await api.patch(endpoints.students.detail(student!.user.id), formData);
            } else {
                await api.post(endpoints.students.list, formData);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Error submitting form');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                {/* User Info */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">First Name</label>
                    <input required name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Last Name</label>
                    <input required name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
                    <input required name="username" value={formData.username} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" disabled={isEdit} />
                </div>
                
                {/* Profile Info */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Admission No.</label>
                    <input required name="admission_number" value={formData.admission_number || ''} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" disabled={isEdit} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Class</label>
                    <select name="current_class" value={formData.current_class} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" style={{ colorScheme: 'dark' }}>
                        <option value="">Select Class</option>
                        {['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" style={{ colorScheme: 'dark' }}>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30" style={{ colorScheme: 'dark' }}>
                        <option value="active">Active</option>
                        <option value="graduated">Graduated</option>
                        <option value="transferred">Transferred</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20">
                    {loading ? 'Saving...' : 'Save Student'}
                </button>
            </div>
        </form>
    );
}
