/**
 * DynamicCRUDTable.tsx — مكوّن CRUD ذكي قابل لإعادة الاستخدام
 * يدعم: select ثابت + select ديناميكي (من API) + نص + رقم + نص طويل
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { Can } from "../../auth";
import { Plus, Pencil, Trash2, Search, X, Loader2, AlertCircle, CheckCircle } from "lucide-react";

/* ── Types ── */
export interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "select" | "textarea";
  required?: boolean;
  options?: { value: string | number; label: string }[];
  fetchOptions?: { endpoint: string; valueKey: string; labelKey: string };
  disabledOnEdit?: boolean;
}

interface Props {
  apiEndpoint: string;
  columns: Column[];
  requiredPermission: string;
  formFields: FormField[];
  title: string;
}

/* ── المكون ── */
const DynamicCRUDTable: React.FC<Props> = ({ apiEndpoint, columns, requiredPermission, formFields, title }) => {
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [dynOpts, setDynOpts] = useState<Record<string, any[]>>({});
  const [loadingOpts, setLoadingOpts] = useState<Record<string, boolean>>({});

  /* ── جلب الخيارات الديناميكية ── */
  const fetchDynOpts = useCallback(async () => {
    const fields = formFields.filter((f) => f.fetchOptions);
    if (!fields.length) return;
    const opts: Record<string, any[]> = {};
    const ld: Record<string, boolean> = {};
    await Promise.all(fields.map(async (f) => {
      ld[f.name] = true;
      try {
        const { data: res } = await api.get(f.fetchOptions!.endpoint);
        const items = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        opts[f.name] = items.map((i: any) => ({ value: i[f.fetchOptions!.valueKey], label: i[f.fetchOptions!.labelKey] }));
      } catch { opts[f.name] = []; } finally { ld[f.name] = false; }
    }));
    setDynOpts(opts);
    setLoadingOpts(ld);
  }, [formFields]);

  /* ── جلب البيانات ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await api.get(apiEndpoint);
      const items = res.data || res;
      setData(Array.isArray(items) ? items : []);
    } catch (err: any) { setError(err.response?.data?.message || "خطأ"); }
    finally { setLoading(false); }
  }, [apiEndpoint]);

  useEffect(() => { fetchData(); fetchDynOpts(); }, [fetchData, fetchDynOpts]);

  /* ── بحث ── */
  useEffect(() => {
    if (!search) { setFiltered(data); return; }
    const s = search.toLowerCase();
    setFiltered(data.filter((d) => columns.some((c) => String(d[c.key] ?? "").toLowerCase().includes(s))));
  }, [search, data, columns]);

  const getOpts = (f: FormField) => f.fetchOptions ? (dynOpts[f.name] || []) : (f.options || []);

  const openAdd = () => {
    setEditing(null);
    setError("");
    const init: Record<string, any> = {};
    formFields.forEach((f) => { init[f.name] = f.type === "number" ? 0 : ""; });
    setForm(init);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setError("");
    const init: Record<string, any> = {};
    formFields.forEach((f) => { init[f.name] = item[f.name] ?? ""; });
    setForm(init);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`${apiEndpoint}/${editing.id}`, form);
        setSuccess("تم التعديل بنجاح");
      } else {
        await api.post(apiEndpoint, form);
        setSuccess("تم الإضافة بنجاح");
      }
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      if (errs) { const k = Object.keys(errs)[0]; setError(errs[k]?.[0] || "خطأ"); }
      else setError(err.response?.data?.message || "حدث خطأ");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (item: any) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.delete(`${apiEndpoint}/${item.id}`);
      setSuccess("تم الحذف بنجاح");
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) { setError(err.response?.data?.message || "خطأ"); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">{title}</h1>
        <Can permission={requiredPermission}>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg">
            <Plus size={18} /> إضافة جديد
          </button>
        </Can>
      </div>

      {success && <div className="flex items-center gap-2 p-3 bg-green-600/20 text-green-400 rounded-xl text-sm font-bold"><CheckCircle size={18} /> {success}</div>}
      {error && <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {error}</div>}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600" />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 size={32} className="text-red-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 text-slate-500 font-bold">لا توجد بيانات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-4 py-3 text-right text-slate-400 font-bold text-xs">#</th>
                  {columns.map((c) => <th key={c.key} className="px-4 py-3 text-right text-slate-400 font-bold text-xs">{c.label}</th>)}
                  <Can permission={requiredPermission}>
                    <th className="px-4 py-3 text-center text-slate-400 font-bold text-xs">إجراءات</th>
                  </Can>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-slate-200">{c.render ? c.render(item[c.key], item) : item[c.key] ?? "—"}</td>
                    ))}
                    <Can permission={requiredPermission}>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(item)} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(item)} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </Can>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-slate-500 text-xs font-bold">إجمالي: {filtered.length} من {data.length}</div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{editing ? "تعديل" : "إضافة جديد"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            {error && <div className="p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {formFields.map((f) => (
                <div key={f.name} className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
                  {f.type === "select" ? (
                    <select value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      required={f.required} disabled={loadingOpts[f.name]}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50">
                      <option value="">{loadingOpts[f.name] ? "جاري التحميل..." : "اختر..."}</option>
                      {getOpts(f).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      required={f.required} rows={3}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 resize-none" />
                  ) : (
                    <input type={f.type} value={form[f.name] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.name]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                      required={f.required} disabled={f.disabledOnEdit && !!editing}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50" />
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editing ? "حفظ" : "إضافة"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm hover:text-white">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCRUDTable;