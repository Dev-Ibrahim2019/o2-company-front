import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import InputField from "./InputField";

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const e: any = {};
    if (!email) e.email = "Email is required";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setApiError("");
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      localStorage.setItem("token", data.data.token);
      onLogin(data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-inner">
      <div className="form-header">
        <div className="badge">SIGN IN</div>
        <h1>
          Welcome
          <br />
          back.
        </h1>
        <p>Enter your credentials to continue.</p>
      </div>
      {apiError && <div className="api-error">{apiError}</div>}
      <InputField
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        error={errors.email}
      />
      <InputField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        error={errors.password}
      />
      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="spinner" /> : "Sign In →"}
      </button>
      <p className="switch-text">
        Don't have an account?{" "}
        <button className="link-btn" onClick={() => navigate("/register")}>
          Create one
        </button>
      </p>
    </div>
  );
}

export default LoginForm;
