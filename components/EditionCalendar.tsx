'use client'

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Eye } from 'lucide-react';
import Link from 'next/link';

interface Edition {
  _id: string;
  name: string;
  alias: string;
  date: string;
  pageCount: number;
  pages: Array<{
    filename: string;
    url: string;
    pageNum: number;
  }>;
}

interface AvailableEdition {
  date: number; // day of month
  edition: Edition;
}

interface EditionCalendarProps {
  className?: string;
  onDateSelect?: (edition: Edition) => void;
}

export default function EditionCalendar({ className = "", onDateSelect }: EditionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availableEditions, setAvailableEditions] = useState<AvailableEdition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [previewEdition, setPreviewEdition] = useState<Edition | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Weekday headers
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create calendar grid
  const createCalendarDays = () => {
    const days = [];

    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(currentYear, currentMonth, day)
      });
    }

    // Next month's leading days to fill grid
    const remainingCells = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(currentYear, currentMonth + 1, day)
      });
    }

    return days;
  };

  // Fetch editions for current month
  const fetchEditionsForMonth = async () => {
    setIsLoading(true);
    try {
      // Get start and end of current month
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      
      console.log('Fetching editions for:', { startDate, endDate }); // Debug
      
      // Fetch all editions for the month
      const response = await fetch(`/api/editions?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      
      console.log('Calendar API response:', data); // Debug
      
      if (data.editions && data.editions.length > 0) {
        // Map editions to available dates
        const editionsMap = data.editions
          .filter((edition: Edition) => edition.date)
          .map((edition: Edition) => ({
            date: new Date(edition.date).getDate(),
            edition
          }));
        
        console.log('Mapped editions:', editionsMap); // Debug
        setAvailableEditions(editionsMap);
      } else {
        console.log('No editions found for date range, trying without filter...'); // Debug
        
        // Fallback: Get all editions and filter client-side
        const fallbackResponse = await fetch('/api/editions');
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.editions) {
          const currentMonthEditions = fallbackData.editions
            .filter((edition: Edition) => {
              if (!edition.date) return false;
              const editionDate = new Date(edition.date);
              return editionDate.getMonth() === currentMonth && 
                     editionDate.getFullYear() === currentYear;
            })
            .map((edition: Edition) => ({
              date: new Date(edition.date).getDate(),
              edition
            }));
          
          console.log('Fallback editions:', currentMonthEditions); // Debug
          setAvailableEditions(currentMonthEditions);
        } else {
          setAvailableEditions([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch editions:', error);
      setAvailableEditions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
    setSelectedDate(null);
    setPreviewEdition(null);
  };

  // Handle date click
  const handleDateClick = async (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    const clickedEdition = availableEditions.find(item => item.date === day);
    
    if (clickedEdition) {
      setSelectedDate(day);
      setPreviewEdition(clickedEdition.edition);
      
      // Call callback if provided
      if (onDateSelect) {
        onDateSelect(clickedEdition.edition);
      }
    }
  };

  // Check if date has edition
  const hasEdition = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    return availableEditions.some(item => item.date === day);
  };

  // Check if date is today
  const isToday = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  // Format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Fetch editions when month changes
  useEffect(() => {
    fetchEditionsForMonth();
  }, [currentMonth, currentYear]);

  // Check if date is in the future
  const isFutureDate = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date > now;
  };

  const calendarDays = createCalendarDays();

  return (
    <div className={`border bg-white shadow-sm rounded-sm ${className}`}>
      {/* Header */}
      <div className="bg-gray-100 border-b p-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Calendar size={18} />
          Edition Calendar
        </h3>
        {isLoading && (
          <div className="w-4 h-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#D4A800] border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isLoading}
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </span>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isLoading}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, index) => {
            const hasEditionToday = hasEdition(dayInfo.day, dayInfo.isCurrentMonth);
            const isTodayDate = isToday(dayInfo.day, dayInfo.isCurrentMonth);
            const isSelected = selectedDate === dayInfo.day && dayInfo.isCurrentMonth;
            const isFuture = isFutureDate(dayInfo.date);

            return (
              <button
                key={index}
                onClick={() => !isFuture && handleDateClick(dayInfo.day, dayInfo.isCurrentMonth)}
                disabled={isLoading || !dayInfo.isCurrentMonth || isFuture}
                className={`
                  aspect-square text-sm rounded transition-all duration-200 relative
                  ${!dayInfo.isCurrentMonth || isFuture 
                    ? 'text-gray-300 cursor-default opacity-50' 
                    : hasEditionToday
                      ? 'bg-[#D4A800] text-white hover:bg-[#b8930a] cursor-pointer font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 cursor-default'
                  }
                  ${isTodayDate && !hasEditionToday ? 'ring-2 ring-[#D4A800] ring-opacity-50' : ''}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                {dayInfo.day}
                
                {/* Red indicator dot - Only for TODAY */}
                {isTodayDate && dayInfo.isCurrentMonth && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Edition Preview */}
        {previewEdition && selectedDate && (
          <div className="mt-4 p-3 bg-[#FFF3C4] rounded border border-[#D4A800] border-opacity-30">
            <div className="flex items-start gap-3">
              {previewEdition.pages && previewEdition.pages[0] && (
                <img
                  src={previewEdition.pages[0].url}
                  alt="Edition preview"
                  className="w-12 h-16 object-cover rounded border shadow-sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-800 truncate">
                  {previewEdition.name}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDate(previewEdition.date)}
                </p>
                <p className="text-xs text-gray-600">
                  {previewEdition.pageCount} pages
                </p>
                <Link
                  href={`/edition/${previewEdition.alias}`}
                  className="inline-flex items-center gap-1 text-xs text-[#D4A800] hover:text-[#b8930a] mt-2 font-medium"
                >
                  <Eye size={12} />
                  View Edition
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Available Editions Count */}
        {availableEditions.length > 0 && (
          <div className="mt-3 text-center text-xs text-gray-500">
            {availableEditions.length} edition{availableEditions.length !== 1 ? 's' : ''} available this month
          </div>
        )}

        {/* No Editions Message */}
        {!isLoading && availableEditions.length === 0 && (
          <div className="mt-4 text-center text-sm text-gray-500 py-4">
            No editions available for {monthNames[currentMonth]} {currentYear}
          </div>
        )}
      </div>
    </div>
  );
}