import { createContext, useContext, useState, ReactNode } from "react";

interface ItemFilters {
  departmentId: string;
  status: string;
  popular: boolean;
  chefRecommended: boolean;
  seasonal: boolean;
}

interface ItemsContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filters: ItemFilters;
  setFilters: (f: ItemFilters) => void;
  modalType: "MENU_ITEM" | null;
  editingItem: any;
  isModalOpen: boolean;
  openModal: (item?: any) => void;
  closeModal: () => void;
}

const ItemsContext = createContext<ItemsContextType | null>(null);

export const ItemsProvider = ({ children }: { children: ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ItemFilters>({
    departmentId: "all",
    status: "all",
    popular: false,
    chefRecommended: false,
    seasonal: false,
  });
  const [modalType, setModalType] = useState<"MENU_ITEM" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (item: any = null) => {
    setModalType("MENU_ITEM");
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setModalType(null);
  };

  return (
    <ItemsContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        modalType,
        editingItem,
        isModalOpen,
        openModal,
        closeModal,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error("useItems must be used within ItemsProvider");
  return ctx;
};