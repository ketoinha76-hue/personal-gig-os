import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CrmContact } from "../types";

interface CrmManagerProps {
  crmContacts: CrmContact[];
  onSave: (contact: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
  apiCall: (url: string, method?: string, body?: any) => Promise<any>;
}

declare var L: any; // global Leaflet variable

export default function CrmManager({ crmContacts, onSave, onDelete, showToast, apiCall }: CrmManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CrmContact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "Khách hàng ngày chẵn",
    address: "",
    locationUrl: "",
    value: "23300"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");

  // Invoice / Contract states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    customerName: "",
    date: new Date().toLocaleDateString("vi-VN"),
    value: 0
  });

  const [showContractModal, setShowContractModal] = useState(false);
  const [contractData, setContractData] = useState({
    clientA: "Nguyễn Văn A",
    clientB: "Trần Thị B",
    date: new Date().toLocaleDateString("vi-VN"),
    package: "Gói chụp hình cưới Premium Studio",
    price: 8500000,
    deposit: 2000000
  });

  const crmMapRef = useRef<any>(null);
  const crmMarkerRef = useRef<any>(null);

  const extractCoordinates = (url: string) => {
    if (!url) return null;
    url = url.trim();
    const placeParamMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (placeParamMatch) {
      const lat = parseFloat(placeParamMatch[1]);
      const lng = parseFloat(placeParamMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    const qMatch = url.match(/[?&]q=([\d.-]+),([\d.-]+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    const atMatch = url.match(/@([\d.-]+),([\d.-]+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    const rawMatch = url.match(/^([\d.-]+)\s*,\s*([\d.-]+)$/);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  };

  const resolveShortGoogleMapsUrl = async (url: string) => {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data && data.status && data.status.url && data.status.url !== url) {
        return data.status.url;
      }
      if (data && data.contents) {
        const metaMatch = data.contents.match(/https:\/\/www\.google\.com\/maps\/place\/[^"']+/);
        if (metaMatch) return metaMatch[0];
      }
    } catch (e) {
      try {
        const res2 = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (res2 && res2.url) return res2.url;
      } catch(e2) {}
    }
    return url;
  };

  // Init leaflet in modal
  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        const container = document.getElementById("crm-map-container");
        if (!container) return;

        if (crmMapRef.current) {
          crmMapRef.current.remove();
          crmMapRef.current = null;
        }

        let initialLat = 10.7794;
        let initialLng = 106.7028;
        const coords = extractCoordinates(formData.locationUrl);
        if (coords) {
          initialLat = coords[0];
          initialLng = coords[1];
        }

        const map = L.map("crm-map-container").setView([initialLat, initialLng], 14);
        crmMapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: L.divIcon({
            className: "custom-div-icon",
            html: "<div style='background-color: var(--rose); color: white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid white;'>📍</div>",
            iconSize: [26, 26]
          })
        }).addTo(map);
        crmMarkerRef.current = marker;

        const updateInputs = (lat: number, lng: number) => {
          const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
          setFormData((prev) => ({ ...prev, locationUrl: mapsUrl }));
        };

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          updateInputs(position.lat, position.lng);
        });

        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          updateInputs(e.latlng.lat, e.latlng.lng);
        });
      }, 300);
    } else {
      if (crmMapRef.current) {
        crmMapRef.current.remove();
        crmMapRef.current = null;
      }
      crmMarkerRef.current = null;
    }
  }, [showModal]);

  // Adjust center on manual typing
  const handleLocationChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, locationUrl: val }));

    if (val.includes("maps.app.goo.gl") || val.includes("goo.gl/maps")) {
      showToast("Đang phân giải link bản đồ ngắn...", "info");
      const resolved = await resolveShortGoogleMapsUrl(val);
      if (resolved && resolved !== val) {
        const extracted = extractCoordinates(resolved);
        if (extracted) {
          const finalVal = `https://www.google.com/maps?q=${extracted[0].toFixed(6)},${extracted[1].toFixed(6)}`;
          setFormData((prev) => ({ ...prev, locationUrl: finalVal }));
          showToast("Phân giải link thành công!", "success");
          if (crmMapRef.current) {
            crmMapRef.current.setView(extracted, 14);
          }
          if (crmMarkerRef.current) {
            crmMarkerRef.current.setLatLng(extracted);
          }
        }
      }
    } else {
      const extracted = extractCoordinates(val);
      if (extracted && crmMapRef.current) {
        crmMapRef.current.setView(extracted, 14);
      }
      if (extracted && crmMarkerRef.current) {
        crmMarkerRef.current.setLatLng(extracted);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "Khách hàng ngày chẵn",
      address: "",
      locationUrl: "",
      value: "23300"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: CrmContact) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      email: "",
      phone: item.phone || "Tạp Hóa",
      company: item.company || "Khách hàng ngày chẵn",
      address: item.address || "",
      locationUrl: item.locationUrl || "",
      value: item.value != null ? item.value.toString() : "23300"
    });
    setShowModal(true);
  };

  const handlePingLocation = () => {
    if (navigator.geolocation) {
      showToast("Đang định vị tọa độ GPS hiện tại...", "info");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
          setFormData((prev) => ({ ...prev, locationUrl: mapsUrl }));
          if (crmMapRef.current) {
            crmMapRef.current.setView([lat, lng], 14);
          }
          if (crmMarkerRef.current) {
            crmMarkerRef.current.setLatLng([lat, lng]);
          }
          showToast("Định vị tọa độ GPS thành công!", "success");
        },
        (error) => {
          showToast("Lỗi định vị GPS: " + error.message, "danger");
        }
      );
    } else {
      showToast("Định vị GPS không khả dụng trên thiết bị này.", "danger");
    }
  };

  const handleSearchAddress = async () => {
    if (!formData.address) {
      showToast("Vui lòng nhập địa chỉ trước khi tìm kiếm.", "warning");
      return;
    }
    showToast("Đang tự động tìm kiếm tọa độ...", "info");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
        setFormData((prev) => ({ ...prev, locationUrl: mapsUrl }));
        if (crmMapRef.current) {
          crmMapRef.current.setView([lat, lon], 16);
        }
        if (crmMarkerRef.current) {
          crmMarkerRef.current.setLatLng([lat, lon]);
        }
        showToast("Đã tìm thấy tọa độ! Bạn có thể kéo thả ghim nếu bị sai xót.", "success");
      } else {
        showToast("Không tìm thấy tọa độ cho địa chỉ này trên bản đồ.", "warning");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi tìm kiếm tọa độ.", "danger");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast("Họ tên là bắt buộc.", "warning");
      return;
    }
    const payload = {
      ...editItem,
      ...formData,
      value: Number(formData.value) || 0
    };
    await onSave(payload);
    setShowModal(false);
  };

  const handleComposeZaloMsg = async (client: CrmContact) => {
    showToast("AI đang soạn thảo tin nhắn chăm sóc Zalo...", "info");
    let biz = "";
    if (client.company === "Nhà riêng" || client.company === "Đại lý") {
      biz = "thăm hỏi chất lượng sữa Yakult anh Long giao và mời tiếp tục đặt mua";
    } else if (client.company === "Học viên Guitar") {
      biz = "thăm hỏi tình hình học thế tay bấm của hợp âm guitar, tạo sự hứng khởi và hỏi bài tập về nhà";
    } else {
      biz = "thăm hỏi xem hai bạn Vy & Long có yêu cầu chỉnh sửa hay thêm hình ảnh gì cho album cưới không";
    }

    const prompt = `Hãy soạn một tin nhắn chăm sóc khách hàng gửi qua Zalo cho tên: "${client.name}". Mục tiêu: ${biz}. Viết bằng Tiếng Việt ngắn gọn, thân mật, tự nhiên như người bạn chụp hình/dạy đàn hoặc người giao sữa.`;
    try {
      const res = await apiCall("/api/ai/assistant", "POST", { prompt });
      if (res.response) {
        await navigator.clipboard.writeText(res.response.trim());
        showToast("Đã sao chép tin nhắn vào Clipboard! Đang mở Zalo...", "success");
        window.open(`https://zalo.me/${client.phone}`, "_blank");
      }
    } catch (e: any) {
      showToast("Lỗi soạn tin nhắn AI: " + e.message, "danger");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-extrabold text-[var(--text-main)]">Quản lý Hồ sơ khách hàng</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Tìm tên khách hàng..."
            className="flex-1 sm:w-64 bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
            <select
            className="bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="All" className="bg-slate-800 text-white">Tất cả Nhóm</option>
            <option value="Khách hàng ngày chẵn" className="bg-slate-800 text-white">Khách hàng ngày chẵn</option>
            <option value="Khách hàng ngày lẻ" className="bg-slate-800 text-white">Khách hàng ngày lẻ</option>
          </select>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
          >
            + Thêm
          </button>
        </div>
      </div>

      {/* Compact Customer List */}
      <div className="flex flex-col gap-1.5">
        {crmContacts
          .filter((c) => {
            const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (c.phone && c.phone.includes(searchTerm));
            const matchGroup = filterGroup === "All" || c.company === filterGroup || 
                               (filterGroup === "Nhà riêng" && c.company === "Nhà riêng") ||
                               (filterGroup === "Đại lý" && c.company === "Đại lý");
            return matchSearch && matchGroup;
          })
          .map((c, idx) => (
          <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center hover:border-[rgba(99,102,241,0.4)] transition-all shadow-sm">
            {/* Col 1: Tên & Nhóm */}
            <div className="md:col-span-3 flex flex-col w-full min-w-0">
              <span className="text-[14px] font-extrabold text-[var(--text-main)] truncate block">{c.name}</span>
              <span className={`text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full border w-fit ${
                c.company === "Khách hàng ngày chẵn" ? "bg-blue-900/20 text-blue-400 border-blue-500/20" :
                c.company === "Khách hàng ngày lẻ" ? "bg-violet-900/20 text-violet-400 border-violet-500/20" :
                "bg-white/5 text-[var(--text-muted)] border-white/10"
              }`}>
                {c.company}
              </span>
            </div>

            {/* Col 2: Liên hệ (Phone & Address) */}
            <div className="md:col-span-4 flex flex-col gap-1.5 w-full text-[12px] text-[var(--text-muted)] border-l-0 md:border-l border-[var(--border-color)] md:pl-4">
              {c.phone ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-white/30 w-12">K.Thác</span>
                  <span className="font-mono text-emerald-400 font-semibold">{c.phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 italic opacity-50"><span className="text-[10px] uppercase font-bold text-white/30 w-12">K.Thác</span> -</div>
              )}
              {c.address ? (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] uppercase font-bold text-white/30 w-12 shrink-0 mt-0.5">Đ.Chỉ</span>
                  <span className="truncate flex-1" title={c.address}>{c.address}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 italic opacity-50"><span className="text-[10px] uppercase font-bold text-white/30 w-12">Đ.Chỉ</span> -</div>
              )}
            </div>

            {/* Col 3: Thông tin phụ (Value) */}
            <div className="md:col-span-3 flex flex-col gap-1.5 w-full text-[12px] text-[var(--text-muted)] border-l-0 md:border-l border-[var(--border-color)] md:pl-4 justify-center">
              {c.value > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-white/30 w-9">T.Giá</span>
                  <strong className="text-emerald-400 font-mono">{c.value.toLocaleString("vi-VN")} đ</strong>
                </div>
              ) : (
                <div className="flex items-center gap-2 italic opacity-50"><span className="text-[10px] uppercase font-bold text-white/30 w-9">T.Giá</span> -</div>
              )}
            </div>

            {/* Col 4: Thao tác */}
            <div className="md:col-span-2 flex items-center md:justify-end gap-2 w-full mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-color)]">
              {c.locationUrl && (
                <a
                  href={c.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chỉ đường"
                  className="flex items-center justify-center p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:scale-105 transition-all cursor-pointer text-[13px] border border-blue-500/20"
                >
                  🧭
                </a>
              )}
              <button
                onClick={() => handleOpenEdit(c)}
                title="Sửa"
                className="flex items-center justify-center p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:scale-105 transition-all cursor-pointer text-[13px] border border-amber-500/20"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(c.id)}
                title="Xóa"
                className="flex items-center justify-center p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:scale-105 transition-all cursor-pointer text-[13px] border border-rose-500/20"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {crmContacts.filter((c) => {
            const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm));
            const matchGroup = filterGroup === "All" || c.company === filterGroup;
            return matchSearch && matchGroup;
          }).length === 0 && (
          <div className="text-center py-12 text-xs text-[var(--text-muted)] italic">Không tìm thấy khách hàng nào.</div>
        )}
      </div>


      {/* CRM Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[99999] p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full max-w-lg px-4 pt-4 pb-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden"></div>
            <h3 className="text-sm font-extrabold text-[var(--text-main)] mb-3">
              {editItem ? "✏️ Sửa thông tin Khách hàng" : "➕ Thêm Khách hàng mới"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div>
                <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Khai thác</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  >
                    <option value="Tạp Hóa" className="bg-slate-800 text-white">Tạp Hóa</option>
                    <option value="Công Ty" className="bg-slate-800 text-white">Công Ty</option>
                    <option value="Khác" className="bg-slate-800 text-white">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Giá trị giao dịch (đ)</label>
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Nhóm khách hàng</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  >
                    <option value="Khách hàng ngày chẵn" className="bg-slate-800 text-white">Khách hàng ngày chẵn</option>
                    <option value="Khách hàng ngày lẻ" className="bg-slate-800 text-white">Khách hàng ngày lẻ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Địa chỉ</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={handleSearchAddress}
                      className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap border border-blue-400"
                    >
                      🔍 Tìm tọa độ
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Google Maps URL (Tọa độ)</label>
                <input
                  type="text"
                  placeholder="Dán link Google Maps hoặc Vĩ độ, Kinh độ"
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.locationUrl}
                  onChange={(e) => handleLocationChange(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handlePingLocation}
                  className="w-full mt-2.5 px-4 py-2 bg-[var(--overlay-03)] hover:bg-[var(--overlay-06)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer transition-all border border-[var(--border-color)]"
                >
                  📍 Lấy tọa độ GPS hiện tại (Mobile)
                </button>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Ghim vị trí trên bản đồ</label>
                <div id="crm-map-container" className="h-32 w-full rounded-xl border border-[var(--border-color)] z-10"></div>
              </div>

              <div className="flex gap-2 justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--overlay-06)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] shadow-sm"
                >
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Invoice Quick Printable Modal */}
      {showInvoiceModal && createPortal(
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div id="print-invoice-area" className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white text-slate-900 font-serif shadow-inner">
              <div className="flex justify-between border-b-2 border-black pb-4">
                <div>
                  <h2 className="text-lg font-extrabold uppercase">PHIẾU THU THANH TOÁN</h2>
                  <small className="text-gray-500 font-sans">Mã phiếu: PT-{Date.now().toString().slice(-6)}</small>
                </div>
                <div className="text-right text-xs">
                  <strong>Huỳnh Bá Long</strong><br/>
                  <small className="font-sans">SĐT: 0912-345-678</small>
                </div>
              </div>
              <div className="my-5 text-sm flex flex-col gap-1">
                <div>Khách hàng: <b>{invoiceData.customerName}</b></div>
                <div>Ngày phát hành: {invoiceData.date}</div>
              </div>
              <table className="w-full text-left text-xs mb-6 border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2">Nội dung hàng / dịch vụ</th>
                    <th className="py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dashed border-gray-300">
                    <td className="py-3">Thanh toán tiền hàng / dịch vụ cưới / học phí Guitar</td>
                    <td className="py-3 text-right">{(invoiceData.value || 0).toLocaleString()} đ</td>
                  </tr>
                </tbody>
              </table>
              <div className="text-right text-base font-black">
                Tổng thanh toán: {(invoiceData.value || 0).toLocaleString()} đ
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--primary-hover)] shadow-sm"
              >
                🖨️ Xuất / In PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
