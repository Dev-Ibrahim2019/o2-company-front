// src/components/administration/Departments/DepartmentsPage.tsx

import { useState } from 'react';
import { useDepartments } from '../../../hooks/useDepartments';
import DepartmentsHeader from './Departmentsheader ';
import DepartmentModal from './DepartmentModal';
import DepartmentApiCard from './Departmentcard';
import type { Department } from '../../../services/departmentService';

type SubView = 'LIST' | 'MAP';

const DepartmentsPage = () => {
  const { departments, loading, error, addDepartment, updateDepartment, deleteDepartment } = useDepartments();

  const [subView, setSubView] = useState<SubView>('LIST');
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ إضافة searchQuery كان ناقصاً
  const [searchQuery, setSearchQuery] = useState('');

  const openModal = (dept: Department | null = null) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: any) => {
    if (editingDept) {
      await updateDepartment(editingDept.id, formData);
    } else {
      await addDepartment(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    await deleteDepartment(Number(id));
  };

  // ✅ تصفية الأقسام بناءً على searchQuery
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.nameAr ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Skeleton loading
  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-slate-900 border border-white/5 rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-800 rounded" />
            <div className="h-3 bg-slate-800 rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ✅ تمرير searchQuery و onSearchChange */}
      <DepartmentsHeader
        subView={subView}
        onSubViewChange={setSubView}
        onAddDepartment={() => openModal()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {subView === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map(dept => (
            <DepartmentApiCard
              key={dept.id}
              dept={dept}
              onEdit={() => openModal(dept)}
              onDelete={() => handleDelete(dept.id)}
            />
          ))}

          {filteredDepartments.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500">
              لا توجد أقسام مطابقة للبحث
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-slate-500">
          خريطة المطبخ — قريباً
        </div>
      )}

      {isModalOpen && (
        <DepartmentModal
          dept={editingDept}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DepartmentsPage;