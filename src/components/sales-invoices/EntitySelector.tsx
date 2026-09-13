import { Search, X, User, Phone, Building2, Users } from "lucide-react";
import type { EntityType, EntityItem } from "../../hooks/useEntitySearch";
import { getEntityLabel } from "../../hooks/useEntitySearch";

interface Props {
  entityType: EntityType;
  onEntityTypeChange: (type: EntityType) => void;
  query: string;
  setQuery: (v: string) => void;
  results: EntityItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  selected: EntityItem | null;
  onSelect: (item: EntityItem) => void;
  onClear: () => void;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  symbol?: string;
}

const ENTITY_ICONS: Record<EntityType, typeof User> = {
  customer: User,
  supplier: Building2,
  employee: Users,
};

export const EntitySelector = ({
  entityType,
  onEntityTypeChange,
  query,
  setQuery,
  results,
  open,
  setOpen,
  selected,
  onSelect,
  onClear,
  wrapRef,
  symbol = "₪",
}: Props) => {
  const Icon = ENTITY_ICONS[entityType];

  return (
    <div className="relative" ref={wrapRef}>
      <label className="block text-xs font-semibold mb-1.5 text-slate-400 uppercase tracking-wide">
        الجهة
      </label>

      {/* Entity Type Selector */}
      <div className="flex gap-1 mb-2">
        {(["customer", "supplier", "employee"] as EntityType[]).map((type) => {
          const TypeIcon = ENTITY_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onEntityTypeChange(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                entityType === type
                  ? "bg-red-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-white/5 border border-white/10"
              }`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              {getEntityLabel(type)}
            </button>
          );
        })}
      </div>

      {/* Selected Entity Display */}
      {selected ? (
        <div className="flex items-center justify-between bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{selected.name}</span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                  #{selected.code || selected.id}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {selected.phone && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selected.phone}
                  </span>
                )}
                {selected.balance !== undefined && selected.balance > 0 && (
                  <span className={`text-xs font-medium ${selected.is_over_limit ? "text-red-500" : "text-green-500"}`}>
                    {symbol}{Number(selected.balance || 0).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="إزالة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { if (results.length) setOpen(true); }}
            placeholder={`ابحث بالاسم أو رقم ${getEntityLabel(entityType)}...`}
            className="w-full bg-slate-800 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition"
          />
          {/* Results Dropdown */}
          {open && results.length > 0 && (
            <div className="absolute z-30 w-full bg-slate-900 border border-white/10 rounded-xl mt-1 shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full text-right px-4 py-3 hover:bg-white/5 text-sm flex items-center justify-between transition-colors border-b border-white/5 last:border-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-white truncate">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.phone && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {item.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.balance !== undefined && item.balance > 0 && (
                      <span className={`text-xs font-medium ${item.is_over_limit ? "text-red-500" : "text-green-500"}`}>
                        {symbol}{Number(item.balance || 0).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded font-mono">
                      {item.code || `#${item.id}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
