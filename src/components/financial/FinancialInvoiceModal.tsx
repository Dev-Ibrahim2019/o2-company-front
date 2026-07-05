import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { FinancialInvoiceForm } from "./FinancialInvoiceForm";

interface Props {
  invoiceId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export const FinancialInvoiceModal = ({ invoiceId, onClose, onSaved }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 200);
  };

  const handleSaved = () => {
    setShow(false);
    setTimeout(onSaved, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-10 transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      dir="rtl"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden transition-all duration-200 ${show ? "translate-y-0 scale-100" : "translate-y-4 scale-95"}`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 z-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[85vh] custom-scrollbar">
          <FinancialInvoiceForm invoiceId={invoiceId} onBack={handleClose} onSaved={handleSaved} />
        </div>
      </div>
    </div>
  );
};
