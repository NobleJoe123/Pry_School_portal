import { Clock } from 'lucide-react';

interface EnrollmentPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnrollmentPendingModal({ isOpen, onClose }: EnrollmentPendingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Request Under Review</h2>
              <p className="text-xs text-slate-600 mt-0.5">Your enrollment is pending admin approval</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Your enrollment request is currently under review. Our administration team will carefully evaluate your application and notify you once it has been approved or if any additional information is required.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-900 mb-2">⏱ Timeline</p>
              <p className="text-xs text-amber-800">
                This typically takes 2-5 business days. You will receive an email confirmation with your child's admission number(s) once approved.
              </p>
            </div>

            <p className="text-xs text-slate-500 text-center">
              You can browse the dashboard while waiting for approval.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
