import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2, Trash2, X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
}

export interface AlertOptions {
    title?: string;
    message: string;
    buttonText?: string;
    variant?: DialogVariant;
}

interface DialogContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
    showAlert: (options: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Confirmation dialog state
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText: string;
        cancelText: string;
        variant: DialogVariant;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        title: 'Confirm Action',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'warning',
        resolve: null,
    });

    // Alert dialog state
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        buttonText: string;
        variant: DialogVariant;
        resolve: (() => void) | null;
    }>({
        isOpen: false,
        title: 'Notification',
        message: '',
        buttonText: 'OK',
        variant: 'info',
        resolve: null,
    });

    const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
        return new Promise((resolve) => {
            const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
            setConfirmState({
                isOpen: true,
                title: opts.title || (opts.variant === 'danger' ? 'Confirm Deletion' : 'Are you sure?'),
                message: opts.message,
                confirmText: opts.confirmText || (opts.variant === 'danger' ? 'Delete' : 'Confirm'),
                cancelText: opts.cancelText || 'Cancel',
                variant: opts.variant || 'warning',
                resolve: () => resolve,
            });
        });
    }, []);

    const showAlert = useCallback((options: AlertOptions | string): Promise<void> => {
        return new Promise((resolve) => {
            const opts: AlertOptions = typeof options === 'string' ? { message: options } : options;
            setAlertState({
                isOpen: true,
                title: opts.title || (opts.variant === 'danger' ? 'Error' : opts.variant === 'success' ? 'Success' : 'Notice'),
                message: opts.message,
                buttonText: opts.buttonText || 'OK',
                variant: opts.variant || 'info',
                resolve: () => resolve,
            });
        });
    }, []);

    const handleConfirmClose = (result: boolean) => {
        if (confirmState.resolve) {
            confirmState.resolve(result);
        }
        setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    };

    const handleAlertClose = () => {
        if (alertState.resolve) {
            alertState.resolve();
        }
        setAlertState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    };

    const getVariantStyles = (variant: DialogVariant) => {
        switch (variant) {
            case 'danger':
                return {
                    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    icon: <Trash2 className="w-6 h-6 text-rose-400" />,
                    btnClass: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/20',
                };
            case 'warning':
                return {
                    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
                    btnClass: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-amber-500/20',
                };
            case 'success':
                return {
                    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
                    btnClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-emerald-500/20',
                };
            default:
                return {
                    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    icon: <Info className="w-6 h-6 text-blue-400" />,
                    btnClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20',
                };
        }
    };

    const confirmStyles = getVariantStyles(confirmState.variant);
    const alertStyles = getVariantStyles(alertState.variant);

    return (
        <DialogContext.Provider value={{ confirm, showAlert }}>
            {children}

            {/* In-Site Confirmation Modal */}
            {confirmState.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in"
                        onClick={() => handleConfirmClose(false)}
                    />
                    <div
                        className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                        style={{ background: 'linear-gradient(145deg, #0d1b2a 0%, #0a1628 100%)' }}
                    >
                        <button
                            type="button"
                            onClick={() => handleConfirmClose(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl border shrink-0 ${confirmStyles.badgeBg}`}>
                                {confirmStyles.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white leading-tight">
                                    {confirmState.title}
                                </h3>
                                <p className="text-slate-400 text-sm mt-2 leading-relaxed whitespace-pre-line">
                                    {confirmState.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => handleConfirmClose(false)}
                                className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all"
                            >
                                {confirmState.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirmClose(true)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all ${confirmStyles.btnClass}`}
                            >
                                {confirmState.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-Site Alert Modal */}
            {alertState.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in"
                        onClick={handleAlertClose}
                    />
                    <div
                        className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                        style={{ background: 'linear-gradient(145deg, #0d1b2a 0%, #0a1628 100%)' }}
                    >
                        <button
                            type="button"
                            onClick={handleAlertClose}
                            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl border shrink-0 ${alertStyles.badgeBg}`}>
                                {alertStyles.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white leading-tight">
                                    {alertState.title}
                                </h3>
                                <p className="text-slate-400 text-sm mt-2 leading-relaxed whitespace-pre-line">
                                    {alertState.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end mt-6 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={handleAlertClose}
                                className={`px-5 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all ${alertStyles.btnClass}`}
                            >
                                {alertState.buttonText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};

export const useDialog = (): DialogContextType => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};
