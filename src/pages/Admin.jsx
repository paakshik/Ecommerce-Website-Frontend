import { useState, useEffect } from "react";
import { api } from "../services/api";
import ImageUpload from "../components/ImageUpload";
import RateLimitMessage from "../components/RateLimitMessage";

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  // Backend contract: delivery_type is "ship" | "download" | "both".
  const [deliveryType, setDeliveryType] = useState("ship");
  const [categoryId, setCategoryId] = useState("");
  // Variants collected for product creation (valid variant info).
  const [variants, setVariants] = useState([{ sku: "", price_minor: "", stock: "" }]);
  // Uploaded image connected to the product being created.
  const [uploadedImage, setUploadedImage] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);

  // ---- Orders ----
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [fulfilling, setFulfilling] = useState(new Set());

  // ---- Digital asset upload ----
  const [selectedProductId, setSelectedProductId] = useState("");
  const [digitalFile, setDigitalFile] = useState(null);
  const [digitalUploading, setDigitalUploading] = useState(false);
  const [digitalError, setDigitalError] = useState(null);
  const [digitalSuccess, setDigitalSuccess] = useState(null);

  useEffect(() => {
    api.get("/admin/products")
      .then((data) => setProducts(data.items || data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    api.get("/admin/orders")
      .then((data) => setOrders(data.items || data))
      .catch((e) => setOrdersError(e.message))
      .finally(() => setOrdersLoading(false));
  }, []);

  const addVariant = () => setVariants([...variants, { sku: "", price_minor: "", stock: "" }]);
  const removeVariant = (i) => setVariants(variants.filter((_, idx) => idx !== i));
  const updateVariant = (i, field, value) => {
    const next = [...variants];
    next[i][field] = value;
    setVariants(next);
  };

  const handleUpload = (result) => {
    // Connect the uploaded image to the product being created.
    setUploadedImage(result);
    setError(null);
  };

  const createProduct = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const variantPayloads = variants.map((v) => ({
        sku: v.sku,
        options: null,
        price_minor: parseInt(v.price_minor, 10) || 0,
        currency: "USD",
        stock: parseInt(v.stock, 10) || 0,
      })).filter((v) => v.sku);

      await api.post("/admin/products", {
        name,
        slug,
        description,
        delivery_type: deliveryType,
        category_id: categoryId || undefined,
        variants: variantPayloads,
        images: uploadedImage ? [uploadedImage.storage_key] : [],
      });
      setName(""); setSlug(""); setDescription("");
      setVariants([{ sku: "", price_minor: "", stock: "" }]);
      setUploadedImage(null);
      window.location.reload();
    } catch (e) {
      setError(e.message);
      if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60, onRetry: createProduct, disabled: loading });
    }
  };

  const refreshOrders = async () => {
    const data = await api.get("/admin/orders");
    setOrders(data.items || data);
    setOrdersError(null);
  };

  const fulfillOrder = async (id) => {
    setFulfilling((prev) => new Set([...prev, id]));
    setOrdersError(null);
    try {
      await api.post(`/admin/orders/${id}/fulfill`, null);
      await refreshOrders();
    } catch (e) {
      setOrdersError(e.message);
      if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60, onRetry: () => fulfillOrder(id), disabled: fulfilling.has(id) });
    } finally {
      setFulfilling((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const statusBadge = (status) => {
    const style = {
      pending: "bg-amber-100 text-amber-800",
      paid: "bg-blue-100 text-blue-800",
      fulfilled: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    }[status || ""] || "bg-gray-100 text-gray-800";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {status}
      </span>
    );
  };

  const formatMoney = (minor, currency) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format((minor || 0) / 100);
  };

  const handleDigitalSelect = (e) => {
    setDigitalFile(e.target.files?.[0] ?? null);
    setDigitalError(null);
    setDigitalSuccess(null);
  };

  const handleDigitalUpload = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !digitalFile) return;
    setDigitalError(null);
    setDigitalSuccess(null);
    setDigitalUploading(true);
    const fd = new FormData();
    fd.append("file", digitalFile);
    try {
      await api.post(`/admin/products/${selectedProductId}/digital-assets`, fd);
      setDigitalSuccess("Digital asset uploaded successfully.");
      setDigitalFile(null);
      setSelectedProductId("");
    } catch (e) {
      setDigitalError(e.message);
      if (e.status === 429) setRateLimit({ retryAfterSeconds: parseInt(e.retryAfter, 10) || 60, onRetry: handleDigitalUpload, disabled: digitalUploading });
    } finally {
      setDigitalUploading(false);
    }
  };

  if (loading) return <p className="text-center py-10">Loading admin…</p>;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin — Product Management</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add product</h2>
          <form onSubmit={createProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery type</label>
              <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="ship">Ship (physical)</option>
                <option value="download">Download (digital)</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variants</label>
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
                  <input placeholder="Price (minor units)" value={v.price_minor} onChange={(e) => updateVariant(i, "price_minor", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
                  <input placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
                  {variants.length > 1 && <button type="button" onClick={() => removeVariant(i)} className="px-3 py-2 border border-gray-300 rounded-lg text-red-600">Remove</button>}
                </div>
              ))}
              <button type="button" onClick={addVariant} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Add variant</button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product image</label>
              <ImageUpload onUpload={handleUpload} />
              {uploadedImage && <p className="text-xs text-gray-600 mt-1">Image connected: {uploadedImage.storage_key}</p>}
            </div>
            {rateLimit && (
              <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={rateLimit.onRetry} disabled={rateLimit.disabled || loading} />
            )}
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button disabled={!!rateLimit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Create product</button>
          </form>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Image upload</h2>
          <ImageUpload onUpload={handleUpload} />
        </div>
      </div>
      <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Slug</th><th className="text-left px-4 py-3">Type</th></tr></thead>
            <tbody>
              {(products || []).map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-gray-600">{p.slug}</td>
                  <td className="px-4 py-2 text-gray-600">{p.delivery_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Orders section ---- */}
      <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
          {ordersLoading ? (
            <span className="text-xs text-gray-500">Loading…</span>
          ) : (
            <span className="text-xs text-gray-600">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {ordersError && <p className="mb-3 text-sm text-red-600" role="alert">{ordersError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer email</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Payment status</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="px-4 py-2 font-medium">#{o.id}</td>
                  <td className="px-4 py-2 text-gray-600">{o.email}</td>
                  <td className="px-4 py-2">{statusBadge(o.status)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatMoney(o.total_minor, o.currency)}</td>
                  <td className="px-4 py-2 text-gray-600">{o.payment_status || "—"}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {(o.items || []).map((it) => (
                      <div key={it.variant_id} className="mb-1">
                        {it.product_name} × {it.quantity} <span className="text-xs text-gray-400">({it.delivery_type})</span>
                      </div>
                    ))}
                    {o.downloadable_item_ids && o.downloadable_item_ids.length > 0 && (
                      <div className="text-xs text-green-700 font-medium mt-1">📥 Digital downloads available ({o.downloadable_item_ids.length})</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {o.status === "paid" ? (
                      <button
                        onClick={() => fulfillOrder(o.id)}
                        disabled={fulfilling.has(o.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {fulfilling.has(o.id) ? "Fulfilling…" : "Fulfill"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">{o.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {(orders || []).length === 0 && !ordersLoading && (
                <tr>
                  <td colSpan="7" className="px-4 py-4 text-center text-gray-500 text-sm">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Digital asset upload section ---- */}
      <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Digital Asset Upload</h2>
        <p className="text-sm text-gray-600 mb-4">Attach a private digital file to a product (for downloadable products).</p>
        <form onSubmit={handleDigitalUpload} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={digitalUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a product</option>
              {(products || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Digital file</label>
            <input
              type="file"
              onChange={handleDigitalSelect}
              disabled={digitalUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {digitalFile && <p className="text-xs text-gray-600 mt-1">{digitalFile.name}</p>}
          </div>
          {digitalError && <p className="text-sm text-red-600" role="alert">{digitalError}</p>}
          {digitalSuccess && <p className="text-sm text-green-600" role="status">{digitalSuccess}</p>}
          {rateLimit && (
            <RateLimitMessage retryAfterSeconds={rateLimit.retryAfterSeconds} onRetry={rateLimit.onRetry} disabled={rateLimit.disabled || digitalUploading} />
          )}
          <button
            type="submit"
            disabled={!selectedProductId || !digitalFile || digitalUploading || !!rateLimit}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {digitalUploading ? "Uploading…" : "Upload digital asset"}
          </button>
        </form>
      </div>
    </section>
  );
}
