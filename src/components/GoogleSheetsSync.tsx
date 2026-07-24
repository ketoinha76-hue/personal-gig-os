import React, { useState, useEffect } from "react";
import { Settings } from "../types";
import { initAuth, googleSignIn, logout } from "../lib/firebaseAuth";

interface GoogleSheetsSyncProps {
  settings: Settings;
  onSaveSettings: (updated: Settings) => Promise<void>;
  apiCall: (url: string, method?: string, body?: any) => Promise<any>;
  refreshData: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "danger" | "warning" | "info") => void;
}

interface LocalGoogleUser {
  displayName: string;
  email: string;
  photoURL: string;
}

export default function GoogleSheetsSync({
  settings,
  onSaveSettings,
  apiCall,
  refreshData,
  showToast
}: GoogleSheetsSyncProps) {
  const [user, setUser] = useState<LocalGoogleUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        setToken(accessToken);
        setUser({
          displayName: firebaseUser.displayName || "Huỳnh Bá Long",
          email: firebaseUser.email || "ketoinha76@gmail.com",
          photoURL: firebaseUser.photoURL || ""
        });
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser({
          displayName: result.user.displayName || "Huỳnh Bá Long",
          email: result.user.email || "ketoinha76@gmail.com",
          photoURL: result.user.photoURL || ""
        });
        showToast(`Chào mừng ${result.user.displayName || "anh Long"}! Đăng nhập Google thành công.`, "success");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        showToast("Đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.", "warning");
      } else {
        showToast("Đăng nhập Google thất bại: " + err.message, "danger");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      showToast("Đã ngắt kết nối tài khoản Google.", "info");
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi khi đăng xuất: " + err.message, "danger");
    }
  };

  const handleExport = async () => {
    if (!token) {
      showToast("Vui lòng đăng nhập Google trước khi đồng bộ.", "warning");
      return;
    }
    
    setIsExporting(true);
    showToast("Đang chuẩn bị và xuất dữ liệu lên Google Sheets...", "info");
    
    try {
      const res = await apiCall("/api/sync/google-sheets", "POST", {
        action: "export",
        token: token,
        spreadsheetId: settings.googleSpreadsheetId
      });
      
      if (res && res.spreadsheetId) {
        await onSaveSettings({
          ...settings,
          googleSpreadsheetId: res.spreadsheetId,
          googleSpreadsheetUrl: res.spreadsheetUrl
        });
        showToast("Đồng bộ dữ liệu xuất Google Sheets thành công rực rỡ!", "success");
        await refreshData();
      } else {
        throw new Error("Không nhận được spreadsheetId từ máy chủ.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi khi xuất Google Sheets: " + (err.message || err), "danger");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!token) {
      showToast("Vui lòng đăng nhập Google trước khi tải dữ liệu.", "warning");
      return;
    }
    
    if (!settings.googleSpreadsheetId) {
      showToast("Không tìm thấy ID bảng tính để tải về. Hãy nhấn 'Xuất lên Google Sheets' trước.", "warning");
      return;
    }

    if (!window.confirm("CẢNH BÁO: Hành động này sẽ thay thế TOÀN BỘ dữ liệu hiện tại bằng dữ liệu từ Google Sheets. Bạn có chắc chắn muốn tiếp tục không?")) {
      return;
    }

    setIsImporting(true);
    showToast("Đang tải dữ liệu từ Google Sheets về ứng dụng...", "info");

    try {
      const res = await apiCall("/api/sync/google-sheets", "POST", {
        action: "import",
        token: token,
        spreadsheetId: settings.googleSpreadsheetId
      });

      if (res && res.success) {
        showToast("Tải và đồng bộ dữ liệu từ Google Sheets thành công!", "success");
        await refreshData();
      } else {
        throw new Error("Yêu cầu nhập dữ liệu thất bại.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi khi nhập từ Google Sheets: " + (err.message || err), "danger");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm max-w-xl mt-6">
      <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="text-emerald-500">📊</span> Tích hợp Google Sheets (Database)
      </h3>
      
      <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
        Lưu trữ và đồng bộ hóa toàn bộ cơ sở dữ liệu của bạn (Công việc, Lịch trình, Doanh thu Grab, Khách hàng CRM, Học phí, v.v.) trực tiếp lên Google Sheets của bạn.
      </p>

      {!user ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button w-full flex items-center justify-center gap-3 cursor-pointer py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-black/15 text-xs font-bold text-[var(--text-main)] hover:bg-black/25 transition-all"
          >
            <div className="gsi-material-button-icon shrink-0">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            </div>
            <span>{isLoggingIn ? "Đang kết nối..." : "Đăng nhập với Google để kích hoạt"}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3.5 bg-black/10 rounded-xl border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img referrerPolicy="no-referrer" src={user.photoURL} alt="Google Avatar" className="w-8 h-8 rounded-full border border-emerald-500/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">G</div>
              )}
              <div>
                <div className="text-xs font-bold text-[var(--text-main)]">{user.displayName}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">{user.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider cursor-pointer border border-rose-500/20 px-2 py-1 rounded"
            >
              Đăng xuất
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExporting ? "⌛ Đang xuất..." : "📤 Xuất lên Google Sheet"}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isExporting || isImporting || !settings.googleSpreadsheetId}
              className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              title={!settings.googleSpreadsheetId ? "Hãy xuất dữ liệu lên Google Sheets trước để khởi tạo" : "Tải dữ liệu từ Google Sheets xuống đè lên bản địa"}
            >
              {isImporting ? "⌛ Đang tải..." : "📥 Tải về từ Google Sheet"}
            </button>
          </div>

          {settings.googleSpreadsheetUrl && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--text-main)]">📁 Bảng tính hiện tại:</span>
              <a
                href={settings.googleSpreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:text-emerald-600 underline"
              >
                Mở Google Sheets ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
