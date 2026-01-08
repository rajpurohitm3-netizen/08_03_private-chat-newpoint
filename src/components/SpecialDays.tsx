"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Heart,
  Star,
  Gift,
  Cake,
  PartyPopper,
  Sparkles,
  CalendarHeart,
  Trash2,
  Edit3
} from "lucide-react";

interface SpecialDay {
  id: string;
  user_id: string;
  date: string;
  title: string;
  description: string | null;
  color: string;
  emoji: string;
  created_at: string;
}

interface SpecialDaysProps {
  userId: string;
}

const COLORS = [
  { name: "indigo", bg: "bg-indigo-500", light: "bg-indigo-500/20", text: "text-indigo-400" },
  { name: "pink", bg: "bg-pink-500", light: "bg-pink-500/20", text: "text-pink-400" },
  { name: "emerald", bg: "bg-emerald-500", light: "bg-emerald-500/20", text: "text-emerald-400" },
  { name: "orange", bg: "bg-orange-500", light: "bg-orange-500/20", text: "text-orange-400" },
  { name: "purple", bg: "bg-purple-500", light: "bg-purple-500/20", text: "text-purple-400" },
  { name: "red", bg: "bg-red-500", light: "bg-red-500/20", text: "text-red-400" },
  { name: "cyan", bg: "bg-cyan-500", light: "bg-cyan-500/20", text: "text-cyan-400" },
  { name: "amber", bg: "bg-amber-500", light: "bg-amber-500/20", text: "text-amber-400" },
];

const EMOJIS = ["🎉", "❤️", "🎂", "🎁", "⭐", "💕", "🌟", "🎊", "💝", "🥳", "✨", "🎈", "💖", "🌸", "🎀", "💐"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SpecialDays({ userId }: SpecialDaysProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingDay, setEditingDay] = useState<SpecialDay | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    color: "indigo",
    emoji: "🎉"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecialDays();
  }, [userId]);

  const fetchSpecialDays = async () => {
    const { data, error } = await supabase
      .from("special_days")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (data) {
      setSpecialDays(data);
    }
    setLoading(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getSpecialDayForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return specialDays.find(sd => sd.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    const existingDay = getSpecialDayForDate(day);
    if (existingDay) {
      setEditingDay(existingDay);
      setFormData({
        title: existingDay.title,
        description: existingDay.description || "",
        color: existingDay.color,
        emoji: existingDay.emoji
      });
    } else {
      setEditingDay(null);
      setFormData({ title: "", description: "", color: "indigo", emoji: "🎉" });
    }
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !selectedDate) {
      toast.error("Please enter a title");
      return;
    }

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    if (editingDay) {
      const { error } = await supabase
        .from("special_days")
        .update({
          title: formData.title,
          description: formData.description || null,
          color: formData.color,
          emoji: formData.emoji,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingDay.id);

      if (error) {
        toast.error("Failed to update");
      } else {
        toast.success("Updated!");
        fetchSpecialDays();
      }
    } else {
      const { error } = await supabase
        .from("special_days")
        .insert({
          user_id: userId,
          date: dateStr,
          title: formData.title,
          description: formData.description || null,
          color: formData.color,
          emoji: formData.emoji
        });

      if (error) {
        toast.error("Failed to save");
      } else {
        toast.success("Special day added!");
        fetchSpecialDays();
      }
    }

    setShowAddModal(false);
    setSelectedDate(null);
    setEditingDay(null);
    setFormData({ title: "", description: "", color: "indigo", emoji: "🎉" });
  };

  const handleDelete = async () => {
    if (!editingDay) return;

    const { error } = await supabase
      .from("special_days")
      .delete()
      .eq("id", editingDay.id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted!");
      fetchSpecialDays();
    }

    setShowAddModal(false);
    setSelectedDate(null);
    setEditingDay(null);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getColorClasses = (colorName: string) => {
    return COLORS.find(c => c.name === colorName) || COLORS[0];
  };

  const upcomingDays = specialDays
    .filter(sd => new Date(sd.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today!";
    if (diff === 1) return "Tomorrow";
    return `${diff} days left`;
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 pb-32 lg:pb-12">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl">
            <CalendarHeart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Special Days</h2>
            <p className="text-sm text-white/40">Mark your special moments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={prevMonth}
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h3 className="text-xl font-black uppercase tracking-wider">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <Button
              onClick={nextMonth}
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-white/30 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const specialDay = getSpecialDayForDate(day);
              const colorClasses = specialDay ? getColorClasses(specialDay.color) : null;

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                    isToday(day)
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#010101]"
                      : specialDay
                      ? `${colorClasses?.light} ${colorClasses?.text} border border-white/10`
                      : "bg-white/[0.02] hover:bg-white/5 text-white/60 hover:text-white border border-transparent hover:border-white/10"
                  }`}
                >
                  {specialDay && (
                    <span className="text-lg leading-none mb-0.5">{specialDay.emoji}</span>
                  )}
                  <span className={`text-sm font-bold ${specialDay ? "" : ""}`}>{day}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-widest">Upcoming</h3>
            </div>

            {upcomingDays.length === 0 ? (
              <div className="text-center py-8">
                <CalendarHeart className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-sm text-white/30">No upcoming special days</p>
                <p className="text-xs text-white/20 mt-1">Tap a date to add one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDays.map(sd => {
                  const colorClasses = getColorClasses(sd.color);
                  const date = new Date(sd.date);
                  return (
                    <motion.div
                      key={sd.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-2xl ${colorClasses.light} border border-white/5 cursor-pointer hover:scale-[1.02] transition-transform`}
                      onClick={() => {
                        setSelectedDate(date);
                        setEditingDay(sd);
                        setFormData({
                          title: sd.title,
                          description: sd.description || "",
                          color: sd.color,
                          emoji: sd.emoji
                        });
                        setShowAddModal(true);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{sd.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{sd.title}</p>
                          <p className="text-xs text-white/40 mt-1">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full ${colorClasses.bg} text-white text-[10px] font-bold uppercase shrink-0`}>
                          {getDaysUntil(sd.date)}
                        </div>
                      </div>
                      {sd.description && (
                        <p className="text-xs text-white/50 mt-2 line-clamp-2">{sd.description}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="text-sm font-black uppercase tracking-widest">Total Memories</h3>
            </div>
            <p className="text-4xl font-black text-white">{specialDays.length}</p>
            <p className="text-xs text-white/40 mt-2 uppercase tracking-wider">Special days marked</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {editingDay ? "Edit Special Day" : "Add Special Day"}
                  </h3>
                  <p className="text-sm text-white/40">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddModal(false)}
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">
                    Title
                  </label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Anniversary, Birthday..."
                    className="h-12 bg-white/5 border-white/10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">
                    Description (Optional)
                  </label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Why is this day special?"
                    className="h-12 bg-white/5 border-white/10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">
                    Emoji
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                          formData.emoji === emoji
                            ? "bg-white/20 ring-2 ring-white/40"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color.name}
                        onClick={() => setFormData(prev => ({ ...prev, color: color.name }))}
                        className={`w-10 h-10 rounded-xl ${color.bg} transition-all ${
                          formData.color === color.name
                            ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {editingDay && (
                  <Button
                    onClick={handleDelete}
                    variant="ghost"
                    className="h-12 px-6 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 font-black uppercase text-xs tracking-widest"
                >
                  {editingDay ? "Update" : "Save"} Special Day
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
