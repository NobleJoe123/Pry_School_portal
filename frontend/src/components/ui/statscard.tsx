import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
    label: string;
    value: number | string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    trend?: {
        value: number;
        label: string;

    };
    loading?: boolean;
}


export default function StatsCard({
    label, value, icon, iconBg, iconColor, trend, loading = false, }: StatsCardProps) {
        const isPositive = (trend?.value ?? 0) >= 0;

        return(
            <div className="rounded-2xl p-5 border border-white/5 flex flex flex-col gap-4 hover:border-white/10 transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}>

                {/* Top row */}

                <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-x1 ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                        {icon}
                    </div>
                    {trend && !loading && (
                        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-500/10 text-emerald-400': 'bg-red-500/10 text-red-400'}`}>
                            {isPositive
                                ? <TrendingUp size={12} />
                                : <TrendingDown size={12} />}
                            {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>

                {/* Value */}
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
                    </div>
                ) : (
                    <div> 
                        <p className="text-white text-2xl font-bold leading-none mb-1">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                        <p className="text-slate-500 text-xs font-medium">{label}</p>
                        {trend && (
                            <p className="text-slate-600 text-[10px] mt-1">{trend.label}</p>
                        )}
                    </div>    
                )}

            </div>
        );
    }
