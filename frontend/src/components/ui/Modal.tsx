import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',

};


export default function Modal({ 
    isOpen, onClose, title, subtitle, children, size = 'md',
}: ModalProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();

        };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className={`relative w-full ${SIZE_CLASSES[size]} rounded-2xl border border-white/10 shadow-2xl overflow-hiden animate-in`}
                style={{ background: 'linear-gradient(145deg, #0d1b2a 0%, #0a1628 100%)' }}>

                <div className="flex items-start justify-between px-6 py-5 border-b border-white/5">
                    <div>
                        <h2 className="text-white font-bold text-lg leading-tight"
                            style={{ fontFamily: "'DM Derif Display', serif" }}>
                            
                            {title}
                        </h2>

                        {subtitle && (
                            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
                        )}

                    </div>
                    <button type="button" onClick={onClose} title="Close modal" className="text-slate-500 hover:text-white transition-colors mt-0.5 ml-4 shrink-0 p-1.5 rounded-lg hover:bg-white/10" >
                        <X size={16} />
                    </button>
                </div>   

                {/* Content */}
                <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}