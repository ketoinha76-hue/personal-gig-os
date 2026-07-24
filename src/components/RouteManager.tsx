import React, { useState, useEffect, useRef } from "react";
import { CrmContact, Schedule } from "../types";
import { 
  Calendar, 
  Map, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  MapPin, 
  X, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  ListTodo
} from "lucide-react";

interface RouteManagerProps {
  crmContacts: CrmContact[];
  schedules: Schedule[];
  depotCoords: string;
  setDepotCoords: (coords: string) => void;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
  apiCall: (url: string, method?: string, body?: any) => Promise<any>;
  refreshData?: () => Promise<void>;
  forcedTab?: "matrix" | "map";
}

declare var L: any;

export default function RouteManager({
  crmContacts,
  schedules,
  depotCoords,
  setDepotCoords,
  showToast,
  apiCall,
  refreshData,
  forcedTab
}: RouteManagerProps) {
  // Tab control: "matrix" = Ma trận Lịch tuần, "map" = Tối ưu lộ trình & Giao sữa
  const [subTab, setSubTab] = useState<"matrix" | "map">(forcedTab || "matrix");

  useEffect(() => {
    if (forcedTab) {
      setSubTab(forcedTab);
    }
  }, [forcedTab]);

  // Map state
  const [selectedCrmRouteIds, setSelectedCrmRouteIds] = useState<string[]>([]);
  const [optimizedRoutePath, setOptimizedRoutePath] = useState<any[]>([]);
  const routeMapRef = useRef<any>(null);

  const [routeSearchTerm, setRouteSearchTerm] = useState("");
  const [routeFilterGroup, setRouteFilterGroup] = useState("All");

  const [isTracking, setIsTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
  const [trackingDistance, setTrackingDistance] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const [showTrackingSummary, setShowTrackingSummary] = useState(false);

  // Modal / Scheduling state
  const [showSchModal, setShowSchModal] = useState(false);
  const [editingSch, setEditingSch] = useState<Schedule | null>(null);
  const [schForm, setSchForm] = useState({
    title: "",
    description: "",
    dayOfWeek: 1, // 1 = Thứ 2, ..., 7 = Chủ Nhật
    startTime: "08:00",
    endTime: "09:00",
    color: "purple",
    address: ""
  });

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

  const getDistance = (c1: number[], c2: number[]) => {
    const latDiff = c1[0] - c2[0];
    const lngDiff = c1[1] - c2[1];
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  };

  // Initialize Route Map automatically when map subTab is selected
  useEffect(() => {
    if (subTab !== "map") return;

    const timer = setTimeout(() => {
      const container = document.getElementById("route-map");
      if (!container) return;

      if (routeMapRef.current) {
        routeMapRef.current.remove();
        routeMapRef.current = null;
      }

      let initialLat = 10.8087727;
      let initialLng = 106.9241267;
      const extracted = extractCoordinates(depotCoords);
      if (extracted) {
        initialLat = extracted[0];
        initialLng = extracted[1];
      }

      const map = L.map("route-map").setView([initialLat, initialLng], 13);
      routeMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      // Redraw default markers
      drawOptimizedMap(initialLat, initialLng, optimizedRoutePath);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (routeMapRef.current) {
        routeMapRef.current.remove();
        routeMapRef.current = null;
      }
    };
  }, [subTab]);

  const drawOptimizedMap = (depotLat: number, depotLng: number, sortedRoute: any[]) => {
    if (!routeMapRef.current) return;
    const map = routeMapRef.current;

    // Clear previous markers & polylines
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Readd tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    // Starter Point Marker (Depot)
    L.marker([depotLat, depotLng], {
      icon: L.divIcon({
        className: "custom-div-icon",
        html: "<div style='background-color: var(--primary); color: white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid white;'>🏁</div>",
        iconSize: [28, 28]
      })
    }).addTo(map).bindPopup("<b>Điểm xuất phát cố định (Tổng kho)</b>");

    const pathPoints = [[depotLat, depotLng]];

    // Waypoints markers
    sortedRoute.forEach((pt, i) => {
      const bgColor = pt.completed ? "#94a3b8" : "var(--rose)";
      const txtDecoration = pt.completed ? "line-through" : "none";
      L.marker(pt.coords, {
        icon: L.divIcon({
          className: "custom-div-icon",
          html: `<div style='background-color: ${bgColor}; color: white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid white; text-decoration: ${txtDecoration};'>${i + 1}</div>`,
          iconSize: [26, 26]
        })
      }).addTo(map).bindPopup(`<b>${i + 1}. ${pt.name}</b><br/>${pt.address}`);
      pathPoints.push(pt.coords);
    });

    // Quay ngược lại điểm cuối là công ty để khứ hồi hoàn chỉnh
    pathPoints.push([depotLat, depotLng]);

    // Draw lines using OSRM
    if (pathPoints.length > 2) {
      // Split into outbound and return
      const outboundPoints = pathPoints.slice(0, pathPoints.length - 1);
      const returnPoints = [pathPoints[pathPoints.length - 2], pathPoints[pathPoints.length - 1]];

      const osrmOutboundCoords = outboundPoints.map(p => `${p[1]},${p[0]}`).join(";");
      const osrmReturnCoords = returnPoints.map(p => `${p[1]},${p[0]}`).join(";");

      const osrmOutboundUrl = `https://router.project-osrm.org/route/v1/driving/${osrmOutboundCoords}?overview=full&geometries=geojson`;
      const osrmReturnUrl = `https://router.project-osrm.org/route/v1/driving/${osrmReturnCoords}?overview=full&geometries=geojson`;

      // Outbound (Pink)
      fetch(osrmOutboundUrl)
        .then(res => res.json())
        .then(data => {
          if (data.code === "Ok" && data.routes && data.routes[0]) {
            const roadGeo = data.routes[0].geometry;
            const roadLine = L.geoJSON(roadGeo, {
              style: { color: "var(--rose)", weight: 5, opacity: 0.8 }
            }).addTo(map);
            map.fitBounds(roadLine.getBounds());
          }
        }).catch(() => {
          L.polyline(outboundPoints, { color: "var(--rose)", weight: 4, dashArray: "5, 8" }).addTo(map);
        });

      // Return (Blue)
      fetch(osrmReturnUrl)
        .then(res => res.json())
        .then(data => {
          if (data.code === "Ok" && data.routes && data.routes[0]) {
            const roadGeo = data.routes[0].geometry;
            L.geoJSON(roadGeo, {
              style: { color: "#3b82f6", weight: 5, opacity: 0.8, dashArray: "10, 10" } // dashed blue line for return
            }).addTo(map);
          }
        }).catch(() => {
          L.polyline(returnPoints, { color: "#3b82f6", weight: 4, dashArray: "5, 8" }).addTo(map);
        });
    } else if (pathPoints.length === 2) {
      // Direct dash line if only 2 points
      const line = L.polyline(pathPoints, { color: "var(--rose)", weight: 4, dashArray: "5, 8" }).addTo(map);
      map.fitBounds(line.getBounds());
    }
  };

  const toggleRouteSelection = (id: string) => {
    setSelectedCrmRouteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOptimizeDailyRoute = async () => {
    if (selectedCrmRouteIds.length === 0) {
      showToast("Vui lòng chọn ít nhất một khách hàng để tối ưu lộ trình.", "warning");
      return;
    }

    let depotLat = null;
    let depotLng = null;
    const extractedStart = extractCoordinates(depotCoords);
    if (extractedStart) {
      depotLat = extractedStart[0];
      depotLng = extractedStart[1];
    } else {
      const parts = depotCoords.split(",").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        depotLat = parts[0];
        depotLng = parts[1];
      }
    }

    if (depotLat === null || depotLng === null) {
      showToast("Tọa độ xuất phát không đúng định dạng.", "danger");
      return;
    }

    // Save depot coords to server settings
    try {
      await apiCall("/api/settings", "PUT", { depotCoords: `${depotLat.toFixed(6)},${depotLng.toFixed(6)}` });
    } catch (err) {}

    const selectedContacts = crmContacts.filter((c) => selectedCrmRouteIds.includes(c.id));
    const coordList: any[] = [];

    selectedContacts.forEach((c) => {
      const extracted = extractCoordinates(c.locationUrl || "");
      if (extracted) {
        coordList.push({ id: c.id, name: c.name, coords: extracted, address: c.address, locationUrl: c.locationUrl });
      }
    });

    if (coordList.length === 0) {
      showToast("Các khách hàng được chọn chưa cấu hình tọa độ GPS.", "danger");
      return;
    }

    // Nearest Neighbor optimization algorithm
    let currentCoords = [depotLat, depotLng];
    const sortedRoute: any[] = [];
    const unvisited = [...coordList];

    while (unvisited.length > 0) {
      let minDistance = Infinity;
      let nextIdx = -1;
      for (let i = 0; i < unvisited.length; i++) {
        const d = getDistance(currentCoords, unvisited[i].coords);
        if (d < minDistance) {
          minDistance = d;
          nextIdx = i;
        }
      }
      if (nextIdx !== -1) {
        const nextDest = unvisited.splice(nextIdx, 1)[0];
        sortedRoute.push({ ...nextDest, completed: false });
        currentCoords = nextDest.coords;
      }
    }

    setOptimizedRoutePath(sortedRoute);
    showToast("Đã tính toán lộ trình tối ưu thành công!", "success");
    drawOptimizedMap(depotLat, depotLng, sortedRoute);
  };

  const handleToggleRouteCheck = (idx: number) => {
    const updated = [...optimizedRoutePath];
    updated[idx].completed = !updated[idx].completed;
    setOptimizedRoutePath(updated);

    if (isTracking && updated[idx].completed) {
      const now = Date.now();
      let depotLat = 10.8087727;
      let depotLng = 106.9241267;
      const extractedStart = extractCoordinates(depotCoords);
      if (extractedStart) {
        depotLat = extractedStart[0];
        depotLng = extractedStart[1];
      }
      
      let addedDist = 0;
      if (idx === 0) {
        addedDist = getDistance([depotLat, depotLng], updated[idx].coords) * 111;
      } else {
        addedDist = getDistance(updated[idx-1].coords, updated[idx].coords) * 111;
      }
      
      setTrackingDistance(prev => prev + addedDist);
      setLastCheckTime(now);

      const allCompleted = updated.every(pt => pt.completed);
      if (allCompleted) {
        const returnDist = getDistance(updated[updated.length-1].coords, [depotLat, depotLng]) * 111;
        setTrackingDistance(prev => prev + returnDist);
        setIsTracking(false);
        setShowTrackingSummary(true);
        showToast("Đã hoàn thành toàn bộ lộ trình!", "success");
      }
    }

    let depotLat = 10.8087727;
    let depotLng = 106.9241267;
    const extractedStart = extractCoordinates(depotCoords);
    if (extractedStart) {
      depotLat = extractedStart[0];
      depotLng = extractedStart[1];
    }
    drawOptimizedMap(depotLat, depotLng, updated);
  };

  // Automated Schedule Match and Auto-Complete
  const handleAutoCompletePassedSchedules = async () => {
    try {
      showToast("Đang đối soát và tự động đóng các lịch hẹn quá hạn...", "info");
      const res = await apiCall("/api/schedules/auto-complete", "POST");
      if (res.count > 0) {
        showToast(res.message, "success");
        if (refreshData) {
          await refreshData();
        }
      } else {
        showToast(res.message, "info");
      }
    } catch (err: any) {
      showToast("Lỗi đóng lịch hẹn tự động: " + err.message, "danger");
    }
  };

  // Toggle single schedule completed state in backend
  const toggleScheduleComplete = async (s: Schedule) => {
    try {
      const updated = { ...s, completed: !s.completed };
      await apiCall(`/api/schedules/${s.id}`, "PUT", updated);
      showToast(`Đã ${!s.completed ? "hoàn thành" : "mở lại"} lịch hẹn: ${s.title}`, "success");
      if (refreshData) await refreshData();
    } catch (err: any) {
      showToast("Lỗi cập nhật lịch hẹn: " + err.message, "danger");
    }
  };

  // Open Add Schedule Modal
  const handleOpenAddModal = () => {
    setEditingSch(null);
    setSchForm({
      title: "",
      description: "",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "09:00",
      color: "purple",
      address: ""
    });
    setShowSchModal(true);
  };

  // Open Edit Schedule Modal
  const handleOpenEditModal = (s: Schedule) => {
    setEditingSch(s);
    setSchForm({
      title: s.title,
      description: s.description || "",
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime || "08:00",
      endTime: s.endTime || "09:00",
      color: s.color || "purple",
      address: s.address || ""
    });
    setShowSchModal(true);
  };

  // Handle Form submit (Create or Update Schedule)
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schForm.title.trim()) {
      showToast("Vui lòng nhập tiêu đề lịch trình.", "warning");
      return;
    }

    try {
      const payload = {
        ...schForm,
        dayOfWeek: Number(schForm.dayOfWeek),
        completed: editingSch ? editingSch.completed : false
      };

      if (editingSch) {
        await apiCall(`/api/schedules/${editingSch.id}`, "PUT", payload);
        showToast("Đã cập nhật lịch trình thành công!", "success");
      } else {
        await apiCall("/api/schedules", "POST", payload);
        showToast("Đã tạo lịch trình mới thành công!", "success");
      }

      setShowSchModal(false);
      if (refreshData) await refreshData();
    } catch (err: any) {
      showToast("Không thể lưu lịch trình: " + err.message, "danger");
    }
  };

  // Handle Delete Schedule
  const handleDeleteSchedule = async () => {
    if (!editingSch) return;
    if (confirm(`Bạn có chắc chắn muốn xóa lịch trình "${editingSch.title}" không?`)) {
      try {
        await apiCall(`/api/schedules/${editingSch.id}`, "DELETE");
        showToast("Đã xóa lịch trình thành công.", "success");
        setShowSchModal(false);
        if (refreshData) await refreshData();
      } catch (err: any) {
        showToast("Không thể xóa lịch trình: " + err.message, "danger");
      }
    }
  };

  // Hours array for left side grid (5:00 to 23:00)
  const hours = Array.from({ length: 19 }, (_, i) => i + 5);

  // Weekdays mapper
  const weekdays = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 7, label: "Chủ Nhật" }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "purple":
        return "bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-950/60";
      case "rose":
        return "bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-950/60";
      case "blue":
        return "bg-blue-950/40 text-blue-300 border-blue-500/30 hover:bg-blue-950/60";
      case "emerald":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/60";
      case "amber":
        return "bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-950/60";
      default:
        return "bg-slate-900/50 text-slate-300 border-slate-600/30 hover:bg-slate-900/80";
    }
  };

  // Get current day of week (1 = Monday, ..., 7 = Sunday)
  const today = new Date();
  let currentDayOfWeek = today.getDay();
  if (currentDayOfWeek === 0) currentDayOfWeek = 7;

  // Get date for a given dayOfWeek of the current week (1 = Monday, ..., 7 = Sunday)
  const getWeekDayDate = (dayVal: number) => {
    const d = new Date(today);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    const currentDay = day === 0 ? 7 : day;
    const diff = currentDay - dayVal;
    d.setDate(d.getDate() - diff);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  // Get full start and end date range of the current week
  const getWeekRangeString = () => {
    const monday = new Date(today);
    const sunday = new Date(today);
    const day = today.getDay();
    const currentDay = day === 0 ? 7 : day;
    
    monday.setDate(today.getDate() - (currentDay - 1));
    sunday.setDate(today.getDate() + (7 - currentDay));
    
    const format = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `Tuần từ ${format(monday)} đến ${format(sunday)}`;
  };

  // Filter schedules for today list
  const todaySchedules = schedules.filter(s => s.dayOfWeek === currentDayOfWeek);

  return (
    <div className="flex flex-col gap-6" id="route-manager-root">
      
      {/* Tab Switcher / Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div>
          <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
            {subTab === "matrix" ? (
              <>
                <Calendar className="text-[var(--primary)] w-6 h-6" />
                Ma trận Lịch tuần
              </>
            ) : (
              <>
                <Map className="text-[var(--primary)] w-6 h-6" />
                Bản đồ giao sữa Yakult
              </>
            )}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {subTab === "matrix" 
              ? "Quản lý ma trận lịch biểu cá nhân tuần và lịch dạy đàn của bạn."
              : "Sơ đồ tối ưu hóa lộ trình khứ hồi xuất phát từ công ty và quay trở lại để tiết kiệm chi phí."
            }
          </p>
        </div>

        {!forcedTab && (
          <div className="flex bg-black/30 p-1 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setSubTab("matrix")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === "matrix" 
                  ? "bg-[var(--primary)] text-white shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              📅 Ma trận Lịch tuần
            </button>
            <button
              onClick={() => setSubTab("map")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === "map" 
                  ? "bg-[var(--primary)] text-white shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              🚚 Bản đồ giao sữa
            </button>
          </div>
        )}
      </div>

      {/* MATRIX VIEW */}
      {subTab === "matrix" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          
          {/* Quick Header Cards */}
          <div className="flex flex-col gap-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                    Ma trận Lịch trình công việc đa nhiệm ({getWeekRangeString()})
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Phân bổ thời gian biểu hàng giờ từ Thứ 2 đến Chủ Nhật. Nhấp vào lịch trình để cập nhật hoặc xóa.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAddModal}
                    className="px-3.5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm Lịch trình
                  </button>
                </div>
              </div>

              {/* Scrollable grid wrapper */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] max-h-[580px] overflow-y-auto custom-scrollbar bg-black/10">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-black/40 text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider sticky top-0 z-20">
                      <th className="p-3 w-16 text-center border-r border-[var(--border-color)]">Giờ</th>
                      {weekdays.map((day) => {
                        const isToday = day.value === currentDayOfWeek;
                        return (
                          <th 
                            key={day.value} 
                            className={`p-3 border-r border-[var(--border-color)] text-center ${
                              isToday ? "bg-[var(--primary)]/20 text-white border-b-2 border-b-[var(--primary)] font-black" : ""
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-extrabold text-[12px]">{day.label}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">({getWeekDayDate(day.value)})</span>
                              {isToday && <span className="text-[9px] text-[var(--primary)] lowercase tracking-normal mt-0.5 font-bold">(hôm nay)</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => {
                      const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                      return (
                        <tr key={hour} className="border-b border-[var(--border-color)]/50 hover:bg-white/[0.01]">
                          {/* Hour label */}
                          <td className="p-2 text-center font-mono text-[11px] font-extrabold text-[var(--text-muted)] bg-black/20 border-r border-[var(--border-color)] sticky left-0 z-10 w-16">
                            {hourStr}
                          </td>
                          {/* Weekdays columns */}
                          {weekdays.map((day) => {
                            const isToday = day.value === currentDayOfWeek;
                            // Match schedules for this day and this start hour
                            const cellSchedules = schedules.filter(s => {
                              if (!s.startTime) return false;
                              const startHour = parseInt(s.startTime.split(":")[0], 10);
                              return s.dayOfWeek === day.value && startHour === hour;
                            });

                            return (
                              <td 
                                key={day.value} 
                                className={`p-1 border-r border-[var(--border-color)]/50 align-top min-w-[110px] min-h-[60px] relative transition-colors ${
                                  isToday ? "bg-[var(--primary)]/[0.02]" : ""
                                }`}
                              >
                                <div className="flex flex-col gap-1 min-h-[44px]">
                                  {cellSchedules.map((s) => (
                                    <div
                                      key={s.id}
                                      onClick={() => handleOpenEditModal(s)}
                                      className={`group p-2 rounded-xl border text-[11.5px] leading-tight cursor-pointer transition-all shadow-sm ${getColorClasses(s.color)} ${
                                        s.completed ? "opacity-45 line-through decoration-[var(--text-muted)] border-slate-700" : ""
                                      }`}
                                      title={`${s.title}\n⏰ ${s.startTime} - ${s.endTime}\n📌 Địa chỉ: ${s.address || "N/A"}`}
                                    >
                                      <div className="flex items-start justify-between gap-1 mb-1">
                                        <span className="font-extrabold line-clamp-2 block tracking-tight leading-snug">{s.title}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleScheduleComplete(s);
                                          }}
                                          className="text-xs p-0.5 rounded-md hover:bg-white/10 shrink-0 cursor-pointer transition-all bg-black/20"
                                          title={s.completed ? "Mở lại" : "Hoàn thành"}
                                        >
                                          {s.completed ? "✅" : "⬜"}
                                        </button>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 text-[9.5px] text-[var(--text-muted)] font-mono">
                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                        <span>{s.startTime} - {s.endTime}</span>
                                      </div>
                                      
                                      {s.address && (
                                        <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] mt-1 truncate">
                                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                                          <span className="truncate">{s.address}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Secondary panels side-by-side under the main large matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Checklist panel */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <h3 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                    <ListTodo className="text-[var(--primary)] w-4 h-4" />
                    Lịch trình hôm nay ({weekdays.find(d => d.value === currentDayOfWeek)?.label} ({getWeekDayDate(currentDayOfWeek)}))
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] font-bold rounded-full">
                    {todaySchedules.length} đầu việc
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto custom-scrollbar">
                  {todaySchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-[var(--text-muted)] italic">Hôm nay không có lịch trình nào được lưu.</p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-3 px-3 py-1.5 bg-black/20 hover:bg-black/40 text-[11px] text-[var(--primary)] font-extrabold border border-[var(--primary)]/20 rounded-lg cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Thêm lịch ngay
                      </button>
                    </div>
                  ) : (
                    todaySchedules.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((s) => (
                      <div 
                        key={s.id} 
                        className={`p-3.5 border rounded-xl flex items-start gap-3 transition-all ${
                          s.completed 
                            ? "bg-slate-900/10 border-slate-800 opacity-60" 
                            : "bg-black/20 border-[var(--border-color)] hover:border-[var(--primary)]/30"
                        }`}
                      >
                        <button
                          onClick={() => toggleScheduleComplete(s)}
                          className="mt-0.5 cursor-pointer text-base shrink-0 p-1 bg-black/30 rounded-md hover:bg-black/50 transition-all border border-white/5"
                        >
                          {s.completed ? "✅" : "⬜"}
                        </button>
                        
                        <div className="flex-1 min-w-0" onClick={() => handleOpenEditModal(s)}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[12.5px] font-bold text-[var(--text-main)] truncate ${s.completed ? "line-through opacity-55" : ""}`}>
                              {s.title}
                            </span>
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 font-mono border ${
                              s.color === "purple" ? "bg-purple-900/20 text-purple-400 border-purple-500/20" :
                              s.color === "rose" ? "bg-rose-900/20 text-rose-400 border-rose-500/20" :
                              s.color === "blue" ? "bg-blue-900/20 text-blue-400 border-blue-500/20" :
                              s.color === "emerald" ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/20" :
                              "bg-amber-900/20 text-amber-400 border-amber-500/20"
                            }`}>
                              {s.color}
                            </span>
                          </div>

                          <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                            {s.description || "Không có mô tả chi tiết."}
                          </p>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-white/[0.03] text-[10.5px] text-[var(--text-muted)]">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-[var(--primary)]" />
                              {s.startTime} - {s.endTime}
                            </span>
                            {s.address && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <MapPin className="w-3 h-3 text-rose-400" />
                                <span className="truncate">{s.address}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Color guide card */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
                <h4 className="text-[11.5px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-3">🎨 Phân loại màu sắc công việc</h4>
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-purple-950/20 border border-purple-500/10">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span className="text-purple-300 font-bold">Sữa Yakult</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-rose-950/20 border border-rose-500/10">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-rose-300 font-bold">Studio Vy Vy</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-blue-950/20 border border-blue-500/10">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-blue-300 font-bold">Guitar Đàn</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/10">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-300 font-bold">Chạy xe Grab</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-950/20 border border-amber-500/10 col-span-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-amber-300 font-bold">Khác / Tổng quát</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MAP VIEW */}
      {subTab === "map" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Controls column */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-1 flex items-center gap-2">
              <MapPin className="text-[var(--primary)] w-4 h-4" />
              🚚 Thiết lập lộ trình giao sữa
            </h3>
            
            <div>
              <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tọa độ xuất phát cố định (nhà riêng/Yakult)</label>
              <input
                type="text"
                className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                value={depotCoords}
                onChange={(e) => setDepotCoords(e.target.value)}
                placeholder="Dán link Google Maps hoặc Vĩ độ, Kinh độ"
              />
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Chọn khách hàng cần giao sữa hôm nay</label>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="🔍 Tìm tên..."
                  className="flex-1 bg-black/20 border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={routeSearchTerm}
                  onChange={(e) => setRouteSearchTerm(e.target.value)}
                />
                <select
                  className="bg-black/20 border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                  value={routeFilterGroup}
                  onChange={(e) => setRouteFilterGroup(e.target.value)}
                >
                  <option value="All" className="bg-slate-800">Tất cả Sữa</option>
                  <option value="Khách hàng ngày chẵn" className="bg-slate-800">Ngày chẵn</option>
                  <option value="Khách hàng ngày lẻ" className="bg-slate-800">Ngày lẻ</option>
                  <option value="Nhà riêng" className="bg-slate-800">Nhà riêng (Yakult)</option>
                  <option value="Đại lý" className="bg-slate-800">Đại lý (Yakult)</option>
                </select>
              </div>
              
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => {
                    const filtered = crmContacts.filter(c => {
                      const isMilk = ["Nhà riêng", "Đại lý", "Khách hàng ngày chẵn", "Khách hàng ngày lẻ"].includes(c.company);
                      const matchGroup = routeFilterGroup === "All" || c.company === routeFilterGroup;
                      const matchSearch = c.name.toLowerCase().includes(routeSearchTerm.toLowerCase());
                      return isMilk && matchGroup && matchSearch;
                    });
                    const newIds = [...new Set([...selectedCrmRouteIds, ...filtered.map(f => f.id)])];
                    setSelectedCrmRouteIds(newIds);
                  }}
                  className="flex-1 py-1 bg-black/40 hover:bg-black/60 border border-[var(--border-color)] text-[var(--text-main)] text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  Chọn lọc
                </button>
                <button
                  onClick={() => setSelectedCrmRouteIds([])}
                  className="flex-1 py-1 bg-black/40 hover:bg-black/60 border border-[var(--border-color)] text-[var(--text-main)] text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto border border-[var(--border-color)] p-3 rounded-xl bg-black/10">
                {(() => {
                  const filteredContacts = crmContacts.filter(c => {
                    const isMilk = ["Nhà riêng", "Đại lý", "Khách hàng ngày chẵn", "Khách hàng ngày lẻ"].includes(c.company);
                    const matchGroup = routeFilterGroup === "All" || c.company === routeFilterGroup;
                    const matchSearch = c.name.toLowerCase().includes(routeSearchTerm.toLowerCase());
                    return isMilk && matchGroup && matchSearch;
                  });

                  if (filteredContacts.length === 0) {
                    return <div className="text-[11px] text-[var(--text-muted)] italic text-center py-4">Không tìm thấy khách hàng sữa nào.</div>;
                  }

                  return filteredContacts.map((c) => (
                    <label key={c.id} className="flex items-center gap-2.5 text-xs text-[var(--text-main)] cursor-pointer py-1 hover:bg-white/[0.02]">
                      <input
                        type="checkbox"
                        checked={selectedCrmRouteIds.includes(c.id)}
                        onChange={() => toggleRouteSelection(c.id)}
                        className="accent-[var(--primary)]"
                      />
                      <span className="line-clamp-1">[{c.company}] {c.name} {c.address ? `(${c.address})` : ''}</span>
                    </label>
                  ));
                })()}
              </div>
            </div>

            <button
              onClick={handleOptimizeDailyRoute}
              className="w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all mt-2 uppercase tracking-wider"
            >
              ⚡ Tối ưu & Vẽ lộ trình di chuyển
            </button>

            {optimizedRoutePath.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex justify-between items-center mb-3">
                  <strong className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider">📍 Thứ tự di chuyển tối ưu:</strong>
                  {!isTracking && !optimizedRoutePath.every(pt => pt.completed) && (
                    <button 
                      onClick={() => {
                        setIsTracking(true);
                        setTrackingStartTime(Date.now());
                        setLastCheckTime(Date.now());
                        setTrackingDistance(0);
                        showToast("Đã bắt đầu tính giờ & quãng đường!", "info");
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs"
                    >
                      ▶ Bắt đầu lộ trình
                    </button>
                  )}
                  {isTracking && (
                    <span className="text-xs text-amber-500 font-bold animate-pulse">⏳ Đang chạy lộ trình...</span>
                  )}
                </div>
                
                <ol className="flex flex-col gap-3.5 pl-1.5 text-xs">
                  <li className="flex gap-3 items-center">
                    <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[10px]">🏁</span>
                    <span className="text-[var(--text-muted)] font-semibold">Xuất phát từ cửa hàng (Tổng kho)</span>
                  </li>
                  {optimizedRoutePath.map((pt, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <input
                        type="checkbox"
                        checked={pt.completed}
                        onChange={() => handleToggleRouteCheck(idx)}
                        className="mt-0.5 accent-[var(--primary)] cursor-pointer w-4 h-4 shrink-0"
                      />
                      <div className={pt.completed ? "line-through opacity-50" : ""}>
                        Giao cho: <strong className="text-[var(--text-main)]">{pt.name}</strong> <br/>
                        <span className="text-[11px] text-[var(--text-muted)]">{pt.address}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Map Column */}
          <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-4">🗺️ Bản đồ lộ trình di chuyển</h3>
            <div id="route-map" className="h-[450px] w-full rounded-xl border border-[var(--border-color)] z-10"></div>
          </div>

        </div>
      )}

      {/* SCHEDULE ADD/EDIT MODAL ... */}
      {showTrackingSummary && trackingStartTime && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
            <h3 className="text-xl font-extrabold text-[var(--text-main)] mb-2 uppercase tracking-wider text-emerald-400">🎉 Hoàn thành lộ trình!</h3>
            <p className="text-[var(--text-muted)] text-sm mb-6">Bạn đã hoàn thành xuất sắc tất cả các điểm giao sữa hôm nay.</p>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-black/20 border border-[var(--border-color)] p-4 rounded-xl flex flex-col items-center">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Quãng đường</span>
                <span className="text-2xl text-[var(--text-main)] font-extrabold">{trackingDistance.toFixed(1)} <span className="text-sm">km</span></span>
              </div>
              <div className="flex-1 bg-black/20 border border-[var(--border-color)] p-4 rounded-xl flex flex-col items-center">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Thời gian</span>
                <span className="text-2xl text-[var(--text-main)] font-extrabold">{Math.round((Date.now() - trackingStartTime) / 60000)} <span className="text-sm">phút</span></span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTrackingSummary(false);
                setTrackingStartTime(null);
                setTrackingDistance(0);
                setOptimizedRoutePath([]);
                setSelectedCrmRouteIds([]);
              }}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-[var(--primary)]/20"
            >
              Đóng & Kết thúc
            </button>
          </div>
        </div>
      )}
      {showSchModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSchModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white p-1 rounded-full hover:bg-black/20"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5 uppercase tracking-wider border-b border-[var(--border-color)] pb-3">
              {editingSch ? "📝 Chỉnh sửa lịch trình công việc" : "📅 Thiết lập lịch trình công việc mới"}
            </h3>

            <form onSubmit={handleSaveSchedule} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tên công việc / Lịch hẹn (*)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={schForm.title}
                  onChange={(e) => setSchForm({ ...schForm, title: e.target.value })}
                  placeholder="Ví dụ: Giao sữa Yakult Q1, Chạy Grab, Dạy Đàn..."
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Mô tả công việc</label>
                <textarea
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] h-20"
                  value={schForm.description}
                  onChange={(e) => setSchForm({ ...schForm, description: e.target.value })}
                  placeholder="Ghi chú các chi tiết, vật dụng chuẩn bị, hoặc đối tác..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Thứ trong tuần</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={schForm.dayOfWeek}
                    onChange={(e) => setSchForm({ ...schForm, dayOfWeek: Number(e.target.value) })}
                  >
                    {weekdays.map((day) => (
                      <option key={day.value} value={day.value} className="bg-slate-800 text-white">
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giờ bắt đầu</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={schForm.startTime}
                    onChange={(e) => setSchForm({ ...schForm, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giờ kết thúc</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={schForm.endTime}
                    onChange={(e) => setSchForm({ ...schForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-sans">Màu sắc định danh</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={schForm.color}
                    onChange={(e) => setSchForm({ ...schForm, color: e.target.value })}
                  >
                    <option value="purple" className="bg-purple-900 text-white">Sữa Yakult (Tím)</option>
                    <option value="rose" className="bg-rose-900 text-white">Studio Vy Vy (Hồng)</option>
                    <option value="blue" className="bg-blue-900 text-white">Guitar Đàn (Xanh dương)</option>
                    <option value="emerald" className="bg-emerald-900 text-white">Chạy xe Grab (Xanh lá)</option>
                    <option value="amber" className="bg-amber-900 text-white">Khác (Vàng hổ phách)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Địa chỉ / Vị trí</label>
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={schForm.address}
                    onChange={(e) => setSchForm({ ...schForm, address: e.target.value })}
                    placeholder="Ví dụ: 12 Điện Biên Phủ, Studio..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
                <div>
                  {editingSch && (
                    <button
                      type="button"
                      onClick={handleDeleteSchedule}
                      className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa lịch trình
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSchModal(false)}
                    className="px-4 py-2 bg-black/30 hover:bg-black/50 text-[var(--text-muted)] hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all border border-[var(--border-color)]"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
                  >
                    Lưu lịch trình
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
