import { useState, useRef, useCallback } from 'react';
import {
    Upload, X, CheckCircle, AlertCircle, Camera, FileText,
    Phone, MapPin, Heart, Loader2, ShieldCheck,
} from 'lucide-react';
import { api, endpoints } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FieldErrors {
    phone?: string;
    address?: string;
    relationship_to_student?: string;
    passport_photo?: string;
    id_document?: string;
    general?: string;
}

interface Props {
    onComplete: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// File Drop Zone
// ─────────────────────────────────────────────────────────────────────────────

interface FileDropProps {
    label: string;
    hint: string;
    icon: React.ReactNode;
    value: File | null;
    accept: string;
    error?: string;
    onChange: (file: File | null) => void;
    id: string;
}

function FileDrop({ label, hint, icon, value, accept, error, onChange, id }: FileDropProps) {
    const ref = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const validate = (file: File): string | null => {
        const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
        const allowedDocs = [...allowedImages, 'application/pdf'];
        const allowed = accept.includes('pdf') ? allowedDocs : allowedImages;
        if (!allowed.includes(file.type)) return `Invalid file type. Allowed: ${accept.includes('pdf') ? 'JPG, PNG, WEBP, PDF' : 'JPG, PNG, WEBP'}`;
        if (file.size > 3 * 1024 * 1024) return 'File must be less than 3 MB';
        return null;
    };

    const handleFile = (file: File) => {
        const err = validate(file);
        if (err) {
            onChange(null);
            // surface via error prop via parent — we emit the invalid file so parent can catch
            // For UX simplicity: show alert inline
            alert(err);
            return;
        }
        onChange(file);
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, []);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);

    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                {icon} {label} <span className="text-red-400">*</span>
            </label>
            <div
                onClick={() => ref.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 transition-all select-none
                    ${dragging ? 'border-sky-400 bg-sky-500/10' : error ? 'border-red-500/50 bg-red-500/5' : value ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}
                style={{ minHeight: 110 }}
            >
                {value ? (
                    <>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                            <CheckCircle size={20} />
                        </div>
                        <p className="text-emerald-400 text-xs font-semibold text-center truncate max-w-full px-2">{value.name}</p>
                        <p className="text-slate-500 text-[10px]">{(value.size / 1024).toFixed(0)} KB</p>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(null); }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </>
                ) : (
                    <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${error ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-slate-500'}`}>
                            <Upload size={18} />
                        </div>
                        <p className="text-slate-400 text-xs font-semibold">Drop file here or click to browse</p>
                        <p className="text-slate-600 text-[10px]">{hint}</p>
                    </>
                )}
            </div>
            {error && (
                <p className="text-red-400 text-[10px] flex items-center gap-1">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
            <input ref={ref} type="file" id={id} accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ParentProfileCompletionModal({ onComplete }: Props) {
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [relationship, setRelationship] = useState('');
    const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
    const [idDocument, setIdDocument] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [done, setDone] = useState(false);

    const validate = (): boolean => {
        const errs: FieldErrors = {};
        if (!phone.trim()) errs.phone = 'Phone number is required';
        else if (!/^\+?[\d\s\-()]{9,17}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number';
        if (!address.trim()) errs.address = 'Residential address is required';
        if (!relationship) errs.relationship_to_student = 'Please select your relationship to the pupil';
        if (!passportPhoto) errs.passport_photo = 'Passport photo is required';
        if (!idDocument) errs.id_document = 'ID document is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setErrors({});

        const formData = new FormData();
        formData.append('phone', phone.trim());
        formData.append('address', address.trim());
        formData.append('relationship_to_student', relationship);
        formData.append('passport_photo', passportPhoto!);
        formData.append('id_document', idDocument!);

        try {
            await api.postFormData(endpoints.auth.parentCompleteProfile, formData);
            setDone(true);
            setTimeout(() => onComplete(), 2000);
        } catch (err: any) {
            const msg = err.message || '';
            // Try to parse field errors from message
            setErrors({ general: msg || 'Submission failed. Please check your inputs and try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = (field: keyof FieldErrors) =>
        `w-full px-4 py-3 rounded-xl border text-white text-sm font-medium bg-white/[0.04] placeholder-slate-600 outline-none transition-all
        ${errors[field] ? 'border-red-500/50 focus:border-red-400' : 'border-white/10 focus:border-sky-500/50 focus:bg-white/[0.06]'}`;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(2, 6, 15, 0.95)', backdropFilter: 'blur(24px)' }}>

            {/* Success State */}
            {done ? (
                <div className="flex flex-col items-center gap-4 text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                        <CheckCircle size={40} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">Profile Complete!</h2>
                        <p className="text-slate-400 text-sm mt-1">Redirecting you to your dashboard…</p>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[95vh] flex flex-col">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-white/5 shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a, #070e1a)' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h1 className="text-white font-black text-lg leading-tight">Complete Your Profile</h1>
                                <p className="text-slate-500 text-xs">Required before accessing your dashboard</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                            <AlertCircle size={13} className="shrink-0 mt-0.5" />
                            <span>Your profile must be verified by the school before you can access pupil information. Please provide accurate details and upload clear documents.</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                        {errors.general && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle size={14} /> {errors.general}
                            </div>
                        )}

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Phone size={10} /> Phone Number <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="tel"
                                placeholder="+234 800 000 0000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={inputClass('phone')}
                            />
                            {errors.phone && <p className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={10} />{errors.phone}</p>}
                        </div>

                        {/* Relationship */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Heart size={10} /> Relationship to Pupil <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={relationship}
                                onChange={(e) => setRelationship(e.target.value)}
                                className={`${inputClass('relationship_to_student')} appearance-none`}
                            >
                                <option value="" disabled className="bg-slate-900">Select relationship…</option>
                                <option value="father" className="bg-slate-900">Father</option>
                                <option value="mother" className="bg-slate-900">Mother</option>
                                <option value="guardian" className="bg-slate-900">Guardian</option>
                                <option value="other" className="bg-slate-900">Other</option>
                            </select>
                            {errors.relationship_to_student && <p className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={10} />{errors.relationship_to_student}</p>}
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin size={10} /> Residential Address <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Enter your full residential address…"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className={`${inputClass('address')} resize-none`}
                            />
                            {errors.address && <p className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={10} />{errors.address}</p>}
                        </div>

                        {/* File Uploads */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FileDrop
                                id="passport_photo"
                                label="Passport Photo"
                                hint="JPG, PNG, or WEBP · max 3 MB"
                                icon={<Camera size={10} />}
                                accept="image/jpeg,image/png,image/webp"
                                value={passportPhoto}
                                error={errors.passport_photo}
                                onChange={setPassportPhoto}
                            />
                            <FileDrop
                                id="id_document"
                                label="ID Document"
                                hint="NIN, Driver's Licence, etc. · max 3 MB"
                                icon={<FileText size={10} />}
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                value={idDocument}
                                error={errors.id_document}
                                onChange={setIdDocument}
                            />
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/5 shrink-0 bg-slate-950/50">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-sky-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                            ) : (
                                <><ShieldCheck size={16} /> Complete Profile & Access Dashboard</>
                            )}
                        </button>
                        <p className="text-center text-slate-600 text-[10px] mt-3">
                            Your information is securely stored and only accessible to school administrators.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
