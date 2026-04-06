
import React, { useState } from 'react';
import { useApp } from '../../../store';
import { 
  Settings,
  Eye,
  X,
  Map,
  Bell,
  Info,
  DollarSign,
} from 'lucide-react';
import { OrderType } from '../../../types';

  

const renderModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER' | null>(null);
    const [editingItem, setEditingItem] = useState<any>(null);

    const {  
        departments, 
        addDepartment, updateDepartment, 
        addMenuItem, updateMenuItem,
        addEmployee, updateEmployee, 
        addCustomer, updateCustomer
    } = useApp();

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType(null);
        setEditingItem(null);
    };

    if (!isModalOpen || !modalType) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());

      if (modalType === 'DEPARTMENT') {
        const deptData = {
          ...data,
          hasKds: data.hasKds === 'on',
          autoPrintTicket: data.autoPrintTicket === 'on',
          requiresAssembly: data.requiresAssembly === 'on',
          defaultPrepTime: parseInt(data.defaultPrepTime as string) || 0,
          displayOrder: parseInt(data.displayOrder as string) || 0,
          maxConcurrentOrders: parseInt(data.maxConcurrentOrders as string) || 0,
          priority: parseInt(data.priority as string) || 0,
          notifications: {
            sound: data['notifications.sound'] === 'on',
            flash: data['notifications.flash'] === 'on',
            push: data['notifications.push'] === 'on',
          },
          orderTypeVisibility: [
            ...(data['orderType.DINE_IN'] === 'on' ? [OrderType.DINE_IN] : []),
            ...(data['orderType.TAKEAWAY'] === 'on' ? [OrderType.TAKEAWAY] : []),
            ...(data['orderType.DELIVERY'] === 'on' ? [OrderType.DELIVERY] : []),
          ]
        };
        if (editingItem) {
          updateDepartment(editingItem.id, deptData as any);
        } else {
          addDepartment({ ...deptData, branchId: 'b1' } as any);
        }
      } else if (modalType === 'MENU_ITEM') {
        let sizes = [];
        try { sizes = data.sizes ? JSON.parse(data.sizes as string) : []; } catch(e) { console.error('Invalid sizes JSON'); }
        let addons = [];
        try { addons = data.addons ? JSON.parse(data.addons as string) : []; } catch(e) { console.error('Invalid addons JSON'); }
        let removals = [];
        try { removals = data.removals ? JSON.parse(data.removals as string) : []; } catch(e) { console.error('Invalid removals JSON'); }
        let comboItems = [];
        try { comboItems = data.comboItems ? JSON.parse(data.comboItems as string) : []; } catch(e) { console.error('Invalid comboItems JSON'); }

        const itemData = {
          ...data,
          price: parseFloat(data.price as string) || 0,
          dineInPrice: parseFloat(data.dineInPrice as string) || parseFloat(data.price as string) || 0,
          takeawayPrice: parseFloat(data.takeawayPrice as string) || parseFloat(data.price as string) || 0,
          deliveryPrice: parseFloat(data.deliveryPrice as string) || parseFloat(data.price as string) || 0,
          offerPrice: data.offerPrice ? parseFloat(data.offerPrice as string) : undefined,
          prepTime: parseInt(data.prepTime as string) || 0,
          displayOrder: parseInt(data.displayOrder as string) || 0,
          requiresKitchen: data.requiresKitchen === 'on',
          popular: data.popular === 'on',
          chefRecommended: data.chefRecommended === 'on',
          seasonal: data.seasonal === 'on',
          isCombo: data.isCombo === 'on',
          status: data.status || 'AVAILABLE',
          visibility: {
            pos: data['visibility.pos'] === 'on',
            qrMenu: data['visibility.qrMenu'] === 'on',
            delivery: data['visibility.delivery'] === 'on',
          },
          sizes,
          addons,
          removals,
          comboItems,
          image: data.image || editingItem?.image || 'https://picsum.photos/seed/food/400/400'
        };
        if (editingItem) {
          updateMenuItem(editingItem.id, itemData as any);
        } else {
          addMenuItem({ ...itemData, id: Math.random().toString(36).substr(2, 9) } as any);
        }
      } else if (modalType === 'EMPLOYEE') {
        if (editingItem) {
          updateEmployee(editingItem.id, data as any);
        } else {
          addEmployee({ ...data, status: 'ACTIVE', branchId: 'b1', hireDate: new Date() } as any);
        }
      } else if (modalType === 'CUSTOMER') {
        if (editingItem) {
          updateCustomer(editingItem.id, data as any);
        } else {
          addCustomer(data as any);
        }
      }

      closeModal();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
            <h3 className="text-xl font-bold text-white">
              {editingItem ? 'تعديل' : 'إضافة'} {
                modalType === 'DEPARTMENT' ? 'قسم' :
                modalType === 'MENU_ITEM' ? 'صنف' :
                modalType === 'EMPLOYEE' ? 'موظف' : 'عميل'
              }
            </h3>
            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {modalType === 'DEPARTMENT' && (
              <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Info size={16} className="text-blue-500" />
                    المعلومات الأساسية
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">اسم القسم (EN)</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">اسم القسم (عربي)</label>
                      <input name="nameAr" defaultValue={editingItem?.nameAr} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">اسم مختصر</label>
                      <input name="shortName" defaultValue={editingItem?.shortName} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">نوع القسم</label>
                      <select name="type" defaultValue={editingItem?.type || 'MAIN_KITCHEN'} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                        <option value="MAIN_KITCHEN">مطبخ رئيسي</option>
                        <option value="FAST_FOOD">وجبات سريعة</option>
                        <option value="BAR">بار / مشروبات</option>
                        <option value="COLD_PREP">تحضير بارد</option>
                        <option value="BAKERY">مخبوزات</option>
                        <option value="DESSERT">حلويات</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">أيقونة (Emoji)</label>
                      <input name="icon" defaultValue={editingItem?.icon} placeholder="🍕" className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">لون القسم</label>
                      <input name="color" type="color" defaultValue={editingItem?.color || '#ef4444'} className="w-full h-10 bg-slate-800 border border-white/5 rounded-xl px-1 py-1 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">الوصف</label>
                    <textarea name="description" defaultValue={editingItem?.description} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 h-20" />
                  </div>
                </div>

                {/* Location & KDS */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Map size={16} className="text-emerald-500" />
                    الموقع ونظام KDS
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">رقم المحطة</label>
                      <input name="stationNumber" defaultValue={editingItem?.stationNumber} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الموقع الوصفي</label>
                      <input name="location" defaultValue={editingItem?.location} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input name="hasKds" type="checkbox" defaultChecked={editingItem?.hasKds} className="w-4 h-4 accent-red-600" />
                      <span className="text-sm text-white font-bold">تفعيل شاشة KDS</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">معرف الشاشة</label>
                        <input name="kdsScreenId" defaultValue={editingItem?.kdsScreenId} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">اسم الجهاز</label>
                        <input name="kdsDeviceName" defaultValue={editingItem?.kdsDeviceName} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Settings size={16} className="text-orange-500" />
                    الإعدادات التشغيلية
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">وقت التحضير الافتراضي (د)</label>
                      <input name="defaultPrepTime" type="number" defaultValue={editingItem?.defaultPrepTime || 15} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">ترتيب العرض</label>
                      <input name="displayOrder" type="number" defaultValue={editingItem?.displayOrder || 0} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">أقصى عدد طلبات متزامنة</label>
                      <input name="maxConcurrentOrders" type="number" defaultValue={editingItem?.maxConcurrentOrders || 10} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الأولوية</label>
                      <input name="priority" type="number" defaultValue={editingItem?.priority || 1} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الحالة</label>
                      <select name="status" defaultValue={editingItem?.status || 'ACTIVE'} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                        <option value="ACTIVE">نشط</option>
                        <option value="BUSY">مزدحم</option>
                        <option value="INACTIVE">غير نشط</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input name="requiresAssembly" type="checkbox" defaultChecked={editingItem?.requiresAssembly} className="w-4 h-4 accent-red-600" />
                        <span className="text-sm text-white font-bold">يتطلب تجميع</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notifications & Printing */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Bell size={16} className="text-yellow-500" />
                    التنبيهات والطباعة
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer">
                      <input name="notifications.sound" type="checkbox" defaultChecked={editingItem?.notifications?.sound ?? true} className="w-3 h-3 accent-red-600" />
                      <span className="text-[10px] text-slate-300">صوت</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer">
                      <input name="notifications.flash" type="checkbox" defaultChecked={editingItem?.notifications?.flash ?? true} className="w-3 h-3 accent-red-600" />
                      <span className="text-[10px] text-slate-300">وميض</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer">
                      <input name="notifications.push" type="checkbox" defaultChecked={editingItem?.notifications?.push ?? true} className="w-3 h-3 accent-red-600" />
                      <span className="text-[10px] text-slate-300">Push</span>
                    </label>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-800/50 border border-white/5">
                    <input name="autoPrintTicket" type="checkbox" defaultChecked={editingItem?.autoPrintTicket} className="w-4 h-4 accent-red-600" />
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-bold">طباعة تلقائية للتذاكر</span>
                      <span className="text-[10px] text-slate-500">طباعة تذكرة المطبخ فور وصول الطلب</span>
                    </div>
                  </label>
                </div>

                {/* Order Type Visibility */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Eye size={16} className="text-purple-500" />
                    ظهور أنواع الطلبات
                  </h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="orderType.DINE_IN" type="checkbox" defaultChecked={editingItem?.orderTypeVisibility?.includes(OrderType.DINE_IN) ?? true} className="w-4 h-4 accent-red-600" />
                      <span className="text-xs text-slate-300">محلي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="orderType.TAKEAWAY" type="checkbox" defaultChecked={editingItem?.orderTypeVisibility?.includes(OrderType.TAKEAWAY) ?? true} className="w-4 h-4 accent-red-600" />
                      <span className="text-xs text-slate-300">سفري</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="orderType.DELIVERY" type="checkbox" defaultChecked={editingItem?.orderTypeVisibility?.includes(OrderType.DELIVERY) ?? true} className="w-4 h-4 accent-red-600" />
                      <span className="text-xs text-slate-300">توصيل</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {modalType === 'MENU_ITEM' && (
              <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Info size={16} className="text-blue-500" />
                    المعلومات الأساسية
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">اسم الصنف (عربي)</label>
                      <input name="nameAr" defaultValue={editingItem?.nameAr} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">اسم الصنف (EN)</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">اسم مختصر (للمطبخ)</label>
                      <input name="shortName" defaultValue={editingItem?.shortName} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">كود الصنف (SKU)</label>
                      <input name="code" defaultValue={editingItem?.code} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">رابط الصورة</label>
                    <input name="image" defaultValue={editingItem?.image} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">وصف الصنف</label>
                    <textarea name="descriptionAr" defaultValue={editingItem?.descriptionAr} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 h-20" />
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <DollarSign size={16} className="text-emerald-500" />
                    إدارة التسعير
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">السعر الأساسي</label>
                      <input name="price" type="number" step="0.01" defaultValue={editingItem?.price} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">سعر العرض (اختياري)</label>
                      <input name="offerPrice" type="number" step="0.01" defaultValue={editingItem?.offerPrice} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">سعر المحلي</label>
                      <input name="dineInPrice" type="number" step="0.01" defaultValue={editingItem?.dineInPrice} className="w-full bg-slate-800 border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">سعر السفري</label>
                      <input name="takeawayPrice" type="number" step="0.01" defaultValue={editingItem?.takeawayPrice} className="w-full bg-slate-800 border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">سعر التوصيل</label>
                      <input name="deliveryPrice" type="number" step="0.01" defaultValue={editingItem?.deliveryPrice} className="w-full bg-slate-800 border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Operations */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Settings size={16} className="text-orange-500" />
                    الإعدادات التشغيلية
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">القسم المرتبط</label>
                      <select name="departmentId" defaultValue={editingItem?.departmentId} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                        {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">وقت التحضير (د)</label>
                      <input name="prepTime" type="number" defaultValue={editingItem?.prepTime || 10} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الحالة</label>
                      <select name="status" defaultValue={editingItem?.status || 'AVAILABLE'} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                        <option value="AVAILABLE">متوفر</option>
                        <option value="UNAVAILABLE">غير متوفر</option>
                        <option value="OUT_OF_STOCK">نفذت الكمية</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">ترتيب العرض</label>
                      <input name="displayOrder" type="number" defaultValue={editingItem?.displayOrder || 0} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input name="requiresKitchen" type="checkbox" defaultChecked={editingItem?.requiresKitchen ?? true} className="w-4 h-4 accent-red-600" />
                      <span className="text-sm text-white font-bold">يتطلب تحضير في المطبخ</span>
                    </label>
                  </div>
                </div>

                {/* Visibility & Flags */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Eye size={16} className="text-purple-500" />
                    الظهور والخيارات الإضافية
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer">
                      <input name="popular" type="checkbox" defaultChecked={editingItem?.popular} className="w-3 h-3 accent-red-600" />
                      <span className="text-[10px] text-slate-300">الأكثر مبيعاً</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer">
                      <input name="chefRecommended" type="checkbox" defaultChecked={editingItem?.chefRecommended} className="w-3 h-3 accent-red-600" />
                      <span className="text-[10px] text-slate-300">توصية الشيف</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer">
                      <input name="seasonal" type="checkbox" defaultChecked={editingItem?.seasonal} className="w-3 h-3 accent-red-600" />
                      <span className="text-[10px] text-slate-300">موسمي</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="isCombo" type="checkbox" defaultChecked={editingItem?.isCombo} className="w-4 h-4 accent-red-600" />
                      <span className="text-xs text-white font-bold">وجبة كومبو (Combo)</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">أماكن الظهور</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="visibility.pos" type="checkbox" defaultChecked={editingItem?.visibility?.pos ?? true} className="w-4 h-4 accent-red-600" />
                        <span className="text-xs text-slate-300">شاشة الكاشير</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="visibility.qrMenu" type="checkbox" defaultChecked={editingItem?.visibility?.qrMenu ?? true} className="w-4 h-4 accent-red-600" />
                        <span className="text-xs text-slate-300">منيو QR</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="visibility.delivery" type="checkbox" defaultChecked={editingItem?.visibility?.delivery ?? true} className="w-4 h-4 accent-red-600" />
                        <span className="text-xs text-slate-300">تطبيقات التوصيل</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ملاحظات المطبخ</label>
                    <textarea name="kitchenNotes" defaultValue={editingItem?.kitchenNotes} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none h-16" />
                  </div>
                </div>

                {/* Options & Customization */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                    <Settings size={16} className="text-indigo-500" />
                    الخيارات والإضافات (Advanced JSON)
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الأحجام (Sizes)</label>
                      <textarea 
                        name="sizes" 
                        placeholder='[{"name": "صغير", "price": 10}, {"name": "كبير", "price": 15}]'
                        defaultValue={editingItem?.sizes ? JSON.stringify(editingItem.sizes) : ''} 
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-white focus:outline-none h-20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">الإضافات (Add-ons)</label>
                      <textarea 
                        name="addons" 
                        placeholder='[{"name": "جبنة إضافية", "price": 2, "maxQty": 2}]'
                        defaultValue={editingItem?.addons ? JSON.stringify(editingItem.addons) : ''} 
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-white focus:outline-none h-20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">مكونات قابلة للإزالة (Removals)</label>
                      <textarea 
                        name="removals" 
                        placeholder='[{"name": "بصل"}, {"name": "مخلل"}]'
                        defaultValue={editingItem?.removals ? JSON.stringify(editingItem.removals) : ''} 
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-white focus:outline-none h-20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">أصناف الكومبو (Combo Item IDs)</label>
                      <textarea 
                        name="comboItems" 
                        placeholder='["item-id-1", "item-id-2"]'
                        defaultValue={editingItem?.comboItems ? JSON.stringify(editingItem.comboItems) : ''} 
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-white focus:outline-none h-20" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalType === 'EMPLOYEE' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">اسم الموظف</label>
                  <input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">رقم الهاتف</label>
                    <input name="phone" defaultValue={editingItem?.phone} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">الدور الوظيفي</label>
                    <select name="role" defaultValue={editingItem?.role} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                      <option value="ADMIN">مدير نظام</option>
                      <option value="BRANCH_MANAGER">مدير فرع</option>
                      <option value="HEAD_CHEF">رئيس طهاة</option>
                      <option value="COOK">طباخ</option>
                      <option value="CASHIER">كاشير</option>
                      <option value="WAITER">ويتر</option>
                      <option value="DEPARTMENT_STAFF">موظف قسم</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">القسم</label>
                  <select name="departmentId" defaultValue={editingItem?.departmentId} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {modalType === 'CUSTOMER' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">اسم العميل</label>
                  <input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">رقم الهاتف</label>
                  <input name="phone" defaultValue={editingItem?.phone} required className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">ملاحظات</label>
                  <textarea name="notes" defaultValue={editingItem?.notes} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 h-24" />
                </div>
              </>
            )}

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={closeModal} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm transition-all">
                إلغاء
              </button>
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/20">
                {editingItem ? 'حفظ التعديلات' : 'إضافة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

   export default renderModal;