import React, { useState, useEffect, useRef } from "react";
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
    birthYear: "",
    email: "",
    phone: "",
    company: "Nhà riêng",
    address: "",
    locationUrl: "",
    value: ""
  });

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
        }
      }
    } else {
      const extracted = extractCoordinates(val);
      if (extracted && crmMapRef.current) {
        crmMapRef.current.setView(extracted, 14);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      name: "",
      birthYear: "",
      email: "",
      phone: "",
      company: "Nhà riêng",
      address: "",
      locationUrl: "",
      value: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: CrmContact) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      birthYear: item.birthYear || "",
      email: item.email || "",
      phone: item.phone,
      company: item.company,
      address: item.address,
      locationUrl: item.locationUrl || "",
      value: item.value.toString()
    });
    setShowModal(true);
  };

  const handlePingLocation = () => {
    if (navigator.geolocation) {
      showToast("Đang định vị tọa độ GPS hiện tại...", "info");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const mapsUrl = `https://www.google.com/maps?q=${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
          setFormData((prev) => ({ ...prev, locationUrl: mapsUrl }));
          if (crmMapRef.current) {
            crmMapRef.current.setView([position.coords.latitude, position.coords.longitude], 14);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast("Họ tên và số điện thoại là bắt buộc.", "warning");
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-extrabold text-[var(--text-main)]">Quản lý Hồ sơ khách hàng</h2>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
        >
          + Thêm Khách hàng
        </button>
      </div>

      {/* Contacts List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {crmContacts.map((c) => (
          <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl flex flex-col shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="px-2 py-0.5 bg-[var(--overlay-03)] rounded text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider">{c.company}</span>
                <h4 className="font-bold text-sm text-[var(--text-main)] mt-2 leading-tight">{c.name}</h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] cursor-pointer"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)] flex flex-col gap-2 mt-4 leading-relaxed font-medium grow">
              <div>📞 Số điện thoại: <strong className="text-[var(--text-main)]">{c.phone}</strong></div>
              {c.birthYear && <div>🎂 Năm sinh: {c.birthYear}</div>}
              {c.address && <div className="line-clamp-2">📍 Địa chỉ: {c.address}</div>}
              {c.value > 0 && <div>💵 Trị giá: <strong className="text-emerald-500">{c.value.toLocaleString("vi-VN")} đ</strong></div>}
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-[var(--border-color)]">
              {c.locationUrl ? (
                <a
                  href={c.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--overlay-06)] text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  🧭 Chỉ đường
                </a>
              ) : (
                <span className="flex-grow flex items-center justify-center text-[11px] text-amber-500 italic font-medium">Chưa ghim tọa độ</span>
              )}
              <button
                onClick={() => {
                  setInvoiceData({ customerName: c.name, date: new Date().toLocaleDateString("vi-VN"), value: c.value });
                  setShowInvoiceModal(true);
                }}
                className="px-3 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--overlay-06)] text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                🧾 Phiếu thu
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CRM Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5">
              {editItem ? "Sửa thông tin Khách hàng" : "Thêm Khách hàng mới"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Họ và Tên *</label>
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
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Năm sinh</label>
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.birthYear}
                    onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Địa chỉ</label>
                <input
                  type="text"
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Google Maps URL (Tọa độ)</label>
                <input
                  type="text"
                  placeholder="Dán link Google Maps hoặc Vĩ độ, Kinh độ"
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
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
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Bản đồ ghim vị trí (Kéo thả ghim ghim đúng nhà khách)</label>
                <div id="crm-map-container" className="h-44 w-full rounded-xl border border-[var(--border-color)] z-10"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Nhóm khách hàng</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  >
                    <option value="Nhà riêng" className="bg-slate-800 text-white">Nhà riêng (Yakult)</option>
                    <option value="Đại lý" className="bg-slate-800 text-white">Đại lý (Yakult)</option>
                    <option value="Học viên Guitar" className="bg-slate-800 text-white">Học viên Guitar</option>
                    <option value="Khách cưới" className="bg-slate-800 text-white">Khách cưới</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giá trị giao dịch (đ)</label>
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
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
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Quick Printable Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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
        </div>
      )}
    </div>
  );
}
