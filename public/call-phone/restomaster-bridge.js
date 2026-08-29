// restomaster-bridge.js
//
// Provisions this Browser-Phone instance with the current agent's SIP credentials,
// fetched from RestoMaster's own API, instead of requiring manual entry through
// Browser-Phone's own Settings UI. This file is NOT part of upstream Browser-Phone —
// it is RestoMaster's own integration glue, loaded between jQuery and phone.js.
//
// How it gets the agent's identity: this page is only ever opened as an iframe by
// CallPhoneWidget.tsx, which appends ?token=<sanctum-token>&api=<api-base-url> to the
// src URL. Same-origin iframe, so this is equivalent in trust level to the parent
// page itself reading its own token from localStorage.
(function () {
    "use strict";

    var params = new URLSearchParams(window.location.search);
    var token = params.get("token");
    var apiBase = params.get("api") || "/api";

    function loadPhoneScript() {
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.src = "phone.js";
        document.body.appendChild(s);
    }

    if (!token) {
        console.warn("[RestoMaster] لا يوجد token في رابط الصفحة — لن يتم تزويد السماعة ببيانات SIP تلقائياً. سيُطلب إدخالها يدوياً من إعدادات السماعة.");
        if (typeof restomasterNotify === "function") restomasterNotify("provisioning_failed", { reason: "no_token" });
        loadPhoneScript();
        return;
    }

    fetch(apiBase.replace(/\/$/, "") + "/call-center/sip-accounts/my-credentials", {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    })
        .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(function (body) {
            var account = body && body.data;
            if (!account) throw new Error("empty account in response");

            window.phoneOptions = window.phoneOptions || {};
            window.phoneOptions.wssServer = account.sip_server;
            window.phoneOptions.WebSocketPort = account.websocket_port;
            window.phoneOptions.ServerPath = account.server_path || "/ws";
            window.phoneOptions.SipDomain = account.domain || account.sip_server;
            window.phoneOptions.SipUsername = account.username;
            window.phoneOptions.SipPassword = account.password;
            window.phoneOptions.profileName = account.account_name;

            console.log("[RestoMaster] تم تزويد السماعة ببيانات SIP الخاصة بالموظف تلقائياً (" + account.username + ").");
            if (typeof restomasterNotify === "function") restomasterNotify("provisioned", { username: account.username });
        })
        .catch(function (err) {
            // لا تعرض رسالة الخطأ الخام للمستخدم — فقط سجل تشخيصي في الـ console، والحالة
            // الحقيقية (لا يوجد حساب / فشل الاتصال) تظهر في الواجهة عبر رسالة provisioning_failed
            console.warn("[RestoMaster] تعذّر جلب بيانات SIP تلقائياً — سيُطلب إدخالها يدوياً:", err);
            if (typeof restomasterNotify === "function") restomasterNotify("provisioning_failed", { reason: String(err && err.message || err) });
        })
        .finally(function () {
            loadPhoneScript();
        });
})();

// Exposed for the parent page to call directly via iframe.contentWindow (same-origin) —
// simpler than a postMessage round trip for the common "dial this number" action.
window.restomasterDial = function (number) {
    if (typeof DialByLine === "function") {
        DialByLine("audio", null, String(number));
    } else {
        console.warn("[RestoMaster] DialByLine غير متاحة بعد — لم يكتمل تحميل السماعة.");
    }
};
