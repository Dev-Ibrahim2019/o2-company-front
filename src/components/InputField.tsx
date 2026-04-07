const InputField = ({ label, type = "text", value, onChange, placeholder, error }) => (
  <div className="field">
    <label>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
    />
    {error && <span className="field-error">{error}</span>}
  </div>
);

export default InputField;