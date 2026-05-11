import { useState, useEffect, type FormEvent } from 'react';
import { Field, Input, Select, Textarea, FormSection, SubmitButton } from '../../components/ui/Formfields';
import { api, endpoints } from '../../utils/api';
import type { Teacher } from '../../types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface TeacherFormProps {
  teacherId?: string;
  onSuccess:  () => void;
  onCancel:   () => void;
}

interface FormData {
  // User fields
  email:                  string;
  username:               string;
  first_name:             string;
  last_name:              string;
  phone:                  string;
  date_of_birth:          string;
  address:                string;
  // Profile fields
  staff_id:               string;
  employment_status:      string;
  date_of_joining:        string;
  highest_qualification:  string;
  specialization:         string;
  years_of_experience:    number;
  subjects_taught:        string;
  monthly_salary:         string;
  is_class_teacher:       boolean;
  assigned_class:         string;
  emergency_contact_name: string;
  emergency_contact_phone:string;
}

const EMPTY_FORM: FormData = {
  email: '', username: '', first_name: '', last_name: '',
  phone: '', date_of_birth: '', address: '',
  staff_id: '', employment_status: 'full_time', date_of_joining: '',
  highest_qualification: '', specialization: '', years_of_experience: 0,
  subjects_taught: '', monthly_salary: '', is_class_teacher: false,
  assigned_class: '', emergency_contact_name: '', emergency_contact_phone: '',
};

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full Time'  },
  { value: 'part_time', label: 'Part Time'  },
  { value: 'contract',  label: 'Contract'   },
];

const CLASS_OPTIONS = [
  'Nursery 1','Nursery 2','KG 1','KG 2',
  'Primary 1','Primary 2','Primary 3',
  'Primary 4','Primary 5','Primary 6',
].map((c) => ({ value: c, label: c }));

const QUALIFICATION_OPTIONS = [
  { value: "B.Ed",       label: "B.Ed"             },
  { value: "B.Sc",       label: "B.Sc"             },
  { value: "B.A",        label: "B.A"              },
  { value: "PGDE",       label: "PGDE"             },
  { value: "M.Ed",       label: "M.Ed"             },
  { value: "M.Sc",       label: "M.Sc"             },
  { value: "Ph.D",       label: "Ph.D"             },
  { value: "NCE",        label: "NCE"              },
  { value: "OND",        label: "OND"              },
  { value: "HND",        label: "HND"              },
];

// ─── FORM ─────────────────────────────────────────────────────────────────────

export default function TeacherForm({ teacherId, onSuccess, onCancel }: TeacherFormProps) {
  const isEdit = !!teacherId;

  const [form,     setForm]     = useState<FormData>(EMPTY_FORM);
  const [errors,   setErrors]   = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(false);
  const [apiError, setApiError] = useState('');

  // Fetch teacher detail in edit mode
  useEffect(() => {
    if (!teacherId) return;
    setFetching(true);
    api.get<Teacher>(endpoints.teachers.detail(teacherId))
      .then((data) => {
        const u = data.user;
        const p = data.teacher_profile;
        setForm({
          email:                  u.email,
          username:               u.username,
          first_name:             u.first_name,
          last_name:              u.last_name,
          phone:                  u.phone                ?? '',
          date_of_birth:          u.date_of_birth        ?? '',
          address:                u.address              ?? '',
          staff_id:               p.staff_id,
          employment_status:      p.employment_status,
          date_of_joining:        p.date_of_joining,
          highest_qualification:  p.highest_qualification ?? '',
          specialization:         p.specialization        ?? '',
          years_of_experience:    p.years_of_experience,
          subjects_taught:        p.subjects_taught       ?? '',
          monthly_salary:         p.monthly_salary        ?? '',
          is_class_teacher:       p.is_class_teacher,
          assigned_class:         p.assigned_class        ?? '',
          emergency_contact_name: p.emergency_contact_name  ?? '',
          emergency_contact_phone:p.emergency_contact_phone ?? '',
        });
      })
      .catch(() => setApiError('Failed to load teacher details.'))
      .finally(() => setFetching(false));
  }, [teacherId]);

  const set = (key: keyof FormData, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim())  errs.last_name  = 'Required';
    if (!form.email.trim())      errs.email      = 'Required';
    if (!form.username.trim())   errs.username   = 'Required';
    if (!form.staff_id.trim())   errs.staff_id   = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');
    setLoading(true);

    try {
      if (isEdit && teacherId) {
        await api.patch(endpoints.teachers.detail(teacherId), {
          first_name:             form.first_name,
          last_name:              form.last_name,
          phone:                  form.phone,
          date_of_birth:          form.date_of_birth || null,
          address:                form.address,
          employment_status:      form.employment_status,
          highest_qualification:  form.highest_qualification,
          specialization:         form.specialization,
          years_of_experience:    form.years_of_experience,
          subjects_taught:        form.subjects_taught,
          monthly_salary:         form.monthly_salary || null,
          is_class_teacher:       form.is_class_teacher,
          assigned_class:         form.assigned_class,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone:form.emergency_contact_phone,
        });
      } else {
        await api.post(endpoints.teachers.list, {
          ...form,
          date_of_birth:   form.date_of_birth   || undefined,
          date_of_joining: form.date_of_joining  || undefined,
          monthly_salary:  form.monthly_salary   || undefined,
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
            placeholder="Amaka" error={!!errors.first_name} />
        </Field>
        <Field label="Last Name" required error={errors.last_name}>
          <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
            placeholder="Okonkwo" error={!!errors.last_name} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="amaka@school.com" disabled={isEdit} error={!!errors.email} />
        </Field>
        <Field label="Username" required error={errors.username}>
          <Input value={form.username} onChange={(e) => set('username', e.target.value)}
            placeholder="amaka.okonkwo" disabled={isEdit} error={!!errors.username} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)}
            placeholder="+2348012345678" />
        </Field>
        <Field label="Date of Birth">
          <Input type="date" value={form.date_of_birth}
            onChange={(e) => set('date_of_birth', e.target.value)} />
        </Field>
      </div>

      <Field label="Address">
        <Input value={form.address} onChange={(e) => set('address', e.target.value)}
          placeholder="12 Teacher's Quarters, Lagos" />
      </Field>

      <FormSection title="Employment Details" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Staff ID" required error={errors.staff_id}>
          <Input value={form.staff_id} onChange={(e) => set('staff_id', e.target.value)}
            placeholder="TCH001" disabled={isEdit} error={!!errors.staff_id} />
        </Field>
        <Field label="Employment Status">
          <Select value={form.employment_status}
            onChange={(e) => set('employment_status', e.target.value)}
            options={EMPLOYMENT_OPTIONS} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date of Joining">
          <Input type="date" value={form.date_of_joining}
            onChange={(e) => set('date_of_joining', e.target.value)} />
        </Field>
        <Field label="Years of Experience">
          <Input type="number" min={0} value={String(form.years_of_experience)}
            onChange={(e) => set('years_of_experience', Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Highest Qualification">
          <Select value={form.highest_qualification}
            onChange={(e) => set('highest_qualification', e.target.value)}
            options={QUALIFICATION_OPTIONS} placeholder="Select qualification" />
        </Field>
        <Field label="Specialization / Subject">
          <Input value={form.specialization}
            onChange={(e) => set('specialization', e.target.value)}
            placeholder="Mathematics, English…" />
        </Field>
      </div>

      <Field label="Subjects Taught (comma separated)">
        <Input value={form.subjects_taught}
          onChange={(e) => set('subjects_taught', e.target.value)}
          placeholder="Maths, English, Science" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Monthly Salary (₦)">
          <Input type="number" min={0} value={form.monthly_salary}
            onChange={(e) => set('monthly_salary', e.target.value)}
            placeholder="85000" />
        </Field>
        <Field label="Assigned Class">
          <Select value={form.assigned_class}
            onChange={(e) => set('assigned_class', e.target.value)}
            options={CLASS_OPTIONS} placeholder="Select class" />
        </Field>
      </div>

      {/* Class teacher toggle */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
        <input
          type="checkbox"
          id="is_class_teacher"
          checked={form.is_class_teacher}
          onChange={(e) => set('is_class_teacher', e.target.checked)}
          className="w-4 h-4 rounded accent-amber-500"
        />
        <label htmlFor="is_class_teacher" className="text-slate-300 text-sm cursor-pointer">
          This teacher is a <span className="text-amber-400 font-semibold">Class Teacher</span>
        </label>
      </div>

      <FormSection title="Emergency Contact" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact Name">
          <Input value={form.emergency_contact_name}
            onChange={(e) => set('emergency_contact_name', e.target.value)}
            placeholder="Next of kin name" />
        </Field>
        <Field label="Contact Phone">
          <Input value={form.emergency_contact_phone}
            onChange={(e) => set('emergency_contact_phone', e.target.value)}
            placeholder="+2348012345678" />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400
                     border border-white/10 hover:bg-white/5 hover:text-white transition-all">
          Cancel
        </button>
        <div className="flex-1">
          <SubmitButton
            loading={loading}
            label={isEdit ? 'Save Changes' : 'Add Teacher'}
            loadingLabel={isEdit ? 'Saving…' : 'Adding…'}
          />
        </div>
      </div>
    </form>
  );
}