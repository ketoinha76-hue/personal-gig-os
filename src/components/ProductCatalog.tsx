import React, { useState } from "react";
import { Product } from "../types";

interface ProductCatalogProps {
  products: Product[];
  onSave: (product: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
}

export default function ProductCatalog({ products, onSave, onDelete, showToast }: ProductCatalogProps) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("custom_product_categories");
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const allCategories = Array.from(
    new Set([
      "Sữa Yakult",
      "Yakult Light",
      "Gói chụp cưới",
      "Dạy học Guitar",
      ...products.map((p) => p.category),
      ...customCategories,
    ].filter(Boolean))
  );

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    cost: "",
    description: "",
    category: "Sữa Yakult",
    sku: "",
    image: ""
  });

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      name: "",
      price: "",
      cost: "",
      description: "",
      category: allCategories[0] || "Sữa Yakult",
      sku: `PROD-${Date.now().toString().slice(-6)}`,
      image: ""
    });
    setIsAddingCategory(false);
    setNewCategoryName("");
    setShowModal(true);
  };

  const handleOpenEdit = (item: Product) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      cost: item.cost.toString(),
      description: item.description,
      category: item.category,
      sku: item.sku,
      image: item.image || ""
    });
    setIsAddingCategory(false);
    setNewCategoryName("");
    setShowModal(true);
  };

  const handleAddCategory = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập tên phân mục.", "warning");
      return;
    }
    if (allCategories.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
      showToast("Phân mục này đã tồn tại rồi.", "warning");
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem("custom_product_categories", JSON.stringify(updated));
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryName("");
    setIsAddingCategory(false);
    showToast(`Đã thêm và chọn phân mục mới: "${trimmed}"!`, "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.cost) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc.", "warning");
      return;
    }
    const payload = {
      ...editItem,
      ...formData,
      price: Number(formData.price),
      cost: Number(formData.cost)
    };
    await onSave(payload);
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-extrabold text-[var(--text-main)]">Sản phẩm & Gói dịch vụ cưới</h2>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
        >
          + Thêm sản phẩm / gói
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((prod) => (
          <div key={prod.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <img
              className="w-full h-40 object-cover bg-[var(--overlay-01)]"
              src={prod.image || "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop"}
              alt={prod.name}
              onError={(e) => {
                (e.target as HTMLImageElement).onerror = null;
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop";
              }}
            />
            <div className="p-4 flex flex-col flex-grow">
              <span className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider mb-1">{prod.category}</span>
              <h4 className="font-bold text-sm text-[var(--text-main)] mb-1 leading-snug">{prod.name}</h4>
              <p className="text-rose-500 font-extrabold text-base mb-2">{prod.price.toLocaleString("vi-VN")} đ</p>
              <p className="text-[11.5px] text-[var(--text-muted)] line-clamp-3 leading-relaxed mb-4 grow">{prod.description}</p>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="flex-grow px-3 py-2 bg-[var(--overlay-03)] hover:bg-[var(--overlay-06)] border border-[var(--border-color)] text-[var(--text-main)] text-[11.5px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  Sửa
                </button>
                <button
                  onClick={() => onDelete(prod.id)}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11.5px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5">
              {editItem ? "Chỉnh sửa Sản phẩm / Gói chụp" : "Thêm mới Sản phẩm / Gói chụp"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tên sản phẩm / gói *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giá bán (đ) *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giá vốn (đ) *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Phân mục</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isAddingCategory ? "✕ Đóng lại" : "➕ Thêm phân mục mới"}
                  </button>
                </div>

                {isAddingCategory && (
                  <div className="flex gap-2 items-center mb-3 bg-black/10 p-2.5 rounded-xl border border-[var(--border-color)] animate-fadeIn">
                    <input
                      type="text"
                      className="flex-grow bg-black/20 border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      placeholder="Nhập tên phân mục mới..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 bg-[var(--primary)] text-white text-[11px] font-bold rounded-lg cursor-pointer hover:bg-[var(--primary-hover)] transition-all"
                    >
                      Thêm
                    </button>
                  </div>
                )}

                <select
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] font-bold cursor-pointer"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {allCategories.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}
                      className="bg-[var(--bg-card)] text-[var(--text-main)] font-semibold"
                    >
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Hình ảnh sản phẩm (Link URL)</label>
                <input
                  type="text"
                  placeholder="Dán link ảnh"
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--overlay-06)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--primary-hover)] shadow-sm"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
