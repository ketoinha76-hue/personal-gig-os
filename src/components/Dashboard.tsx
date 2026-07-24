import React from "react";
import { Transaction, Task } from "../types";

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

  const todayTasks = tasks.filter(t => t.status !== "Hoàn thành");
  const doneTasks = tasks.filter(t => t.status === "Hoàn thành");

  const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="flex flex-col gap-5">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-emerald-400 before:to-teal-500">
          <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">💰 Tổng Thu</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{fmt(totalIncome)}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-rose-400 before:to-orange-500">
          <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">💸 Tổng Chi</div>
          <div className="text-xl font-extrabold text-rose-400 font-mono">{fmt(totalExpense)}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-amber-400 before:to-yellow-500">
          <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">📊 Lợi nhuận</div>
          <div className={`text-xl font-extrabold font-mono ${netProfit >= 0 ? "text-amber-400" : "text-rose-400"}`}>{fmt(netProfit)}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-violet-400 before:to-purple-500">
          <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">✅ Hoàn thành</div>
          <div className="text-xl font-extrabold text-violet-400 font-mono">{doneTasks.length}<span className="text-sm font-normal text-[var(--text-muted)]"> / {tasks.length}</span></div>
        </div>
      </div>

      {/* Main Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Savings Goal Progress */}
        <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] flex items-center gap-2">
              🎯 Mục tiêu tiết kiệm
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-semibold">{goalProgress.toFixed(1)}%</span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
              <span>{savingsGoalName}</span>
              <span className="font-bold text-[var(--text-main)]">{fmt(netProfit)} / {fmt(savingsGoalAmount)}</span>
            </div>
            <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>

          {/* Công việc hôm nay */}
          <div className="mt-1">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">📋 Công việc cần làm hôm nay</h4>
            {todayTasks.length === 0 ? (
              <div className="text-center py-4 text-xs text-[var(--text-muted)] italic">🎉 Không có việc gì cần làm hôm nay!</div>
            ) : (
              <div className="flex flex-col gap-2">
                {todayTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 shrink-0 rounded-full ${
                      t.priority === "Cao" ? "bg-rose-500" :
                      t.priority === "Trung bình" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <span className="text-xs text-[var(--text-main)] font-medium flex-1 truncate">{t.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 bg-black/20 px-2 py-0.5 rounded-full">{t.status}</span>
                  </div>
                ))}
                {todayTasks.length > 5 && (
                  <div className="text-[11px] text-[var(--text-muted)] text-center italic">+{todayTasks.length - 5} việc khác...</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <h3 className="text-sm font-extrabold mb-1 flex items-center gap-2">
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

          {/* Online Status */}
          <div className="mt-auto pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Hệ thống</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400">ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
