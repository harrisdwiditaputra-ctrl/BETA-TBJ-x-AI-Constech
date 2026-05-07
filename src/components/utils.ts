import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency Formatting ──────────────────────────────────────────────────────
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRupiah(value: number): string {
  if (!value || isNaN(value)) return "Rp 0";
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Pricing Helpers ──────────────────────────────────────────────────────────
// globalMarkup: decimal (e.g. 0.2 = 20%)
export function calculateAdminPrice(basePrice: number): number {
  return Math.round(basePrice);
}

export function calculateClientPrice(basePrice: number, globalMarkup: number = 0.2): number {
  return Math.round(basePrice * (1 + globalMarkup) / 1000) * 1000; // round to nearest 1000
}

// ─── Google Drive Image URL Helper ───────────────────────────────────────────
// Converts a Google Drive share URL to a direct image URL
export function getDriveImageUrl(url: string): string {
  if (!url) return "";
  
  // Already a direct URL (not Drive)
  if (!url.includes("drive.google.com") && !url.includes("drive.usercontent.google.com")) {
    return url;
  }
  
  // Extract file ID from various Drive URL formats
  let fileId = "";
  
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([^\/\?]+)/);
  if (fileMatch) fileId = fileMatch[1];
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (!fileId && openMatch) fileId = openMatch[1];
  
  // Format: https://drive.google.com/uc?id=FILE_ID
  const ucMatch = url.match(/uc\?.*id=([^&]+)/);
  if (!fileId && ucMatch) fileId = ucMatch[1];

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  
  return url;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateStr);
}

// ─── Truncate ─────────────────────────────────────────────────────────────────
export function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

// ─── Safe JSON Parse ──────────────────────────────────────────────────────────
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
