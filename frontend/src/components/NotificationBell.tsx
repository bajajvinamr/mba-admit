"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
};

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  weekly_recap: { bg: "bg-blue-50", text: "text-blue-700", label: "Weekly Recap" },
  deadline_alert: { bg: "bg-red-50", text: "text-red-700", label: "Deadline" },
  inactivity: { bg: "bg-amber-50", text: "text-amber-700", label: "Reminder" },
  achievement: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Achievement" },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      // Use a generic user_id for now (in production, get from auth context)
      const userId = localStorage.getItem("ac_user_id") || "anonymous";
      const data = await apiFetch<{
        notifications: Notification[];
        unread_count: number;
      }>(`/api/notifications?user_id=${userId}&limit=20`);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // Silently fail - notifications are non-critical
    }
  }, []);

  // Fetch on mount and poll every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const markAllRead = async () => {
    try {
      const userId = localStorage.getItem("ac_user_id") || "anonymous";
      await apiFetch(`/api/notifications/read-all?user_id=${userId}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        className="relative flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-card border border-border shadow-xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-primary hover:text-primary/80 font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground/40">
                  <Bell size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const typeStyle = TYPE_STYLES[notif.type] || TYPE_STYLES.deadline_alert;
                  return (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notif.read ? "bg-primary/[0.03]" : ""
                      }`}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${typeStyle.bg} ${typeStyle.text}`}>
                              {typeStyle.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{notif.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {/* Try to parse weekly_recap body as JSON for better display */}
                            {notif.type === "weekly_recap"
                              ? (() => {
                                  try {
                                    const data = JSON.parse(notif.body);
                                    return data.greeting || data.motivation || notif.body.slice(0, 100);
                                  } catch {
                                    return notif.body.slice(0, 100);
                                  }
                                })()
                              : notif.body.slice(0, 100)}
                          </p>
                          {notif.actionUrl && (
                            <Link
                              href={notif.actionUrl}
                              className="inline-flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-wider mt-1 hover:text-primary/80"
                              onClick={() => setOpen(false)}
                            >
                              {notif.actionLabel || "View"} <ExternalLink size={9} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
