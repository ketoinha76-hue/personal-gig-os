import React, { useState } from "react";
import { Settings } from "../types";

interface SettingsPanelProps {
  settings: Settings;
  onSave: (updated: Settings) => Promise<void>;
  theme: string;
  setTheme: (t: string) => void;
  handleTriggerWebhookSetup: () => Promise<void>;
}

export default function SettingsPanel({
  settings,
  onSave,
  theme,
  setTheme,
  handleTriggerWebhookSetup
}: SettingsPanelProps) {
  const [formData, setFormData] = useState<Settings>({ ...settings });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-[var(--text-main)]">Cấu hình & Tích hợp Telegram</h2>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tên không gian làm việc</label>
            <input
              type="text"
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tọa độ xuất phát cố định (nhà riêng/Yakult)</label>
            <input
              type="text"
              placeholder="Vĩ độ, Kinh độ"
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              value={formData.depotCoords}
              onChange={(e) => setFormData({ ...formData, depotCoords: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Telegram Bot Token</label>
              <input
                type="text"
                className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                value={formData.telegramBotToken}
                onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Telegram Chat ID cá nhân</label>
              <input
                type="text"
                className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">⚡ Giao diện Hệ thống (Theme)</label>
            <div className="flex flex-wrap gap-2.5 mt-2">
              {[
                { id: "cyber", label: "🛸 Sci-Fi Cyber" },
                { id: "dark", label: "🌑 Tối giản" },
                { id: "light", label: "☀️ Sáng" },
                { id: "ocean", label: "🌊 Đại dương" },
                { id: "nature", label: "🌿 Tự nhiên" }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`px-4 py-2 text-xs font-extrabold rounded-lg cursor-pointer transition-all border ${
                    theme === t.id
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-[0_0_12px_var(--primary-glow)]"
                      : "bg-[var(--overlay-03)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--overlay-06)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Google Gemini API Key</label>
            <input
              type="password"
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              value={formData.geminiApiKey || ""}
              onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Google Spreadsheet ID (Dành cho Auto-Sync)</label>
            <input
              type="text"
              placeholder="Vd: 1i7Ko3USW_UjsIeURYj9iNGcU91GYpyO9QooEdhNk8WY"
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              value={formData.googleSpreadsheetId || ""}
              onChange={(e) => setFormData({ ...formData, googleSpreadsheetId: e.target.value })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 border-t border-[var(--border-color)] pt-5">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              Lưu cấu hình
            </button>
            <button
              type="button"
              onClick={handleTriggerWebhookSetup}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              🌐 Kích hoạt Telegram Webhook 2 chiều
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
