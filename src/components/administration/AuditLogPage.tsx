import { useState } from 'react';
import { useApp } from '../../../store';

import { 
  Search,
  Filter,
  Download,
} from 'lucide-react';

const AuditLogPage = () => {
  const {  
    employees, 
    activityLogs
  } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    
    const filteredLogs = activityLogs.filter(log => 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employees.find(e => e.id === log.employeeId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="البحث في سجل التدقيق..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-xl pr-12 pl-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-all">
              <Filter size={16} />
              تصفية
            </button>
            <button className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-all">
              <Download size={16} />
              تصدير
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-right">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-white/5">
                <th className="p-4 font-medium">الوقت</th>
                <th className="p-4 font-medium">الموظف</th>
                <th className="p-4 font-medium">الإجراء</th>
                <th className="p-4 font-medium">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map(log => {
                const employee = employees.find(e => e.id === log.employeeId);
                return (
                  <tr key={log.id} className="text-sm hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                          {employee?.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white">{employee?.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500 font-bold">
                    لا توجد سجلات تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  export default AuditLogPage;