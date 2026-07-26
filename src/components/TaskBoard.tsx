import React, { useState } from "react";
import { Task, Project } from "../types";

interface TaskBoardProps {
  schedules?: any[];
  crmContacts?: any[];
  onSave: (task: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
  apiCall?: (url: string, method?: string, body?: any) => Promise<any>;
  refreshData?: () => Promise<void>;
}

export default function TaskBoard({ 
  schedules, 
  crmContacts, 
  onSave, 
  onDelete, 
  showToast,
  apiCall,
  refreshData
}: TaskBoardProps) {
  const [activeTab, setActiveSubTab] = useState<"kanban" | "grab">("kanban");
  
  // --- Kanban States ---
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    taskTypes: [] as string[],
    customerId: "",
    address: "",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "09:00",
    color: "blue"
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

  // --- Schedule Handlers ---
  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({
      taskTypes: [],
      customerId: "",
      address: "",
      dayOfWeek: 2,
      startTime: "08:00",
      endTime: "10:00",
      color: "blue"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    
    // Parse title to extract taskTypes and customerId (best effort)
    let types: string[] = [];
    if (item.title && item.title.startsWith("[")) {
       const match = item.title.match(/\[(.*?)\]/);
       if (match) types = match[1].split(", ").filter(Boolean);
    }
    
    setFormData({
      taskTypes: types,
      customerId: "",
      address: item.address || "",
      dayOfWeek: item.dayOfWeek || 2,
      startTime: item.startTime || "08:00",
      endTime: item.endTime || "10:00",
      color: item.color || "blue"
    });
    setShowModal(true);
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    const crm = crmContacts?.find((c: any) => c.id === cid);
    setFormData(prev => ({
      ...prev,
      customerId: cid,
      address: crm ? `${crm.address} ${crm.locationUrl ? '(' + crm.locationUrl + ')' : ''}` : prev.address
    }));
  };

  const toggleTaskType = (type: string) => {
    setFormData(prev => {
      if (prev.taskTypes.includes(type)) {
        return { ...prev, taskTypes: prev.taskTypes.filter(t => t !== type) };
      } else {
        return { ...prev, taskTypes: [...prev.taskTypes, type] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.taskTypes.length === 0) {
      showToast("Vui lòng chọn ít nhất một loại công việc.", "warning");
      return;
    }
    
    const crm = crmContacts?.find((c: any) => c.id === formData.customerId);
    const title = `[${formData.taskTypes.join(", ")}] ${crm ? crm.name : "Khách lẻ"}`;
    
    const payload = {
      ...editItem,
      title,
      description: "",
      dayOfWeek: Number(formData.dayOfWeek),
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
      address: formData.address,
      completed: editItem ? editItem.completed : false
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

  

  return (
    <div>

      {activeTab === "kanban" ? (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-extrabold text-[var(--text-main)]">Lịch trình Công việc</h2>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
            >
              + Tạo lịch trình mới
            </button>
          </div>
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[700px]">
               <thead>
                 <tr className="border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                   <th className="py-3 px-4">Công việc</th>
                   <th className="py-3 px-4">Thứ</th>
                   <th className="py-3 px-4">Thời gian</th>
                   <th className="py-3 px-4">Địa chỉ</th>
                   <th className="py-3 px-4 w-24 text-center">Thao tác</th>
                 </tr>
               </thead>
               <tbody>
                 {schedules?.map(s => (
                   <tr key={s.id} className="border-b border-[var(--border-color)]/50 hover:bg-white/[0.01]">
                     <td className="py-3 px-4 text-sm font-extrabold text-[var(--text-main)]">{s.title}</td>
                     <td className="py-3 px-4 text-sm text-[var(--text-main)]">
                       {s.dayOfWeek === 1 ? 'Chủ nhật' : `Thứ ${s.dayOfWeek}`}
                     </td>
                     <td className="py-3 px-4 text-xs font-mono text-[var(--text-muted)]">{s.startTime} - {s.endTime}</td>
                     <td className="py-3 px-4 text-xs text-[var(--text-muted)] truncate max-w-[200px]">{s.address}</td>
                     <td className="py-3 px-4 text-center flex justify-center gap-2">
                        <button onClick={() => handleOpenEdit(s)} className="text-xs hover:text-[var(--primary)] cursor-pointer" title="Sửa">✏️</button>
                        <button onClick={() => onDelete(s.id)} className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer" title="Xóa">🗑️</button>
                     </td>
                   </tr>
                 ))}
                 {schedules?.length === 0 && (
                   <tr><td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)] italic">Chưa có công việc nào</td></tr>
                 )}
               </tbody>
             </table>
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

      {/* Schedule Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5 border-b border-[var(--border-color)] pb-3">
              {editItem ? "Chỉnh sửa Lịch trình" : "Tạo Lịch trình mới"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Loại công việc *</label>
                <div className="flex flex-wrap gap-2">
                  {["Giao hàng", "Bán hàng", "Bảo hành", "Lắp đặt", "Khác"].map(type => (
                    <label key={type} className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-[var(--border-color)] cursor-pointer hover:bg-black/40">
                      <input 
                        type="checkbox" 
                        checked={formData.taskTypes.includes(type)}
                        onChange={() => toggleTaskType(type)}
                        className="accent-[var(--primary)]"
                      />
                      <span className="text-xs text-[var(--text-main)]">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Chọn Khách hàng</label>
                <select
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={formData.customerId}
                  onChange={handleCustomerChange}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {crmContacts?.map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                      {c.name} - {c.phone || c.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Địa chỉ / Bản đồ</label>
                <textarea
                  rows={2}
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Sẽ tự động điền khi chọn khách hàng..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Thứ trong tuần *</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                  >
                    <option value={2} className="bg-slate-800 text-white">Thứ 2</option>
                    <option value={3} className="bg-slate-800 text-white">Thứ 3</option>
                    <option value={4} className="bg-slate-800 text-white">Thứ 4</option>
                    <option value={5} className="bg-slate-800 text-white">Thứ 5</option>
                    <option value={6} className="bg-slate-800 text-white">Thứ 6</option>
                    <option value={7} className="bg-slate-800 text-white">Thứ 7</option>
                    <option value={1} className="bg-slate-800 text-white">Chủ nhật</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Màu sắc</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  >
                    <option value="blue" className="bg-slate-800 text-white">Xanh dương</option>
                    <option value="emerald" className="bg-slate-800 text-white">Xanh lá</option>
                    <option value="rose" className="bg-slate-800 text-white">Đỏ</option>
                    <option value="amber" className="bg-slate-800 text-white">Vàng</option>
                    <option value="purple" className="bg-slate-800 text-white">Tím</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giờ bắt đầu *</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Giờ kết thúc *</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
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

