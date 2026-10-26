import { format } from "date-fns";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "TeleCommerce ET",
  channelTitle: "Bole Thrift",
  channelHandle: "@BoleThrift",
  version: "2.2.0",
  copyright: `© ${currentYear}, TeleCommerce ET.`,
  meta: {
    title: "TeleCommerce ET: Merchant Dashboard",
    description: "Merchant web portal for Telegram channel owners selling in Addis Ababa.",
  },
};

/**
 * Format currency in ETB (e.g. "2,400 ETB")
 */
export function formatETB(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ETB`;
}

/**
 * Format Ethiopian phone numbers into "+251 9X XXX XXXX" standard representation.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("251") && digits.length === 12) {
    const code = digits.slice(0, 3);
    const prefix = digits.slice(3, 5);
    const mid = digits.slice(5, 8);
    const last = digits.slice(8);
    return `+${code} ${prefix} ${mid} ${last}`;
  }
  if (digits.startsWith("09") && digits.length === 10) {
    const prefix = digits.slice(1, 3);
    const mid = digits.slice(3, 6);
    const last = digits.slice(6);
    return `+251 ${prefix} ${mid} ${last}`;
  }
  if (digits.startsWith("9") && digits.length === 9) {
    const prefix = digits.slice(0, 2);
    const mid = digits.slice(2, 5);
    const last = digits.slice(5);
    return `+251 ${prefix} ${mid} ${last}`;
  }
  return phone;
}

/**
 * Format dates in Africa/Addis_Ababa local timezone (UTC+3)
 */
export function formatAddisDate(dateStr: string | Date, formatString = "MMM d, yyyy h:mm a"): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return format(date, formatString);
}
