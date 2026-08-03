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
        <h2 className="text-xl font-extrabold text-[var(--text-main)]">⚙️ Cấu hình Hệ thống</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Thiết lập tên không gian làm việc, tọa độ xuất phát và kết nối Google Sheets.</p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Workspace Name */}
          <div>
            <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Tên không gian làm việc
            </label>
            <input
              type="text"
              className="w-full bg-black/10 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          {/* Save */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2 border-t border-[var(--border-color)] pt-5">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              💾 Lưu cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
