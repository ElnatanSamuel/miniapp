"use client";

import * as React from "react";
import { Bot, ExternalLink } from "lucide-react";
import { APP_CONFIG } from "@/lib/utils";

interface BotStatus {
  connected: boolean;
  bot?: {
    id: number;
    username: string;
    firstName: string;
    hasMainWebApp: boolean;
  };
  error?: string;
}

export function TelegramStatusBadge() {
  const [status, setStatus] = React.useState<BotStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/telegram/status")
      .then((res) => res.json())
      .then((data: BotStatus) => {
        if (isMounted) {
          setStatus(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStatus({ connected: false, error: err.message });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const botUsername = status?.bot?.username || APP_CONFIG.botHandle;

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
        <Bot className="size-3.5 animate-pulse" />
        <span className="hidden sm:inline">Connecting Telegram...</span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <a
        href={`https://t.me/${botUsername}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Connected to Telegram Bot: @${botUsername}`}
        className="group flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
        </span>
        <Bot className="size-3.5 text-sky-400" />
        <span className="font-semibold">@{botUsername}</span>
        <ExternalLink className="size-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <div
      title={status?.error || "Telegram Bot Token not configured"}
      className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400"
    >
      <Bot className="size-3.5 text-amber-400" />
      <span className="hidden sm:inline">Telegram Offline</span>
    </div>
  );
}
