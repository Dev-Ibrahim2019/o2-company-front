import React, { useState } from 'react';
import { useApp } from '../../../../store';
import BranchStats from './BranchStats';
import BranchSearchActions from './BranchSearchActions';
import AddEditBranchModal from './AddEditBranchModal';
import BranchTable from './BranchTable';

const BranchesPage: React.FC = () => {
  const { employees, branches, deleteBranch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: branches.length,
    active: branches.filter(b => b.status === 'ACTIVE').length,
    inactive: branches.filter(b => b.status === 'INACTIVE').length,
    totalEmployees: employees.length
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <BranchStats {...stats} />
      <BranchSearchActions 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddBranch={() => setIsModalOpen(true)}
      />
      <AddEditBranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <BranchTable 
        branches={filteredBranches} 
        employees={employees}
        onEdit={(branch) => console.log('تعديل فرع', branch)}
        onDelete={(id) => deleteBranch(id)}
      />
    </div>
  );
};

export default BranchesPage;