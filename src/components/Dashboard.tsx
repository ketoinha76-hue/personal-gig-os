import React, { useState, useEffect } from "react";
import { Task, CrmContact, RouteLog } from "../types";

const API_BASE = "";
async function fetchLogs(): Promise<RouteLog[]> {
  try {
    const res = await fetch(`${API_BASE}/api/route-logs`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.reverse() : [];
  } catch { return []; }
}

interface DashboardProps {
  tasks: Task[];
  crmContacts: CrmContact[];
  routeLogs?: RouteLog[]; // kept for compat
  transactions?: any[];
  savingsGoalName?: string;
  savingsGoalAmount?: number;
  netProfit?: number;
  speakText?: (text: string) => void;
  setShowTxModal?: (show: boolean) => void;
  handleSendEODReport?: () => void;
  handleInvoiceScan?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Dashboard({ tasks, crmContacts }: DashboardProps) {
  const [routeLogs, setRouteLogs] = useState<RouteLog[]>([]);

  useEffect(() => {
    fetchLogs().then(setRouteLogs);
  }, []);
  // ── Task stats ──────────────────────────────────────────────
  const yakultTasks = tasks.filter(t => t.projectId === "p-1");
  const pendingTasks = yakultTasks.filter(t => t.status !== "Hoàn thành");
  const doneTasks = yakultTasks.filter(t => t.status === "Hoàn thành");
  const inProgressTasks = yakultTasks.filter(t => t.status === "Đang thực hiện");

  // ── Customer stats ───────────────────────────────────────────
  const totalCustomers = crmContacts.length;
  const evenDayCustomers = crmContacts.filter(c => c.company === "Khách hàng ngày chẵn").length;
  const oddDayCustomers = crmContacts.filter(c => c.company === "Khách hàng ngày lẻ").length;
  const homeCustomers = crmContacts.filter(c => c.company === "Nhà riêng").length;

  // ── Route stats ──────────────────────────────────────────────
  const totalRoutes = routeLogs.length;
  const totalKm = routeLogs.reduce((sum, l) => sum + (l.totalDistanceKm || 0), 0);
  const avgKm = totalRoutes > 0 ? totalKm / totalRoutes : 0;
  const lastLog = routeLogs[0]; // already sorted newest-first

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Row 1: 3 Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Công việc */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 relative overflow-hidden shadow-sm before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-violet-500 before:to-purple-600">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">📋 Công việc Yakult</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{yakultTasks.length} task</span>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <div className="text-3xl font-extrabold text-violet-400">{pendingTasks.length}</div>
            <div className="text-xs text-[var(--text-muted)] pb-1">việc chưa xong</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="text-[11px] text-[var(--text-muted)]">Cần làm</div>
              <div className="text-sm font-extrabold text-amber-400">{pendingTasks.filter(t => t.status === "Cần làm").length}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="text-[11px] text-[var(--text-muted)]">Đang làm</div>
              <div className="text-sm font-extrabold text-blue-400">{inProgressTasks.length}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="text-[11px] text-[var(--text-muted)]">Xong</div>
              <div className="text-sm font-extrabold text-emerald-400">{doneTasks.length}</div>
            </div>
          </div>
        </div>

        {/* Khách hàng */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 relative overflow-hidden shadow-sm before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-amber-400 before:to-orange-500">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">👥 Khách hàng</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{totalCustomers} người</span>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <div className="text-3xl font-extrabold text-amber-400">{totalCustomers}</div>
            <div className="text-xs text-[var(--text-muted)] pb-1">khách hàng</div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">📅 Ngày chẵn</span>
              <span className="font-bold text-[var(--text-main)]">{evenDayCustomers} người</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">📅 Ngày lẻ</span>
              <span className="font-bold text-[var(--text-main)]">{oddDayCustomers} người</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">🏠 Nhà riêng</span>
              <span className="font-bold text-[var(--text-main)]">{homeCustomers} người</span>
            </div>
          </div>
        </div>

        {/* Quãng đường */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 relative overflow-hidden shadow-sm before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] before:bg-gradient-to-r before:from-emerald-400 before:to-teal-500">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">🗺️ Lịch trình</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{totalRoutes} chuyến</span>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <div className="text-3xl font-extrabold text-emerald-400">{totalKm.toFixed(1)}</div>
            <div className="text-xs text-[var(--text-muted)] pb-1">km tổng cộng</div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Trung bình/chuyến</span>
              <span className="font-bold text-[var(--text-main)]">{avgKm.toFixed(1)} km</span>
            </div>
            {lastLog && (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)]">Chuyến gần nhất</span>
                  <span className="font-bold text-[var(--text-main)]">{lastLog.date}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)]">Quãng đường</span>
                  <span className="font-bold text-emerald-400">{lastLog.totalDistanceKm.toFixed(1)} km</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 2: Tasks list ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-[var(--text-main)] mb-4 flex items-center gap-2">
          📋 Danh sách công việc Bán Sữa Yakult
          <span className="text-[10px] font-semibold text-[var(--text-muted)] ml-auto">{pendingTasks.length} việc cần xử lý</span>
        </h3>
        {yakultTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)] italic">Chưa có công việc nào.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {yakultTasks.map(t => (
              <div key={t.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                t.status === "Hoàn thành"
                  ? "bg-black/10 border-white/5 opacity-60"
                  : "bg-black/20 border-[var(--border-color)]"
              }`}>
                <span className={`w-2 h-2 shrink-0 rounded-full ${
                  t.status === "Hoàn thành" ? "bg-emerald-500" :
                  t.status === "Đang thực hiện" ? "bg-blue-500" :
                  t.priority === "Cao" ? "bg-rose-500" :
                  t.priority === "Trung bình" ? "bg-amber-500" : "bg-slate-500"
                }`} />
                <span className={`text-[13px] font-medium flex-1 ${t.status === "Hoàn thành" ? "line-through text-[var(--text-muted)]" : "text-[var(--text-main)]"}`}>
                  {t.title}
                </span>
                <span className={`text-[10px] shrink-0 font-bold px-2 py-0.5 rounded-full border ${
                  t.status === "Hoàn thành" ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/20" :
                  t.status === "Đang thực hiện" ? "bg-blue-900/20 text-blue-400 border-blue-500/20" :
                  "bg-amber-900/20 text-amber-400 border-amber-500/20"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
