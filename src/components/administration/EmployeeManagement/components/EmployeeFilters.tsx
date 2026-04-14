import React from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { EmployeeStatus } from '../../../../../types';
import type { Department } from '../../../../../types';
import { getStatusLabel } from '../utils';

interface EmployeeFiltersProps {
    searchQuery: string;
    onSearchChange: (v: string) => void;
    selectedDept: string;
    onDeptChange: (v: string) => void;
    selectedStatus: string;
    onStatusChange: (v: string) => void;
    viewMode: 'GRID' | 'TABLE';
    onViewModeChange: (v: 'GRID' | 'TABLE') => void;
    departments: Department[];
}

const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
    searchQuery, onSearchChange,
    selectedDept, onDeptChange,
    selectedStatus, onStatusChange,
    viewMode, onViewModeChange,
    departments,
}) => (
    <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="البحث بالاسم أو الرقم الوظيفي..."
                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <select
                value={selectedDept}
                onChange={e => onDeptChange(e.target.value)}
                className="bg-slate-900 border border-white/5 text-white px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-red-500/50 transition-all"
            >
                <option value="ALL">جميع الأقسام</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
            </select>

            <select
                value={selectedStatus}
                onChange={e => onStatusChange(e.target.value)}
                className="bg-slate-900 border border-white/5 text-white px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-red-500/50 transition-all"
            >
                <option value="ALL">جميع الحالات</option>
                {Object.values(EmployeeStatus).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>

            <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                <button
                    onClick={() => onViewModeChange('GRID')}
                    className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    <LayoutGrid size={18} />
                </button>
                <button
                    onClick={() => onViewModeChange('TABLE')}
                    className={`p-2 rounded-xl transition-all ${viewMode === 'TABLE' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    <List size={18} />
                </button>
            </div>
        </div>
    </div>
);

export default EmployeeFilters;