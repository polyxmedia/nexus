"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

export interface Notification {
  id: number;
  uid: string;
  alertId: number;
  triggeredAt: string;
  title: string;
  message: string;
  severity: number;
  data: string | null;
  dismissed: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
  newNotification: Notification | null;
  clearNewNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  dismiss: () => {},
  dismissAll: () => {},
  newNotification: null,
  clearNewNotification: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newNotification, setNewNotification] = useState<Notification | null>(null);
  const prevIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    function connect() {
      eventSource = new EventSource("/api/alerts/stream");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alerts: Notification[] = data.alerts || [];
          setNotifications(alerts);

          // Detect genuinely new notifications (not from init)
          if (data.type === "update") {
            const currentIds = new Set(alerts.map((a) => a.id));
            for (const alert of alerts) {
              if (!prevIdsRef.current.has(alert.id)) {
                setNewNotification(alert);
                break;
              }
            }
          }

          prevIdsRef.current = new Set(alerts.map((a) => a.id));
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        retryTimeout = setTimeout(connect, 10_000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  const dismiss = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/alerts?action=dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // ignore
    }
  }, []);

  const dismissAll = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    for (const id of ids) {
      try {
        await fetch("/api/alerts?action=dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch {
        // ignore
      }
    }
  }, [notifications]);

  const clearNewNotification = useCallback(() => {
    setNewNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        dismiss,
        dismissAll,
        newNotification,
        clearNewNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
