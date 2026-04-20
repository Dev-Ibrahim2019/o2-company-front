import React, { useState } from 'react';
import { 
  Building2, 
  MapPin,
  Phone,
  Settings,
} from 'lucide-react';

const BranchContainer: React.FC = () => {
    const [formData, setFormData] = useState<any>({});
    return(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Building2 size={12}/> اسم الفرع التشغيلي</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all" 
                  placeholder="مثلاً: فرع الميناء الرئيسي"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> الموقع الجغرافي</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all" 
                  placeholder="المدينة، الشارع..."
                  value={formData.address || ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Phone size={12}/> رقم الاتصال الموحد</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all" 
                  placeholder="059..."
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2"><Settings size={12}/> حالة الفرع</label>
                <select 
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="ACTIVE">نشط (Active)</option>
                  <option value="INACTIVE">غير نشط (Inactive)</option>
                </select>
              </div>
            </div>
    );
};

export default BranchContainer;