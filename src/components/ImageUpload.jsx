// Validated image upload: JPEG/PNG/WebP, max 5MiB.
import { useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function ImageUpload({ onUpload, accepted = ALLOWED, maxBytes = MAX_BYTES }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSelect = (e) => {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!accepted.includes(f.type)) {
      setError("Only JPEG, PNG and WebP images are allowed.");
      return;
    }
    if (f.size > maxBytes) {
      setError("Image must be 5 MiB or smaller.");
      return;
    }
    setFile(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/admin/uploads/images`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j.error && j.error.message) || "Upload failed");
      }
      const result = await res.json();
      onUpload(result);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
      <input type="file" accept={accepted.join(",")} onChange={handleSelect} className="sr-only" id="image-upload" />
      <label htmlFor="image-upload" className="cursor-pointer text-indigo-600 hover:underline">
        {file ? file.name : "Choose image"}
      </label>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-4 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        {uploading ? "Uploading..." : "Upload image"}
      </button>
    </section>
  );
}
