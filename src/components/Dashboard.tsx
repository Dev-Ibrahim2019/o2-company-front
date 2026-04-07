import { useState } from "react";
import api from "../api/axios";

function Dashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.post("/logout");
    } catch {
      // ignore errors — always clear local state
    } finally {
      localStorage.removeItem("token");
      setLoading(false);
      onLogout();
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="card-inner dashboard">
      <div className="avatar">{initials}</div>
      <div className="badge" style={{ marginBottom: "0.5rem" }}>LOGGED IN</div>
      <h1 className="dash-title">Hello, {user?.name?.split(" ")[0] || "there"}.</h1>
      <p className="dash-email">{user?.email}</p>

      <div className="dash-info">
        <div className="info-row">
          <span>Status</span>
          <span className="pill green">Active</span>
        </div>
        <div className="info-row">
          <span>Session</span>
          <span className="pill blue">Authenticated</span>
        </div>
        <div className="info-row">
          <span>Token</span>
          <span className="pill gray">
            {localStorage.getItem("token")?.slice(0, 14)}…
          </span>
        </div>
      </div>

      <button className="btn-logout" onClick={handleLogout} disabled={loading}>
        {loading ? <span className="spinner dark" /> : "Sign Out"}
      </button>
    </div>
  );
}

export default Dashboard;