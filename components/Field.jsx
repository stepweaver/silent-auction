export default function Field({ label, error, children, required }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
