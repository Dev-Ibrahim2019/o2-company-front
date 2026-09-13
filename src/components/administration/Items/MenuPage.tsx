// src/components/administration/Items/MenuPage.tsx
// Wires: useItems + useDepartments + ItemsTable (tree) + ItemModal (auto-code)

import { useState } from 'react';
import ItemsStats from './ItemsStats';
import ItemsSearch from './ItemsSearch';
import ItemsTable from './ItemsTable';
import ItemsListTable from './ItemsListTable';
import ItemModal from './ItemModal';
import SubGroupModal from './SubGroupModal';
import { useItems } from '../../../hooks/useItem';
import { useDepartments } from '../../../hooks/useDepartments';
import { useBranch } from '../../../hooks/useBranch';
import type { Item } from '../../../services/itemService';
import type { Department as DepartmentModel } from '../../../services/departmentService';

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
    initialMode?: 'tree' | 'list';
}

const MenuPage = ({ initialMode = 'tree' }: Props) => {
    const { items, loading: itemsLoading, error: itemsError, addItem, editItem, removeItem } = useItems();
    const { departments, loading: deptsLoading, addDepartment, updateDepartment } = useDepartments();
    const { branches, loading: branchesLoading } = useBranch();

    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        departmentId: 'all',
        status: 'all',
        popular: false,
        chefRecommended: false,
        seasonal: false,
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [subGroupModalOpen, setSubGroupModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [editingSubGroup, setEditingSubGroup] = useState<Department | null>(null);
    const [defaultDeptId, setDefaultDeptId] = useState<number | null>(null);

    // Build nested department tree (assuming useDepartments returns flat list)
    const buildTree = (depts: Department[]): Department[] => {
        const map = new Map<number, Department>();
        depts.forEach(d => map.set(d.id, { ...d, children: [] }));
        const roots: Department[] = [];
        map.forEach(d => {
            const parentId = d.parent_id ?? d.parentId ?? null;
            if (parentId && map.has(parentId)) {
                map.get(parentId)!.children!.push(d);
            } else {
                roots.push(d);
            }
        });
        return roots;
    };

    const deptTree = buildTree(departments as Department[]);

    const filteredItems = items.filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = query
            ? item.name.toLowerCase().includes(query) ||
              item.name_ar.toLowerCase().includes(query) ||
              item.code.toLowerCase().includes(query)
            : true;
        const matchesDepartment = filters.departmentId === 'all'
            ? true
            : item.department_id === Number(filters.departmentId);
        const matchesStatus = filters.status === 'all'
            ? true
            : filters.status === 'AVAILABLE'
                ? item.is_active
                : filters.status === 'UNAVAILABLE'
                    ? !item.is_active
                    : true;

        return matchesSearch && matchesDepartment && matchesStatus;
    });

    const openAddModal = (dept?: Department) => {
        setEditingItem(null);
        setDefaultDeptId(dept?.id ?? null);
        setModalOpen(true);
    };

    const openEditModal = (item: Item) => {
        setEditingItem(item);
        setDefaultDeptId(null);
        setModalOpen(true);
    };

    const handleSave = async (data: any) => {
        if (editingItem) {
            await editItem(editingItem.id, data);
        } else {
            await addItem(data);
        }
        setModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
        await removeItem(id);
    };

    const openAddSubGroup = () => {
        setEditingSubGroup(null);
        setSubGroupModalOpen(true);
    };

    const openEditSubGroup = (department: Department) => {
        setEditingSubGroup(department);
        setSubGroupModalOpen(true);
    };

    const handleSaveSubGroup = async (data: Omit<DepartmentModel, 'id'>, id?: number) => {
        if (id) {
            await updateDepartment(id, data);
        } else {
            await addDepartment(data);
        }
        setSubGroupModalOpen(false);
        setEditingSubGroup(null);
    };

    if (itemsLoading || deptsLoading || branchesLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-slate-900 border border-white/5 rounded-2xl h-20" />
                    ))}
                </div>
                <div className="bg-slate-900 border border-white/5 rounded-2xl h-12" />
                <div className="bg-slate-900 border border-white/5 rounded-2xl h-64" />
            </div>
        );
    }

    if (itemsError) {
        return (
            <div className="flex items-center justify-center h-64 text-red-400">
                {itemsError}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ItemsStats />

            <ItemsSearch
                query={searchQuery}
                setQuery={setSearchQuery}
                filters={filters}
                setFilters={setFilters}
                filteredCount={filteredItems.length}
                onAddItem={() => openAddModal()}
                onAddSubGroup={openAddSubGroup}
            />

            {initialMode === 'tree' ? (
                <ItemsTable
                    departments={deptTree}
                    items={items}
                    onEditItem={openEditModal}
                    onDeleteItem={handleDelete}
                    onAddItemToDept={openAddModal}
                    onEditSubGroup={openEditSubGroup}
                    searchQuery={searchQuery}
                />
            ) : (
                <ItemsListTable
                    departments={deptTree}
                    items={filteredItems}
                    onEditItem={openEditModal}
                    onDeleteItem={handleDelete}
                />
            )}

            {modalOpen && (
                <ItemModal
                    item={editingItem}
                    departments={deptTree}
                    branches={branches}
                    allItems={items}
                    onSave={handleSave}
                    onClose={() => setModalOpen(false)}
                    defaultDeptId={defaultDeptId}
                />
            )}

            {subGroupModalOpen && (
                <SubGroupModal
                    departments={deptTree}
                    initialDepartment={editingSubGroup}
                    onSave={handleSaveSubGroup}
                    onClose={() => {
                        setSubGroupModalOpen(false);
                        setEditingSubGroup(null);
                    }}
                />
            )}
        </div>
    );
};

export default MenuPage;