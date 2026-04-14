import ItemsStats from "./ItemsStats";
import ItemsSearch from "./ItemsSearch";
import ItemsTable from "./ItemsTable";

const MenuPage = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ItemsStats />
      <ItemsSearch />
      <ItemsTable />
    </div>
  );
};

export default MenuPage;
