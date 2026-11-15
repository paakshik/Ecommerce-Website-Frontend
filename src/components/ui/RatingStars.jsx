const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z";

function Star({ filled, size = "4" }) {
  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5" };
  return (
    <svg
      className={sizeMap[size]}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? 0 : 1.5}
      />
    </svg>
  );
}

export default function RatingStars({ rating = 0, count, size = "md", showCount = false }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= full) stars.push(<Star key={i} filled size={size} />);
    else if (i === full + 1 && hasHalf) stars.push(<Star key={i} filled size={size} style={{ clipPath: "inset(0 50% 0 0)" }} />);
    else stars.push(<Star key={i} filled={false} size={size} />);
  }

  const filledColor = "text-warning";
  const emptyColor = "text-warm-200";

  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating} out of 5 stars`}>
      {stars.map((s, i) => (
        <span key={i} className={i <= full || (i === full + 1 && hasHalf) ? filledColor : emptyColor}>
          {s}
        </span>
      ))}
      {showCount && count && <span className="text-xs text-warm-600 ml-1">({count} reviews)</span>}
    </div>
  );
}
