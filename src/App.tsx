import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import TaskBoard from "./components/TaskBoard";
import CrmManager from "./components/CrmManager";
import RouteManager from "./components/RouteManager";
import SettingsPanel from "./components/SettingsPanel";
import GoogleSheetsSync from "./components/GoogleSheetsSync";
import { Settings, Task, Project, CrmContact, Schedule } from "./types";
import { getPersistedToken, initAuth, googleSignIn } from "./lib/firebaseAuth";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("light");

  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [toast, setToast] = useState<{ message: string; type: "success" | "danger" | "warning" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);

  // Google Sheets Auto-Sync Status State
  const [googleUser, setGoogleUser] = useState<{ displayName: string; email: string } | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Database States
  const [settings, setSettings] = useState<Settings>({
    companyName: "Huỳnh Bá Long (Chủ sở hữu)",
    telegramBotToken: "",
    telegramChatId: "",
    telegramNotificationsEnabled: false,
    emailNotificationsEnabled: false,
    theme: "light",
    language: "vi",
    timezone: "Asia/Ho_Chi_Minh",
    geminiApiKey: "",
    savingsGoalName: "",
    savingsGoalAmount: 0,
    depotCoords: "10.8087727,106.9241267",
    googleSpreadsheetId: "1i7Ko3USW_UjsIeURYj9iNGcU91GYpyO9QooEdhNk8WY"
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [crmContacts, setCrmContacts] = useState<CrmContact[]>([]);

  const [isInitialSyncing, setIsInitialSyncing] = useState(true);

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("app_theme", "light");
  }, []);

  // Tự động kéo dữ liệu từ Google Sheets mỗi khi quay lại tab ứng dụng
  useEffect(() => {
    let lastSync = 0;
    const handleFocus = async () => {
      const now = Date.now();
      if (now - lastSync < 10000) return; // debounce 10s
      
      const token = getPersistedToken();
      if (token && settings.googleSpreadsheetId) {
        lastSync = now;
        try {
          await apiCall("/api/sync/google-sheets", "POST", {
            action: "import",
            token,
            spreadsheetId: settings.googleSpreadsheetId
          });
          await loadAllData();
        } catch (err: any) {
          console.warn("Auto-pull on focus failed:", err);
          if (err.message?.includes("Failed to fetch") || err.message?.includes("401") || err.message?.includes("token")) {
             showToast("Phiên Google hết hạn, vui lòng Đăng nhập lại ở Cấu hình hệ thống!", "warning");
          }
        }
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [settings.googleSpreadsheetId]);


  // Handle Online/Offline Status and Google Auth on start
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      showToast("Hệ thống đã phục hồi kết nối mạng!", "success");
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      showToast("Mạng bị ngắt. Hệ thống chuyển sang lưu trữ tạm thời (Offline).", "warning");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Track active Google user
    const unsubscribeAuth = initAuth(
      (user) => {
        setGoogleUser({
          displayName: user.displayName || "Huỳnh Bá Long",
          email: user.email || "ketoinha76@gmail.com"
        });
      },
      () => {
        setGoogleUser(null);
      }
    );

    // Initial load
    const initLoad = async () => {
      const token = getPersistedToken();
      if (token && settings.googleSpreadsheetId) {
        try {
          await apiCall("/api/sync/google-sheets", "POST", {
            action: "import",
            token,
            spreadsheetId: settings.googleSpreadsheetId
          });
        } catch (err: any) {
          console.warn("Auto-pull on load failed:", err);
          if (err.message?.includes("Failed to fetch") || err.message?.includes("401") || err.message?.includes("token")) {
             showToast("Phiên Google hết hạn, vui lòng Đăng nhập lại ở Cấu hình hệ thống để tải dữ liệu!", "warning");
          }
        }
      }
      await loadAllData();
      try {
        const liveSettings = await apiCall("/api/settings");
        if (liveSettings) setSettings(liveSettings);
      } catch (err) {
        console.error("Error loading settings:", err);
      }
      setIsInitialSyncing(false);
    };

    initLoad();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribeAuth();
    };
  }, []);

  // Standard fetch wrapper with automatic offline queueing
  const apiCall = async (url: string, method = "GET", body: any = null) => {
    const baseUrl = window.location.hostname === "localhost" && (window as any).Capacitor 
      ? "https://personal-igjw.onrender.com" 
      : "";
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    if (!navigator.onLine && method !== "GET") {
      const queue = JSON.parse(localStorage.getItem("offline_sync_queue") || "[]");
      queue.push({ url: fullUrl, method, body, id: Date.now() });
      localStorage.setItem("offline_sync_queue", JSON.stringify(queue));
      showToast("Đã lưu tác vụ ngoại tuyến. Sẽ tự động đồng bộ khi có mạng.", "warning");
      return { success: true, offline: true };
    }

    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Giao tiếp máy chủ thất bại.");
    }
    return response.json();
  };

  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem("offline_sync_queue") || "[]");
    if (queue.length === 0) return;

    showToast("Đang đồng bộ dữ liệu ngoại tuyến lên đám mây...", "info");
    for (const item of queue) {
      try {
        await apiCall(item.url, item.method, item.body);
      } catch (err) {
        console.error("Lỗi đồng bộ offline:", err);
      }
    }
    localStorage.setItem("offline_sync_queue", "[]");
    showToast("Đồng bộ dữ liệu ngoại tuyến thành công!", "success");
    loadAllData();
  };

  const loadAllData = async (shouldAutoExport = false) => {
    try {
      const [settingsData, tasksData, projectsData, schedulesData, crmData] = await Promise.all([
        apiCall("/api/settings"),
        apiCall("/api/tasks"),
        apiCall("/api/projects"),
        apiCall("/api/schedules"),
        apiCall("/api/crm")
      ]);

      if (settingsData) setSettings(settingsData);
      if (tasksData) setTasks(tasksData);
      if (projectsData) setProjects(projectsData);
      if (schedulesData) setSchedules(schedulesData);
      if (crmData) setCrmContacts(crmData);

      // Automatic background export to Google Sheets
      if (shouldAutoExport) {
        const token = getPersistedToken();
        const sheetId = settingsData?.googleSpreadsheetId || settings.googleSpreadsheetId;
        if (token && sheetId) {
          setIsSyncingSheets(true);
          apiCall("/api/sync/google-sheets", "POST", {
            action: "export",
            token,
            spreadsheetId: sheetId
          })
          .then(() => {
            console.log("Auto-exported database to Google Sheets successfully!");
          })
          .catch((err) => {
            console.error("Background auto-export failed:", err);
          })
          .finally(() => {
            setIsSyncingSheets(false);
          });
        }
      }
    } catch (err: any) {
      showToast("Lỗi tải cơ sở dữ liệu: " + err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    showToast("Đang tải lại dữ liệu...", "info");
    
    const token = getPersistedToken();
    if (token && settings.googleSpreadsheetId) {
      setIsSyncingSheets(true);
      try {
        await apiCall("/api/sync/google-sheets", "POST", {
          action: "import",
          token,
          spreadsheetId: settings.googleSpreadsheetId
        });
        showToast("Đã cập nhật dữ liệu mới nhất từ Google Sheets trước!", "success");
      } catch (err) {
        console.error("Manual refresh sync failed:", err);
      } finally {
        setIsSyncingSheets(false);
      }
    }

    await loadAllData();
    showToast("Làm mới dữ liệu thành công!");
  };

  const showToast = (message: string, type: "success" | "danger" | "warning" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Save Settings
  const handleSaveSettings = async (updated: Settings) => {
    try {
      const res = await apiCall("/api/settings", "PUT", updated);
      setSettings(res);
      showToast("Đã lưu các tùy chỉnh thành công!");
    } catch (err: any) {
      showToast("Lỗi lưu cấu hình: " + err.message, "danger");
    }
  };

  // Save Task
  const onSaveTask = async (task: any) => {
    try {
      if (task.id) {
        await apiCall(`/api/schedules/${task.id}`, "PUT", task);
        showToast("Đã cập nhật công việc!");
      } else {
        await apiCall("/api/schedules", "POST", task);
        showToast("Đã tạo công việc mới!");
      }
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi lưu công việc: " + err.message, "danger");
    }
  };

  const onDeleteTask = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      try {
        await apiCall(`/api/schedules/${id}`, "DELETE");
        showToast("Đã xóa công việc.");
        loadAllData(true);
      } catch (err: any) {
        showToast("Lỗi: " + err.message, "danger");
      }
    }
  };

  const onUpdateTaskStatus = async (id: string, newStatus: string) => {
    try {
      await apiCall(`/api/tasks/${id}`, "PUT", { status: newStatus });
      showToast("Đã chuyển trạng thái công việc!");
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi chuyển trạng thái: " + err.message, "danger");
    }
  };

  // Save CRM
  const onSaveCrm = async (contact: any) => {
    try {
      if (contact.id) {
        await apiCall(`/api/crm/${contact.id}`, "PUT", contact);
        showToast("Cập nhật hồ sơ khách hàng thành công!");
      } else {
        await apiCall("/api/crm", "POST", contact);
        showToast("Đã thêm khách hàng mới!");
      }
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi: " + err.message, "danger");
    }
  };

  const onDeleteCrm = async (id: string) => {
    if (confirm("Xóa thông tin khách hàng này khỏi danh sách?")) {
      try {
        await apiCall(`/api/crm/${id}`, "DELETE");
        showToast("Đã xóa khách hàng.");
        loadAllData(true);
      } catch (err: any) {
        showToast("Lỗi xóa: " + err.message, "danger");
      }
    }
  };

  const handleTriggerWebhookSetup = async () => {
    // no-op: Telegram removed
  };

  const handleGoogleLinkAndCreate = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser({
          displayName: res.user.displayName || "Huỳnh Bá Long",
          email: res.user.email || "ketoinha76@gmail.com"
        });
        
        if (settings.googleSpreadsheetId) {
          showToast("Đăng nhập thành công! Đang tự động đồng bộ dữ liệu...", "info");
          await apiCall("/api/sync/google-sheets", "POST", {
            action: "import",
            token: res.accessToken,
            spreadsheetId: settings.googleSpreadsheetId
          });
          await loadAllData();
          showToast("Đồng bộ dữ liệu từ Google Sheets thành công!", "success");
        } else {
          showToast("Đăng nhập thành công! Đang tự động khởi tạo file Google Sheets mới...", "info");
          
          const createRes = await apiCall("/api/sync/google-sheets", "POST", {
            action: "export",
            token: res.accessToken
          });
          
          if (createRes && createRes.spreadsheetId) {
            const updatedSettings = {
              ...settings,
              googleSpreadsheetId: createRes.spreadsheetId,
              googleSpreadsheetUrl: createRes.spreadsheetUrl
            };
            await apiCall("/api/settings", "PUT", updatedSettings);
            setSettings(updatedSettings);
            showToast("Đã khởi tạo và liên kết File Google Sheets mới thành công!", "success");
            await loadAllData();
          } else {
            throw new Error("Không thể khởi tạo file Google Sheets.");
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi liên kết Google Sheets: " + err.message, "danger");
    }
  };

  if (isInitialSyncing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"></div>
          <p className="text-[var(--text-muted)] font-bold text-sm tracking-wider uppercase">Đang đồng bộ dữ liệu từ Đám mây...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} companyName={settings.companyName} />

      {/* Main Panel Content Area */}
      <main className="grow bg-[var(--bg-main)] p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">{settings.companyName}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--overlay-03)] rounded-full text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full ${onlineStatus ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                <span className="text-[11px]">{onlineStatus ? "Đang trực tuyến" : "Mất kết nối mạng (Lưu offline)"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAllData}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-extrabold rounded-xl hover:bg-[var(--primary-hover)] cursor-pointer transition-all shadow-sm"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>


        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-[var(--overlay-04)] border-t-[var(--primary)] rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-[var(--text-muted)]">Đang đồng bộ cơ sở dữ liệu...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  tasks={tasks}
                  crmContacts={crmContacts}
                  routeLogs={[]}
                />
              )}

              {activeTab === "tasks" && (
                <TaskBoard
                  schedules={schedules}
                  crmContacts={crmContacts}
                  onSave={onSaveTask}
                  onDelete={onDeleteTask}
                  showToast={showToast}
                  apiCall={apiCall}
                  refreshData={loadAllData}
                />
              )}

              {activeTab === "crm" && (
                <CrmManager
                  crmContacts={crmContacts}
                  onSave={onSaveCrm}
                  onDelete={onDeleteCrm}
                  showToast={showToast}
                  apiCall={apiCall}
                />
              )}

              {activeTab === "calendar" && (
                <RouteManager
                  crmContacts={crmContacts}
                  schedules={schedules}
                  depotCoords={settings.depotCoords}
                  setDepotCoords={(coords) => setSettings({ ...settings, depotCoords: coords })}
                  showToast={showToast}
                  apiCall={apiCall}
                  refreshData={loadAllData}
                  forcedTab="matrix"
                />
              )}

              {activeTab === "delivery_map" && (
                <RouteManager
                  crmContacts={crmContacts}
                  schedules={schedules}
                  depotCoords={settings.depotCoords}
                  setDepotCoords={(coords) => setSettings({ ...settings, depotCoords: coords })}
                  showToast={showToast}
                  apiCall={apiCall}
                  refreshData={loadAllData}
                  forcedTab="map"
                />
              )}

              {activeTab === "settings" && (
                <div className="flex flex-col gap-6">
                  <SettingsPanel
                    settings={settings}
                    onSave={handleSaveSettings}
                    theme={theme}
                    setTheme={setTheme}
                    handleTriggerWebhookSetup={handleTriggerWebhookSetup}
                  />
                  <GoogleSheetsSync
                    settings={settings}
                    onSaveSettings={handleSaveSettings}
                    apiCall={apiCall}
                    refreshData={loadAllData}
                    showToast={showToast}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Toast Notification HUD */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 bg-[var(--bg-card)] border border-[var(--border-color)] border-l-4 rounded-xl px-5 py-3 shadow-2xl z-50 flex items-center gap-3 animate-slideIn font-bold text-[13px] text-[var(--text-main)]"
          style={{
            borderLeftColor:
              toast.type === "danger"
                ? "var(--danger)"
                : toast.type === "success"
                ? "var(--success)"
                : toast.type === "warning"
                ? "var(--warning)"
                : "var(--primary)"
          }}
        >
          <span>🔔</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
