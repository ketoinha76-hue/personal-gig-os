import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Transaction, Task } from "../types";
import { 
  TrendingUp, 
  Cpu, 
  Activity, 
  Zap, 
  Calendar, 
  DollarSign, 
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface SciFiAnalyticsProps {
  transactions: Transaction[];
  tasks: Task[];
  savingsGoalAmount?: number;
  netProfit: number;
}

export default function SciFiAnalytics({
  transactions,
  tasks,
  savingsGoalAmount = 50000000,
  netProfit
}: SciFiAnalyticsProps) {
  // 1. Calculate Real Telemetry
  const totalIncome = useMemo(() => 
    transactions.filter(t => t.type === "Thu").reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );
  
  const totalExpense = useMemo(() => 
    transactions.filter(t => t.type === "Chi").reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );

  const taskCompletionRate = useMemo(() => {
    if (tasks.length === 0) return 100;
    const completed = tasks.filter(t => t.status === "Hoàn thành").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const expenseRatio = useMemo(() => {
    if (totalIncome === 0) return 0;
    return Math.min(100, Math.round((totalExpense / totalIncome) * 100));
  }, [totalIncome, totalExpense]);

  const financialEfficiency = 100 - expenseRatio;

  // 2. Projection Engine State
  const [dailyTargetIncome, setDailyTargetIncome] = useState<number>(1200000); // 1.2M default

  // 3. Compute 15-day projection coordinates
  const projectionData = useMemo(() => {
    const data = [];
    let currentBalance = netProfit;
    for (let day = 0; day <= 15; day++) {
      data.push({
        day,
        amount: currentBalance,
        label: `Này +${day} ngày`
      });
      currentBalance += dailyTargetIncome;
    }
    return data;
  }, [netProfit, dailyTargetIncome]);

  // Compute SVG line path coordinates based on projectionData
  const svgCoords = useMemo(() => {
    if (projectionData.length === 0) return "";
    const padding = 30;
    const width = 500;
    const height = 150;
    
    const minVal = netProfit;
    const maxVal = Math.max(savingsGoalAmount, projectionData[projectionData.length - 1].amount);
    const valRange = maxVal - minVal || 1;

    return projectionData.map((d, index) => {
      const x = padding + (index / (projectionData.length - 1)) * (width - padding * 2);
      const normalizedY = (d.amount - minVal) / valRange;
      const y = height - padding - normalizedY * (height - padding * 2);
      return { x, y, amount: d.amount, label: d.label };
    });
  }, [projectionData, netProfit, savingsGoalAmount]);

  const pathD = useMemo(() => {
    if (svgCoords.length === 0) return "";
    return svgCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  }, [svgCoords]);

  const areaD = useMemo(() => {
    if (svgCoords.length === 0) return "";
    const padding = 30;
    const width = 500;
    const height = 150;
    const startX = svgCoords[0].x;
    const endX = svgCoords[svgCoords.length - 1].x;
    return `${pathD} L ${endX} ${height - padding} L ${startX} ${height - padding} Z`;
  }, [svgCoords, pathD]);

  // Target Threshold Y Coordinate
  const targetY = useMemo(() => {
    if (projectionData.length === 0) return 0;
    const padding = 30;
    const height = 150;
    const minVal = netProfit;
    const maxVal = Math.max(savingsGoalAmount, projectionData[projectionData.length - 1].amount);
    const valRange = maxVal - minVal || 1;
    
    const normalizedY = (savingsGoalAmount - minVal) / valRange;
    return height - padding - normalizedY * (height - padding * 2);
  }, [projectionData, netProfit, savingsGoalAmount]);

  // Check when target will be met
  const daysToGoal = useMemo(() => {
    if (netProfit >= savingsGoalAmount) return 0;
    if (dailyTargetIncome <= 0) return Infinity;
    return Math.ceil((savingsGoalAmount - netProfit) / dailyTargetIncome);
  }, [netProfit, savingsGoalAmount, dailyTargetIncome]);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col gap-6 animate-fadeIn">
      {/* Sci-Fi Decorative Grid Header Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--purple)] to-[var(--rose)] opacity-80" />
      
      {/* HUD-style Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[var(--primary)] uppercase font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-ping" />
            <span>[ SYSTEM TELEMETRY & PREDICTIVE ANALYTICS ]</span>
          </div>
          <h3 className="text-lg font-extrabold text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--primary)]" />
            Hệ Thống Dự Báo & Giám Sát Cash-Flow
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="text-[var(--text-muted)]">LOG_STATUS:</span>
          <span className="text-[var(--success)] font-bold">ONLINE_SECURE</span>
        </div>
      </div>

      {/* Grid of Key Science Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Financial Efficiency */}
        <div className="bg-black/30 border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--primary)] transition-all">
          <div className="w-12 h-12 rounded-lg bg-[rgba(0,240,255,0.07)] border border-[rgba(0,240,255,0.15)] flex items-center justify-center text-[var(--primary)]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="grow">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Hiệu Suất Tài Chính</div>
            <div className="text-lg font-extrabold text-[var(--text-main)] mt-0.5 font-mono">{financialEfficiency}%</div>
            <div className="w-full bg-black/40 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-[var(--primary)] rounded-full" 
                style={{ width: `${financialEfficiency}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Tỷ lệ tiền tích lũy ròng</span>
          </div>
        </div>

        {/* Metric 2: Task Execution Health */}
        <div className="bg-black/30 border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--success)] transition-all">
          <div className="w-12 h-12 rounded-lg bg-[rgba(57,255,20,0.07)] border border-[rgba(57,255,20,0.15)] flex items-center justify-center text-[var(--success)]">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="grow">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Hoàn Thành Công Việc</div>
            <div className="text-lg font-extrabold text-[var(--success)] mt-0.5 font-mono">{taskCompletionRate}%</div>
            <div className="w-full bg-black/40 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-[var(--success)] rounded-full" 
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{tasks.filter(t => t.status === "Hoàn thành").length}/{tasks.length} công việc xong</span>
          </div>
        </div>

        {/* Metric 3: Expense Ratio */}
        <div className="bg-black/30 border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--danger)] transition-all">
          <div className="w-12 h-12 rounded-lg bg-[rgba(255,0,60,0.07)] border border-[rgba(255,0,60,0.15)] flex items-center justify-center text-[var(--danger)]">
            <Activity className="w-6 h-6" />
          </div>
          <div className="grow">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Hệ Số Chi Tiêu</div>
            <div className="text-lg font-extrabold text-[var(--danger)] mt-0.5 font-mono">{expenseRatio}%</div>
            <div className="w-full bg-black/40 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-[var(--danger)] rounded-full" 
                style={{ width: `${expenseRatio}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Tỷ số chi phí so với thu nhập</span>
          </div>
        </div>
      </div>

      {/* Futuristic Simulator and Chart Wrapper */}
      <div className="bg-black/20 border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-5">
        {/* Simulator Control Unit */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div className="grow max-w-md">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[12px] font-mono uppercase tracking-wider text-[var(--text-main)] font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[var(--primary)] animate-pulse" />
                Mức thu nhập mục tiêu/ngày:
              </label>
              <span className="text-sm font-mono font-bold text-[var(--primary)]">
                {dailyTargetIncome.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <input 
              type="range" 
              min="200000" 
              max="5000000" 
              step="50000"
              value={dailyTargetIncome}
              onChange={(e) => setDailyTargetIncome(Number(e.target.value))}
              className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mt-1.5">
              <span>200k đ</span>
              <span>2.5M đ</span>
              <span>5M đ</span>
            </div>
          </div>

          <div className="p-3 bg-black/40 border border-[var(--border-color)] rounded-xl flex items-center gap-3 shrink-0">
            <Calendar className="w-8 h-8 text-[var(--primary)]" />
            <div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Dự kiến chạm mốc mục tiêu</div>
              <div className="text-sm font-mono font-bold text-[var(--primary)]">
                {daysToGoal === 0 ? "Đã đạt được!" : daysToGoal === Infinity ? "Không xác định" : `Sau ${daysToGoal} ngày`}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                {daysToGoal !== Infinity && daysToGoal > 0 
                  ? `Mốc: ${new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")}`
                  : "Mục tiêu tích lũy an toàn"
                }
              </div>
            </div>
          </div>
        </div>

        {/* Projection SVG Line Chart */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-mono text-[var(--text-muted)] mb-2">
            <span>Dự báo dòng tiền tích lũy (15 ngày tới)</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-[var(--primary)] inline-block" /> Dự báo giả lập
              <span className="w-2.5 h-0.5 border-t border-dashed border-[var(--rose)] inline-block ml-2" /> Vạch mục tiêu
            </span>
          </div>

          <div className="relative bg-black/40 border border-[var(--border-color)] rounded-xl p-2.5 overflow-hidden">
            {/* Grid Overlay Effects */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
            
            <svg 
              viewBox="0 0 500 150" 
              className="w-full h-[150px] overflow-visible relative z-10"
              preserveAspectRatio="none"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--purple)" />
                </linearGradient>
              </defs>

              {/* Target Line (Dashed red/pink line) */}
              {targetY >= 0 && targetY <= 150 && (
                <g>
                  <line 
                    x1="30" 
                    y1={targetY} 
                    x2="470" 
                    y2={targetY} 
                    stroke="var(--rose)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4,4" 
                    opacity="0.8"
                  />
                  <text 
                    x="35" 
                    y={targetY - 5} 
                    fill="var(--rose)" 
                    fontSize="8" 
                    fontFamily="monospace"
                    className="font-bold fill-current"
                  >
                    MỤC TIÊU: {savingsGoalAmount.toLocaleString("vi-VN")} đ
                  </text>
                </g>
              )}

              {/* Area Under Line */}
              {areaD && (
                <path 
                  d={areaD} 
                  fill="url(#chartAreaGrad)"
                />
              )}

              {/* Glow filter path */}
              {pathD && (
                <path 
                  d={pathD} 
                  stroke="var(--primary)" 
                  strokeWidth="4" 
                  fill="none" 
                  opacity="0.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Actual Forecasting Line */}
              {pathD && (
                <path 
                  d={pathD} 
                  stroke="url(#chartLineGrad)" 
                  strokeWidth="2" 
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {svgCoords.map((coord, i) => {
                // Show dot for every 3 days to prevent cluttering
                if (i % 3 !== 0 && i !== svgCoords.length - 1) return null;
                return (
                  <g key={i} className="group cursor-pointer">
                    <circle 
                      cx={coord.x} 
                      cy={coord.y} 
                      r="4" 
                      fill="var(--primary)" 
                      stroke="#020308"
                      strokeWidth="1.5"
                      className="transition-all hover:scale-150"
                    />
                    <text
                      x={coord.x}
                      y={coord.y - 8}
                      fill="var(--text-main)"
                      fontSize="7"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="opacity-60 font-semibold"
                    >
                      {i === 0 ? "Bây giờ" : `+${i} ngày`}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Simulated Live Value HUD readout */}
            <div className="absolute bottom-2.5 right-3 bg-black/80 border border-[var(--border-color)] px-2.5 py-1 rounded-md text-[9px] font-mono text-[var(--primary)] z-20 flex gap-2">
              <span className="text-[var(--text-muted)]">SIM_END_BALANCE:</span>
              <span className="font-bold">
                {projectionData[projectionData.length - 1].amount.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
