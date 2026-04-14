import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Attendance } from '../../../../../types';

interface AttendanceModalProps {
    employeeId: string;
    onClose: () => void;
    onSave: (record: Partial<Attendance>) => void;
}

const inputCls = "w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-red-500/50";
const labelCls = "text-xs font-bold text-slate-500 uppercase";

const AttendanceModal: React.FC<AttendanceModalProps> = ({ employeeId, onClose, onSave }) => {
    const [form, setForm] = useState<Partial<Attendance>>({
        employeeId,
        status: 'PRESENT',
        date: new Date(),
    });

    const handleTimeChange = (field: 'checkIn' | 'checkOut', value: string) => {
        const [hours, minutes] = value.split(':');
        const date = new Date(form.date || new Date());
        date.setHours(parseInt(hours), parseInt(minutes));
        setForm(prev => ({ ...prev, [field]: date }));
    };

    const handleSave = () => {
        if (form.employeeId && form.date && form.status) {
            onSave(form);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
                <h3 className="text-xl font-bold text-white mb-6">إضافة سجل حضور يدوي</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className={labelCls}>التاريخ</label>
                        <input
                            type="date"
                            className={inputCls}
                            value={form.date ? new Date(form.date).toISOString().split('T')[0] : ''}
                            onChange={e => setForm(prev => ({ ...prev, date: new Date(e.target.value) }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelCls}>وقت الدخول</label>
                            <input type="time" className={inputCls} onChange={e => handleTimeChange('checkIn', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>وقت الخروج</label>
                            <input type="time" className={inputCls} onChange={e => handleTimeChange('checkOut', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={labelCls}>الحالة</label>
                        <select
                            className={inputCls}
                            value={form.status}
                            onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                        >
                            <option value="PRESENT">حاضر</option>
                            <option value="LATE">متأخر</option>
                            <option value="ABSENT">غائب</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className={labelCls}>ملاحظات</label>
                        <textarea
                            className={`${inputCls} h-20`}
                            placeholder="أدخل أي ملاحظات إضافية..."
                            value={form.note || ''}
                            onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all">
                            إلغاء
                        </button>
                        <button onClick={handleSave} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all">
                            حفظ السجل
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AttendanceModal;