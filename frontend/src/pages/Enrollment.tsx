import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { CheckCircle, Users, GraduationCap, Lock, Plus, Trash2, UserCircle, Camera } from 'lucide-react';

const CLASS_OPTIONS = [
  'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
  'Primary 1', 'Primary 2', 'Primary 3',
  'Primary 4', 'Primary 5', 'Primary 6',
].map((c) => ({ value: c, label: c }));

type Step = 1 | 2 | 3 | 4;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function Enrollment() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Parent State
  const [parentData, setParentData] = useState({
    parent_first_name: '',
    parent_last_name: '',
    parent_email: '',
    parent_phone: '',
    parent_address: '',
    relationship: 'Father',
    employment_details: '',
    password: '',
    confirm_password: '',
    parent_profile_photo: ''
  });

  // Pupils State
  const [studentsData, setStudentsData] = useState([{
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    username: '',
    dob: '',
    gender: 'M',
    class: '',
    state_of_origin: '',
    place_of_birth: '',
    blood_group: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_conditions: '',
    profile_photo: ''
  }]);

  const addStudent = () => {
    setStudentsData([...studentsData, {
      first_name: '', middle_name: '', last_name: '', email: '', username: '', dob: '', gender: 'M',
      class: '', state_of_origin: '', place_of_birth: '', blood_group: '',
      emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
      medical_conditions: '', profile_photo: ''
    }]);
  };

  const removeStudent = (index: number) => {
    setStudentsData(studentsData.filter((_, i) => i !== index));
  };

  const updateStudent = (index: number, field: string, value: string) => {
    const updated = [...studentsData];
    updated[index] = { ...updated[index], [field]: value };
    setStudentsData(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (parentData.password !== parentData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        parent_first_name: parentData.parent_first_name,
        parent_last_name: parentData.parent_last_name,
        parent_email: parentData.parent_email,
        parent_phone: parentData.parent_phone,
        parent_address: parentData.parent_address,
        relationship_to_student: parentData.relationship,
        employment_details: parentData.employment_details,
        password: parentData.password,
        students_data: studentsData,
        parent_profile_photo: parentData.parent_profile_photo
      };

      await api.post('/auth/enrollment/', payload, { skipAuth: true });

      setStep(4); // Success step
    } catch (err: any) {
      setError(err.message || 'Failed to submit enrollment request.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setError('');
    // Simple validation for current step
    if (step === 1) {
      if (!parentData.parent_first_name || !parentData.parent_last_name || !parentData.parent_phone) {
        setError('Please fill in all required parent details.');
        return;
      }
    } else if (step === 2) {
      const incomplete = studentsData.some(s => !s.first_name || !s.last_name || !s.dob || !s.class);
      if (incomplete) {
        setError('Please fill in all required pupil details (First Name, Last Name, Date of Birth, and Class).');
        return;
      }
    }
    setStep(prev => (prev + 1) as Step);
  };

  const prevStep = () => {
    setError('');
    setStep(prev => (prev - 1) as Step);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl mt-10">

        {/* Progress Tracker */}
        {step < 4 && (
          <div className="flex justify-between items-center mb-8 px-4">
            {[
              { num: 1, label: 'Parent Details', icon: Users },
              { num: 2, label: 'Pupil Info', icon: GraduationCap },
              { num: 3, label: 'Account Setup', icon: Lock }
            ].map((s) => (
              <div key={s.num} className={`flex flex-col items-center gap-2 ${step >= s.num ? 'text-amber-500' : 'text-slate-600'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= s.num ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600'}`}>
                  <s.icon size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Parent Info */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-white mb-6">Parent/Guardian Information</h2>

              {/* Parent Passport Photo Upload */}
              <div className="flex flex-col items-center gap-3 pb-4">
                <div
                  onClick={() => document.getElementById('parent-photo-input')?.click()}
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-500/5 hover:border-sky-500/70 hover:bg-sky-500/10 cursor-pointer transition-all group overflow-hidden"
                  title="Click to upload parent passport photo"
                >
                  {parentData.parent_profile_photo ? (
                    <img src={parentData.parent_profile_photo} alt="Parent Passport" className="w-full h-full object-cover" />
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
                <input
                  type="file"
                  id="parent-photo-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 3 * 1024 * 1024) {
                        setError('Parent passport photo must be less than 3MB');
                        return;
                      }
                      const b64 = await fileToBase64(file);
                      setParentData({ ...parentData, parent_profile_photo: b64 });
                      setError('');
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                />
                <p className="text-slate-400 text-[10px] text-center">
                  Parent Passport (JPG, PNG, WEBP. Max size: 3MB)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name</label>
                  <input required value={parentData.parent_first_name} onChange={e => setParentData({ ...parentData, parent_first_name: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name</label>
                  <input required value={parentData.parent_last_name} onChange={e => setParentData({ ...parentData, parent_last_name: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input required type="tel" value={parentData.parent_phone} onChange={e => setParentData({ ...parentData, parent_phone: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Employment Details (Occupation & Employer)</label>
                  <input required type="text" value={parentData.employment_details} onChange={e => setParentData({ ...parentData, employment_details: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Relationship</label>
                  <select value={parentData.relationship} onChange={e => setParentData({ ...parentData, relationship: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50">
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={nextStep} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all">Next Step</button>
              </div>
            </div>
          )}

          {/* STEP 2: Students Info */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black text-white">Pupil Information</h2>
                <button onClick={addStudent} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-all">
                  <Plus size={16} /> Add Another
                </button>
              </div>

              {studentsData.map((student, idx) => (
                <div key={idx} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 relative group">
                  {studentsData.length > 1 && (
                    <button onClick={() => removeStudent(idx)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className="flex items-start gap-4 pb-2 border-b border-white/5">
                    {/* Passport Photo Upload Box */}
                    <div
                      onClick={() => document.getElementById(`student-photo-${idx}`)?.click()}
                      className="relative w-16 h-16 rounded-xl border-2 border-dashed border-sky-500/40 bg-sky-500/5 hover:border-sky-500/70 hover:bg-sky-500/10 cursor-pointer transition-all group overflow-hidden shrink-0 select-none"
                      title="Click to upload pupil passport photo"
                    >
                      {student.profile_photo ? (
                        <img src={student.profile_photo} alt="Pupil Passport" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 text-sky-400">
                          <UserCircle size={20} className="opacity-60" />
                          <span className="text-[8px] font-bold text-center">PASSPORT</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={14} className="text-white" />
                      </div>
                    </div>
                    <input
                      type="file"
                      id={`student-photo-${idx}`}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 3 * 1024 * 1024) {
                            setError('Pupil passport photo must be less than 3MB');
                            return;
                          }
                          const b64 = await fileToBase64(file);
                          updateStudent(idx, 'profile_photo', b64);
                          setError('');
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pupil #{idx + 1}</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Upload a clear passport photo of the pupil (Max size: 3MB).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name</label>
                      <input required value={student.first_name} onChange={e => updateStudent(idx, 'first_name', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Middle Name</label>
                      <input value={student.middle_name} onChange={e => updateStudent(idx, 'middle_name', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name</label>
                      <input required value={student.last_name} onChange={e => updateStudent(idx, 'last_name', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                  </div>
                  {/* 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Student Email</label>
                      <input required type="email" placeholder="student@email.com" value={student.email} onChange={e => updateStudent(idx, 'email', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Student Username</label>
                      <input required placeholder="unique_username" value={student.username} onChange={e => updateStudent(idx, 'username', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                  </div> */}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date of Birth</label>
                      <input type="date" required value={student.dob} onChange={e => updateStudent(idx, 'dob', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Gender</label>
                      <select value={student.gender} onChange={e => updateStudent(idx, 'gender', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50">
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Proposed Class</label>
                      <select
                        required
                        value={student.class}
                        onChange={e => updateStudent(idx, 'class', e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="">Select class</option>
                        {CLASS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">State of Origin</label>
                      <input value={student.state_of_origin} onChange={e => updateStudent(idx, 'state_of_origin', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Place of Birth</label>
                      <input value={student.place_of_birth} onChange={e => updateStudent(idx, 'place_of_birth', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Blood Group</label>
                      <select value={student.blood_group} onChange={e => updateStudent(idx, 'blood_group', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50">
                        <option value="">Select</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-3">Emergency Contact (If different from parent)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact Name</label>
                        <input value={student.emergency_contact_name} onChange={e => updateStudent(idx, 'emergency_contact_name', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact Phone</label>
                        <input value={student.emergency_contact_phone} onChange={e => updateStudent(idx, 'emergency_contact_phone', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Relationship</label>
                        <select value={student.emergency_contact_relationship} onChange={e => updateStudent(idx, 'emergency_contact_relationship', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50">
                          <option value="">Select</option>
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Guardian</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Medical Information</label>
                    <input placeholder="Allergies, conditions, etc." value={student.medical_conditions} onChange={e => updateStudent(idx, 'medical_conditions', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-4">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 hover:bg-white/5 text-slate-300 font-bold rounded-xl transition-all">Back</button>
                <button onClick={nextStep} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all">Next Step</button>
              </div>
            </div>
          )}

          {/* STEP 3: Account Setup */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-white mb-2">Account Setup</h2>
              <p className="text-sm text-slate-400 mb-6">Create the login credentials you will use to access the parent portal once approved.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input type="email" required value={parentData.parent_email} onChange={e => setParentData({ ...parentData, parent_email: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Residential Address</label>
                  <textarea rows={2} required placeholder="123 Street Name, City, State" value={parentData.parent_address} onChange={e => setParentData({ ...parentData, parent_address: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Portal Password</label>
                  <input type="password" required value={parentData.password} onChange={e => setParentData({ ...parentData, password: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confirm Password</label>
                  <input type="password" required value={parentData.confirm_password} onChange={e => setParentData({ ...parentData, confirm_password: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
              </div>

              <div className="flex justify-between pt-8">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 hover:bg-white/5 text-slate-300 font-bold rounded-xl transition-all">Back</button>
                <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                  {loading ? 'Submitting...' : 'Submit Enrollment'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="text-center py-12 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-black text-white mb-4">Request Submitted!</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                Your enrollment request has been successfully submitted. Our administration team will review your application.
                Once verified, you will receive an email containing your child's Admission Number(s) and a link to access the portal.
              </p>
              <button onClick={() => navigate('/login')} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all">
                Return to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
