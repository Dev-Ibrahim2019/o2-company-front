import React, { useState } from "react";
// import { useApp } from '../../../../store';
import BranchStats from "./BranchStats";
import BranchSearchActions from "./BranchSearchActions";
import AddEditBranchModal from "./AddEditBranchModal";
import BranchTable from "./BranchTable";
import { useBranch } from "../../../hooks/useBranch";

const BranchesPage: React.FC = () => {
  const {
    employees = [],
    branches = [],
    deleteBranch,
    updateBranch,
    refetch
  } = useBranch();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: branches.length,
    active: branches.filter((b) => b.status === "ACTIVE").length,
    inactive: branches.filter((b) => b.status === "INACTIVE").length,
    totalEmployees: employees.length,
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        refetch={refetch}
        editingItem={editingItem}
      />

      <BranchTable
        branches={branches}
        employees={employees}
        onEdit={(branch) => {
          setEditingItem(branch);
          setIsModalOpen(true);
        }}
        onDelete={(id) => deleteBranch(id)}
      />
    </div>
  );
};

export default BranchesPage;
