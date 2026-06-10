import { useState } from 'react';
import { Check, AlertCircle, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';
import type { StudentAdmissionDetail } from '../types';

interface EnrollmentAdmissionModalProps {
  isOpen: boolean;
  parentId: string;
  onSuccess: () => void;
}

type Step = 'input' | 'confirm' | 'success';

export default function EnrollmentAdmissionModal({ isOpen, parentId, onSuccess }: EnrollmentAdmissionModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [studentDetails, setStudentDetails] = useState<StudentAdmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    setError('');

    if (!admissionNumber.trim()) {
      setError('Please enter an admission number');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<StudentAdmissionDetail>(
        `/auth/student-by-admission/?admission_number=${encodeURIComponent(admissionNumber)}`,
        { skipAuth: false }
      );
      setStudentDetails(response);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Student not found. Please check the admission number.');
      setStudentDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!studentDetails) return;

    setLoading(true);
    setError('');
    try {
      await api.post(`/auth/parents/${parentId}/link-students/`, {
        admission_numbers: [studentDetails.admission_number]
      });
      setStep('success');

      // Redirect after success message
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to link student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setAdmissionNumber('');
    setStudentDetails(null);
    setError('');
  };

  // Step 1: Input
  if (step === 'input') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
          <div className="px-6 py-4 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
            <h2 className="text-lg font-bold text-slate-900">Link Your Child</h2>
            <p className="text-xs text-slate-600 mt-0.5">Enter the admission number to get started</p>
          </div>

          <div className="px-6 py-8 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                Admission Number
              </label>
              <input
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g., ADM2026ABC123"
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 disabled:opacity-50 transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                You received this with your enrollment approval email.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex gap-2">
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              disabled={loading || !admissionNumber.trim()}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <>
                  Search
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Confirm
  if (step === 'confirm' && studentDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <h2 className="text-lg font-bold text-slate-900">Confirm Student</h2>
            <p className="text-xs text-slate-600 mt-0.5">Is this your child?</p>
          </div>

          <div className="px-6 py-8 space-y-6">
            {/* Student Card */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest">Student Name</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{studentDetails.full_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest">Admission No.</p>
                    <p className="text-sm font-mono text-sky-600 mt-0.5">{studentDetails.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest">Class</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{studentDetails.class_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                setStep('input');
                setAdmissionNumber('');
                setStudentDetails(null);
                setError('');
              }}
              disabled={loading}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              Try Another
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <>
                  Yes, Link Student
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
              <Check size={32} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Success!</h2>
              <p className="text-sm text-slate-600 mt-2">
                {studentDetails?.full_name} has been linked to your account. Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
