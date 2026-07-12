import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Phone, User, X, Loader2, Plus, AlertTriangle } from "lucide-react";
import type { CustomerSearchResult, CustomerAlert } from "../../services/callCenterService";
import { CustomerQuickPreview } from "./CustomerQuickPreview";
import { CustomerProfileDrawer } from "./CustomerProfileDrawer";
import type { CustomerAddress, OrderDetail } from "../../services/callCenterService";

interface Props {
  onSelectCustomer: (customer: CustomerSearchResult) => void;
  onQuickAdd?: () => void;
  externalInputRef?: React.MutableRefObject<HTMLInputElement | null>;
  searchResults: CustomerSearchResult[];
  searchLoading: boolean;
  searchQuery: string;
  onSearch: (q: string) => void;
  onClear: () => void;
  customerAlerts?: CustomerAlert[];
  isCallCenterMode?: boolean;
  onSelectAddress?: (address: CustomerAddress) => void;
  onRepeatOrder?: (order: OrderDetail) => void;
  onApplyLoyaltyDiscount?: (amount: number) => void;
}

export const CustomerPhoneSearch: React.FC<Props> = ({
  onSelectCustomer,
  onQuickAdd,
  externalInputRef,
  searchResults,
  searchLoading,
  searchQuery,
  onSearch,
  onClear,
  customerAlerts = [],
  isCallCenterMode = false,
  onSelectAddress,
  onRepeatOrder,
  onApplyLoyaltyDiscount,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<CustomerSearchResult | null>(null);
  const [drawerCustomer, setDrawerCustomer] = useState<CustomerSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalInputRef) {
      externalInputRef.current = inputRef.current;
    }
  }, [externalInputRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && focusedIndex >= 0 && searchResults[focusedIndex]) {
      e.preventDefault();
      setPreviewCustomer(searchResults[focusedIndex]);
      setShowResults(false);
    } else if (e.key === "Escape") {
      setShowResults(false);
      inputRef.current?.blur();
    }
  }, [focusedIndex, searchResults]);

  useEffect(() => {
    if (searchResults.length > 0) {
      setShowResults(true);
      setFocusedIndex(-1);
    }
  }, [searchResults]);

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setPreviewCustomer(customer);
    setShowResults(false);
  };

  const handleConfirmCustomer = (customer: CustomerSearchResult) => {
    setPreviewCustomer(null);
    onSelectCustomer(customer);
  };

  const handleClosePreview = () => {
    setPreviewCustomer(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">نشط</span>;
      case "inactive": return <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">غير نشط</span>;
      case "blocked": return <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">محظور</span>;
      default: return null;
    }
  };

  return (
    <div className="relative" dir="rtl">
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={isCallCenterMode ? "ابحث برقم الهاتف أو الاسم..." : "ابحث عن عميل..."}
          className="w-full bg-slate-800 border border-white/10 rounded-xl py-2.5 pl-9 pr-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
        />
        {searchQuery && (
          <button onClick={onClear} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        )}
        {searchLoading && (
          <Loader2 size={14} className="absolute left-9 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />
        )}
      </div>

      {showResults && searchQuery.length >= 2 && (
        <div ref={resultsRef} className="absolute top-full mt-1 right-0 left-0 bg-slate-800 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-[100] max-h-72 overflow-y-auto">
          {searchLoading ? (
            <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> جاري البحث...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-slate-400 text-sm mb-2">لم يتم العثور على عميل</p>
              {onQuickAdd && (
                <button onClick={onQuickAdd} className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1 mx-auto">
                  <Plus size={14} /> إنشاء عميل جديد
                </button>
              )}
            </div>
          ) : (
            searchResults.map((customer, idx) => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all hover:bg-slate-700/50 ${focusedIndex === idx ? "bg-slate-700/50" : ""} ${customer.status === "blocked" ? "opacity-60" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <User size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{customer.name}</span>
                    {getStatusBadge(customer.status)}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <Phone size={10} /> {customer.phone || customer.mobile || "—"}
                    {customer.code && <span className="text-slate-600">• {customer.code}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {previewCustomer && (
        <CustomerQuickPreview
          customer={previewCustomer}
          alerts={customerAlerts}
          onSelect={handleConfirmCustomer}
          onClose={handleClosePreview}
          onOpenFullProfile={setDrawerCustomer}
        />
      )}
      <CustomerProfileDrawer
        isOpen={Boolean(drawerCustomer)}
        customerId={drawerCustomer?.id ?? 0}
        onClose={() => setDrawerCustomer(null)}
        onSelectCustomer={handleConfirmCustomer}
        onSelectAddress={(address) => {
          if (drawerCustomer) {
            onSelectCustomer({ ...drawerCustomer, selectedAddress: address } as CustomerSearchResult);
          } else {
            onSelectAddress?.(address);
          }
        }}
        onRepeatOrder={(order) => {
          if (drawerCustomer) {
            onSelectCustomer({ ...drawerCustomer, lastOrder: order } as CustomerSearchResult);
          } else {
            onRepeatOrder?.(order);
          }
        }}
        onApplyLoyaltyDiscount={onApplyLoyaltyDiscount}
      />
    </div>
  );
};
