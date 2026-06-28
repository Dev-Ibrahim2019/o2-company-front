/**
 * posSecurity.ts — إدارة المعرفات الرقمية ونظام التخزين المتقاطع لحماية نقاط البيع
 */

// 1. دالة لتوليد UUID فريد نظيف برمجياً في حال لم يدعمه المتصفح تلقائياً
export const generateSecureUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// اسم قاعدة البيانات الداخلية المعزولة في المتصفح
const DB_NAME = 'POS_Secure_Storage';
const STORE_NAME = 'device_meta';
const KEY_NAME = 'pos_device_uuid';

// 2. دالة التخزين العميق المزدوج (LocalStorage + IndexedDB)
export const saveDeviceUUIDSecurely = async (uuid: string): Promise<void> => {
  // الحفظ السريع في الـ LocalStorage
  localStorage.setItem(KEY_NAME, uuid);

  // الحفظ المقاوم للمسح العادي في الـ IndexedDB
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(uuid, KEY_NAME);
      resolve();
    };

    request.onerror = () => reject(new Error('فشل التخزين في IndexedDB'));
  });
};

// 3. دالة الاسترجاع الذكي وإعادة الإحياء (الدمج والترميم التلقائي في حال مسح الكاش)
export const getDeviceUUIDSecurely = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const localUuid = localStorage.getItem(KEY_NAME);

    // فتح قاعدة البيانات الداخلية للفحص والترميم
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(KEY_NAME);

      getReq.onsuccess = () => {
        const idbUuid = getReq.result;

        // حالة أ: الـ LocalStorage ممسوح ولكن البيانات محفوظة في الـ IndexedDB (ترميم الكاش)
        if (!localUuid && idbUuid) {
          localStorage.setItem(KEY_NAME, idbUuid);
          resolve(idbUuid);
          return;
        }

        // حالة ب: الـ IndexedDB ممسوح ولكن البيانات محفوظة في الـ LocalStorage (ترميم الـ IndexedDB)
        if (localUuid && !idbUuid) {
          const writeTx = db.transaction(STORE_NAME, 'readwrite');
          writeTx.objectStore(STORE_NAME).put(localUuid, KEY_NAME);
          resolve(localUuid);
          return;
        }

        // حالة ج: كل شيء سليم ومطابق أو كلاهما فارغ تماماً (جهاز جديد لم يفعّل بعد)
        resolve(localUuid || idbUuid || null);
      };

      getReq.onerror = () => resolve(localUuid || null);
    };

    request.onerror = () => resolve(localUuid || null);
  });
};

// 4. دالة حذف الهوية الرقمية من الجهاز (تستدعى فقط في حال عمل الأدمن Revoke من لوحة التحكم)
export const clearDeviceUUIDSecurely = (): Promise<void> => {
  localStorage.removeItem(KEY_NAME);
  localStorage.removeItem('pos_register_info'); // مسح معلومات نقطة البيع المخزنة

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(KEY_NAME);
      resolve();
    };
    request.onerror = () => resolve();
  });
};