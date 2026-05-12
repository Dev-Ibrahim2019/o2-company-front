// src/components/administration/Items/ItemsTable.tsx
// Tree-style expandable rows mirroring department hierarchy (matches the notebook image)

import { useState, useMemo } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Edit2,
    Trash2,
    Plus,
    Layers,
    Package,
    Hash,
    Circle,
    Image as ImageIcon,
} from 'lucide-react';
import { getItemImageUrl, type Item } from '../../../services/itemService';

interface Department {
    id: number;
    name: string;
    nameAr?: string;
    code?: string;
    parent_id?: number | null;
    parentId?: number | null;
    children?: Department[];
    color?: string;
}

interface Props {
    departments: Department[];   // nested tree from API
    items: Item[];               // flat list from API
    onEditItem: (item: Item) => void;
    onDeleteItem: (id: number) => void;
    onAddItemToDept: (dept: Department) => void;
    onEditSubGroup?: (dept: Department) => void;
    searchQuery?: string;
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

interface TreeNodeProps {
    dept: Department;
    items: Item[];
    depth: number;
    onEditItem: (item: Item) => void;
    onDeleteItem: (id: number) => void;
    onAddItemToDept: (dept: Department) => void;
    onEditSubGroup?: (dept: Department) => void;
    searchQuery: string;
}

const DEPTH_INDENT = 28; // px per level

const formatPrice = (price?: number | string | null) => {
    if (price === undefined || price === null || price === '') return '-';
    const value = Number(price);
    if (Number.isNaN(value)) return String(price);
    return value.toLocaleString('ar-SA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

const getDisplayPrice = (item: Item) => {
    if (item.price !== undefined && item.price !== null && item.price !== '') return item.price;
    const pivotRows = item.branch_item ?? item.branch_items ?? item.branch_prices;
    if (pivotRows?.length) return pivotRows[0]?.price;
    const branch = item.branches?.find((entry) => entry.pivot?.price !== undefined || entry.price !== undefined);
    return branch?.pivot?.price ?? branch?.price ?? null;
};

const TreeNode = ({
    dept,
    items,
    depth,
    onEditItem,
    onDeleteItem,
    onAddItemToDept,
    onEditSubGroup,
    searchQuery,
}: TreeNodeProps) => {
    const [expanded, setExpanded] = useState(depth < 2); // auto-open first 2 levels

    const deptItems = items.filter(i => {
        const matchesDept = i.department_id === dept.id;
        const matchesSearch = searchQuery
            ? i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              i.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
              i.code.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        return matchesDept && matchesSearch;
    });

    const hasChildren = (dept.children?.length ?? 0) > 0 || deptItems.length > 0;
    const color = dept.color ?? '#ef4444';

    // highlight matching search
    const matchesDeptSearch = searchQuery
        ? dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dept.nameAr ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dept.code ?? '').includes(searchQuery)
        : true;

    if (!matchesDeptSearch && deptItems.length === 0 && !dept.children?.some(() => true)) {
        return null;
    }

    return (
        <div>
            {/* ── Department Row ── */}
            <div
                className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                style={{ paddingRight: `${12 + depth * DEPTH_INDENT}px` }}
                onClick={() => setExpanded(e => !e)}
            >
                {/* Tree connector line visual */}
                {depth > 0 && (
                    <div className="shrink-0 flex items-center">
                        <div
                            className="border-r border-b border-white/10 rounded-br"
                            style={{ width: 12, height: 12, marginLeft: -4 }}
                        />
                    </div>
                )}

                {/* Expand chevron */}
                <span className="shrink-0 text-slate-500">
                    {hasChildren
                        ? expanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />
                        : <span className="w-3.5 h-3.5 inline-block" />
                    }
                </span>

                {/* Dept color dot */}
                <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />

                {/* Dept code badge */}
                {dept.code && (
                    <span className="shrink-0 text-[10px] font-mono font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md border border-white/5">
                        {dept.code}
                    </span>
                )}

                {/* Dept name */}
                <span className="font-bold text-white text-sm flex-1">
                    {dept.nameAr ?? dept.name}
                </span>

                {/* Item count badge */}
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-white/5">
                    {deptItems.length} صنف
                </span>

                {/* Edit subgroup button */}
                {(dept.parent_id ?? dept.parentId) && onEditSubGroup && (
                    <button
                        onClick={e => { e.stopPropagation(); onEditSubGroup(dept); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20"
                        title="تعديل المجموعة الفرعية"
                    >
                        <Edit2 size={13} />
                    </button>
                )}

                {/* Add item button */}
                <button
                    onClick={e => { e.stopPropagation(); onAddItemToDept(dept); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20"
                    title="إضافة صنف لهذا القسم"
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* ── Expanded Content ── */}
            {expanded && (
                <div>
                    {/* Child departments */}
                    {dept.children?.map(child => (
                        <TreeNode
                            key={child.id}
                            dept={child}
                            items={items}
                            depth={depth + 1}
                            onEditItem={onEditItem}
                            onDeleteItem={onDeleteItem}
                            onAddItemToDept={onAddItemToDept}
                            onEditSubGroup={onEditSubGroup}
                            searchQuery={searchQuery}
                        />
                    ))}

                    {/* Items in this department */}
                    {deptItems.map((item, idx) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            depth={depth + 1}
                            isLast={idx === deptItems.length - 1}
                            color={color}
                            onEdit={() => onEditItem(item)}
                            onDelete={() => onDeleteItem(item.id)}
                        />
                    ))}

                    {/* Empty state */}
                    {deptItems.length === 0 && !dept.children?.length && (
                        <div
                            className="flex items-center gap-2 py-2 text-[11px] text-slate-600 italic"
                            style={{ paddingRight: `${12 + (depth + 1) * DEPTH_INDENT}px` }}
                        >
                            <Package size={12} />
                            لا توجد أصناف في هذا القسم
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
    item: Item;
    depth: number;
    isLast: boolean;
    color: string;
    onEdit: () => void;
    onDelete: () => void;
}

const ItemRow = ({ item, depth, isLast, color, onEdit, onDelete }: ItemRowProps) => {
    const imageUrl = getItemImageUrl(item);

    return (
    <div
        className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-white/5 transition-colors group"
        style={{ paddingRight: `${12 + depth * DEPTH_INDENT}px` }}
    >
        {/* Tree connector */}
        <div className="shrink-0 flex items-center self-stretch">
            <div className="flex flex-col items-center h-full">
                <div className="w-px flex-1 border-r border-white/10" />
                {!isLast && <div className="w-px flex-1 border-r border-white/10" />}
            </div>
            <div className="w-3 border-b border-white/10" />
        </div>

        {/* Item indicator */}
        <Circle size={6} className="shrink-0" style={{ color, fill: color }} />

        {/* Image */}
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 overflow-hidden flex items-center justify-center text-slate-600 shrink-0">
            {imageUrl ? (
                <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
                <ImageIcon size={13} />
            )}
        </div>

        {/* Code */}
        <span className="shrink-0 text-[11px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
            <Hash size={9} className="text-slate-600" />
            {item.code}
        </span>

        {/* Names */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-sm text-white font-medium truncate">{item.name_ar}</span>
            <span className="text-[11px] text-slate-500 truncate hidden sm:block">{item.name}</span>
        </div>

        {/* Price */}
        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 shrink-0">
            {formatPrice(getDisplayPrice(item))}
        </span>

        {/* Unit */}
        {item.unit && (
            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                {item.unit}
            </span>
        )}

        {/* Status */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
            item.is_active
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-slate-500/10 text-slate-500'
        }`}>
            {item.is_active ? 'نشط' : 'معطل'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                title="تعديل">
                <Edit2 size={13} />
            </button>
            <button onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                title="حذف">
                <Trash2 size={13} />
            </button>
        </div>
    </div>
    );
};

// ─── Root component ───────────────────────────────────────────────────────────

const ItemsTable = ({
    departments,
    items,
    onEditItem,
    onDeleteItem,
    onAddItemToDept,
    onEditSubGroup,
    searchQuery = '',
}: Props) => {
    // Only root departments (no parent) at top level
    const rootDepts = useMemo(
        () => departments.filter(d => !(d.parent_id ?? d.parentId)),
        [departments]
    );

    if (!departments.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                <Layers size={40} className="opacity-30" />
                <p className="text-sm">لا توجد أقسام، أضف قسماً أولاً</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">

            {/* Table header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-red-500" />
                    <span className="text-sm font-bold text-white">شجرة الأصناف</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> قسم</span>
                    <span className="flex items-center gap-1"><Circle size={6} className="text-red-500" fill="currentColor" /> صنف</span>
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-white/5">{items.length} صنف</span>
                </div>
            </div>

            {/* Tree */}
            <div className="p-3">
                {rootDepts.map(dept => (
                    <TreeNode
                        key={dept.id}
                        dept={dept}
                        items={items}
                        depth={0}
                        onEditItem={onEditItem}
                        onDeleteItem={onDeleteItem}
                        onAddItemToDept={onAddItemToDept}
                        onEditSubGroup={onEditSubGroup}
                        searchQuery={searchQuery}
                    />
                ))}

                {rootDepts.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">
                        لا توجد نتائج مطابقة للبحث
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemsTable;
