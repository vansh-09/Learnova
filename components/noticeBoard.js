"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Bell,
  BellOff,
  Pin,
  Calendar,
  User,
  Filter,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Users,
  Settings,
  Clock,
  ChevronDown,
  X,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "./Navbar";

const SmartNoticeBoard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [readNotices, setReadNotices] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [scheduleView, setScheduleView] = useState("school");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Helper functions to get user info safely (similar to navbar)
  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  const getUserRole = () => {
    // You can determine role based on user properties
    // For now, defaulting to 'student' - you might have this in user object
    return user?.role || "student";
  };

  const getUserId = () => {
    return user?.uid || user?.id || "anonymous";
  };

  // Connect to Realtime SSE Stream
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let eventSource;
    let reconnectTimeout;
    
    const connectSSE = () => {
      eventSource = new EventSource("/api/notices/stream");

      eventSource.addEventListener("initial", (e) => {
        try {
          const data = JSON.parse(e.data);
          setNotices(data);
          setLoading(false);
        } catch (err) {
          console.error("Failed to parse initial notices", err);
        }
      });

      eventSource.addEventListener("new-notice", (e) => {
        try {
          const newNotice = JSON.parse(e.data);
          setNotices((prev) => {
            // Prevent duplicates
            if (prev.find(n => n.id === newNotice.id)) return prev;
            return [newNotice, ...prev];
          });
          
          if (newNotice.priority === "high") {
             toast(`High Priority: ${newNotice.title}`, { icon: '🚨', duration: 5000 });
          } else {
             toast.success(`New Notice: ${newNotice.title}`);
          }
        } catch (err) {
          console.error("Failed to parse new notice", err);
        }
      });

      eventSource.onerror = (e) => {
        console.error("SSE Connection dropped. Reconnecting in 5s...");
        eventSource.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    // Load read notices from localStorage
    const userId = getUserId();
    const savedReadNotices = localStorage.getItem(`readNotices_${userId}`);
    if (savedReadNotices) {
      try {
        const parsed = JSON.parse(savedReadNotices);
        if (Array.isArray(parsed)) {
          setReadNotices(new Set(parsed));
        }
      } catch (err) {
        localStorage.removeItem(`readNotices_${userId}`);
      }
    }

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user]);

  // Filter notices based on search, category, and read status
  useEffect(() => {
    let filtered = notices;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (notice) =>
          notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notice.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notice.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (notice) => notice.category === selectedCategory
      );
    }

    // Read/Unread filter
    if (showOnlyUnread) {
      filtered = filtered.filter((notice) => !readNotices.has(notice.id));
    }

    // Sort by pinned first, then by date
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setFilteredNotices(filtered);
  }, [notices, searchQuery, selectedCategory, showOnlyUnread, readNotices]);

  const markAsRead = (noticeId) => {
    if (user) {
      const newReadNotices = new Set(readNotices);
      newReadNotices.add(noticeId);
      setReadNotices(newReadNotices);
      const userId = getUserId();
      localStorage.setItem(
        `readNotices_${userId}`,
        JSON.stringify([...newReadNotices])
      );
    }
  };

  const markAsUnread = (noticeId) => {
    if (user) {
      const newReadNotices = new Set(readNotices);
      newReadNotices.delete(noticeId);
      setReadNotices(newReadNotices);
      const userId = getUserId();
      localStorage.setItem(
        `readNotices_${userId}`,
        JSON.stringify([...newReadNotices])
      );
    }
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notices.filter(
    (notice) => !readNotices.has(notice.id)
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 flex items-center justify-center">
        <Navbar />
        <div className="text-center text-white pt-20">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden pt-20">
      {/* Background Effects */}
      <Navbar />
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.1)_0%,transparent_50%)]" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-6">
            {/* Left Section: Icon + Title */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-accent to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Bell className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs md:text-sm font-bold">
                      {unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-accent to-purple-400 bg-clip-text text-transparent">
                  Smart Notice Board
                </h1>
                <p className="text-gray-400 mt-1 text-xs md:text-sm lg:text-base">
                  Stay updated with the latest announcements
                </p>
              </div>
            </div>

            {/* Right Section: Date, Role, Button */}
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 w-full md:w-auto">
              {/* Date */}
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {new Date().toLocaleDateString()}
                </span>
              </div>

              {/* Divider (responsive) */}
              <div className="w-full md:w-px h-px md:h-6 bg-gray-600 my-3 md:my-0" />

              {/* Role */}
              <div className="flex items-center gap-2 text-gray-400">
                <User className="w-4 h-4" />
                <span className="text-sm capitalize">{getUserRole()}</span>
              </div>

              {/* Button */}
              <button
                onClick={() => setShowScheduleModal(true)}
                className="mt-3 md:mt-0 w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white hover:shadow-lg transition-all duration-300 text-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>Check Schedule</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-accent focus:outline-none transition-all duration-300"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center space-x-2 px-4 py-3 bg-black/40 border border-gray-600 rounded-xl text-white hover:border-accent transition-all duration-300"
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isFilterOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <button
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                className={`flex items-center space-x-2 px-4 py-3 border rounded-xl transition-all duration-300 ${
                  showOnlyUnread
                    ? "bg-accent border-accent text-white"
                    : "bg-black/40 border-gray-600 text-white hover:border-accent"
                }`}
              >
                <EyeOff className="w-5 h-5" />
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Category Filters */}
          {isFilterOpen && (
            <div className="mb-6 p-4 bg-black/40 border border-gray-600 rounded-xl backdrop-blur-sm transition-all duration-300">
              <h3 className="text-white font-semibold mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-gradient-to-r from-accent to-purple-600 text-white shadow-lg shadow-accent/25 border border-accent/20"
                          : "bg-gray-800/30 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-black/40 backdrop-blur-sm border border-gray-600 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {notices.length}
                </div>
                <div className="text-gray-400 text-sm">Total Notices</div>
              </div>
              <div className="bg-black/40 backdrop-blur-sm border border-gray-600 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {unreadCount}
                </div>
                <div className="text-gray-400 text-sm">Unread</div>
              </div>
              <div className="bg-black/40 backdrop-blur-sm border border-gray-600 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {notices.filter((n) => n.isPinned).length}
                </div>
                <div className="text-gray-400 text-sm">Pinned</div>
              </div>
              <div className="bg-black/40 backdrop-blur-sm border border-gray-600 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {notices.filter((n) => n.priority === "high").length}
                </div>
                <div className="text-gray-400 text-sm">High Priority</div>
              </div>
            </div>

            {/* Notices List */}
<div className="space-y-4">
  <AnimatePresence mode="popLayout">
  {filteredNotices.length === 0 ? (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <BellOff className="w-14 h-14 text-gray-500 mb-4" />

      <p className="text-lg font-medium text-gray-300">
        No notices yet. Check back later.
      </p>
    </motion.div>
  ) : (
    filteredNotices.map((notice) => {
      const isRead = readNotices.has(notice.id);
      const priorityStyle = priorityConfig[notice.priority];

      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          key={notice.id}
          className={`group relative bg-black/40 backdrop-blur-sm border rounded-2xl p-4 sm:p-6 transition-colors duration-300 hover:scale-[1.01] hover:shadow-2xl ${
            isRead
              ? "border-gray-600"
              : "border-accent/50 shadow-lg shadow-accent/10"
          }`}
        >
                      {/* Pinned Indicator */}
                      {notice.isPinned && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                            <Pin className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3
                              className={`text-base sm:text-lg font-semibold transition-colors duration-300 ${
                                isRead ? "text-gray-300" : "text-white"
                              }`}
                            >
                              {notice.title}
                            </h3>
                            {!isRead && (
                              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <User className="w-3.5 h-3.5 sm:w-4 h-4" />
                              <span>{notice.author}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 sm:w-4 h-4" />
                              <span>{getRelativeTime(notice.createdAt)}</span>
                            </div>
                            <div
                              className={`flex items-center space-x-1 px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs ${priorityStyle.bg} ${priorityStyle.border} border`}
                            >
                              <AlertCircle
                                className={`w-2.5 h-2.5 sm:w-3 h-3 ${priorityStyle.text}`}
                              />
                              <span
                                className={`capitalize ${priorityStyle.text}`}
                              >
                                {notice.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Read/Unread Toggle */}
                        <button
                          onClick={() =>
                            isRead
                              ? markAsUnread(notice.id)
                              : markAsRead(notice.id)
                          }
                          className={`self-end sm:self-start p-2 rounded-lg transition-all duration-300 ${
                            isRead
                              ? "text-gray-500 hover:text-gray-400 hover:bg-gray-700/50"
                              : "text-accent hover:text-accent/80 hover:bg-accent/10"
                          }`}
                          title={isRead ? "Mark as unread" : "Mark as read"}
                        >
                          {isRead ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* Content */}
                      <p
                        className={`leading-relaxed mb-4 text-sm sm:text-base ${
                          isRead ? "text-gray-400" : "text-gray-300"
                        }`}
                      >
                        {notice.content}
                      </p>

                      {/* Tags */}
                      {notice.tags && notice.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {notice.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-gray-700/50 text-gray-300 text-[10px] sm:text-xs rounded-full border border-gray-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Glow effect for unread high priority */}
                      {!isRead && notice.priority === "high" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-2xl -z-10 blur-xl pointer-events-none opacity-50 sm:opacity-100" />
                      )}
                    </motion.div>
                  );
                })
              )}
  </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-600 rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Check Schedule</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* School/College Toggle */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setScheduleView("school")}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                  scheduleView === "school"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                }`}
              >
                School Schedule
              </button>
              <button
                onClick={() => setScheduleView("college")}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                  scheduleView === "college"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                }`}
              >
                College Schedule
              </button>
            </div>

            {/* Schedule Content */}
            <div className="space-y-4">
              {scheduleView === "school" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-gray-600 rounded-xl p-4">
                    <h4 className="text-white font-semibold mb-2">
                      Today's Classes
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Mathematics</span>
                        <span>9:00 AM - 10:00 AM</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Science</span>
                        <span>10:15 AM - 11:15 AM</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>English</span>
                        <span>11:30 AM - 12:30 PM</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/40 border border-gray-600 rounded-xl p-4">
                    <h4 className="text-white font-semibold mb-2">
                      Upcoming Events
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Parent-Teacher Meeting - Oct 15</div>
                      <div>• Science Fair - Oct 20</div>
                      <div>• Sports Day - Oct 25</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-gray-600 rounded-xl p-4">
                    <h4 className="text-white font-semibold mb-2">
                      Today's Lectures
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Advanced Calculus</span>
                        <span>9:00 AM - 10:30 AM</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Data Structures</span>
                        <span>11:00 AM - 12:30 PM</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Physics Lab</span>
                        <span>2:00 PM - 4:00 PM</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/40 border border-gray-600 rounded-xl p-4">
                    <h4 className="text-white font-semibold mb-2">
                      Assignments Due
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Algorithm Analysis - Oct 12</div>
                      <div>• Research Paper - Oct 18</div>
                      <div>• Lab Report - Oct 22</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SmartNoticeBoard;
