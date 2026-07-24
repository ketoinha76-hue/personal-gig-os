import React from "react";
import { Transaction, Task } from "../types";
import SciFiAnalytics from "./SciFiAnalytics";

interface DashboardProps {
  transactions: Transaction[];
  tasks: Task[];
  savingsGoalName?: string;
  savingsGoalAmount?: number;
  netProfit: number;
  speakText: (text: string) => void;
  setShowTxModal: (show: boolean) => void;
  handleSendEODReport: () => void;
  handleInvoiceScan: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Dashboard({
  transactions,
  tasks,
  savingsGoalName = "Mục tiêu giả định",
  savingsGoalAmount = 50000000,
  netProfit,
  speakText,
  setShowTxModal,
  handleSendEODReport,
  handleInvoiceScan
}: DashboardProps) {
  const totalIncome = transactions.filter(t => t.type === "Thu").reduce((a, b) => a + Number(b.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "Chi").reduce((a, b) => a + Number(b.amount), 0);
  const goalProgress = Math.min(100, Math.max(0, (netProfit / (savingsGoalAmount || 1)) * 100));

  // Sci-Fi analytics replaced virtual assistants

  const forecastDate = () => {
    if (netProfit <= 0) return "Cần thêm dữ liệu thu chi";
    const remaining = savingsGoalAmount - netProfit;
    if (remaining <= 0) return "Đã hoàn thành mục tiêu!";
    const days = Math.ceil((remaining / (netProfit / 14))); // assume 14 days of data
    if (isNaN(days) || !isFinite(days)) return "Đang tính toán...";
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 relative overflow-hidden shadow-sm before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-amber-500 before:to-orange-500 flex flex-col justify-center">
          <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">📊 Công việc cần làm hôm nay</div>
          <div className="text-2xl font-extrabold mt-2 text-amber-500 font-mono">{tasks.filter(t => t.status !== "Hoàn thành").length} việc cần xử lý</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 relative overflow-hidden shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">⚡ Hệ thống vận hành</div>
            <div className="text-sm font-bold mt-1 text-[var(--success)] font-mono">ONLINE ACTIVE</div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_8px_var(--success)]" />
        </div>
      </div>

      {/* Two Columns Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sci-Fi Predictive Analytics & Performance Core */}
        <div className="lg:col-span-8">
          <SciFiAnalytics
            transactions={transactions}
            tasks={tasks}
            savingsGoalAmount={savingsGoalAmount}
            netProfit={netProfit}
          />
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-base font-extrabold mb-2 flex items-center gap-2">
            <span>🚀</span> Phím tắt nhanh
          </h3>
          <button
            onClick={() => setShowTxModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-[var(--primary-hover)] transition-all shadow-sm"
          >
            💵 Ghi sổ Thu/Chi
          </button>
          <button
            onClick={handleSendEODReport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl cursor-pointer hover:bg-[var(--overlay-06)] transition-all"
          >
            🔔 Báo cáo EOD Telegram
          </button>
          <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-emerald-700 transition-all shadow-sm">
            🧾 Quét hóa đơn chi phí AI
            <input type="file" accept="image/*" className="hidden" onChange={handleInvoiceScan} />
          </label>
        </div>
      </div>
    </div>
  );
}
