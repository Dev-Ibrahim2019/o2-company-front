// DepartmentsHeader.tsx
import { Search, Plus, LayoutGrid, Map } from 'lucide-react';

type SubView = 'LIST' | 'MAP';

interface DepartmentsHeaderProps {
    subView: SubView;
    onSubViewChange: (view: SubView) => void;
    onAddDepartment: () => void;
    searchQuery: string;           // ← أضف
    onSearchChange: (q: string) => void; // ← أضف
}



const DepartmentsHeader = ({ subView, onSubViewChange, onAddDepartment, searchQuery,
    onSearchChange }: DepartmentsHeaderProps) => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-slate-900 border border-white/5 p-1 rounded-xl">
                <ViewToggleButton
                    active={subView === 'LIST'}
                    onClick={() => onSubViewChange('LIST')}
                    icon={<LayoutGrid size={18} />}
                    label="قائمة الأقسام"
                />
                <ViewToggleButton
                    active={subView === 'MAP'}
                    onClick={() => onSubViewChange('MAP')}
                    icon={<Map size={18} />}
                    label="خريطة المطبخ"
                />
            </div>

            {/* Search + Add */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <SearchInput
                    value={searchQuery}
                    onChange={onSearchChange}
                />
                <AddButton onClick={onAddDepartment} />
            </div>
        </div>
    );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

interface ViewToggleButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const ViewToggleButton = ({ active, onClick, icon, label }: ViewToggleButtonProps) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${active
            ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
            : 'text-slate-400 hover:text-white'
            }`}
    >
        {icon}
        {label}
    </button>
);

const SearchInput = ({
    value,
    onChange
}: {
    value: string;
    onChange: (v: string) => void;
}) => (
    <div className="relative flex-1 md:w-64">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="البحث عن قسم..."
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
        />
    </div>
);

interface AddButtonProps {
    onClick: () => void;
}

const AddButton = ({ onClick }: AddButtonProps) => (
    <button
        onClick={onClick}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20 whitespace-nowrap"
    >
        <Plus size={18} />
        إضافة قسم
    </button>
);

export default DepartmentsHeader;