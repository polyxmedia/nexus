"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useNotifications, type Notification } from "./notification-provider";

const SEVERITY_COLOR = [
  "",
  "text-navy-400",
  "text-accent-cyan",
  "text-accent-amber",
  "text-accent-rose",
  "text-signal-5",
];

const SEVERITY_BG = [
  "",
  "bg-navy-700/50",
  "bg-accent-cyan/10",
  "bg-accent-amber/10",
  "bg-accent-rose/10",
  "bg-signal-5/10",
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-navy-400 hover:text-navy-200 hover:bg-navy-800/50 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-accent-rose text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-80 bg-navy-900 border border-navy-700 rounded-lg shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-navy-100 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-accent-rose/15 text-accent-rose">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={dismissAll}
                  className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors px-1.5 py-1 rounded hover:bg-navy-800"
                  title="Dismiss all"
                >
                  <CheckCheck className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-6 w-6 text-navy-700 mx-auto mb-2" />
                <p className="text-[11px] text-navy-500">No notifications</p>
                <p className="text-[10px] text-navy-600 mt-0.5">
                  Alerts will appear here when triggered
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onDismiss={dismiss}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-navy-800 px-4 py-2.5">
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-[10px] text-navy-400 hover:text-accent-cyan transition-colors"
            >
              View all alerts
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: number) => void;
}) {
  return (
    <Link
      href={`/alerts/${notification.uid}`}
      className="group flex items-start gap-2.5 px-4 py-3 border-b border-navy-800/50 last:border-0 hover:bg-navy-800/30 transition-colors block"
    >
      <div className={`mt-0.5 shrink-0 p-1 rounded ${SEVERITY_BG[notification.severity] || SEVERITY_BG[1]}`}>
        <AlertTriangle
          className={`h-3 w-3 ${SEVERITY_COLOR[notification.severity] || SEVERITY_COLOR[1]}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-navy-100 leading-snug">
          {notification.title}
        </p>
        <p className="text-[10px] text-navy-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] font-mono text-navy-600">
            {timeAgo(notification.triggeredAt)}
          </span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
            notification.severity >= 4
              ? "bg-accent-rose/10 text-accent-rose"
              : notification.severity >= 3
              ? "bg-accent-amber/10 text-accent-amber"
              : "bg-navy-700/50 text-navy-400"
          }`}>
            SEV {notification.severity}
          </span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-navy-600 hover:text-navy-300 transition-all p-1 rounded hover:bg-navy-800"
        title="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </Link>
  );
}
