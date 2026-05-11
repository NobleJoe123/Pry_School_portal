import { useState, useEffect, FormEvent } from 'react';
import { Field, Input, Select, Textarea, FormSection, SubmitButton } from '../../components/ui/Formfields';
import { api, endpoints } from '../../utils/api';
import type { Student, CreateStudentRequest } from '../../types';

interface StudentFormProps {
    studentId?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

type FormData = Omit<CreateStudentRequest, 'gender'> & { gender: 'M' | 'F' | '', admission_number?: string };

const EMPTY_FORM: FormData = {
    email: '', username: '', first_name: '', middle_name: '', last_name: '',
    phone: '', date_of_birth: '', address: '',
    current_class: '', gender: '', admission_number: '',
    state_of_origin: '', place_of_birth: '',
    blood_group: '', status: 'active',
    emergency_contact_name: '', emergency_contact_phone: '',
    emergency_contact_relationship: '', medical_conditions: '',
};

// Options


const GENDER_OPTIONS = [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }];
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'graduated', label: 'Graduated' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'suspended', label: 'Suspended' },
];

const CLASS_OPTIONS = [
    'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
    'Primary 1', 'Primary 2', 'Primary 3',
    'Primary 4', 'Primary 5', 'Primary 6',
].map((c) => ({ value: c, label: c}));
const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    .map((b) => ({ value: b, label: b }));
const RELATION_OPTIONS = ['Father', 'Mother', 'Guardian', 'SIbling', 'Other']
    .map((r) => ({ value: r.toLowerCase(), label: r }));


//Form

export default function StudentForm({ studentId, onSuccess, onCancel }: StudentFormProps) {
    const isEdit = !!studentId;

    const [form, setForm] = useState<FormData>(EMPTY_FORM);

    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (!studentId) return;
        
        setFetching(true);
        api.get<Student>(endpoints.students.detail(studentId))
            .then((data) => {
                const u = data.user;
                const p = data.student_profile;
                setForm({
                    email:      u.email,
                    username:   u.username,
                    first_name:  u.first_name,
                    middle_name: u.middle_name ?? '',
                    last_name:   u.last_name,
                    phone:       u.phone ?? '',
                    date_of_birth: u.date_of_birth ?? '',
                    address:     u.address ?? '',
                    admission_number: p.admission_number ?? '',
                    current_class: p.current_class ?? '',
                    gender:      p.gender,
                    state_of_origin: p.state_of_origin ?? '',
                    place_of_birth: p.place_of_birth ?? '',
                    blood_group: p.blood_group ?? '',
                    status:      p.status ?? 'active',
                    emergency_contact_name: p.emergency_contact_name ?? '',
                    emergency_contact_phone: p.emergency_contact_phone ?? '',
                    emergency_contact_relationship: p.emergency_contact_relationship ?? '',
                    medical_conditions: p.medical_conditions ?? '',
                });
            })
            .catch(() => setApiError('Failed to load student details.'))
            .finally(() => setFetching(false));
    }, [studentId]);



    const set = (key: keyof FormData, value: string) => {
        // Enforce 10 character limit for specific fields
        let processedValue = value;
        if (['last_name', 'date_of_birth', 'address'].includes(key)) {
            processedValue = value.slice(0, 10);
        }

        setForm((f) => ({ ...f, [key]: processedValue }));
        setErrors((e) => ({ ...e, [key]: '' }));
    };


    const validate = (): boolean => {
        const errs: Partial<Record<keyof FormData, string>> = {};
        if (!form.first_name.trim()) errs.first_name = 'Required';
        if (!form.last_name.trim()) errs.last_name = 'Required';
        if (!form.email.trim()) errs.email = 'Required';
        if (!form.username.trim()) errs.username = 'Required';
        if (!form.gender.trim()) errs.gender = 'Required';
        setErrors(errs);
        return Object.keys(errs).length === 0;

    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setApiError('');
        setLoading (true);

        try {
            if (isEdit && studentId) {
                await api.patch(
                    endpoints.students.detail(studentId),
                    {
                        first_name: form.first_name,
                        middle_name: form.middle_name,
                        last_name: form.last_name,
                        phone: form.phone,
                        date_of_birth: form.date_of_birth || null,
                        address: form.address,
                        current_class: form.current_class,
                        blood_group: form.blood_group,
                        status: form.status,
                        emergency_contact_name: form.emergency_contact_name,
                        emergency_contact_phone: form.emergency_contact_phone,
                        emergency_contact_relationship: form.emergency_contact_relationship,
                        medical_conditions: form.medical_conditions,
                    }
                );
            } else {
                // For creation, admission_number is handled by backend
                const { admission_number, ...createData } = form;
                await api.post(endpoints.students.list, {
                    ...createData,
                    gender: form.gender as 'M' | 'F',
                    date_of_birth: form.date_of_birth || undefined,
                });
            }

            onSuccess();
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {apiError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    ⚠ {apiError}
                </div>
            )}

            <FormSection title="Personal Information" />
            <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required error={errors.first_name}>
                    <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                        placeholder="John" error={!!errors.first_name} />
                </Field>
                <Field label="Last Name" required error={errors.last_name}>
                    <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                        placeholder="Ade" error={!!errors.last_name} maxLength={10} />
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Middle Name">
                    <Input value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)}
                        placeholder="Emeka" />
                </Field>
                <Field label="Gender" required error={errors.gender}>
                    <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}
                        options={GENDER_OPTIONS} placeholder="Select" error={!!errors.gender} />
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="State of Origin">
                    <Input value={form.state_of_origin} onChange={(e) => set('state_of_origin', e.target.value)}
                        placeholder="Lagos" />
                </Field>
                <Field label="Place of Birth">
                    <Input value={form.place_of_birth} onChange={(e) => set('place_of_birth', e.target.value)}
                        placeholder="Ikeja" />
                </Field>
            </div>

            <Field label="Address">
                <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)}
                    placeholder="123 old pils, Lagos" maxLength={10} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth">
                    <Input type="date" value={form.date_of_birth ?? ''}
                        onChange={(e) => set('date_of_birth', e.target.value)} maxLength={10} />
                </Field>
                <Field label="Phone">
                    <Input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                        placeholder="+23490........" />
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Email" required error={errors.email}>
                    <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                        placeholder="john@gmail.com" disabled={isEdit} error={!!errors.email} />
                </Field>
                <Field label="Username" required error={errors.username}>
                    <Input value={form.username} onChange={(e) => set('username', e.target.value)}
                        placeholder="johnade001" disabled={isEdit} error={!!errors.username} />
                </Field>
            </div>

            {isEdit && (
                <Field label="Admission Number">
                    <Input value={form.admission_number} disabled placeholder="STU001" />
                </Field>
            )}

            <FormSection title="Academic Information" />
            <div className="grid grid-cols-3 gap-4">
                <Field label="Current Class">
                    <Select value={form.current_class ?? ''}
                        onChange={(e) => set('current_class', e.target.value)}
                        options={CLASS_OPTIONS} placeholder="Select class" />
                </Field>
                <Field label="Blood Group">
                    <Select value={form.blood_group ?? ''} onChange={(e) => set('blood_group', e.target.value)}
                        options={BLOOD_OPTIONS} placeholder="Select" />
                </Field>
                <Field label="Status">
                    <Select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value as any)}
                        options={STATUS_OPTIONS} />
                </Field>
            </div>

            <FormSection title="Emergency Contact" />
            <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Name">
                    <Input value={form.emergency_contact_name ?? ''}
                        onChange={(e) => set('emergency_contact_name', e.target.value)}
                            placeholder="Ade Mary" />
                </Field>
                <Field label="Contact Phone">
                    <Input value={form.emergency_contact_phone ?? ''}
                        onChange={(e) => set('emergency_contact_phone', e.target.value)}
                        placeholder="+2345678......" />
                </Field>
            </div>
            <Field label="Relationship">
                <Select value={form.emergency_contact_relationship ?? ''}
                    onChange={(e) => set('emergency_contact_relationship', e.target.value)}
                    options={RELATION_OPTIONS} placeholder="Select relationship" />
            </Field>

            <FormSection title="Medical Information" />
            <Field label="Medical Conditions / Allergies">
                <Textarea value={form.medical_conditions ?? ''}
                onChange={(e) => set('medical_conditions', e.target.value)}
                placeholder="List any known conditions or allergies" rows={3} />
            </Field>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 hover:text-white transition-all">Cancel
                </button>
                <div className="flex-1">
                    <SubmitButton loading={loading}
                        label={isEdit ? 'Save Changes' : 'Add Student'}
                        loadingLabel={isEdit ? 'Saving...' : 'Adding...'} />
                </div>
            </div>
        </form>
    );
}
