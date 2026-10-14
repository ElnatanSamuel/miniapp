/** Minimal typing for the Telegram WebApp SDK (window.Telegram.WebApp). */
export type TgUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export type TgWebApp = {
  initData: string;
  initDataUnsafe: {
    user?: TgUser;
    start_param?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton?: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  openLink?: (url: string) => void;
  Haptics?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred?: (type: "error" | "success" | "warning") => void;
    selectionChanged?: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | null {
  return window.Telegram?.WebApp ?? null;
}
