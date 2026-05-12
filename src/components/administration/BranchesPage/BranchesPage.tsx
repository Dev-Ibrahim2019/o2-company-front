import React, { useState, useEffect } from "react";
import BranchStats from "./BranchStats";
import BranchSearchActions from "./BranchSearchActions";
import AddEditBranchModal from "./AddEditBranchModal";
import BranchTable from "./BranchTable";
import { useBranch } from "../../../hooks/useBranch";
import api from "../../../api/axios"; // ✅ جلب الموظفين بشكل منفصل

const BranchesPage: React.FC = () => {
  const {
    branches = [],
    deleteBranch,
    updateBranch,
    refetch,
  } = useBranch();

  // ✅ جلب الموظفين من الـ API مباشرة
  const [employees, setEmployees] = useState<any[]>([]);
  useEffect(() => {
    api
      .get("/employees")
      .then((r) => setEmployees(r.data.data ?? []))
      .catch(() => setEmployees([]));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ إصلاح: استخدام is_active بدل status
  const stats = {
    total: branches.length,
    active: branches.filter((b) => b.is_active).length,
    inactive: branches.filter((b) => !b.is_active).length,
    totalEmployees: employees.length,
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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

      {/* ✅ تمرير filteredBranches بدل branches الكاملة */}
      <BranchTable
        branches={filteredBranches}
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