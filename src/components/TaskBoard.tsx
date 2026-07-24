import React, { useState } from "react";
import { Task, Project } from "../types";

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
  onSave: (task: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
  apiCall?: (url: string, method?: string, body?: any) => Promise<any>;
  refreshData?: () => Promise<void>;
}

export default function TaskBoard({ 
  tasks, 
  projects, 
  onSave, 
  onDelete, 
  onUpdateStatus, 
  showToast,
  apiCall,
  refreshData
}: TaskBoardProps) {
  const [activeTab, setActiveSubTab] = useState<"kanban" | "grab">("kanban");
  
  // --- Kanban States ---
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "p-1",
    priority: "Cao",
    status: "Cần làm"
  });

  // --- Grab Accounting States ---
  const [walletBalance, setWalletBalance] = useState(() => {
    return Number(localStorage.getItem("grab_wallet_balance")) || 390261;
  });

  const [dateStr, setDateStr] = useState(() => {
    return localStorage.getItem("grab_date") || new Date().toISOString().split("T")[0];
  });

  // Start of Shift states
  const [startCash, setStartCash] = useState(() => localStorage.getItem("grab_start_cash") || "");
  const [startGrab, setStartGrab] = useState(() => localStorage.getItem("grab_start_grab") || "");
  const [startBank, setStartBank] = useState(() => localStorage.getItem("grab_start_bank") || "");

  // End of Shift states
  const [endCash, setEndCash] = useState(() => localStorage.getItem("grab_end_cash") || "");
  const [endGrab, setEndGrab] = useState(() => localStorage.getItem("grab_end_grab") || "");
  const [endBank, setEndBank] = useState(() => localStorage.getItem("grab_end_bank") || "");

  // Expenses states
  const [expenseFuel, setExpenseFuel] = useState(() => localStorage.getItem("grab_exp_fuel") || "");
  const [expenseFood, setExpenseFood] = useState(() => localStorage.getItem("grab_exp_food") || "");
  const [expenseOther, setExpenseOther] = useState(() => localStorage.getItem("grab_exp_other") || "");

  // Calculation Results
  const [results, setResults] = useState<{
    calculated: boolean;
    totalStart: number;
    totalEnd: number;
    totalExp: number;
    revenue: number;
    netProfit: number;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [tempWalletBalance, setTempWalletBalance] = useState("");

  // --- Kanban Handlers ---
  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      title: "",
      description: "",
      projectId: projects[0]?.id || "p-1",
      priority: "Cao",
      status: "Cần làm"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: Task) => {
    setEditItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      projectId: item.projectId,
      priority: item.priority,
      status: item.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      showToast("Vui lòng điền tiêu đề công việc.", "warning");
      return;
    }
    const payload = {
      ...editItem,
      ...formData
    };
    await onSave(payload);
    setShowModal(false);
  };

  // --- Grab Accounting Handlers ---
  const handleChotDauCa = () => {
    localStorage.setItem("grab_start_cash", startCash);
    localStorage.setItem("grab_start_grab", startGrab);
    localStorage.setItem("grab_start_bank", startBank);
    localStorage.setItem("grab_date", dateStr);
    
    const totalStart = (Number(startCash) || 0) + (Number(startGrab) || 0) + (Number(startBank) || 0);
    showToast(`Đã chốt số dư đầu ca: ${totalStart.toLocaleString("vi-VN")} đ. Bắt đầu ca chạy mới!`, "success");
  };

  const handleCalculateGrabProfit = () => {
    const tStart = (Number(startCash) || 0) + (Number(startGrab) || 0) + (Number(startBank) || 0);
    const tEnd = (Number(endCash) || 0) + (Number(endGrab) || 0) + (Number(endBank) || 0);
    const tExp = (Number(expenseFuel) || 0) + (Number(expenseFood) || 0) + (Number(expenseOther) || 0);

    const diff = tEnd - tStart;
    const revenueVal = diff + tExp;
    const netProfitVal = diff;

    setResults({
      calculated: true,
      totalStart: tStart,
      totalEnd: tEnd,
      totalExp: tExp,
      revenue: revenueVal,
      netProfit: netProfitVal
    });

    // Save inputs for convenience
    localStorage.setItem("grab_end_cash", endCash);
    localStorage.setItem("grab_end_grab", endGrab);
    localStorage.setItem("grab_end_bank", endBank);
    localStorage.setItem("grab_exp_fuel", expenseFuel);
    localStorage.setItem("grab_exp_food", expenseFood);
    localStorage.setItem("grab_exp_other", expenseOther);

    showToast(`Đã tính toán lãi ròng! Lãi ròng thực tế: ${netProfitVal.toLocaleString("vi-VN")} đ.`, "success");
  };

  const handleSyncToFinance = async () => {
    if (!results || !apiCall) {
      showToast("Không tìm thấy kết quả tính hoặc dịch vụ đồng bộ.", "warning");
      return;
    }

    try {
      setIsSyncing(true);
      showToast("Đang đồng bộ dữ liệu vào Sổ sách Thu Chi...", "info");

      const proj = projects.find(p => p.id === "p-4") || { name: "Chạy xe công nghệ Grab" };

      // 1. Sync Gross Revenue
      if (results.revenue > 0) {
        await apiCall("/api/transactions", "POST", {
          projectId: "p-4",
          projectName: proj.name,
          type: "Thu",
          amount: results.revenue,
          note: `Doanh thu ca chạy Grab ngày ${dateStr}`,
          date: dateStr
        });
      }

      // 2. Sync Expenses
      if (Number(expenseFuel) > 0) {
        await apiCall("/api/transactions", "POST", {
          projectId: "p-4",
          projectName: proj.name,
          type: "Chi",
          amount: Number(expenseFuel),
          note: `Chi phí xăng ca chạy Grab ngày ${dateStr}`,
          date: dateStr
        });
      }

      if (Number(expenseFood) > 0) {
        await apiCall("/api/transactions", "POST", {
          projectId: "p-4",
          projectName: proj.name,
          type: "Chi",
          amount: Number(expenseFood),
          note: `Chi phí ăn uống ca chạy Grab ngày ${dateStr}`,
          date: dateStr
        });
      }

      if (Number(expenseOther) > 0) {
        await apiCall("/api/transactions", "POST", {
          projectId: "p-4",
          projectName: proj.name,
          type: "Chi",
          amount: Number(expenseOther),
          note: `Chi phí phát sinh khác Grab ngày ${dateStr}`,
          date: dateStr
        });
      }

      // Update Grab Wallet Balance shown in green card
      const finalGrabWalletBalance = Number(endGrab) || walletBalance;
      setWalletBalance(finalGrabWalletBalance);
      localStorage.setItem("grab_wallet_balance", String(finalGrabWalletBalance));

      showToast(`Đã đồng bộ thành công vào sổ sách thu chi ca ngày ${dateStr}!`, "success");

      if (refreshData) {
        await refreshData();
      }
    } catch (err: any) {
      showToast("Lỗi đồng bộ: " + err.message, "danger");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateManualWallet = () => {
    setTempWalletBalance(String(walletBalance));
    setShowWalletModal(true);
  };

  const handleSaveManualWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = tempWalletBalance.replace(/[^0-9.-]/g, "");
    const num = Number(cleanVal);
    if (!isNaN(num)) {
      setWalletBalance(num);
      localStorage.setItem("grab_wallet_balance", String(num));
      setShowWalletModal(false);
      showToast("Đã cập nhật số dư ví Grab thủ công!", "success");
    } else {
      showToast("Vui lòng nhập một số hợp lệ.", "warning");
    }
  };

  const columns = ["Cần làm", "Đang thực hiện", "Hoàn thành"];

  return (
    <div>

      {activeTab === "kanban" ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-extrabold text-[var(--text-main)]">Quản lý Công việc</h2>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
            >
              + Tạo công việc mới
            </button>
          </div>

          {/* Horizontal Category Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedProjectFilter("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                selectedProjectFilter === "all"
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-[var(--overlay-02)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Tất cả công việc
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectFilter(p.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedProjectFilter === p.id
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--overlay-02)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Kanban Board Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => {
                const isMatchProj = selectedProjectFilter === "all" || t.projectId === selectedProjectFilter;
                return isMatchProj && t.status === col;
              });

              return (
                <div key={col} className="bg-[var(--overlay-01)] border border-dashed border-[var(--border-color)] rounded-2xl p-4">
                  <div className="flex justify-between items-center text-xs font-bold text-[var(--text-muted)] uppercase mb-4 tracking-wider">
                    <span>{col}</span>
                    <span className="px-2 py-0.5 bg-[var(--overlay-03)] rounded-full text-[10px] text-[var(--text-main)]">{colTasks.length}</span>
                  </div>

                  <div className="flex flex-col gap-3 min-h-[300px]">
                    {colTasks.map((t) => (
                      <div key={t.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:border-[rgba(99,102,241,0.2)] hover:-translate-y-0.5 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-[13.5px] text-[var(--text-main)] leading-snug">{t.title}</h4>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] cursor-pointer"
                              title="Sửa"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => onDelete(t.id)}
                              className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Xóa"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-[var(--text-muted)] mt-2 mb-4 leading-relaxed line-clamp-3">{t.description}</p>
                        
                        <div className="flex justify-between items-center">
                          <select
                            value={t.status}
                            onChange={(e) => onUpdateStatus(t.id, e.target.value)}
                            className="bg-black/20 border border-[var(--border-color)] text-[11px] rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:border-[var(--primary)] text-[var(--text-main)]"
                          >
                            <option value="Cần làm" className="bg-slate-800 text-white">Cần làm</option>
                            <option value="Đang thực hiện" className="bg-slate-800 text-white">Đang thực hiện</option>
                            <option value="Hoàn thành" className="bg-slate-800 text-white">Hoàn thành</option>
                          </select>
                          <span className="text-[11px] font-bold text-[var(--primary)]">
                            {projects.find((p) => p.id === t.projectId)?.name || "Khác"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-[11px] text-[var(--text-muted)] font-medium italic">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Grab Accounting View matching screenshot */
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* SỐ DƯ VÍ GRAB Green Header Box */}
          <div 
            onClick={handleUpdateManualWallet}
            className="bg-[#0fb48a] hover:bg-[#0da07b] text-white rounded-2xl p-5 flex items-center justify-between shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-black/15 flex items-center justify-center text-2xl shrink-0">
                🏍️
              </div>
              <div>
                <div className="text-[10px] md:text-[11px] font-bold tracking-wider uppercase text-emerald-100">SỐ DƯ VÍ GRAB</div>
                <div className="text-xl md:text-2xl font-black">{walletBalance.toLocaleString("vi-VN")}đ</div>
              </div>
            </div>
            <span className="text-xs font-semibold bg-white/25 px-2.5 py-1 rounded-lg">Chỉnh sửa ✏️</span>
          </div>

          {/* Shift inputs: 1. Đầu Ca & 2. Cuối Ca */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1. ĐẦU CA */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-emerald-500">⚙️</span> 1. Đầu Ca
                </h3>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ngày</label>
                    <input
                      type="date"
                      className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-3 py-2 text-[13px] text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Tiền Mặt (đ)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                        value={startCash}
                        onChange={(e) => setStartCash(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Ví Grab (đ)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                        value={startGrab}
                        onChange={(e) => setStartGrab(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Ngân Hàng (đ)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                        value={startBank}
                        onChange={(e) => setStartBank(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleChotDauCa}
                  className="w-full py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-200/50"
                >
                  ☁️ Chốt & Đồng bộ
                </button>
              </div>
            </div>

            {/* COLUMN 2. CUỐI CA */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-emerald-500">🌙</span> 2. Cuối Ca
                </h3>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Tiền Mặt (đ)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                        value={endCash}
                        onChange={(e) => setEndCash(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Ví Grab (đ)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                        value={endGrab}
                        onChange={(e) => setEndGrab(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Ngân Hàng (đ)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a]"
                        value={endBank}
                        onChange={(e) => setEndBank(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-2 border-b border-[var(--border-color)] pb-1">Chi phí phát sinh</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <input
                          type="number"
                          placeholder="Xăng"
                          className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-rose-500"
                          value={expenseFuel}
                          onChange={(e) => setExpenseFuel(e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Ăn uống"
                          className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-rose-500"
                          value={expenseFood}
                          onChange={(e) => setExpenseFood(e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Khác"
                          className="w-full bg-black/10 border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-rose-500"
                          value={expenseOther}
                          onChange={(e) => setExpenseOther(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCalculateGrabProfit}
                  className="w-full py-2.5 bg-[#0fb48a] hover:bg-[#0da07b] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  📊 Tính Lãi Ròng
                </button>
              </div>
            </div>

          </div>

          {/* CALCULATION RESULTS PANEL */}
          {results && (
            <div className="bg-gradient-to-br from-[rgba(16,185,129,0.05)] to-[rgba(15,180,138,0.1)] border border-emerald-500/20 rounded-2xl p-6 shadow-sm animate-fadeIn">
              <h4 className="text-sm font-bold text-[#0fb48a] mb-4 flex items-center gap-2">
                <span>🎯</span> KẾT QUẢ PHÂN TÍCH CA CHẠY ({dateStr})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tổng Doanh Thu Ca Chạy</div>
                  <div className="text-lg font-extrabold text-[#0fb48a] mt-1">+{results.revenue.toLocaleString("vi-VN")} đ</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">(Đã tính bù chi phí phát sinh)</div>
                </div>
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tổng Chi Phí Phát Sinh</div>
                  <div className="text-lg font-extrabold text-rose-500 mt-1">-{results.totalExp.toLocaleString("vi-VN")} đ</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
                    (Xăng: {Number(expenseFuel).toLocaleString()} đ | Ăn: {Number(expenseFood).toLocaleString()} đ)
                  </div>
                </div>
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Lãi Ròng Thực Tế</div>
                  <div className="text-lg font-extrabold text-emerald-500 mt-1">+{results.netProfit.toLocaleString("vi-VN")} đ</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">(Lợi nhuận ròng bỏ túi sau ca)</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-[var(--border-color)] pt-4">
                <span className="text-[11px] text-[var(--text-muted)] font-bold">
                  * Nhấn nút bên phải để ghi nhận doanh thu và chi phí xăng xe vào sổ sách chung.
                </span>
                <button
                  type="button"
                  onClick={handleSyncToFinance}
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? "⌛ Đang đồng bộ..." : "🔄 Đồng bộ vào Sổ sách Thu Chi"}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Task Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5">
              {editItem ? "Chỉnh sửa Công việc" : "Tạo Công việc mới"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tiêu đề công việc *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Liên kết công việc / dự án</label>
                <select
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
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

      {/* Grab Wallet Edit Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fadeIn">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] mb-4 uppercase tracking-wider">
              Chỉnh sửa Số dư ví Grab
            </h3>
            <form onSubmit={handleSaveManualWallet} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Số dư ví mong muốn (đ)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-main)] focus:outline-none focus:border-[#0fb48a] font-bold font-mono"
                  value={tempWalletBalance}
                  onChange={(e) => setTempWalletBalance(e.target.value)}
                  placeholder="390261"
                />
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="px-4 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--overlay-06)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0fb48a] hover:bg-[#0da07b] text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

