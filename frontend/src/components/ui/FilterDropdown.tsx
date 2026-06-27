import { useState, useEffect, useRef } from 'react';

export interface DropdownOption {
    id: string;
    label: string;
}

interface FilterDropdownProps {
    icon?: React.ReactNode;
    value: string;
    options: DropdownOption[];
    onChange: (id: string) => void;
    placeholder?: string;
    label?: string;          // Optional label shown above (for form use)
    fullWidth?: boolean;     // Stretch to fill parent container width
    className?: string;
}

/**
 * FilterDropdown – styled floating-panel dropdown.
 *
 * Replaces native <select> elements across the app with a consistent
 * design: dark pill trigger + animated chevron + white floating panel
 * with a pointer-arrow tip, smooth scale/opacity transitions,
 * hover-to-open and click-outside-to-close.
 */
export default function FilterDropdown({
    icon,
    value,
    options,
    onChange,
    placeholder = 'Select…',
    label,
    fullWidth = false,
    className = '',
}: FilterDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = options.find(o => o.id === value);

    return (
        <div className={`${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
            {label && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    {label}
                </p>
            )}

            <div
                ref={ref}
                className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}
                onMouseLeave={() => setOpen(false)}
            >
                {/* ── Trigger button ─────────────────────────────────── */}
                <button
                    type="button"
                    onMouseEnter={() => setOpen(true)}
                    onClick={() => setOpen(v => !v)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                               text-slate-300 bg-slate-800/80 border border-white/10
                               hover:border-amber-500/40 hover:text-white
                               focus:outline-none focus:border-amber-500/60
                               transition-all duration-300
                               ${fullWidth ? 'w-full justify-between' : ''}`}
                >
                    {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
                    <span className="flex-1 text-left truncate max-w-[160px]">
                        {selected?.label ?? placeholder}
                    </span>
                    {/* Chevron */}
                    <svg
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        className={`flex-shrink-0 w-4 h-4 text-slate-500
                                    transition-transform duration-300 ease-in-out
                                    ${open ? 'rotate-180' : ''}`}
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>

                {/* ── Floating panel ─────────────────────────────────── */}
                <div
                    className={`absolute left-0 z-[999] pt-2 transition-all duration-200 ease-out origin-top
                               ${open
                            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                        }`}
                    style={{ minWidth: '160px', ...(fullWidth ? { width: '100%' } : {}) }}
                >
                    <div className="relative py-1 bg-white border border-gray-200 rounded-xl shadow-2xl">
                        {/* Pointer arrow */}
                        <div
                            className="absolute top-0 left-5 w-3.5 h-3.5 origin-center rotate-45 -translate-y-[7px]
                                       bg-white border-t border-l border-gray-200 rounded-sm pointer-events-none"
                        />
                        <div className="relative max-h-52 overflow-y-auto">
                            {options.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => { onChange(opt.id); setOpen(false); }}
                                    className={`block w-full text-left px-4 py-2 text-xs font-medium
                                               whitespace-nowrap transition-colors duration-150
                                               ${opt.id === value
                                            ? 'bg-amber-50 text-amber-700 font-semibold'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <p className="px-4 py-2 text-xs text-gray-400 italic">No options</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
