import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

// Field Wrapper

interface FieldProps {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}


export function Field({ label, error, required, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {label}
                {required && <span className="text-amber-500 ml-1">*</span>}
            </label>
            {children}
            {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
    );
}



// Shared Input Styles


const inputClass = `w-full px-3.5 py-2.5 rounded-xl border text-white text-sm bg-white/5 border-white/10
                    placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus :border-amber-500/40`.trim();


// Text Input

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
    return (
        <input className={`${inputClass} ${error ? 'border-red-500/50 focus:ring-red-500/20' : ''} ${className}`}
            {...props} />
    );
}


// Select

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    error?: boolean;
    options: { value: string; label: string }[];
    placeholder?: string;
}

export function Select({ error, options, placeholder, className = '', ...props }: SelectProps) {
    return (
        <select
            className={`${inputClass} ${error ? 'border-red-500/50' : ''} ${className}`}
            style={{ colorScheme: 'dark' }}
            {...props}>


            {placeholder && (
                <option value="" disabled style={{ background: '#0d1b2a' }}>
                    {placeholder}
                </option>
            )}
            {options.map((o) => (
                <option key={o.value} value={o.value} style={{ background: '#0d1b2a' }}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}


// TextArea


interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
    return (
        <textarea className={`${inputClass} resize-none ${error ? 'border-red-500/50' : ''} ${className}`}
            rows={3}
            {...props} />
    )
}


// Form Section Divider


export function FormSection({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3 py-1">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest whitespace-nowrap">
                {title}
            </p>
            <div className="flex-1 h-px bg-whit/5" />
        </div>
    )
}


// Submit Button

interface SubmitBtnProps {
    loading: boolean;
    label: string;
    loadingLabel?: string;
}


export function SubmitButton({ loading, label, loadingLabel = 'Saving...' }: SubmitBtnProps) {
    return (
        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
                background: loading
                    ? '#334155'
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(245, 158, 11, 0.25)',
            }}>

            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {loadingLabel}

                </span>
            ) : label}

        </button>
    );
}