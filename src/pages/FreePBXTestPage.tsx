import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Signal,
  TriangleAlert,
} from "lucide-react";

type TestStatus = "success" | "failed" | "idle";

type FreepbxTestResponse = {
  success: boolean;
  connected: boolean;
  serverUrl: string;
  authentication: {
    status: TestStatus;
    message: string;
    tokenType?: string;
    body?: unknown;
  };
  accessToken: string | null;
  accessTokenPreview: string | null;
  responseTimeMs: number;
  httpStatus: number | null;
  graphql: {
    status: TestStatus;
    httpStatus?: number;
    message: string;
    body?: unknown;
  };
  rest: {
    status: TestStatus;
    httpStatus?: number;
    message: string;
    body?: unknown;
  };
  apiResponse: unknown;
  error?: {
    title: string;
    message: string;
    httpStatus?: number | null;
    fallbackStatus?: number | null;
    body?: unknown;
    stack?: string | null;
    suggestedSolution?: string;
  } | null;
  requestedAt?: string;
};

const panelClassName =
  "rounded-3xl border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur";

const FreePBXTestPage = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FreepbxTestResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  const loadTest = async () => {
    setLoading(true);
    setRequestError(null);
    try {
      const { data } = await api.get<FreepbxTestResponse>("/freepbx/test");
      setResult(data);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response?.data?.message === "string"
          ? (error as any).response.data.message
          : error instanceof Error
            ? error.message
            : "فشل الاتصال بالخادم.";
      setRequestError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTest();
  }, []);

  const connectionState = useMemo(() => {
    if (!result) {
      return {
        label: "Waiting",
        color: "text-slate-400",
        bg: "bg-slate-700/40",
        border: "border-slate-700/70",
      };
    }

    if (result.connected) {
      return {
        label: "Connected",
        color: "text-emerald-300",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
      };
    }

    return {
      label: "Failed",
      color: "text-rose-300",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
    };
  }, [result]);

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.16),transparent_32%),linear-gradient(135deg,#020617,#0f172a)] p-4 md:p-8 text-slate-100"
      dir="rtl"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className={`${panelClassName} overflow-hidden`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-300">
                <ShieldCheck size={16} />
                FreePBX API Connection Test
              </div>
              <h1 className="text-3xl font-black text-white">
                تحقق من التواصل بين الواجهة والخادم الخلفي وخادم FreePBX
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                هذه الصفحة تتحقق من OAuth2، وتختبر GraphQL ثم REST، وتعرض
                النتيجة بصيغة JSON واضحة للـ debugging.
              </p>
            </div>
            <button
              onClick={() => loadTest()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-2.5 font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              {loading ? "جارٍ الاختبار..." : "إعادة اختبار الاتصال"}
            </button>
          </div>
        </div>

        {loading ? (
          <div
            className={`${panelClassName} flex items-center justify-center gap-3 py-16`}
          >
            <Loader2 className="h-7 w-7 animate-spin text-red-400" />
            <span className="text-lg font-semibold text-slate-200">
              جارٍ اختبار الاتصال مع FreePBX...
            </span>
          </div>
        ) : (
          <>
            <div
              className={`rounded-3xl border ${connectionState.border} ${connectionState.bg} p-6 shadow-2xl shadow-slate-950/20`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-sm font-semibold text-slate-200">
                    <Signal size={16} className={connectionState.color} />
                    Connection Status
                  </div>
                  <h2
                    className={`text-3xl font-black ${connectionState.color}`}
                  >
                    {connectionState.label}
                  </h2>
                  <p className="max-w-2xl text-sm text-slate-300">
                    {result?.connected
                      ? "تمت مكالمة FreePBX بنجاح عبر Laravel backend."
                      : "تعذر الوصول إلى FreePBX أو فشل التحقق من الإذن والوصول."}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                      <Server size={16} />
                      FreePBX Server
                    </div>
                    <div className="font-semibold text-white">
                      {result?.serverUrl || "http://192.168.2.250:83"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                      <Clock3 size={16} />
                      Response Time
                    </div>
                    <div className="font-semibold text-white">
                      {result?.responseTimeMs ?? 0} ms
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {requestError && (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle size={18} />
                  Request Error
                </div>
                <p className="mt-2 text-sm">{requestError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className={`${panelClassName} space-y-4 xl:col-span-2`}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      Authentication
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${result?.authentication.status === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}
                    >
                      {result?.authentication.status === "success" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      {result?.authentication.status === "success"
                        ? "Success"
                        : "Failed"}
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      {result?.authentication.message ||
                        "No authentication data yet."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <KeyRound size={16} className="text-amber-400" />
                      Access Token
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 font-mono text-sm text-slate-200">
                      {result?.accessTokenPreview || "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <ChevronRight size={16} className="text-sky-400" />
                      HTTP Status
                    </div>
                    <div className="text-2xl font-black text-white">
                      {result?.httpStatus ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <Globe2Icon />
                      GraphQL Test
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${result?.graphql.status === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}
                    >
                      {result?.graphql.status === "success" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      {result?.graphql.status === "success"
                        ? "Success"
                        : "Failed"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <ChevronRight size={16} className="text-violet-400" />
                    REST Test
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${result?.rest.status === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}
                  >
                    {result?.rest.status === "success" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    {result?.rest.status === "success" ? "Success" : "Failed"}
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {result?.rest.message || "REST fallback not executed yet."}
                  </p>
                </div>
              </div>

              <div className={`${panelClassName} space-y-4`}>
                {result?.error ? (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <TriangleAlert size={18} />
                      {result.error.title}
                    </div>
                    <p className="mt-3 text-sm">{result.error.message}</p>
                    {result.error.suggestedSolution && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
                        <div className="mb-1 font-semibold text-slate-100">
                          Suggested solution
                        </div>
                        <p>{result.error.suggestedSolution}</p>
                      </div>
                    )}
                    {isDev && result.error.stack && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-400">
                        <div className="mb-1 font-semibold text-slate-200">
                          Stack
                        </div>
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap">
                          {result.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 size={18} />
                      Ready to inspect the live response
                    </div>
                    <p className="mt-2 text-sm">
                      The latest test completed successfully and the backend
                      response is ready to review.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className={`${panelClassName}`}>
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
                <CodeIcon />
                API Response
              </div>
              <pre className="max-h-120 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-200 whitespace-pre-wrap wrap-break-word">
                {JSON.stringify(result?.apiResponse ?? result ?? {}, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Globe2Icon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4 text-sky-400"
  >
    <path d="M12 2v20M2 12h20" strokeLinecap="round" />
    <path
      d="M5.6 5.6c2.2 2.2 3.4 5.7 3.4 10.4 0 4.7-1.2 8.2-3.4 10.4M18.4 5.6c-2.2 2.2-3.4 5.7-3.4 10.4 0 4.7 1.2 8.2 3.4 10.4"
      strokeLinecap="round"
    />
  </svg>
);

const CodeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-5 w-5 text-slate-100"
  >
    <path
      d="M9 8l-4 4 4 4M15 8l4 4-4 4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default FreePBXTestPage;
