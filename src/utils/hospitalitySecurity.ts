/**
 * hospitalitySecurity.ts — إدارة المعرفات الرقمية ونظام التخزين المتقاطع لحماية أجهزة الضيافة
 */

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

const DB_NAME = 'Hospitality_Secure_Storage';
const STORE_NAME = 'device_meta';
const KEY_NAME = 'hospitality_device_uuid';

export const saveDeviceUUIDSecurely = async (uuid: string): Promise<void> => {
  localStorage.setItem(KEY_NAME, uuid);

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

export const getDeviceUUIDSecurely = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const localUuid = localStorage.getItem(KEY_NAME);

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

        if (!localUuid && idbUuid) {
          localStorage.setItem(KEY_NAME, idbUuid);
          resolve(idbUuid);
          return;
        }

        if (localUuid && !idbUuid) {
          const writeTx = db.transaction(STORE_NAME, 'readwrite');
          writeTx.objectStore(STORE_NAME).put(localUuid, KEY_NAME);
          resolve(localUuid);
          return;
        }

        resolve(localUuid || idbUuid || null);
      };

      getReq.onerror = () => resolve(localUuid || null);
    };

    request.onerror = () => resolve(localUuid || null);
  });
};

export const clearDeviceUUIDSecurely = (): Promise<void> => {
  localStorage.removeItem(KEY_NAME);
  localStorage.removeItem('hospitality_register_info');

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
