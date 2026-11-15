const variants = {
  default: "bg-warm-100 text-warm-600 border border-warm-200",
  success: "bg-[#ECF7F1] text-success",
  warning: "bg-[#FDF4EC] text-warning",
  danger: "bg-[#FEF2F2] text-error",
  outline: "bg-transparent border border-warm-200 text-warm-600",
};

const sizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-xs",
};

export default function Badge({ variant = "default", size = "md", children, className }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizes[size]} ${variants[variant]} ${className || ""}`}
    >
      {children}
    </span>
  );
}
