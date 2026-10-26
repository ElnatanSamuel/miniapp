"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, ExternalLink, LogOut, Package, ShoppingBag, X } from "lucide-react";

import { APP_CONFIG } from "@/lib/utils";

const navItems = [
  {
    title: "Orders",
    titleAmharic: "ትዕዛዞች",
    href: "/dashboard/orders",
    icon: ShoppingBag,
  },
  {
    title: "Catalog",
    titleAmharic: "ካታሎግ",
    href: "/dashboard/catalog",
    icon: Package,
  },
  {
    title: "Settlements",
    titleAmharic: "ክፍያዎች",
    href: "/dashboard/settlements",
    icon: Banknote,
  },
];

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard/orders" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
              <ShoppingBag className="size-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-foreground">
                {APP_CONFIG.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {APP_CONFIG.channelTitle}
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.title}</span>
                <span className="ml-auto text-xs text-muted-foreground/60">{item.titleAmharic}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-1">
          <a
            href={`https://t.me/${APP_CONFIG.channelHandle.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span>{APP_CONFIG.channelHandle}</span>
            <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out / ውጣ</span>
          </button>
        </div>
      </aside>
    </>
  );
}
