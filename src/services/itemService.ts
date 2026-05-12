// src/services/itemService.ts

import api from '../api/axios';

export interface Item {
    id: number;
    department_id: number;
    name: string;
    name_ar: string;
    code: string;
    price?: number | string | null;
    branch_prices?: ItemBranchPrice[];
    branch_item?: ItemBranchPrice[];
    branch_items?: ItemBranchPrice[];
    branches?: ItemBranch[];
    image?: string | null;
    image_url?: string | null;
    image_path?: string | null;
    unit?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ItemBranchPrice {
    id?: number;
    branch_id: number;
    item_id?: number;
    price: number | string | null;
    is_availble?: boolean | number;
    branch?: {
        id: number;
        name: string;
    };
}

export interface ItemBranch {
    id: number;
    name: string;
    pivot?: {
        price?: number | string | null;
        is_availble?: boolean | number;
    };
    price?: number | string | null;
    is_availble?: boolean | number;
}

export interface ItemBranchPriceFormData {
    branch_id: number;
    price: number | string;
    is_availble?: boolean | number;
}

export interface ItemBranchFormData {
    id: number;
    price: number | string;
    is_availble?: boolean | number;
}

export interface ItemFormData {
    department_id: number;
    name: string;
    name_ar: string;
    code?: string;           // auto-generated if omitted
    price?: number | string | null;
    branch_prices?: ItemBranchPriceFormData[];
    branch_item?: ItemBranchPriceFormData[];
    branch_items?: ItemBranchPriceFormData[];
    branches?: ItemBranchFormData[];
    image?: string | File | null;
    unit?: string | null;
    is_active?: boolean;
}

const appendValue = (formData: FormData, key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;

    if (value instanceof File) {
        formData.append(key, value);
        return;
    }

    if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
        return;
    }

    formData.append(key, String(value));
};

const appendArray = (formData: FormData, key: string, value?: object[]) => {
    if (!value?.length) return;

    value.forEach((entry, index) => {
        Object.entries(entry).forEach(([entryKey, entryValue]) => {
            appendValue(formData, `${key}[${index}][${entryKey}]`, entryValue);
        });
    });
};

const toItemFormData = (data: Partial<ItemFormData>, method?: 'PUT') => {
    const formData = new FormData();

    if (method) formData.append('_method', method);

    appendValue(formData, 'department_id', data.department_id);
    appendValue(formData, 'name', data.name);
    appendValue(formData, 'name_ar', data.name_ar);
    appendValue(formData, 'code', data.code);
    appendValue(formData, 'price', data.price);
    appendValue(formData, 'unit', data.unit);
    appendValue(formData, 'is_active', data.is_active);

    if (typeof File !== 'undefined' && data.image instanceof File) {
        formData.append('image', data.image);
    }

    appendArray(formData, 'branch_prices', data.branch_prices);
    appendArray(formData, 'branch_item', data.branch_item);
    appendArray(formData, 'branch_items', data.branch_items);
    appendArray(formData, 'branches', data.branches);

    return formData;
};

/** Laravel app origin + optional path prefix (no trailing `/api`), for `/storage/...` URLs. */
export const getLaravelPublicBase = (): string => {
    const env = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim();
    let base = env.replace(/\/?api\/?$/i, '');
    base = base.replace(/\/+$/, '');

    if (/^https?:\/\//i.test(base)) {
        try {
            const u = new URL(base);
            const path = u.pathname.replace(/\/$/, '');
            return `${u.origin}${path === '/' ? '' : path}`;
        } catch {
            return base;
        }
    }

    if (typeof window !== 'undefined') {
        try {
            const prefix = base || '/';
            const u = new URL(prefix.startsWith('/') ? prefix : `/${prefix}`, window.location.origin);
            const path = u.pathname.replace(/\/$/, '');
            return `${u.origin}${path === '/' ? '' : path}`;
        } catch {
            return window.location.origin;
        }
    }

    return 'http://localhost:8000';
};

const firstNonEmpty = (...vals: (string | null | undefined)[]): string => {
    for (const v of vals) {
        if (v == null) continue;
        const s = String(v).trim();
        if (s) return s;
    }
    return '';
};

/** If `absoluteUrl` points at another host than our API (e.g. wrong APP_URL in Laravel), rebuild on `publicBase`. */
const rewriteAbsoluteToPublicBase = (absoluteUrl: string, publicBase: string): string => {
    if (!/^https?:\/\//i.test(absoluteUrl)) return absoluteUrl;
    try {
        const asset = new URL(absoluteUrl);
        const baseWithScheme = /^https?:\/\//i.test(publicBase) ? publicBase : `http://${publicBase.replace(/^\/+/, '')}`;
        const baseUrl = new URL(baseWithScheme);
        if (asset.origin === baseUrl.origin) return absoluteUrl;

        const tail = asset.pathname + asset.search + asset.hash;
        const pb = publicBase.replace(/\/+$/, '');
        return `${pb}${tail.startsWith('/') ? tail : `/${tail}`}`;
    } catch {
        return absoluteUrl;
    }
};

export const getItemImageUrl = (item?: Pick<Item, 'image' | 'image_url' | 'image_path'> | null) => {
    const publicBase = getLaravelPublicBase();
    const imageUrlField = firstNonEmpty(item?.image_url, item?.image, item?.image_path);
    if (!imageUrlField) return '';

    if (imageUrlField.startsWith('blob:') || imageUrlField.startsWith('data:')) return imageUrlField;

    // Protocol-relative URL — use same scheme as configured API base
    if (imageUrlField.startsWith('//')) {
        try {
            const ref = new URL(/^https?:\/\//i.test(publicBase) ? publicBase : 'http://localhost');
            return `${ref.protocol}//${imageUrlField.slice(2)}`;
        } catch {
            return `https:${imageUrlField}`;
        }
    }

    if (/^https?:\/\//i.test(imageUrlField)) {
        return rewriteAbsoluteToPublicBase(imageUrlField, publicBase);
    }

    const raw = imageUrlField
        .replace(/\\/g, '/')
        .replace(/^\/?public\/storage\//i, 'storage/')
        .replace(/^\/?public\//i, '')
        .replace(/^\/+/, '');

    const storagePath = raw.replace(/^storage\//i, '');

    const pb = publicBase.replace(/\/+$/, '');
    return `${pb}/storage/${storagePath}`;
};

/** Vite `public/` assets (e.g. `/menu/...`) — ensure root-relative URL so nested routes resolve correctly. */
export const resolvePublicAssetUrl = (path?: string | null): string => {
    if (!path) return '';
    const raw = String(path).trim();
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
    return raw.startsWith('/') ? raw : `/${raw}`;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const fetchItems = (): Promise<Item[]> =>
    api.get('/items').then(r => r.data.data ?? r.data);

export const fetchItemsByDepartment = (deptId: number): Promise<Item[]> =>
    api.get('/items', { params: { department_id: deptId } }).then(r => r.data.data ?? r.data);

export const createItem = (data: ItemFormData): Promise<Item> =>
    api.post('/items', toItemFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data ?? r.data);

export const updateItem = (id: number, data: Partial<ItemFormData>): Promise<Item> =>
    api.post(`/items/${id}`, toItemFormData(data, 'PUT'), {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data ?? r.data);

export const deleteItem = (id: number): Promise<void> =>
    api.delete(`/items/${id}`).then(() => undefined);

// ─── Code Generation (mirrors image hierarchy) ───────────────────────────────
// Department code structure from image:
//   Root (1) → أصناف تشغيلية (11) → قسم الشاورما (1101) → items: 1101001, 1101002 …
//
// Item code = departmentCode + zero-padded sequential suffix (3 digits)
// e.g. dept code "1101" + next index 3 → "1101003"

export const generateNextItemCode = (
    departmentCode: string,
    existingItems: Item[]
): string => {
    const prefix = departmentCode.replace(/\D/g, ''); // strip non-digits just in case
    const siblings = existingItems.filter(i => i.code.startsWith(prefix));

    // Extract the numeric suffix after the prefix
    const usedNumbers = siblings
        .map(i => {
            const suffix = i.code.slice(prefix.length);
            return parseInt(suffix, 10);
        })
        .filter(n => !isNaN(n));

    const next = Array.from({ length: 99 }, (_, index) => index + 1)
        .find(number => !usedNumbers.includes(number));
    if (!next) return '';
    return `${prefix}${String(next).padStart(2, '0')}`;
};
