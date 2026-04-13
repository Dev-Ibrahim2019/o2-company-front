// DepartmentStationCard.tsx
import { Plus, Layers, AlertCircle } from 'lucide-react';
import { OrderStatus } from '../../../../types';

interface DepartmentStationCardProps {
    stationNum: number;
    dept?: any;
    activeOrders: any[];
    onEdit: (dept: any) => void;
}

const DepartmentStationCard = ({ stationNum, dept, activeOrders, onEdit }: DepartmentStationCardProps) => {
    const activeDeptOrders = dept
        ? activeOrders.filter(
            o => o.items.some((i: any) => i.departmentId === dept.id) && o.status !== OrderStatus.COMPLETED
        )
        : [];

    const borderClass = dept
        ? dept.status === 'ACTIVE'
            ? 'bg-slate-800/80 border-white/10 hover:border-red-500/50'
            : dept.status === 'BUSY'
                ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50'
                : 'bg-slate-900/80 border-white/5 opacity-50'
        : 'bg-slate-900/40 border-dashed border-white/5 hover:bg-slate-800/40';

    return (
        <div
            className={`relative rounded-3xl border-2 transition-all flex flex-col items-center justify-center p-6 min-h-[200px] cursor-pointer group ${borderClass}`}
            onClick={() => dept && onEdit(dept)}
        >
            <div className="absolute top-3 left-3 text-[10px] font-bold text-slate-600 tracking-widest">
                STATION {stationNum}
            </div>

            {dept ? <FilledStation dept={dept} activeDeptOrders={activeDeptOrders} /> : <EmptyStation />}
        </div>
    );
};

const FilledStation = ({ dept, activeDeptOrders }: { dept: any; activeDeptOrders: any[] }) => (
    <>
        <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${dept.color || '#ef4444'}20`, color: dept.color || '#ef4444' }}
        >
            {dept.icon || <Layers size={32} />}
        </div>

        <div className="text-center">
            <h4 className="text-sm font-bold text-white">{dept.nameAr || dept.name}</h4>
            <div className="mt-2 flex items-center justify-center gap-2">
                <span
                    className={`w-2 h-2 rounded-full ${dept.status === 'ACTIVE' ? 'bg-emerald-500' : dept.status === 'BUSY' ? 'bg-orange-500' : 'bg-slate-600'
                        }`}
                />
                <span className="text-[10px] text-slate-500 font-bold uppercase">{dept.status}</span>
            </div>
        </div>

        {dept.status === 'BUSY' && (
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-1.5 rounded-full animate-pulse shadow-lg shadow-orange-900/20">
                <AlertCircle size={14} />
            </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-slate-900/95 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs font-bold text-white mb-3">{dept.name}</p>
            <div className="flex flex-col gap-2 w-full max-w-[140px]">
                <HoverRow label="وقت التحضير:" value={`${dept.defaultPrepTime}د`} valueClass="text-white" />
                <HoverRow label="طلبات نشطة:" value={String(activeDeptOrders.length)} valueClass="text-blue-500 font-bold" />
                <HoverRow
                    label="KDS:"
                    value={dept.hasKds ? 'متصل' : 'غير متصل'}
                    valueClass={dept.hasKds ? 'text-emerald-500' : 'text-slate-500'}
                />
            </div>
            <button className="mt-4 text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors">
                تعديل الإعدادات
            </button>
        </div>
    </>
);

const HoverRow = ({ label, value, valueClass }: { label: string; value: string; valueClass: string }) => (
    <div className="flex justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className={valueClass}>{value}</span>
    </div>
);

const EmptyStation = () => (
    <div className="text-center opacity-20 group-hover:opacity-100 transition-opacity">
        <Plus size={24} className="text-slate-500 mx-auto mb-2" />
        <p className="text-[10px] text-slate-500 font-bold">محطة فارغة</p>
    </div>
);

export default DepartmentStationCard;