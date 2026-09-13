import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../../api/axios";
import CallCenterActivationPage from "./CallCenterActivationPage";

const CallCenterGuard: React.FC = () => {
  const [activationInfo, setActivationInfo] = useState<any | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const deviceUuid = localStorage.getItem("call_center_device_uuid");
    const existing = localStorage.getItem("call_center_register_info");

    // If we have register info in cache, use it directly
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        setActivationInfo(parsed);
        setChecking(false);
        return;
      } catch {
        localStorage.removeItem("call_center_register_info");
      }
    }

    // If we have a device UUID but no register info, verify from backend
    if (deviceUuid) {
      api.post("/call-center/check-status", { device_uuid: deviceUuid })
        .then((res) => {
          const info = res.data?.call_center_info;
          if (info) {
            localStorage.setItem("call_center_register_info", JSON.stringify(info));
            setActivationInfo(info);
          } else {
            // Backend says device is not valid anymore
            localStorage.removeItem("call_center_device_uuid");
            localStorage.removeItem("call_center_register_info");
          }
        })
        .catch(() => {
          // If the request fails (network error, server down), keep the cached device UUID
          // so the user doesn't lose activation on transient errors.
          // Only clear if the backend explicitly says the device is invalid (empty info).
          localStorage.removeItem("call_center_register_info");
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" dir="rtl">
        <Loader2 size={40} className="text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!activationInfo) {
    return <CallCenterActivationPage onActivationSuccess={(info) => {
      setActivationInfo(info);
    }} />;
  }

  return <Outlet />;
};

export default CallCenterGuard;
