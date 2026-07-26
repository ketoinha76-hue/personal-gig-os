import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import { evenDayCustomers, oddDayCustomers } from "./seed_data";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(process.cwd(), "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads as static
app.use("/uploads", express.static(UPLOADS_DIR));

// Default Seed Database from original Apps Script
const DEFAULT_DATABASE = {
  "users": [
    {
      "id": "u-1",
      "name": "Huỳnh Bá Long",
      "email": "ketoinha76@gmail.com",
      "role": "Chủ sở hữu",
      "avatar": "https://scontent.fsgn5-10.fna.fbcdn.net/v/t39.30808-1/732046181_1723277098714202_2903552125172383637_n.jpg?stp=c0.215.1364.1364a_dst-jpg_tt6&cstp=mx1364x1364&ctp=s160x160&_nc_cat=103&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeHLV32Bs8CZgYo4ZRp4Be_IlQy4z9hJH2-VDLjP2Ekfb7rvURi5EPzP_Uvsxto8hzNFZzE8hKRhoo0JidXn2AIJ&_nc_ohc=-Vo0Ei0j4iMQ7kNvwGL0Q-y&_nc_oc=AdoxMKB4CgWPKlbd9rOvwpGKnOPMjJFOIynRb87Aa72LL_D6rJk4CxP4FrwfddsmNag&_nc_zt=24&_nc_ht=scontent.fsgn5-10.fna&_nc_gid=n5mvWwxSpxRghIM6-0I5yw&_nc_ss=7b2a8&oh=00_AQDZPebYzuMeFjyaIOu9PJ3EiVs02sHeotNcMpdsQ5dTyA&oe=6A5BB69D",
      "department": "Quản lý"
    }
  ],
  "tasks": [],
  "projects": [],
  "products": [],
  "crmContacts": [],
  "schedules": [],
  "transactions": [],
  "settings": {
    "tuitionSheetUrl": "https://docs.google.com/spreadsheets/d/16YsyE3TB_LURl4pr09qPprzfuCH78lSZ5YmoULkcF-A/edit",
    "companyName": "Long Hub OS Pro",
    "telegramBotToken": "8830411780:AAFaHaADFjdIm-TbPkmXko4vwNtKlTgTWhk",
    "telegramChatId": "8915483610",
    "telegramNotificationsEnabled": true,
    "emailNotificationsEnabled": false,
    "theme": "dark",
    "language": "vi",
    "timezone": "Asia/Ho_Chi_Minh",
    "geminiApiKey": "",
    "googleCalendarId": "primary",
    "savingsGoalName": "Mua máy ảnh Sony A7IV",
    "savingsGoalAmount": "45000000",
    "depotCoords": "10.8087727,106.9241267",
    "googleSpreadsheetId": "1i7Ko3USW_UjsIeURYj9iNGcU91GYpyO9QooEdhNk8WY",
    "activeRoute": []
  },
  "tuitionRecords": [],
  "routeLogs": []
};

// Database utility functions
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATABASE, null, 2), "utf8");
    return DEFAULT_DATABASE;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(data);
    let dirty = false;
    if (!db.tuitionRecords) {
      db.tuitionRecords = DEFAULT_DATABASE.tuitionRecords;
      dirty = true;
    }
    if (!db.routeLogs) {
      db.routeLogs = DEFAULT_DATABASE.routeLogs;
      dirty = true;
    }
    if (db.settings && !db.settings.tuitionSheetUrl) {
      db.settings.tuitionSheetUrl = DEFAULT_DATABASE.settings.tuitionSheetUrl;
      dirty = true;
    }
    if (db.settings && !db.settings.telegramBotToken && DEFAULT_DATABASE.settings.telegramBotToken) {
      db.settings.telegramBotToken = DEFAULT_DATABASE.settings.telegramBotToken;
      db.settings.telegramChatId = DEFAULT_DATABASE.settings.telegramChatId;
      db.settings.telegramNotificationsEnabled = true;
      dirty = true;
    }
    if (db.settings && !db.settings.googleSpreadsheetId) {
      db.settings.googleSpreadsheetId = DEFAULT_DATABASE.settings.googleSpreadsheetId;
      dirty = true;
    }
    if (db.settings && (db.settings.companyName === "Không gian làm việc của Hoàng" || !db.settings.companyName)) {
      db.settings.companyName = "Huỳnh Bá Long (Chủ sở hữu)";
      dirty = true;
    }
    if (dirty) {
      saveDB(db);
    }
    return db;
  } catch (err) {
    return DEFAULT_DATABASE;
  }
}

let syncTimeout: NodeJS.Timeout | null = null;

async function autoSyncToGoogleSheets() {
  try {
    const db = getDB();
    const bridgeUrl = db.settings?.gasBridgeUrl || "https://script.google.com/macros/s/AKfycbyhXyY5a5uSSMsIBVamFQlJksf-jBHGz-LefbmVVukAiXaqbVJTigEqdexwE5laWRmW/exec";
    
    console.log("Auto-syncing to Google Sheets via GAS Bridge...");
    
    const res = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      // GAS needs plain text or json payload, e.postData.contents will have it
      body: JSON.stringify({
        action: "sync",
        db: db
      })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Bridge sync failed: ${errText}`);
    }
    
    // Attempt to parse response (some GAS errors return HTML, but we expect JSON on success)
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      throw new Error(`Invalid JSON response from bridge: ${text.substring(0, 50)}...`);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }

    console.log("Auto-sync complete.");
    db.settings.lastSyncStatus = "Success";
    db.settings.lastSyncTime = new Date().toISOString();
    db.settings.lastSyncError = "";
    
    // Save status silently without triggering another sync loop
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err: any) {
    console.error("Auto-sync failed:", err.message);
    const db = getDB();
    db.settings.lastSyncStatus = "Error";
    db.settings.lastSyncTime = new Date().toISOString();
    db.settings.lastSyncError = err.message || "Unknown error";
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
}

function triggerAutoSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  // Debounce for 10 seconds to avoid API spam
  syncTimeout = setTimeout(() => {
    autoSyncToGoogleSheets();
  }, 10000);
}

function saveDB(db: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  triggerAutoSync();
}

// Lazy Initialize Gemini
function getGeminiClient(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY || getDB().settings?.geminiApiKey;
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. Please add it in Cấu hình hệ thống.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });
}

// --- API ROUTES ---

// Auth APIs (Mocked/Static based on Apps Script logic)
app.get("/api/auth/me", (req, res) => {
  res.json({ user: getDB().users[0] });
});

app.post("/api/auth/login", (req, res) => {
  res.json({ success: true, user: getDB().users[0] });
});

app.post("/api/auth/register", (req, res) => {
  res.json({ success: true, user: getDB().users[0] });
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/switch-user", (req, res) => {
  res.json({ success: true, user: getDB().users[0] });
});

// Users
app.get("/api/users", (req, res) => {
  res.json(getDB().users);
});

// Settings
app.get("/api/settings", (req, res) => {
  res.json(getDB().settings);
});

app.put("/api/settings", (req, res) => {
  const db = getDB();
  db.settings = { ...db.settings, ...req.body };
  saveDB(db);
  res.json(db.settings);
});

// Google Sheets Sync Functions & API Endpoints
async function exportToGoogleSheets(token: string, spreadsheetId?: string) {
  const db = getDB();
  const sheetsToCreate = ["Công việc", "Khách hàng"];
  let targetSpreadsheetId = spreadsheetId;
  
  if (!targetSpreadsheetId) {
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          title: "Personal GIG-OS - Huỳnh Bá Long"
        },
        sheets: sheetsToCreate.map(name => ({ properties: { title: name } }))
      })
    });
    
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create spreadsheet: ${errText}`);
    }
    
    const createData = await createRes.json() as any;
    targetSpreadsheetId = createData.spreadsheetId;
  }
  
  // 1. Prepare values for each tab
  const scheduleRows = [
    ["ID", "Tiêu đề", "Mô tả", "Ngày trong tuần", "Giờ bắt đầu", "Giờ kết thúc", "Màu sắc", "Hoàn thành", "Địa chỉ"]
  ];
  db.schedules.forEach((s: any) => {
    scheduleRows.push([
      s.id || "", s.title || "", s.description || "", String(s.dayOfWeek || 1),
      s.startTime || "", s.endTime || "", s.color || "", String(s.completed || false), s.address || ""
    ]);
  });
  
  const crmRows = [
    ["ID", "Tên khách hàng", "Khai thác", "Nhóm", "Giá trị", "Địa chỉ", "Link bản đồ"]
  ];
  db.crmContacts.forEach((c: any) => {
    crmRows.push([
      c.id || "", c.name || "", c.phone || "", c.company || "", 
      String(c.value || 0), c.address || "", c.locationUrl || ""
    ]);
  });
  
  const dataPayload = [
    { range: "Công việc!A1", values: scheduleRows },
    { range: "Khách hàng!A1", values: crmRows }
  ];
  
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: dataPayload
    })
  });
  
  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to update sheet rows: ${errText}`);
  }
  
  db.settings.googleSpreadsheetId = targetSpreadsheetId;
  db.settings.googleSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  
  return {
    spreadsheetId: targetSpreadsheetId,
    spreadsheetUrl: db.settings.googleSpreadsheetUrl
  };
}

async function importFromGoogleSheets(token: string, spreadsheetId: string) {
  const db = getDB();
  // Support Vietnamese tab names
  const expectedRanges = [
    "Công việc", "Schedules",
    "Khách hàng", "CRM"
  ];
  
  // Fetch metadata to find which sheets actually exist
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const metaRes = await fetch(metaUrl, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${errText}`);
  }
  const metaData = await metaRes.json() as any;
  const actualSheets = (metaData.sheets || []).map((s: any) => s.properties.title);
  
  const validRanges: string[] = [];
  expectedRanges.forEach(expected => {
    const expLower = expected.trim().toLowerCase();
    const found = actualSheets.find((act: string) => {
      const aL = act.trim().toLowerCase();
      return aL === expLower || 
             (expLower === "khách hàng" && (aL === "khach hang" || aL === "khách hàng " || aL === "khách hang"));
    });
    if (found) validRanges.push(found);
  });

  if (validRanges.length === 0) {
    throw new Error(`Không tìm thấy tab "Khách hàng" hoặc "Schedules". Các tab hiện có trong file là: [${actualSheets.join(", ")}]. Vui lòng nhấp đúp vào tên tab ở dưới cùng Google Sheet và đổi tên thành "Khách hàng" hoặc "Công việc"!`);
  }
  
  const queryStr = validRanges.map(r => `ranges=${encodeURIComponent(r)}!A1:Z1000`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?valueRenderOption=FORMATTED_VALUE&${queryStr}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch spreadsheet data: ${errText}`);
  }
  
  const data = await res.json() as any;
  const valueRanges = data.valueRanges || [];
  
  valueRanges.forEach((vr: any) => {
    // Google Sheets adds single quotes around sheet names with spaces
    const rangeName = (vr.range || "").toLowerCase().replace(/'/g, "");
    const values = vr.values || [];
    if (values.length <= 1) return;
    
    const rows = values.slice(1);
    
    if (rangeName.startsWith("schedules") || rangeName.startsWith("công việc")) {
      db.schedules = rows.map((row: any, i: number) => ({
        id: row[0] || `sch-imported-${Date.now()}-${i}`,
        title: row[1] || "",
        description: row[2] || "",
        dayOfWeek: Number(row[3]) || 1,
        startTime: row[4] || "",
        endTime: row[5] || "",
        color: row[6] || "",
        completed: row[7] === "true",
        address: row[8] || ""
      }));
    } else if (rangeName.startsWith("crm") || rangeName.startsWith("khách hàng")) {
      const imported = rows.map((row: any, i: number) => ({
        id: row[0] || `crm-imported-${Date.now()}-${i}`,
        name: row[1] || "",
        phone: row[2] || "",
        company: row[3] || "",
        value: Number(row[4]) || 0,
        address: row[5] || "",
        locationUrl: row[6] || ""
      })).filter((c: any) => c.name && c.name.trim() !== "");
      // Deduplicate by name (keep last occurrence)
      const seenNames = new Map<string, any>();
      imported.forEach((c: any) => {
        seenNames.set(c.name.trim().toLowerCase(), c);
      });
      db.crmContacts = Array.from(seenNames.values());
    }
  });
  
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  return { success: true };
}

app.post("/api/sync/auto-pull", async (req, res) => {
  const db = getDB();
  const spreadsheetId = db.settings?.googleSpreadsheetId;
  
  if (!spreadsheetId || !process.env.GOOGLE_CREDENTIALS) {
    return res.json({ success: true, skipped: true });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new Error("Failed to get access token");
    }

    await importFromGoogleSheets(token.token, spreadsheetId);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Auto-pull failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/google-sheets", async (req, res) => {
  const { action, token, spreadsheetId } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: "Missing Google OAuth access token." });
  }
  
  try {
    if (action === "export") {
      const result = await exportToGoogleSheets(token, spreadsheetId);
      res.json(result);
    } else if (action === "import") {
      if (!spreadsheetId) {
        return res.status(400).json({ error: "Missing spreadsheetId for import." });
      }
      const result = await importFromGoogleSheets(token, spreadsheetId);
      res.json(result);
    } else {
      res.status(400).json({ error: "Invalid action. Choose 'export' or 'import'." });
    }
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions for custom guitar sheet sync
function parseTimeTo24h(str: string): string {
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
  if (!match) return "08:00";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && h < 12) {
      h += 12;
    } else if (ampm.toUpperCase() === "AM" && h === 12) {
      h = 0;
    }
  }
  return `${String(h).padStart(2, "0")}:${m}`;
}

function parseDateToISOString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = dateStr.split(" ")[0].split("/");
  if (parts.length === 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

app.post("/api/sync/custom-guitar-sheet", async (req, res) => {
  const { token, spreadsheetId } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Missing Google OAuth access token." });
  }
  const sheetId = spreadsheetId || "16YsyE3TB_LURl4pr09qPprzfuCH78lSZ5YmoULkcF-A";

  try {
    const ranges = ["DanhSachLopHoc", "LichSuHocPhi"];
    const queryStr = ranges.map(r => `ranges=${r}!A1:Z1000`).join("&");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?valueRenderOption=FORMATTED_VALUE&${queryStr}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch spreadsheet data: ${errText}`);
    }
    
    const data = await response.json() as any;
    const valueRanges = data.valueRanges || [];
    
    const db = getDB();
    let tuitionImported = 0;
    let schedulesImported = 0;
    let incomeAdded = 0;

    // First filter out old imported schedules to prevent duplication
    db.schedules = (db.schedules || []).filter((s: any) => !s.id.startsWith("sch-class-"));

    valueRanges.forEach((vr: any) => {
      const rangeName = vr.range || "";
      const values = vr.values || [];
      if (values.length <= 1) return;
      
      const rows = values.slice(1); // skip headers
      
      if (rangeName.startsWith("DanhSachLopHoc")) {
        // columns: maLop (A), tenLop (B), lichHoc (C), maGV (D)
        rows.forEach((row: any) => {
          const maLop = row[0] || "";
          const tenLop = row[1] || "";
          const lichHoc = row[2] || "";
          const maGV = row[3] || "";

          if (!lichHoc || lichHoc.trim() === "") return;

          // Split by "&" or "and"
          const parts = lichHoc.split(/&|and/i).map((p: string) => p.trim());
          parts.forEach((part: string, index: number) => {
            // Find day of week
            let dayOfWeek = 0;
            if (/Thứ\s*2|Thứ\s*hai|T2/i.test(part)) dayOfWeek = 1;
            else if (/Thứ\s*3|Thứ\s*ba|T3/i.test(part)) dayOfWeek = 2;
            else if (/Thứ\s*4|Thứ\s*tư|T4/i.test(part)) dayOfWeek = 3;
            else if (/Thứ\s*5|Thứ\s*năm|T5/i.test(part)) dayOfWeek = 4;
            else if (/Thứ\s*6|Thứ\s*sáu|T6/i.test(part)) dayOfWeek = 5;
            else if (/Thứ\s*7|Thứ\s*bảy|T7/i.test(part)) dayOfWeek = 6;
            else if (/Chủ\s*Nhật|Chủ\s*nhật|CN/i.test(part)) dayOfWeek = 7;

            // If no day is matched but it contains "Tự do"
            if (dayOfWeek === 0) {
              if (/Tự\s*do|Linh\s*động/i.test(part)) {
                dayOfWeek = 1; // default to Monday for flexible
              } else {
                return; // skip if cannot parse
              }
            }

            // Extract time
            let startTime = "08:00";
            let endTime = "09:00";

            // match inside brackets or parentheses
            const bracketMatch = part.match(/\(([^)]+)\)/);
            if (bracketMatch) {
              const timeStr = bracketMatch[1].trim();
              const times = timeStr.split("-").map((t: string) => t.trim());
              if (times.length === 2) {
                startTime = parseTimeTo24h(times[0]);
                endTime = parseTimeTo24h(times[1]);
              }
            }

            const isFlexible = /Tự\s*do|Linh\s*động/i.test(part);

            const schId = `sch-class-${maLop}-${index + 1}`;
            db.schedules.push({
              id: schId,
              title: `🎸 Lớp Dạy Đàn: ${tenLop}`,
              description: `Mã lớp: ${maLop}. Giáo viên: ${maGV}.${isFlexible ? " (Thời gian tự do linh động)" : ""}`,
              dayOfWeek,
              startTime,
              endTime,
              color: "blue", // Blue stands for Guitar classes
              completed: false,
              address: "Tại nhà / Studio"
            });
            schedulesImported++;
          });
        });
      } else if (rangeName.startsWith("LichSuHocPhi")) {
        // columns: Mã HD (A), Mã HV (B), Tên HV (C), Số Tiền (D), Ngày Thu (E), Người Thu (F), Ghi Chú (G), Link File (H)
        rows.forEach((row: any) => {
          const maHD = row[0] || "";
          const maHV = row[1] || "";
          const tenHV = row[2] || "";
          const soTienRaw = row[3] || "0";
          const ngayThu = row[4] || "";
          const nguoiThu = row[5] || "";
          const ghiChu = row[6] || "";

          if (!maHD) return;

          const amount = Number(String(soTienRaw).replace(/[^0-9]/g, ""));
          if (isNaN(amount) || amount <= 0) return;

          const date = parseDateToISOString(ngayThu);

          // Check if this transaction already exists to avoid duplicates
          const txId = `tx-hp-${maHD}`;
          const exists = db.transactions.some((t: any) => t.id === txId);
          if (!exists) {
            db.transactions.push({
              id: txId,
              projectId: "p-3", // Dạy học đàn Guitar
              projectName: "Dạy học đàn Guitar",
              type: "Thu",
              amount,
              note: `[Thu học phí] HV: ${tenHV} (Mã: ${maHV}) - Người thu: ${nguoiThu}. ${ghiChu}`,
              date
            });
            incomeAdded += amount;
            tuitionImported++;
          }
        });
      }
    });

    saveDB(db);
    res.json({
      success: true,
      message: `Đồng bộ thành công! Đã cập nhật ${schedulesImported} lịch dạy đàn. Thêm mới ${tuitionImported} giao dịch thu học phí với tổng số tiền +${incomeAdded.toLocaleString("vi-VN")}đ vào sổ sách thu chi.`,
      schedulesCount: schedulesImported,
      tuitionCount: tuitionImported,
      incomeAdded
    });

  } catch (err: any) {
    console.error("Custom sheet sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/auth/callback", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Đang đồng bộ Google...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #121214;
          color: #e1e1e6;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .container {
          padding: 24px;
          border-radius: 16px;
          background-color: #1e1e24;
          border: 1px solid #2e2e38;
          max-width: 400px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        h3 { color: #10b981; margin-top: 0; font-size: 18px; }
        .spinner {
          border: 3px solid #2e2e38;
          border-top: 3px solid #10b981;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        p { font-size: 13px; color: #a1a1aa; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>Kết Nối Google Thành Công</h3>
        <div class="spinner"></div>
        <p>Đang chuyển khóa xác thực và đồng bộ dữ liệu. Cửa sổ này sẽ tự động đóng trong giây lát...</p>
      </div>
      <script>
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
        
        if (accessToken) {
          if (window.opener) {
            window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", accessToken }, "*");
            setTimeout(() => {
              window.close();
            }, 1000);
          } else {
            document.body.innerHTML = '<div class="container" style="border-color: #f43f5e;"><h3 style="color: #f43f5e;">Lỗi liên kết</h3><p>Không tìm thấy ứng dụng chính. Vui lòng đóng cửa sổ này và thử lại từ ứng dụng.</p></div>';
          }
        } else {
          document.body.innerHTML = '<div class="container" style="border-color: #eab308;"><h3 style="color: #eab308;">Thiếu quyền truy cập</h3><p>Đăng nhập Google không trả về khóa truy cập (Access Token). Vui lòng thử lại.</p></div>';
        }
      </script>
    </body>
    </html>
  `);
});

// Tasks
app.get("/api/tasks", (req, res) => {
  res.json(getDB().tasks);
});

app.post("/api/tasks", (req, res) => {
  const db = getDB();
  const newTask = {
    ...req.body,
    id: `t-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  db.tasks.push(newTask);
  saveDB(db);
  res.json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const db = getDB();
  const idx = db.tasks.findIndex((t: any) => String(t.id) === String(req.params.id));
  if (idx !== -1) {
    db.tasks[idx] = { ...db.tasks[idx], ...req.body };
    saveDB(db);
    res.json(db.tasks[idx]);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  const db = getDB();
  db.tasks = db.tasks.filter((t: any) => String(t.id) !== String(req.params.id));
  saveDB(db);
  res.json({ success: true });
});

// Projects
app.get("/api/projects", (req, res) => {
  res.json(getDB().projects);
});

app.post("/api/projects", (req, res) => {
  const db = getDB();
  const newProject = {
    ...req.body,
    id: `p-${Date.now()}`
  };
  db.projects.push(newProject);
  saveDB(db);
  res.json(newProject);
});

app.put("/api/projects/:id", (req, res) => {
  const db = getDB();
  const idx = db.projects.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (idx !== -1) {
    db.projects[idx] = { ...db.projects[idx], ...req.body };
    saveDB(db);
    res.json(db.projects[idx]);
  } else {
    res.status(404).json({ error: "Project not found" });
  }
});

app.delete("/api/projects/:id", (req, res) => {
  const db = getDB();
  db.projects = db.projects.filter((p: any) => String(p.id) !== String(req.params.id));
  saveDB(db);
  res.json({ success: true });
});

// Products
app.get("/api/products", (req, res) => {
  res.json(getDB().products);
});

app.post("/api/products", (req, res) => {
  const db = getDB();
  const newProduct = {
    ...req.body,
    id: `prod-${Date.now()}`
  };
  db.products.push(newProduct);
  saveDB(db);
  res.json(newProduct);
});

app.put("/api/products/:id", (req, res) => {
  const db = getDB();
  const idx = db.products.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (idx !== -1) {
    db.products[idx] = { ...db.products[idx], ...req.body };
    saveDB(db);
    res.json(db.products[idx]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  const db = getDB();
  db.products = db.products.filter((p: any) => String(p.id) !== String(req.params.id));
  saveDB(db);
  res.json({ success: true });
});

// CRM Contacts
app.get("/api/crm", (req, res) => {
  res.json(getDB().crmContacts);
});

app.post("/api/crm", (req, res) => {
  const db = getDB();
  const newContact = {
    ...req.body,
    id: `crm-${Date.now()}`
  };
  db.crmContacts.push(newContact);
  saveDB(db);
  res.json(newContact);
});

app.put("/api/crm/:id", (req, res) => {
  const db = getDB();
  const idx = db.crmContacts.findIndex((c: any) => String(c.id) === String(req.params.id));
  if (idx !== -1) {
    db.crmContacts[idx] = { ...db.crmContacts[idx], ...req.body };
    saveDB(db);
    res.json(db.crmContacts[idx]);
  } else {
    res.status(404).json({ error: "Contact not found" });
  }
});

app.delete("/api/crm/:id", (req, res) => {
  const db = getDB();
  const targetId = String(req.params.id);
  // Find the contact to get its name (for name-based dedup cleanup)
  const toDelete = db.crmContacts.find((c: any) => String(c.id) === targetId);
  if (toDelete) {
    // Remove all contacts with the same name (handles sync duplicates)
    const targetName = (toDelete.name || "").trim().toLowerCase();
    db.crmContacts = db.crmContacts.filter(
      (c: any) => (c.name || "").trim().toLowerCase() !== targetName
    );
  } else {
    // Fallback: remove by ID
    db.crmContacts = db.crmContacts.filter((c: any) => String(c.id) !== targetId);
  }
  saveDB(db);
  res.json({ success: true });
});

// Schedules
app.get("/api/schedules", (req, res) => {
  res.json(getDB().schedules);
});

app.post("/api/schedules", (req, res) => {
  const db = getDB();
  const newSch = {
    ...req.body,
    id: `sch-${Date.now()}`,
    completed: req.body.completed === true || req.body.completed === "true"
  };
  db.schedules.push(newSch);
  saveDB(db);
  res.json(newSch);
});

app.put("/api/schedules/:id", (req, res) => {
  const db = getDB();
  const idx = db.schedules.findIndex((s: any) => String(s.id) === String(req.params.id));
  if (idx !== -1) {
    db.schedules[idx] = {
      ...db.schedules[idx],
      ...req.body,
      completed: req.body.completed === true || req.body.completed === "true"
    };
    saveDB(db);
    res.json(db.schedules[idx]);
  } else {
    res.status(404).json({ error: "Schedule not found" });
  }
});

app.delete("/api/schedules/:id", (req, res) => {
  const db = getDB();
  db.schedules = db.schedules.filter((s: any) => String(s.id) !== String(req.params.id));
  saveDB(db);
  res.json({ success: true });
});

// Transactions
app.get("/api/transactions", (req, res) => {
  res.json(getDB().transactions);
});

app.post("/api/transactions", (req, res) => {
  const db = getDB();
  const newTx = {
    ...req.body,
    id: `tx-${Date.now()}`
  };
  db.transactions.push(newTx);
  saveDB(db);
  res.json(newTx);
});

app.delete("/api/transactions/:id", (req, res) => {
  const db = getDB();
  db.transactions = db.transactions.filter((t: any) => String(t.id) !== String(req.params.id));
  saveDB(db);
  res.json({ success: true });
});

// --- TUITION LOGS (From legacy Code.gs syncTuitionToGiaoDich) ---
app.get("/api/tuitions", (req, res) => {
  res.json(getDB().tuitionRecords || []);
});

app.post("/api/tuitions", (req, res) => {
  const db = getDB();
  const newRecord = {
    ...req.body,
    id: `tui-${Date.now()}`,
    tuitionFee: Number(req.body.tuitionFee) || 0,
    totalLessons: Number(req.body.totalLessons) || 10,
    completedLessons: Number(req.body.completedLessons) || 0,
    syncedToFinance: req.body.syncedToFinance === true || req.body.syncedToFinance === "true",
    updatedAt: new Date().toISOString()
  };
  if (!db.tuitionRecords) db.tuitionRecords = [];
  db.tuitionRecords.push(newRecord);
  saveDB(db);
  res.json(newRecord);
});

app.put("/api/tuitions/:id", (req, res) => {
  const db = getDB();
  const idx = db.tuitionRecords.findIndex((t: any) => String(t.id) === String(req.params.id));
  if (idx !== -1) {
    db.tuitionRecords[idx] = {
      ...db.tuitionRecords[idx],
      ...req.body,
      tuitionFee: Number(req.body.tuitionFee) !== undefined ? Number(req.body.tuitionFee) : db.tuitionRecords[idx].tuitionFee,
      totalLessons: Number(req.body.totalLessons) !== undefined ? Number(req.body.totalLessons) : db.tuitionRecords[idx].totalLessons,
      completedLessons: Number(req.body.completedLessons) !== undefined ? Number(req.body.completedLessons) : db.tuitionRecords[idx].completedLessons,
      syncedToFinance: req.body.syncedToFinance !== undefined ? (req.body.syncedToFinance === true || req.body.syncedToFinance === "true") : db.tuitionRecords[idx].syncedToFinance,
      updatedAt: new Date().toISOString()
    };
    saveDB(db);
    res.json(db.tuitionRecords[idx]);
  } else {
    res.status(404).json({ error: "Tuition record not found" });
  }
});

app.delete("/api/tuitions/:id", (req, res) => {
  const db = getDB();
  db.tuitionRecords = db.tuitionRecords.filter((t: any) => String(t.id) !== String(req.params.id));
  saveDB(db);
  res.json({ success: true });
});

// Route Logs
app.get("/api/route-logs", (req, res) => {
  res.json(getDB().routeLogs || []);
});

app.post("/api/route-logs", (req, res) => {
  const db = getDB();
  const newLog = {
    id: `rl-${Date.now()}`,
    date: req.body.date || new Date().toISOString().split("T")[0],
    startTime: req.body.startTime || "",
    endTime: req.body.endTime || "",
    totalDistanceKm: Number(req.body.totalDistanceKm) || 0,
    customers: req.body.customers || [],
    details: req.body.details || []
  };
  if (!db.routeLogs) db.routeLogs = [];
  db.routeLogs.push(newLog);
  saveDB(db);
  res.json(newLog);
});

app.delete("/api/route-logs/:id", (req, res) => {
  const db = getDB();
  if (db.routeLogs) {
    db.routeLogs = db.routeLogs.filter((l: any) => String(l.id) !== String(req.params.id));
    saveDB(db);
  }
  res.json({ success: true });
});

// Port of syncTuitionToGiaoDich()
app.post("/api/tuitions/sync", (req, res) => {
  const db = getDB();
  const todayStr = new Date().toISOString().split("T")[0];
  let syncCount = 0;
  let totalAmount = 0;

  if (db.tuitionRecords) {
    db.tuitionRecords.forEach((record: any) => {
      if (record.paymentStatus === "Đã đóng" && !record.syncedToFinance) {
        // Create corresponding Thu transaction under Guitar project (p-3)
        const p = db.projects.find((pr: any) => pr.id === "p-3");
        const newTx = {
          id: `tx-sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          projectId: "p-3",
          projectName: p ? p.name : "Dạy học đàn Guitar",
          type: "Thu" as const,
          amount: Number(record.tuitionFee) || 0,
          note: `Đồng bộ học phí: ${record.studentName} - ${record.courseName}`,
          date: todayStr
        };
        db.transactions.push(newTx);
        record.syncedToFinance = true;
        syncCount++;
        totalAmount += newTx.amount;
      }
    });
  }

  if (syncCount > 0) {
    saveDB(db);
    res.json({ success: true, message: `Đã đồng bộ thành công ${syncCount} học viên đóng học phí, tổng số tiền +${totalAmount.toLocaleString("vi-VN")} đ vào sổ sách.`, count: syncCount });
  } else {
    res.json({ success: true, message: "Không có học viên mới đóng học phí nào cần đồng bộ.", count: 0 });
  }
});

// Port of autoCompletePassedSchedules()
app.post("/api/schedules/auto-complete", (req, res) => {
  const db = getDB();
  const today = new Date();
  let currentDayOfWeek = today.getDay();
  if (currentDayOfWeek === 0) currentDayOfWeek = 7; // Sunday is 7 in our dayOfWeek mapping

  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  let updatedCount = 0;

  if (db.schedules) {
    db.schedules.forEach((s: any) => {
      if (s.completed) return;

      let shouldComplete = false;
      if (s.dayOfWeek < currentDayOfWeek) {
        shouldComplete = true;
      } else if (s.dayOfWeek === currentDayOfWeek) {
        if (s.endTime) {
          const [endH, endM] = s.endTime.split(":").map(Number);
          if (endH < currentHour || (endH === currentHour && endM <= currentMinute)) {
            shouldComplete = true;
          }
        }
      }

      if (shouldComplete) {
        s.completed = true;
        updatedCount++;
      }
    });
  }

  if (updatedCount > 0) {
    saveDB(db);
    res.json({ success: true, message: `Đã tự động đánh dấu hoàn thành ${updatedCount} lịch hẹn/lộ trình quá hạn trong tuần.`, count: updatedCount });
  } else {
    res.json({ success: true, message: "Tất cả các lịch hẹn đều chưa quá hạn hoặc đã được hoàn tất.", count: 0 });
  }
});

// Port of saveGrabSession()
app.post("/api/grab/save-session", (req, res) => {
  const { odoStart, odoEnd, fuelCost, revenue, date } = req.body;
  
  const startNum = Number(odoStart);
  const endNum = Number(odoEnd);
  const fuelNum = Number(fuelCost) || 0;
  const revNum = Number(revenue) || 0;
  const txDate = date || new Date().toISOString().split("T")[0];

  const distance = endNum - startNum;
  if (distance <= 0) {
    return res.status(400).json({ error: "Số công-tơ-mét kết thúc phải lớn hơn số lúc xuất phát." });
  }

  const db = getDB();
  const p = db.projects.find((pr: any) => pr.id === "p-4"); // Grab project
  const projName = p ? p.name : "Chạy xe công nghệ Grab";

  const transactionsAdded = [];

  // Add revenue (Thu) if greater than 0
  if (revNum > 0) {
    const revTx = {
      id: `tx-grab-rev-${Date.now()}`,
      projectId: "p-4",
      projectName: projName,
      type: "Thu" as const,
      amount: revNum,
      note: `Doanh thu ca chạy Grab ngày ${txDate} (${distance}km)`,
      date: txDate
    };
    db.transactions.push(revTx);
    transactionsAdded.push(revTx);
  }

  // Add fuel cost (Chi) if greater than 0
  if (fuelNum > 0) {
    const fuelTx = {
      id: `tx-grab-fuel-${Date.now()}`,
      projectId: "p-4",
      projectName: projName,
      type: "Chi" as const,
      amount: fuelNum,
      note: `Chi phí xăng xe ca chạy Grab ngày ${txDate} (${distance}km)`,
      date: txDate
    };
    db.transactions.push(fuelTx);
    transactionsAdded.push(fuelTx);
  }

  if (transactionsAdded.length > 0) {
    saveDB(db);
    res.json({
      success: true,
      message: `Đã lưu thành công ca chạy xe Grab (${distance} km): Ghi nhận +${revNum.toLocaleString("vi-VN")} đ doanh thu và -${fuelNum.toLocaleString("vi-VN")} đ tiền xăng đổ xe vào sổ sách thu chi.`,
      distance
    });
  } else {
    res.status(400).json({ error: "Vui lòng nhập doanh thu hoặc chi phí xăng xe để lưu ca chạy." });
  }
});

// Real upload files
app.post("/api/upload", (req, res) => {
  try {
    const { name, type, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: "Missing file name or data" });
    }
    const filename = `${Date.now()}_${name}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(data, "base64");
    fs.writeFileSync(filePath, buffer);
    const url = `/uploads/${filename}`;
    res.json({ success: true, url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Assistant Endpoint
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { prompt } = req.body;
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    res.json({ response: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Receipt Scanning via Gemini OCR Multimodal
app.post("/api/ai/receipt", async (req, res) => {
  try {
    const { data, type } = req.body;
    if (!data || !type) {
      return res.status(400).json({ error: "Missing image base64 data or content type." });
    }
    const ai = getGeminiClient();
    const prompt = `Hãy quét ảnh hóa đơn này. Nhận diện các thông tin chi phí và trả về duy nhất một chuỗi JSON hợp lệ (không markdown code blocks) như sau:
{
  "amount": số tiền hóa đơn (số nguyên),
  "vendor": "tên cửa hàng/nhà cung cấp",
  "date": "ngày hóa đơn dạng YYYY-MM-DD",
  "note": "tóm tắt ngắn gọn những gì đã mua",
  "projectId": "p-1"|"p-2"|"p-3"|"p-4" // phân loại thông minh: p-1 (Bán sữa Yakult), p-2 (Chụp ảnh cưới Wedding), p-3 (Dạy học đàn Guitar), p-4 (Chạy xe công nghệ Grab)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            mimeType: type,
            data: data
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.INTEGER },
            vendor: { type: Type.STRING },
            date: { type: Type.STRING },
            note: { type: Type.STRING },
            projectId: { type: Type.STRING }
          },
          required: ["amount", "vendor", "date", "note", "projectId"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsedTx = JSON.parse(resultText.trim());

    const db = getDB();
    const p = db.projects.find((pr: any) => pr.id === parsedTx.projectId);
    const newTx = {
      id: `tx-${Date.now()}`,
      projectId: parsedTx.projectId,
      projectName: p ? p.name : "Khác",
      type: "Chi",
      amount: Number(parsedTx.amount) || 0,
      note: `${parsedTx.vendor} - ${parsedTx.note}`,
      date: parsedTx.date || new Date().toISOString().split("T")[0]
    };

    db.transactions.push(newTx);
    saveDB(db);

    res.json({ success: true, transaction: newTx });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice command handler
app.post("/api/voice-command", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing command text" });
    }
    const ai = getGeminiClient();
    const systemPrompt = `Bạn là trợ lý điều khiển giọng nói cho hệ điều hành cá nhân. Tin nhắn giọng nói nhận được: "${text}"
Trả về chuỗi JSON duy nhất đại diện cho hành động cần làm:
{
  "action": "add_transaction" | "add_task" | "complete_task" | "unrecognized",
  "data": {
     // Cho add_transaction: { "type": "Thu"|"Chi", "amount": số, "note": "ghi chú", "projectId": "p-1"|"p-2"|"p-3"|"p-4" }
     // Cho add_task: { "title": "tên việc", "description": "mô tả", "projectId": "p-1"|"p-2"|"p-3"|"p-4" }
     // Cho complete_task: { "query": "tên việc" }
  }
}
Lưu ý các dự án: p-1 (Bán sữa Yakult), p-2 (Chụp ảnh cưới Wedding), p-3 (Dạy học đàn Guitar), p-4 (Chạy xe công nghệ Grab). Hãy suy luận thông minh, ví dụ 'giao sữa' -> p-1, 'chụp ảnh/áo cưới/album' -> p-2, 'dạy học/guitar/hợp âm' -> p-3, 'chạy Grab/đổ xăng xe' -> p-4. Hãy trả về JSON thô sạch.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            data: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                note: { type: Type.STRING },
                projectId: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                query: { type: Type.STRING }
              }
            }
          },
          required: ["action", "data"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    const db = getDB();

    if (json.action === "add_transaction") {
      const p = db.projects.find((pr: any) => pr.id === json.data.projectId);
      const created = {
        id: `tx-${Date.now()}`,
        projectId: json.data.projectId,
        projectName: p ? p.name : "Khác",
        type: json.data.type || "Chi",
        amount: Number(json.data.amount) || 0,
        note: json.data.note || "Giao dịch tự động qua giọng nói",
        date: new Date().toISOString().split("T")[0]
      };
      db.transactions.push(created);
      saveDB(db);
      return res.json({
        success: true,
        message: `Đã thêm giao dịch: ${created.type === "Thu" ? "Thu nhập" : "Chi phí"} ${created.amount.toLocaleString("vi-VN")} đ cho ${created.projectName}`
      });
    } else if (json.action === "add_task") {
      const created = {
        id: `t-${Date.now()}`,
        title: json.data.title,
        description: json.data.description || "",
        projectId: json.data.projectId || "p-1",
        status: "Cần làm",
        priority: "Trung bình",
        createdAt: new Date().toISOString()
      };
      db.tasks.push(created);
      saveDB(db);
      return res.json({
        success: true,
        message: `Đã thêm công việc mới: ${created.title}`
      });
    } else if (json.action === "complete_task") {
      const query = (json.data.query || "").toLowerCase();
      const matchIdx = db.tasks.findIndex((t: any) => t.title.toLowerCase().includes(query) && t.status !== "Hoàn thành");
      if (matchIdx !== -1) {
        db.tasks[matchIdx].status = "Hoàn thành";
        saveDB(db);
        return res.json({
          success: true,
          message: `Đã đánh dấu hoàn thành: ${db.tasks[matchIdx].title}`
        });
      }
      return res.json({
        success: false,
        error: `Không tìm thấy công việc dở dang nào chứa từ khóa "${json.data.query}"`
      });
    }

    res.json({ success: false, error: "Không nhận dạng được hành động điều khiển." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Telegram APIs
app.post("/api/telegram/test", async (req, res) => {
  try {
    const { token, chatId } = getDB().settings;
    if (!token || !chatId) {
      return res.status(400).json({ error: "Token hoặc Chat ID chưa được cấu hình." });
    }
    const text = "🔔 <b>Thử nghiệm kết nối Telegram:</b> Cấu hình ID và Token của bạn hoạt động chính xác!";
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML" })
    });
    const result = await response.json();
    res.json({ success: response.ok, response: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/telegram/eod-report", async (req, res) => {
  try {
    const db = getDB();
    const { token, chatId } = db.settings;
    if (!token || !chatId) {
      return res.status(400).json({ error: "Token hoặc Chat ID chưa được cấu hình." });
    }

    const tasks = db.tasks;
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const doneTasks: string[] = [];
    const activeTasks: string[] = [];

    tasks.forEach((t: any) => {
      if (t.status === "Hoàn thành") doneTasks.push(t.title);
      else activeTasks.push(`${t.title} [${t.status}]`);
    });

    let msg = `<b>📊 BÁO CÁO CÔNG VIỆC CUỐI NGÀY</b>\n` +
              `<i>Ngày: ${todayStr}</i>\n\n` +
              `<b>✅ Việc Đã Làm Được:</b>\n`;

    if (doneTasks.length > 0) {
      doneTasks.forEach((title, idx) => { msg += `${idx + 1}. ${title}\n`; });
    } else {
      msg += `- Không có công việc nào hoàn thành hôm nay.\n`;
    }

    msg += `\n<b>❌ Việc Chưa Làm Được:</b>\n`;
    if (activeTasks.length > 0) {
      activeTasks.forEach((title, idx) => { msg += `${idx + 1}. ${title}\n`; });
    } else {
      msg += `- Tất cả công việc hôm nay đã được hoàn thành.\n`;
    }

    msg += `\nChúc bạn buổi tối vui vẻ!`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" })
    });
    const result = await response.json();
    res.json({ success: response.ok, response: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/telegram-webhook", (req, res) => {
  // Telegram 2-way Webhook Setup Mock / Sync response
  res.json({ success: true, message: "Đã giả lập kết nối webhook hai chiều thành công." });
});

// Export Database
app.get("/api/db/export", (req, res) => {
  res.json(getDB());
});

// Import Database
app.post("/api/db/import", (req, res) => {
  try {
    saveDB(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Development / Production Static Server Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // One-time cleanup script to remove unused projects
  const db = getDB();
  const removeProjectIds = ["p-2", "p-3", "p-4"];
  const originalLength = db.projects?.length || 0;
  if (db.projects) {
    db.projects = db.projects.filter((p: any) => !removeProjectIds.includes(p.id));
    if (db.projects.length !== originalLength) {
      saveDB(db);
    }
  }


app.post("/api/sync/seed", async (req, res) => {
  try {
    const db = getDB();
    if (!db.projects) db.projects = [];
    if (!db.crmContacts) db.crmContacts = [];

    // Cleanup mistakenly added projects
    db.projects = db.projects.filter(p => p.id !== "even_days" && p.id !== "odd_days");
    // Cleanup mistakenly added crm array
    if (db.crm) delete db.crm;

    const generateId = () => Math.random().toString(36).substring(2, 9);
    
    evenDayCustomers.forEach(name => {
      if (!db.crmContacts.find(c => c.name === name)) {
        db.crmContacts.push({
          id: `c-${generateId()}`,
          name: name,
          company: "Khách hàng ngày chẵn",
          phone: "",
          address: "",
          value: 0
        });
      }
    });

    oddDayCustomers.forEach(name => {
      if (!db.crmContacts.find(c => c.name === name)) {
        db.crmContacts.push({
          id: `c-${generateId()}`,
          name: name,
          company: "Khách hàng ngày lẻ",
          phone: "",
          address: "",
          value: 0
        });
      }
    });

    saveDB(db);
    await exportToGoogleSheets();
    res.json({ success: true, message: "Seeded customers and synced to Google Sheets" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
