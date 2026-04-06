import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import InputField from "./InputField";

function RegisterForm({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const e: any = {};
    if (!name) e.name = "Name is required";
    if (!email) e.email = "Email is required";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Minimum 8 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
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
      const { data } = await api.post("/register", { name, email, password });
      localStorage.setItem("token", data.token);
      onLogin(data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-inner">
      <div className="form-header">
        <div className="badge">GET STARTED</div>
        <h1>
          Create your
          <br />
          account.
        </h1>
        <p>Join us — it only takes a moment.</p>
      </div>
      {apiError && <div className="api-error">{apiError}</div>}
      <InputField
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Jane Doe"
        error={errors.name}
      />
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
        placeholder="Min. 8 characters"
        error={errors.password}
      />
      <InputField
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Repeat password"
        error={errors.confirm}
      />
      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="spinner" /> : "Create Account →"}
      </button>
      <p className="switch-text">
        Already have an account?{" "}
        <button className="link-btn" onClick={() => navigate("/login")}>
          Sign in
        </button>
      </p>
    </div>
  );
}

export default RegisterForm;
