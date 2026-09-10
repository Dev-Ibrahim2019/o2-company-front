import { ExtensionsTestPage } from "./ExtensionsTestPage";

export const ExtensionsTestView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <ExtensionsTestPage />
    </div>
  );
};
