import { useState, useEffect, type FormEvent } from 'react';
import { Field, Input, Select, FormSection, SubmitButton } from '../../components/ui/Formfields';
import { api, endpoints } from '../../utils/api';
import type { ParentUser } from './index';

// Form interface
interface ParentFormProps {
  parentId?: string;
  onSuccess: () => void;
  onCancel:  () => void;
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
  password?:              string;
  
  // Profile fields
  relationship_to_student: string;
  occupation:              string;
  employer:                string;
  office_address:          string;
  office_phone:            string;
  alternate_phone:         string;
  
  // Linked Children
  student_ids:             string[];
}

const EMPTY_FORM: FormData = {
  email: '', username: '', first_name: '', last_name: '',
  phone: '', date_of_birth: '', address: '', password: '',
  relationship_to_student: 'guardian', occupation: '', employer: '',
  office_address: '', office_phone: '', alternate_phone: '',
  student_ids: [],
};

const RELATIONSHIP_OPTIONS = [
  { value: 'father',   label: 'Father'   },
  { value: 'mother',   label: 'Mother'   },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other',    label: 'Other'    },
];

interface StudentListItem {
  id: string;
  full_name: string;
  admission_number: string;
  current_class: string | null;
}

export default function ParentForm({ parentId, onSuccess, onCancel }: ParentFormProps) {
  const isEdit = !!parentId;

  const [form,          setForm]          = useState<FormData>(EMPTY_FORM);
  const [errors,        setErrors]        = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(false);
  const [apiError,      setApiError]      = useState('');
  
  // Students selection
  const [allStudents,   setAllStudents]   = useState<StudentListItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Fetch all students for linking on mount
  // StudentListSerializer returns flat: { id, full_name, student_profile, ... }
  useEffect(() => {
    api.get<{ results: any[] }>(`${endpoints.students.list}?page_size=1000`)
      .then((data) => {
        const list = data.results.map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          admission_number: s.student_profile?.admission_number ?? '—',
          current_class: s.student_profile?.current_class ?? null,
        }));
        setAllStudents(list);
      })
      .catch((err) => {
        console.error('Failed to load students list', err);
      });
  }, []);

  // Fetch parent details in edit mode
  useEffect(() => {
    if (!parentId) return;
    setFetching(true);
    api.get<ParentUser>(endpoints.parents.detail(parentId))
      .then((data) => {
        const u = data;
        const p = data.parent_profile;
        const childIds = (data.children ?? []).map((c: any) => c.user?.id || c.id);
        
        setForm({
          email:                  u.email || '',
          username:               u.username || '',
          first_name:             u.first_name || '',
          last_name:              u.last_name || '',
          phone:                  u.phone || '',
          date_of_birth:          u.date_of_birth || '',
          address:                u.address || '',
          relationship_to_student: p?.relationship_to_student || 'guardian',
          occupation:              p?.occupation || '',
          employer:                p?.employer || '',
          office_address:          p?.office_address || '',
          office_phone:            p?.office_phone || '',
          alternate_phone:         p?.alternate_phone || '',
          student_ids:             childIds,
        });
      })
      .catch(() => setApiError('Failed to load parent details.'))
      .finally(() => setFetching(false));
  }, [parentId]);

  const set = (key: keyof FormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim())  errs.last_name  = 'Required';
    if (!form.email.trim())      errs.email      = 'Required';
    if (!form.username.trim())   errs.username   = 'Required';
    if (!isEdit && !form.password?.trim()) errs.password = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleToggleStudent = (id: string) => {
    const current = [...form.student_ids];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    set('student_ids', current);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');
    setLoading(true);

    try {
      if (isEdit && parentId) {
        await api.patch(endpoints.parents.detail(parentId), {
          first_name:              form.first_name,
          last_name:               form.last_name,
          phone:                   form.phone,
          date_of_birth:           form.date_of_birth || null,
          address:                 form.address,
          relationship_to_student: form.relationship_to_student,
          occupation:              form.occupation,
          employer:                form.employer,
          office_address:          form.office_address,
          office_phone:            form.office_phone,
          alternate_phone:         form.alternate_phone,
          student_ids:             form.student_ids,
        });
      } else {
        await api.post(endpoints.parents.list, {
          ...form,
          date_of_birth: form.date_of_birth || undefined,
          password:      form.password || undefined,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search input
  const filteredStudents = allStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
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
            placeholder="Doe" error={!!errors.last_name} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="john.doe@gmail.com" disabled={isEdit} error={!!errors.email} />
        </Field>
        <Field label="Username" required error={errors.username}>
          <Input value={form.username} onChange={(e) => set('username', e.target.value)}
            placeholder="john_doe" disabled={isEdit} error={!!errors.username} />
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
          placeholder="12 Parent Street, Lagos" />
      </Field>

      {!isEdit && (
        <Field label="Password" required error={errors.password}>
          <Input type="password" value={form.password || ''}
            onChange={(e) => set('password', e.target.value)}
            placeholder="••••••••" error={!!errors.password} />
        </Field>
      )}

      <FormSection title="Profile Details" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Relationship to Student">
          <Select value={form.relationship_to_student}
            onChange={(e) => set('relationship_to_student', e.target.value)}
            options={RELATIONSHIP_OPTIONS} />
        </Field>
        <Field label="Occupation">
          <Input value={form.occupation} onChange={(e) => set('occupation', e.target.value)}
            placeholder="Engineer, Doctor…" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Employer">
          <Input value={form.employer} onChange={(e) => set('employer', e.target.value)}
            placeholder="Company Name" />
        </Field>
        <Field label="Office Phone">
          <Input value={form.office_phone} onChange={(e) => set('office_phone', e.target.value)}
            placeholder="Office number" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Alternate Phone">
          <Input value={form.alternate_phone} onChange={(e) => set('alternate_phone', e.target.value)}
            placeholder="Alternate contact number" />
        </Field>
        <Field label="Office Address">
          <Input value={form.office_address} onChange={(e) => set('office_address', e.target.value)}
            placeholder="Office address" />
        </Field>
      </div>

      <FormSection title="Link Students / Children" />
      <div className="space-y-3">
        <input
          type="text"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          placeholder="Search students by name or admission number..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
        />
        
        <div className="border border-white/5 rounded-xl p-3 bg-white/5 space-y-2 max-h-48 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-2">No matching students found.</p>
          ) : (
            filteredStudents.map((student) => (
              <label key={student.id} className="flex items-center gap-3 text-slate-300 text-xs cursor-pointer hover:text-white transition-colors py-1 border-b border-white/[0.02] last:border-0">
                <input
                  type="checkbox"
                  checked={form.student_ids.includes(student.id)}
                  onChange={() => handleToggleStudent(student.id)}
                  className="w-3.5 h-3.5 rounded accent-violet-500"
                />
                <div className="flex flex-col">
                  <span className="font-semibold">{student.full_name}</span>
                  <span className="text-[10px] text-slate-500">
                    ID: {student.admission_number} {student.current_class ? `· Class: ${student.current_class}` : ''}
                  </span>
                </div>
              </label>
            ))
          )}
        </div>
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
            label={isEdit ? 'Save Changes' : 'Add Parent'}
            loadingLabel={isEdit ? 'Saving…' : 'Adding…'}
          />
        </div>
      </div>
    </form>
  );
}
