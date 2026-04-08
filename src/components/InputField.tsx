const InputField = ({
  type = "text",
  value,
  onChange,
  placeholder,
  error,
}) => (
  <div className="field">
    <input
      className="w-full pr-12 pl-4 py-4 bg-slate-800 border border-white/5 rounded-2xl outline-none font-black text-sm text-white focus:ring-2 focus:ring-red-600 transition-all"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
    />
    {error && <span className="mt-2 text-sm text-red-600 font-medium">{error}</span>}
  </div>
);

export default InputField;

