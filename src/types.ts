export type UserTier = "prospect" | "survey" | "deal" | "admin";

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  pmId?: string;
  workerIds?: string[]; // Added for Tier 3 tracking
  createdAt: string;
  totalBudget: number;
  status: "draft" | "survey" | "active" | "completed";
  contractUrl?: string;
  timeline?: TimelineEvent[];
  location?: string;
  locationCoords?: { lat: number; lng: number }; // Added for multi-site tracking
  area?: number;
  dailyReports?: DailyReport[];
  requests?: ProjectRequest[];
}

export interface DailyReport {
  id: string;
  date: string;
  description: string;
  photos: string[];
}

export interface ProjectRequest {
  id: string;
  item: string;
  volume: number;
  unit: string;
  price: number;
  tag: "client" | "pm" | "system";
  photoUrl?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  status: "pending" | "ongoing" | "completed";
}

export interface BudgetCategory {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  categoryId: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  photos?: {
    before?: string[];
    progress?: string[];
    after?: string[];
  };
  progress?: number; // 0 to 100
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: "jual" | "beli" | "sewa";
  location: string;
  area: number;
  photos: string[];
  features: string[];
  status: "available" | "sold" | "rented" | "requested";
}

export interface Workforce {
  id: string;
  name: string;
  ktp: string;
  photoUrl: string;
  role: "pm" | "designer" | "drafter" | "tukang" | "mandor" | "kenek" | string;
  whatsapp: string;
  projectId?: string; // Label proyek dimana
  status: "active" | "inactive";
  location?: { lat: number; lng: number };
  lastSeen?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut?: string;
  location?: { lat: number; lng: number };
  photoUrl?: string;
  status?: string;
}

export interface MaterialRequest {
  id: string;
  projectId: string;
  projectName: string;
  requesterId: string;
  requesterName: string;
  itemName: string;
  quantity: number;
  unit: string;
  note: string;
  status: "pending" | "approved" | "rejected" | "purchased";
  createdAt: string;
  updatedAt: string;
  log: { time: string; action: string; note?: string }[];
}

export interface WorkItemMaster {
  id: string;
  code?: string; // PT010, FR024
  category: string;
  name: string;
  description?: string;
  unit: string;
  price: number;
  status?: "visible" | "hidden" | "deleted";
  soldCount?: number;
  revenue?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "admin" | "user" | "pm";
  tier: UserTier;
  whatsapp?: string;
  phoneNumber?: string; // Added for AI limit tracking
  aiUsageCount?: number; // Added for AI limit tracking
  location?: string;
  createdAt: string;
  lastPaymentStatus?: "unpaid" | "pending" | "paid";
  lifetimeAccess?: boolean; // Added for lifetime access
}

export interface AIEstimateItem {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  reasoning: string;
}

export interface AIEstimateResponse {
  analysis: string;
  items: AIEstimateItem[];
  totalEstimatedCost: number;
}

export type MaterialOption = {
  nama: string;
  hargaSatuan: number;
  deskripsi: string;
};

export interface KalkulasiInput {
  luasAtap: number;
  kodeMaterial: "alderon" | "spandek";
  termasukRangka?: boolean;
}

export interface HasilRAB {
  material: string;
  luas: number;
  hargaSatuan: number;
  biayaRangka: number;
  totalHarga: number;
}
