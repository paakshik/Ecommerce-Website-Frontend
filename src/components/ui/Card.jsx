const base =
  "bg-white border border-warm-200 rounded-radius-md shadow-sm transition-all duration-medium ease-out hover:border-warm-300";

const variants = {
  default: "",
  elevated: "shadow-md hover:shadow-none",
};

const paddings = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  children,
  variant = "default",
  padding = "md",
  onClick,
  href,
  className,
}) {
  const interactive = Boolean(onClick || href);
  const Tag = href ? "a" : "div";

  return (
    <Tag
      as={interactive ? Tag : undefined}
      href={interactive && href ? href : undefined}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`
        ${base} ${variants[variant]} ${paddings[padding]} ${className || ""}
        ${interactive ? "cursor-pointer hover:bg-warm-100 active:bg-warm-200" : ""}
      `}
    >
      {children}
    </Tag>
  );
}
