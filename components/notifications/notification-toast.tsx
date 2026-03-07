"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useNotifications } from "./notification-provider";

const SEVERITY_COLOR = [
  "",
  "border-navy-600",
  "border-accent-cyan/40",
  "border-accent-amber/40",
  "border-accent-rose/40",
  "border-signal-5/40",
];

export function NotificationToast() {
  const { newNotification, clearNewNotification } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(newNotification);

  useEffect(() => {
    if (newNotification) {
      setCurrent(newNotification);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(clearNewNotification, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newNotification, clearNewNotification]);

  if (!current) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[100] w-80 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`bg-navy-900 border rounded-lg shadow-2xl shadow-black/60 overflow-hidden ${
          SEVERITY_COLOR[current.severity] || SEVERITY_COLOR[1]
        }`}
      >
        <div className="flex items-start gap-2.5 p-3.5">
          <AlertTriangle
            className={`h-4 w-4 mt-0.5 shrink-0 ${
              current.severity >= 4
                ? "text-accent-rose"
                : current.severity >= 3
                ? "text-accent-amber"
                : "text-accent-cyan"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-navy-100">
              {current.title}
            </p>
            <p className="text-[10px] text-navy-400 mt-0.5 line-clamp-2">
              {current.message}
            </p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(clearNewNotification, 300);
            }}
            className="shrink-0 text-navy-600 hover:text-navy-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Auto-dismiss progress bar */}
        {visible && (
          <div className="h-0.5 bg-navy-800">
            <div
              className={`h-full transition-all ease-linear ${
                current.severity >= 4
                  ? "bg-accent-rose/60"
                  : current.severity >= 3
                  ? "bg-accent-amber/60"
                  : "bg-accent-cyan/60"
              }`}
              style={{
                width: "100%",
                animation: "shrink 5s linear forwards",
              }}
            />
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
