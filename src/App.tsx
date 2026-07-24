import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import ProductCatalog from "./components/ProductCatalog";
import TaskBoard from "./components/TaskBoard";
import FinanceLedger from "./components/FinanceLedger";
import CrmManager from "./components/CrmManager";
import RouteManager from "./components/RouteManager";
import SettingsPanel from "./components/SettingsPanel";
import GoogleSheetsSync from "./components/GoogleSheetsSync";
import { Settings, Task, Project, Product, CrmContact, Schedule, Transaction, Tuition } from "./types";
import { getPersistedToken, initAuth, googleSignIn } from "./lib/firebaseAuth";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("app_theme") || "cyber");

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
    theme: "dark",
    language: "vi",
    timezone: "Asia/Ho_Chi_Minh",
    geminiApiKey: "",
    savingsGoalName: "Mua máy ảnh Sony A7IV",
    savingsGoalAmount: 45000000,
    depotCoords: "10.8087727,106.9241267",
    googleSpreadsheetId: "1i7Ko3USW_UjsIeURYj9iNGcU91GYpyO9QooEdhNk8WY"
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [crmContacts, setCrmContacts] = useState<CrmContact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tuitionRecords, setTuitionRecords] = useState<Tuition[]>([]);

  // Voice recognition states
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceCommandText, setVoiceCommandText] = useState("");
  const [isInitialSyncing, setIsInitialSyncing] = useState(true);

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

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
      try {
        await apiCall("/api/sync/auto-pull", "POST");
      } catch (err) {
        console.warn("Auto-pull skipped or failed:", err);
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
    // Determine the base URL: Use Render URL if running inside Capacitor (where location.hostname is localhost)
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
      const [settingsData, tasksData, projectsData, productsData, schedulesData, crmData, txData, tuitionData] = await Promise.all([
        apiCall("/api/settings"),
        apiCall("/api/tasks"),
        apiCall("/api/projects"),
        apiCall("/api/products"),
        apiCall("/api/schedules"),
        apiCall("/api/crm"),
        apiCall("/api/transactions"),
        apiCall("/api/tuitions").catch(() => [])
      ]);

      if (settingsData) setSettings(settingsData);
      if (tasksData) setTasks(tasksData);
      if (projectsData) setProjects(projectsData);
      if (productsData) setProducts(productsData);
      if (schedulesData) setSchedules(schedulesData);
      if (crmData) setCrmContacts(crmData);
      if (txData) setTransactions(txData);
      if (tuitionData) setTuitionRecords(tuitionData);

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
    
    // Attempt double sync on manual refresh too
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


  // Text-To-Speech
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        // Specifically search for vi-VN or Vietnamese voices to avoid funny foreign accents
        const viVoice = voices.find(v => 
          v.lang.toLowerCase() === "vi-vn" || 
          v.lang.toLowerCase().startsWith("vi") || 
          v.name.toLowerCase().includes("vietnamese") || 
          v.name.toLowerCase().includes("việt")
        );
        if (viVoice) {
          utterance.voice = viVoice;
        } else {
          const fallbackViVoice = voices.find(v => v.lang.toLowerCase().includes("vi"));
          if (fallbackViVoice) utterance.voice = fallbackViVoice;
        }
        utterance.lang = "vi-VN";
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak();
        };
      } else {
        setVoiceAndSpeak();
      }
      showToast("Đang phát bằng giọng đọc tiếng Việt chuẩn...");
    } else {
      showToast("Trình duyệt của bạn không hỗ trợ công cụ đọc văn bản.", "warning");
    }
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

  // Save Product
  const onSaveProduct = async (prod: any) => {
    try {
      if (prod.id) {
        await apiCall(`/api/products/${prod.id}`, "PUT", prod);
        showToast("Cập nhật sản phẩm thành công!");
      } else {
        await apiCall("/api/products", "POST", prod);
        showToast("Đã thêm sản phẩm mới thành công!");
      }
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi lưu sản phẩm: " + err.message, "danger");
    }
  };

  const onDeleteProduct = async (id: string) => {
    if (confirm("Xóa gói sản phẩm/dịch vụ này?")) {
      try {
        await apiCall(`/api/products/${id}`, "DELETE");
        showToast("Đã xóa sản phẩm thành công.");
        loadAllData(true);
      } catch (err: any) {
        showToast("Lỗi xóa: " + err.message, "danger");
      }
    }
  };

  // Save Task
  const onSaveTask = async (task: any) => {
    try {
      if (task.id) {
        await apiCall(`/api/tasks/${task.id}`, "PUT", task);
        showToast("Đã cập nhật công việc!");
      } else {
        await apiCall("/api/tasks", "POST", task);
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
        await apiCall(`/api/tasks/${id}`, "DELETE");
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

  // --- TUITION RECORDS HANDLERS ---
  const onSaveTuition = async (record: any) => {
    try {
      if (record.id) {
        await apiCall(`/api/tuitions/${record.id}`, "PUT", record);
        showToast("Đã cập nhật thông tin học phí thành công!", "success");
      } else {
        await apiCall("/api/tuitions", "POST", record);
        showToast("Đã thêm thông tin học phí học viên mới!", "success");
      }
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi lưu học phí: " + err.message, "danger");
    }
  };

  const onDeleteTuition = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa học phí của học viên này?")) {
      try {
        await apiCall(`/api/tuitions/${id}`, "DELETE");
        showToast("Đã xóa hồ sơ học phí thành công.", "success");
        loadAllData(true);
      } catch (err: any) {
        showToast("Lỗi xóa hồ sơ: " + err.message, "danger");
      }
    }
  };

  const onSyncTuitionsToFinance = async () => {
    try {
      showToast("Đang đồng bộ học phí đóng mới sang sổ sách...", "info");
      const res = await apiCall("/api/tuitions/sync", "POST");
      if (res.count > 0) {
        showToast(res.message, "success");
      } else {
        showToast(res.message, "info");
      }
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi đồng bộ: " + err.message, "danger");
    }
  };

  // Save manual transaction
  const onSaveTx = async (tx: any) => {
    try {
      const proj = projects.find(p => p.id === tx.projectId);
      const payload = {
        ...tx,
        projectName: proj ? proj.name : "Khác"
      };
      await apiCall("/api/transactions", "POST", payload);
      showToast("Đã ghi nhận giao dịch thành công!");
      loadAllData(true);
    } catch (err: any) {
      showToast("Lỗi lưu giao dịch: " + err.message, "danger");
    }
  };

  const onDeleteTx = async (id: string) => {
    if (confirm("Xóa dòng giao dịch thu chi này?")) {
      try {
        await apiCall(`/api/transactions/${id}`, "DELETE");
        showToast("Đã xóa giao dịch.");
        loadAllData(true);
      } catch (err: any) {
        showToast("Lỗi xóa: " + err.message, "danger");
      }
    }
  };

  // Scan invoice via Gemini OCR
  const handleInvoiceScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast("AI đang tiến hành phân tích hóa đơn chi phí...", "info");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      try {
        const res = await apiCall("/api/ai/receipt", "POST", {
          data: base64Data,
          type: file.type
        });
        if (res.success) {
          showToast(`Quét thành công! Đã tự động chi ${res.transaction.amount.toLocaleString("vi-VN")}đ cho ${res.transaction.projectName}`, "success");
          loadAllData();
        } else {
          showToast("Nhận diện hóa đơn lỗi: " + res.error, "danger");
        }
      } catch (err: any) {
        showToast("AI phân tích lỗi: " + err.message, "danger");
      }
    };
  };

  // Trigger EOD Telegram Report
  const handleSendEODReport = async () => {
    showToast("Đang gửi báo cáo công việc cuối ngày lên Telegram...", "info");
    try {
      const res = await apiCall("/api/telegram/eod-report", "POST");
      if (res.success) {
        showToast("Gửi báo cáo công việc cuối ngày thành công!", "success");
      } else {
        showToast("Lỗi gửi báo cáo: " + res.error, "danger");
      }
    } catch (err: any) {
      showToast("Không thể kết nối Telegram: " + err.message, "danger");
    }
  };

  // Webhook integration
  const handleTriggerWebhookSetup = async () => {
    showToast("Đang kích hoạt liên kết Webhook 2 chiều...", "info");
    try {
      const res = await apiCall("/api/settings/telegram-webhook", "POST");
      if (res.success) {
        showToast("Đã kích hoạt Webhook hai chiều thành công!", "success");
      } else {
        showToast("Lỗi kích hoạt: " + res.error, "danger");
      }
    } catch (err: any) {
      showToast("Lỗi liên kết: " + err.message, "danger");
    }
  };

  // Voice search speech recognition
  const handleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.", "danger");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "vi-VN";
    rec.interimResults = false;

    setIsListeningVoice(true);
    rec.start();

    rec.onresult = async (e: any) => {
      const text = e.results[0][0].transcript;
      setVoiceCommandText(text);
      showToast("AI đang xử lý khẩu lệnh thoại: " + text, "info");

      try {
        const res = await apiCall("/api/voice-command", "POST", { text });
        if (res.success) {
          showToast(res.message, "success");
          speakText(res.message);
          loadAllData(true);
        } else {
          showToast("Lỗi khẩu lệnh: " + res.error, "danger");
          speakText("Lỗi: " + res.error);
        }
      } catch (err: any) {
        showToast("Lỗi kết nối AI: " + err.message, "danger");
      }
    };

    rec.onerror = (e: any) => {
      showToast("Không nhận dạng được âm thanh hoặc micro bị tắt: " + e.error, "danger");
      setIsListeningVoice(false);
    };

    rec.onend = () => {
      setIsListeningVoice(false);
    };
  };

  const [showTxModalInApp, setShowTxModalInApp] = useState(false);
  const [newTxInApp, setNewTxInApp] = useState({
    projectId: "p-1",
    type: "Thu" as "Thu" | "Chi",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0]
  });

  const handleSaveTxInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxInApp.amount || !newTxInApp.note) {
      showToast("Vui lòng nhập đầy đủ các trường.", "warning");
      return;
    }
    await onSaveTx({
      projectId: newTxInApp.projectId,
      type: newTxInApp.type,
      amount: Number(newTxInApp.amount),
      note: newTxInApp.note,
      date: newTxInApp.date
    });
    setShowTxModalInApp(false);
    setNewTxInApp({
      projectId: "p-1",
      type: "Thu",
      amount: "",
      note: "",
      date: new Date().toISOString().split("T")[0]
    });
  };

  const handleGoogleLinkAndCreate = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser({
          displayName: res.user.displayName || "Huỳnh Bá Long",
          email: res.user.email || "ketoinha76@gmail.com"
        });
        showToast("Đăng nhập thành công! Đang tự động khởi tạo file Google Sheets mới...", "info");
        
        // Create a brand new Google Sheets file by calling /api/sync/google-sheets with action=export and no spreadsheetId
        const createRes = await apiCall("/api/sync/google-sheets", "POST", {
          action: "export",
          token: res.accessToken
        });
        
        if (createRes && createRes.spreadsheetId) {
          // Save the spreadsheet ID & URL to settings
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
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi liên kết Google Sheets: " + err.message, "danger");
    }
  };

  const netProfitVal = transactions.filter(t => t.type === "Thu").reduce((a, b) => a + Number(b.amount), 0) -
                       transactions.filter(t => t.type === "Chi").reduce((a, b) => a + Number(b.amount), 0);

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
              {voiceCommandText && (
                <span className="text-xs text-[var(--primary)] font-semibold italic">Lệnh thoại gần nhất: "{voiceCommandText}"</span>
              )}
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
                  transactions={transactions}
                  tasks={tasks}
                  savingsGoalName={settings.savingsGoalName}
                  savingsGoalAmount={Number(settings.savingsGoalAmount) || 45000000}
                  netProfit={netProfitVal}
                  speakText={speakText}
                  setShowTxModal={setShowTxModalInApp}
                  handleSendEODReport={handleSendEODReport}
                  handleInvoiceScan={handleInvoiceScan}
                />
              )}

              {activeTab === "products" && (
                <ProductCatalog
                  products={products}
                  onSave={onSaveProduct}
                  onDelete={onDeleteProduct}
                  showToast={showToast}
                />
              )}

              {activeTab === "tasks" && (
                <TaskBoard
                  tasks={tasks}
                  projects={projects}
                  onSave={onSaveTask}
                  onDelete={onDeleteTask}
                  onUpdateStatus={onUpdateTaskStatus}
                  showToast={showToast}
                  apiCall={apiCall}
                  refreshData={loadAllData}
                />
              )}

              {activeTab === "finance" && (
                <FinanceLedger
                  transactions={transactions}
                  projects={projects}
                  onSaveTx={onSaveTx}
                  onDeleteTx={onDeleteTx}
                  handleInvoiceScan={handleInvoiceScan}
                  showToast={showToast}
                  tuitionRecords={tuitionRecords}
                  onSaveTuition={onSaveTuition}
                  onDeleteTuition={onDeleteTuition}
                  onSyncTuitionsToFinance={onSyncTuitionsToFinance}
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
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm max-w-xl">
                    <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="text-emerald-500">✅</span> Đã Tự Động Kết Nối Google Sheets
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                      Hệ thống đang chạy ngầm và tự động đồng bộ 100% dữ liệu của bạn lên Google Sheets thông qua Service Account. Bảng tính của bạn đã được bảo vệ an toàn.
                    </p>
                    
                    {settings.lastSyncStatus && (
                      <div className={`p-3 rounded-lg border text-xs ${settings.lastSyncStatus === 'Error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                        <strong>Trạng thái đồng bộ cuối:</strong> {settings.lastSyncStatus} <br/>
                        <span className="text-[10px] opacity-70">Lúc: {new Date(settings.lastSyncTime || "").toLocaleString()}</span>
                        {settings.lastSyncError && (
                          <div className="mt-1 font-mono text-[10px] bg-black/30 p-2 rounded break-words">
                            Lỗi: {settings.lastSyncError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Global Quick transaction modal */}
      {showTxModalInApp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-5">Ghi nhận nhanh Thu nhập / Chi phí</h3>
            <form onSubmit={handleSaveTxInApp} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Loại giao dịch</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={newTxInApp.type}
                    onChange={(e) => setNewTxInApp({ ...newTxInApp, type: e.target.value as any })}
                  >
                    <option value="Thu" className="bg-slate-800 text-white">Thu nhập (+)</option>
                    <option value="Chi" className="bg-slate-800 text-white">Chi phí (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Liên kết Công việc</label>
                  <select
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={newTxInApp.projectId}
                    onChange={(e) => setNewTxInApp({ ...newTxInApp, projectId: e.target.value })}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Số tiền (đ) *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={newTxInApp.amount}
                    onChange={(e) => setNewTxInApp({ ...newTxInApp, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ngày giao dịch</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    value={newTxInApp.date}
                    onChange={(e) => setNewTxInApp({ ...newTxInApp, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ghi chú giao dịch *</label>
                <input
                  type="text"
                  required
                  placeholder="Giao sữa thu tiền / đổ xăng..."
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-[13.5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  value={newTxInApp.note}
                  onChange={(e) => setNewTxInApp({ ...newTxInApp, note: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowTxModalInApp(false)}
                  className="px-4 py-2 bg-[var(--overlay-03)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[var(--primary-hover)] shadow-sm"
                >
                  Ghi vào sổ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
