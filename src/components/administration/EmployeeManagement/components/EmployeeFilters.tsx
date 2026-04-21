// src/components/administration/EmployeeManagement/components/EmployeeFilters.tsx

import type { ReactNode } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { STATUSES } from '../utils';

interface Props {
    searchQuery: string;
    onSearchChange: (v: string) => void;
    selectedDept: number | 'ALL';
    onDeptChange: (v: number | 'ALL') => void;
    selectedBranch: number | 'ALL';          // ← جديد
    onBranchChange: (v: number | 'ALL') => void; // ← جديد
    selectedStatus: string;
    onStatusChange: (v: string) => void;
    viewMode: 'GRID' | 'TABLE';
    onViewModeChange: (v: 'GRID' | 'TABLE') => void;
    departments: { id: number; name: string }[];
    branches: { id: number; name: string }[]; // ← جديد
}

const selectCls =
    'bg-slate-900 border border-white/5 text-white px-4 py-2.5 rounded-2xl text-sm' +
    ' focus:outline-none focus:border-red-500/50 transition-all';

const EmployeeFilters = ({
    searchQuery, onSearchChange,
    selectedDept, onDeptChange,
    selectedBranch, onBranchChange,
    selectedStatus, onStatusChange,
    viewMode, onViewModeChange,
    departments, branches,
}: Props) => (
    <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4">

        {/* البحث */}
        <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم الوظيفي أو الهاتف..."
                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">

            {/* فلتر الفرع — جديد */}
            <select
                value={selectedBranch}
                onChange={e => onBranchChange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className={selectCls}
            >
                <option value="ALL">جميع الفروع</option>
                {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>

            {/* فلتر القسم */}
            <select
                value={selectedDept}
                onChange={e => onDeptChange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className={selectCls}
            >
                <option value="ALL">جميع الأقسام</option>
                {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>

            {/* فلتر الحالة */}
            <select value={selectedStatus} onChange={e => onStatusChange(e.target.value)} className={selectCls}>
                <option value="ALL">جميع الحالات</option>
                {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                ))}
            </select>

            {/* تبديل العرض */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                <ViewBtn active={viewMode === 'GRID'} onClick={() => onViewModeChange('GRID')} title="عرض شبكي">
                    <LayoutGrid size={17} />
                </ViewBtn>
                <ViewBtn active={viewMode === 'TABLE'} onClick={() => onViewModeChange('TABLE')} title="عرض جدولي">
                    <List size={17} />
                </ViewBtn>
            </div>
        </div>
    </div>
);

const ViewBtn = ({ active, onClick, title, children }: {
    active: boolean; onClick: () => void; title: string; children: ReactNode;
}) => (
    <button
        onClick={onClick} title={title}
        className={`p-2 rounded-xl transition-all ${active ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-white'}`}
    >
        {children}
    </button>
);

export default EmployeeFilters;