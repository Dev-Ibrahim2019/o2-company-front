import { useItems } from "../../../hooks/useItem";
import { useDepartments } from "../../../hooks/useDepartments";

export const useItemsPage = () => {
  const { items, addItem, updateItem } = useItems();
  const { departments } = useDepartments();

  return {
    items,
    departments,
    addItem,
    updateItem,
    isModalOpen: false,
    editingItem: null,
    openModal: () => {},
    closeModal: () => {},
  };
};
