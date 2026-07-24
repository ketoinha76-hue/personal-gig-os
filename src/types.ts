export interface Project {
  id: string;
  name: string;
  description: string;
  client?: string;
  members?: string[];
  status?: string;
  startDate?: string;
  deadline?: string;
  budget?: number;
  cost?: number;
  progress?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  priority: string;
  status: string;
  assigneeId?: string;
  reporterId?: string;
  checklist?: ChecklistItem[];
  comments?: any[];
  tags?: string[];
  labels?: string[];
  estimateTime?: number;
  actualTime?: number;
  startDate?: string;
  deadline?: string;
  repeat?: string;
  files?: string[];
  createdAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  profit?: number;
  supplier?: string;
  category: string;
  image?: string;
  version?: string;
  features?: string[];
}

export interface CrmContact {
  id: string;
  name: string;
  email?: string;
  phone: string;
  company: string; // group
  pipelineStage?: string;
  lastContacted?: string;
  reminderDate?: string;
  value: number;
  birthYear?: string;
  address: string;
  locationUrl?: string;
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  dayOfWeek: number; // 1 = Monday, etc.
  startTime: string;
  endTime: string;
  color: string;
  completed: boolean;
  address?: string;
}

export interface Transaction {
  id: string;
  projectId: string;
  projectName: string;
  type: 'Thu' | 'Chi';
  amount: number;
  note: string;
  date: string;
}

export interface Settings {
  companyName: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  theme: string;
  language: string;
  timezone: string;
  geminiApiKey: string;
  googleCalendarId?: string;
  savingsGoalName: string;
  savingsGoalAmount: string | number;
  depotCoords: string;
  activeRoute?: any;
  tuitionSheetUrl?: string;
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
}

export interface Tuition {
  id: string;
  studentName: string;
  courseName: string;
  tuitionFee: number;
  totalLessons: number;
  completedLessons: number;
  paymentStatus: 'Đã đóng' | 'Chưa đóng';
  notes?: string;
  syncedToFinance?: boolean;
  updatedAt?: string;
}

export interface Database {
  users: any[];
  tasks: Task[];
  projects: Project[];
  products: Product[];
  crmContacts: CrmContact[];
  schedules: Schedule[];
  transactions: Transaction[];
  settings: Settings;
  tuitionRecords: Tuition[];
  activityLogs?: any[];
}
