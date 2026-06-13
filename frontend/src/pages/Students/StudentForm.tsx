import { useState, useEffect, useRef, FormEvent } from 'react';
import { Camera, UserCircle } from 'lucide-react';
import { Field, Input, Select, Textarea, FormSection, SubmitButton } from '../../components/ui/Formfields';
import { api, endpoints } from '../../utils/api';
import type { Student, CreateStudentRequest } from '../../types';

interface StudentFormProps {
    studentId?: string;
    defaultClass?: string;
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
].map((c) => ({ value: c, label: c }));

const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    .map((b) => ({ value: b, label: b }));
const RELATION_OPTIONS = ['Father', 'Mother', 'Guardian', 'Sibling', 'Other']
    .map((r) => ({ value: r.toLowerCase(), label: r }));


export default function StudentForm({ studentId, defaultClass, onSuccess, onCancel }: StudentFormProps) {
    const isEdit = !!studentId;

    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [apiError, setApiError] = useState('');

    // Passport photo state
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [passportPreview, setPassportPreview] = useState<string | null>(null);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!studentId) {
            if (defaultClass) {
                setForm(f => ({ ...f, current_class: defaultClass }));
            }
            return;
        }

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
                // Load existing profile photo if any
                if ((u as any).profile_photo_url) {
                    setExistingPhotoUrl((u as any).profile_photo_url);
                }
            })
            .catch(() => setApiError('Failed to load student details.'))
            .finally(() => setFetching(false));
    }, [studentId]);

    const handlePassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setApiError('Passport photo must be JPG, PNG, or WEBP.');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setApiError('Passport photo must be less than 3 MB.');
            return;
        }
        setPassportFile(file);
        setPassportPreview(URL.createObjectURL(file));
        setApiError('');
    };

    const set = (key: keyof FormData, value: string) => {
        let processedValue = value;
        if (['date_of_birth'].includes(key)) {
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
        setLoading(true);

        try {
            if (isEdit && studentId) {
                // If there's a passport photo to upload, use FormData
                if (passportFile) {
                    const fd = new FormData();
                    fd.append('first_name', form.first_name);
                    fd.append('middle_name', form.middle_name || '');
                    fd.append('last_name', form.last_name);
                    fd.append('phone', form.phone || '');
                    if (form.date_of_birth) fd.append('date_of_birth', form.date_of_birth);
                    fd.append('address', form.address || '');
                    fd.append('state_of_origin', form.state_of_origin || '');
                    fd.append('place_of_birth', form.place_of_birth || '');
                    fd.append('current_class', form.current_class || '');
                    fd.append('blood_group', form.blood_group || '');
                    fd.append('status', form.status || 'active');
                    fd.append('emergency_contact_name', form.emergency_contact_name || '');
                    fd.append('emergency_contact_phone', form.emergency_contact_phone || '');
                    fd.append('emergency_contact_relationship', form.emergency_contact_relationship || '');
                    fd.append('medical_conditions', form.medical_conditions || '');
                    fd.append('profile_photo', passportFile);
                    await api.postFormData(endpoints.students.detail(studentId).replace('/auth/students/', '/auth/students/') + 'upload_photo/', fd);
                }
                await api.patch(
                    endpoints.students.detail(studentId),
                    {
                        first_name: form.first_name,
                        middle_name: form.middle_name,
                        last_name: form.last_name,
                        phone: form.phone,
                        date_of_birth: form.date_of_birth || null,
                        address: form.address,
                        state_of_origin: form.state_of_origin,
                        place_of_birth: form.place_of_birth,
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
                const { admission_number, ...createData } = form;
                // Use FormData if passport is provided
                if (passportFile) {
                    const fd = new FormData();
                    Object.entries({ ...createData, gender: form.gender as 'M' | 'F' }).forEach(([k, v]) => {
                        if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
                    });
                    if (form.date_of_birth) fd.append('date_of_birth', form.date_of_birth);
                    fd.append('profile_photo', passportFile);
                    await api.postFormData(endpoints.students.list, fd);
                } else {
                    await api.post(endpoints.students.list, {
                        ...createData,
                        gender: form.gender as 'M' | 'F',
                        date_of_birth: form.date_of_birth || undefined,
                    });
                }
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
                <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-sky-500 animate-spin" />
            </div>
        );
    }

    const avatarSrc = passportPreview || existingPhotoUrl;

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {apiError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    ⚠ {apiError}
                </div>
            )}

            {/* ── Passport Photo Upload ───────────────────────────── */}
            <div className="flex flex-col items-center gap-3 pb-2">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-500/5 hover:border-sky-500/70 hover:bg-sky-500/10 cursor-pointer transition-all group overflow-hidden"
                    title="Click to upload passport photo"
                >
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="Passport" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1.5 text-sky-400">
                            <UserCircle size={32} className="opacity-60" />
                            <p className="text-[10px] font-semibold text-center px-1">Photo</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-slate-400 text-xs font-semibold">Passport Photo</p>
                    <p className="text-slate-600 text-[10px] mt-0.5">JPG, PNG, WEBP · Max 3 MB</p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePassportChange}
                />
            </div>

            <FormSection title="Personal Information" />
            <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required error={errors.first_name}>
                    <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                        placeholder="John" error={!!errors.first_name} />
                </Field>
                <Field label="Last Name" required error={errors.last_name}>
                    <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                        placeholder="Ade" error={!!errors.last_name} />
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
                    placeholder="123 old pils, Lagos" />
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
                        label={isEdit ? 'Save Changes' : 'Add Pupil'}
                        loadingLabel={isEdit ? 'Saving...' : 'Adding...'} />
                </div>
            </div>
        </form>
    );
}
