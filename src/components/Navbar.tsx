import React from "react";
import { motion } from "motion/react";
import ChibiDragonAvatar from "./ChibiDragonAvatar";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  companyName: string;
}

export default function Navbar({ activeTab, setActiveTab, companyName }: NavbarProps) {
  const menuItems = [
    { id: "dashboard", label: "Tổng quan", icon: "📊" },
    { id: "tasks", label: "Công việc", icon: "📝" },
    { id: "crm", label: "Quản lý Khách hàng", icon: "👥" },
    { id: "calendar", label: "Ma trận Lịch tuần", icon: "📅" },
    { id: "delivery_map", label: "Bản đồ giao sữa", icon: "🚚" },
    { id: "settings", label: "Cấu hình hệ thống", icon: "🛠️" }
  ];

  return (
    <aside className="w-full md:w-[270px] bg-[var(--bg-sidebar)] border-b md:border-b-0 md:border-r border-[var(--border-color)] flex flex-col p-6 shrink-0">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--purple)] flex items-center justify-center font-extrabold text-lg text-white shadow-lg">
          💼
        </div>
        <div className="text-lg font-extrabold bg-gradient-to-r from-[var(--text-main)] to-slate-400 bg-clip-text text-transparent">
          Personal Gig-OS
        </div>
      </div>
      
      <ul className="flex md:flex-col gap-1 list-none grow overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <li key={item.id} className="shrink-0 md:shrink relative">
              <button
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13.5px] font-semibold cursor-pointer text-left whitespace-nowrap md:whitespace-normal transition-colors duration-200 z-10 ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="text-base z-10">{item.icon}</span>
                <span className="z-10">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.15)] rounded-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="pt-4 border-t border-[var(--border-color)] hidden md:flex items-center gap-3 mt-auto">
        <ChibiDragonAvatar className="w-10 h-10" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px]">{companyName}</span>
          <span className="text-[11px] text-[var(--text-muted)]">Chủ sở hữu</span>
        </div>
      </div>
    </aside>
  );
}
