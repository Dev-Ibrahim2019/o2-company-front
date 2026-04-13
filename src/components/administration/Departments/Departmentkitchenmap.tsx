// DepartmentKitchenMap.tsx
import { ChefHat } from 'lucide-react';
import DepartmentStationCard from "./Departmentstationcard";

const STATION_COUNT = 8;

interface DepartmentKitchenMapProps {
    departments: any[];
    activeOrders: any[];
    onEditDepartment: (dept: any) => void;
}

const DepartmentKitchenMap = ({ departments, activeOrders, onEditDepartment }: DepartmentKitchenMapProps) => (
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 min-h-[600px] relative overflow-hidden">
        {/* Dot grid background */}
        <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        <div className="relative z-10 h-full flex flex-col">
            <MapHeader />
            <MapSummary departments={departments} activeOrders={activeOrders} />

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Aggregator banner spans full width */}
                <AggregatorArea />

                {Array.from({ length: STATION_COUNT }, (_, i) => i + 1).map(stationNum => {
                    const dept = departments.find(d => d.stationNumber === stationNum.toString());
                    return (
                        <DepartmentStationCard
                            key={stationNum}
                            stationNum={stationNum}
                            dept={dept}
                            activeOrders={activeOrders}
                            onEdit={onEditDepartment}
                        />
                    );
                })}
            </div>
        </div>
    </div>
);

// ─── Sub-sections ───────────────────────────────────────────────────────────────

const MapHeader = () => (
    <div className="flex items-center justify-between mb-8">
        <div>
            <h3 className="text-xl font-bold text-white">تخطيط محطات العمل (Kitchen Map)</h3>
            <p className="text-sm text-slate-500">توزيع الأقسام داخل المطبخ الرئيسي ومراقبة الحالة</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
            <LegendItem color="bg-emerald-500" label="نشط" />
            <LegendItem color="bg-orange-500" label="مزدحم" />
            <LegendItem color="bg-slate-500" label="معطل" />
        </div>
    </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-slate-400">{label}</span>
    </div>
);

const MapSummary = ({ departments, activeOrders }: { departments: any[]; activeOrders: any[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="إجمالي الأقسام" value={departments.length} colorClass="bg-slate-800/40 border-white/5" textClass="" />
        <SummaryCard label="أقسام نشطة" value={departments.filter(d => d.status === 'ACTIVE').length} colorClass="bg-emerald-500/5 border-emerald-500/10" textClass="text-emerald-500" />
        <SummaryCard label="أقسام مزدحمة" value={departments.filter(d => d.status === 'BUSY').length} colorClass="bg-orange-500/5 border-orange-500/10" textClass="text-orange-500" />
        <SummaryCard label="إجمالي الطلبات" value={activeOrders.length} colorClass="bg-blue-500/5 border-blue-500/10" textClass="text-blue-500" />
    </div>
);

const SummaryCard = ({
    label, value, colorClass, textClass,
}: { label: string; value: number; colorClass: string; textClass: string }) => (
    <div className={`border rounded-2xl p-4 ${colorClass}`}>
        <p className={`text-[10px] uppercase font-bold mb-1 ${textClass || 'text-slate-500'}`}>{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
    </div>
);

const AggregatorArea = () => (
    <div className="sm:col-span-2 lg:col-span-4 bg-slate-800/40 border border-dashed border-white/10 rounded-2xl flex items-center justify-center p-8">
        <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                <ChefHat size={24} />
            </div>
            <p className="text-sm font-bold text-white uppercase tracking-widest">منطقة تجميع الطلبات (Aggregator Area)</p>
            <p className="text-[10px] text-slate-500">نقطة خروج الطلبات النهائية وتجميع الوجبات</p>
        </div>
    </div>
);

export default DepartmentKitchenMap;