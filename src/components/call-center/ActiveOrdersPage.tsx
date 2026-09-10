import React from "react";
import { useApp } from "../../../store";
import { ActiveOrdersBoard } from "./CallCenterWorkspace";
export const ActiveOrdersPage:React.FC=()=>{const {currentUser}=useApp();const branchId=Number((currentUser as any)?.branch_id||0);return <div className="h-full overflow-y-auto" dir="rtl"><header className="mb-4 rounded-2xl border border-white/5 bg-slate-900 p-5"><h1 className="text-lg font-black text-white">الطلبات النشطة</h1><p className="text-xs text-slate-400">بانتظار الدفع ← قيد التحضير ← مع الديلفري ← تم التسليم</p></header><ActiveOrdersBoard branchId={branchId||undefined}/></div>};
