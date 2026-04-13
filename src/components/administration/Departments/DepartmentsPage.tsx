// src/components/administration/Departments/DepartmentsPage.tsx

import { useState } from 'react';
import { useDepartments } from '../../../hooks/useDepartments';
import DepartmentsHeader from './DepartmentsHeader ';
import DepartmentCard from './DepartmentCard';
import DepartmentKitchenMap from './Departmentkitchenmap';
import DepartmentModal from './DepartmentModal';

type SubView = 'LIST' | 'MAP';

const DepartmentsPage = () => {
  const {
    departments,
    loading,
    error,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();

  const [subView, setSubView] = useState<SubView>('LIST');
  const [editingDept, setEditingDept] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (dept: any = null) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    await deleteDepartment(Number(id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      جاري التحميل...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400">
      {error}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DepartmentsHeader
        subView={subView}
        onSubViewChange={setSubView}
        onAddDepartment={() => openModal()}
      />

      {subView === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              menuItems={[]}
              activeOrders={[]}
              employees={[]}
              onEdit={openModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <DepartmentKitchenMap
          departments={departments}
          activeOrders={[]}
          onEditDepartment={openModal}
        />
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