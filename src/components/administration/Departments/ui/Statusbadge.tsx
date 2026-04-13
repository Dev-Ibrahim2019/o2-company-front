// ui/StatusBadge.tsx
type Status = 'ACTIVE' | 'BUSY' | 'INACTIVE' | string;

interface StatusBadgeProps {
    status: Status;
    className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'نشط', className: 'bg-emerald-500/10 text-emerald-500' },
    BUSY: { label: 'مزدحم', className: 'bg-orange-500/10 text-orange-500' },
    INACTIVE: { label: 'معطل', className: 'bg-slate-500/10 text-slate-500' },
};

const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE;
    return (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${config.className} ${className}`}>
            {config.label}
        </span>
    );
};

export default StatusBadge;