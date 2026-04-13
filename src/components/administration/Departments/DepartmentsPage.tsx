// DepartmentsPage.tsx
import { useState } from 'react';
import { useApp } from '../../../../store';
import DepartmentsHeader from './Departmentsheader ';
import DepartmentCard from './Departmentcard';
import DepartmentKitchenMap from './Departmentkitchenmap';

type SubView = 'LIST' | 'MAP';
type ModalType = 'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER' | null;

const DepartmentsPage = () => {
  const { activeOrders, menuItems, employees, departments, deleteDepartment } = useApp();

  const [subView, setSubView] = useState<SubView>('LIST');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (type: ModalType, item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DepartmentsHeader
        subView={subView}
        onSubViewChange={setSubView}
        onAddDepartment={() => openModal('DEPARTMENT')}
      />

      {subView === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              menuItems={menuItems}
              activeOrders={activeOrders}
              employees={employees}
              onEdit={d => openModal('DEPARTMENT', d)}
              onDelete={deleteDepartment}
            />
          ))}
        </div>
      ) : (
        <DepartmentKitchenMap
          departments={departments}
          activeOrders={activeOrders}
          onEditDepartment={d => openModal('DEPARTMENT', d)}
        />
      )}
    </div>
  );
};

export default DepartmentsPage;