import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateAdminPrice(basePrice: number, globalMarkup: number = 20) {
  const markupFactor = 1 + (globalMarkup / 100);
  return basePrice * markupFactor;
}

export function calculateClientPrice(basePrice: number, globalMarkup: number = 20) {
  const markupFactor = 1 + (globalMarkup / 100);
  return basePrice * markupFactor * 1.1; // Baseline Markup + 10% Profit
}

export function getDriveImageUrl(url: string) {
  if (!url) return null;
  if (url.includes("drive.google.com")) {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }
  return url;
}

export function shareByWA(phoneNumber: string, message: string) {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  const finalPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, "_blank");
}
