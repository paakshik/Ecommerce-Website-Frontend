export default function ReviewList({ reviews = [] }) {
  if (reviews.length === 0) return <p className="text-sm text-gray-500">No reviews yet.</p>;
  return (
    <div className="space-y-3" aria-label="Customer reviews">
      {reviews.map((r) => (
        <div key={r.id} className="border border-gray-100 rounded-lg p-3">
          <div className="flex justify-between items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold">{r.user_name || r.user_id}</span>
            <span className="text-yellow-500 text-sm" aria-label={`Rating ${r.rating} of 5`}>
              {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
            </span>
          </div>
          <p className="text-sm text-gray-700">{r.body}</p>
        </div>
      ))}
    </div>
  );
}
