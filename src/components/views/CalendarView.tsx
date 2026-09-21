import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Play,
  Instagram,
  PlaySquare,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Platform } from '../../types';

export const CalendarView: React.FC = () => {
  const { contentList, brands, selectedBrandId, setSelectedContentItem, scheduleContent } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Calculate days array for month grid
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month filler days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    days.push({ date: prevDate, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month filler days to complete 35 or 42 grid cells
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();

  // Filter content
  const activeContent =
    selectedBrandId === 'ALL'
      ? contentList
      : contentList.filter((c) => c.brandId === selectedBrandId);

  // Map content items by date key (YYYY-MM-DD)
  const contentByDateKey: Record<string, typeof contentList> = {};
  activeContent.forEach((item) => {
    const dateStr = item.scheduledAt || item.createdAt;
    const key = dateStr.slice(0, 10);
    if (!contentByDateKey[key]) {
      contentByDateKey[key] = [];
    }
    contentByDateKey[key].push(item);
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Editorial Publishing Calendar</h1>
          <p className="text-xs text-slate-500">
            Organize distribution schedules across client brands and social networks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[140px] text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Month Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center py-2.5">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* 6 Weeks Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dateKey = date.toISOString().slice(0, 10);
            const isToday =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();

            const itemsOnDay = contentByDateKey[dateKey] || [];

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(date)}
                className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                  isCurrentMonth ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 text-slate-400'
                } ${isToday ? 'ring-2 ring-amber-500 ring-inset bg-amber-50/20' : ''}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black'
                        : isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {itemsOnDay.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                      {itemsOnDay.length}
                    </span>
                  )}
                </div>

                {/* Content Pills in Day Cell */}
                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {itemsOnDay.slice(0, 2).map((item) => {
                    const brand = brands.find((b) => b.id === item.brandId);
                    return (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContentItem(item);
                        }}
                        className="p-1 rounded-md text-[10px] font-semibold text-white truncate shadow-xs flex items-center gap-1 hover:brightness-110 cursor-pointer"
                        style={{ backgroundColor: brand?.color || '#0B192C' }}
                      >
                        <span className="truncate">{item.title}</span>
                      </div>
                    );
                  })}
                  {itemsOnDay.length > 2 && (
                    <div className="text-[10px] font-semibold text-slate-400 pl-1">
                      +{itemsOnDay.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
