'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Newspaper, Download, Share2, ChevronLeft, ChevronRight, X, Copy, Facebook, Twitter, MessageCircle, Mail, Loader2 } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'Home', href: '/', icon: Home, isModal: false as const },
  // Latest should always open today's edition based on date, not a static path.
  { name: 'Latest', href: '#', icon: Newspaper, isModal: 'latest' as const },
  { name: 'Calendar', href: '#', icon: Calendar, isModal: true as const },
  { name: 'Share', href: '#', icon: Share2, isModal: 'share' as const },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_TELUGU = [
  'జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్',
  'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.isModal === true) {
      e.preventDefault();
      setIsCalendarOpen(true);
    } else if (item.isModal === 'share') {
      e.preventDefault();
      handleShare();
    } else if (item.isModal === 'latest') {
      e.preventDefault();
      handleLatestClick();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Yellow Singam Telugu Daily',
      text: 'చదవండి Yellow Singam Telugu Daily ePaper ఆన్‌లైన్‌లో',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
    setIsShareModalOpen(false);
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = async (day: number) => {
    setLoading(true);
    setError('');
    
    const selectedDate = new Date(currentYear, currentMonth, day);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    try {
      const response = await fetch(`/api/editions/by-date?date=${dateStr}`);
      const data = await response.json();
      
      if (data.found && data.edition) {
        setIsCalendarOpen(false);
        router.push(`/edition/${data.edition.alias}`);
      } else {
        setError(`${day} ${MONTH_NAMES_TELUGU[currentMonth]} నాడు ఎడిషన్ లేదు`);
      }
    } catch (err) {
      setError('ఎర్రర్ వచ్చింది. మళ్ళీ ట్రై చేయండి');
    } finally {
      setLoading(false);
    }
  };

  const handleTodayClick = async () => {
    setLoading(true);
    setError('');
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    try {
      const response = await fetch(`/api/editions/by-date?date=${dateStr}`);
      const data = await response.json();
      
      if (data.found && data.edition) {
        setIsCalendarOpen(false);
        router.push(`/edition/${data.edition.alias}`);
      } else {
        setError('ఈ రోజు ఎడిషన్ ఇంకా అప్‌లోడ్ కాలేదు');
      }
    } catch (err) {
      setError('ఎర్రర్ వచ్చింది');
    } finally {
      setLoading(false);
    }
  };

  // Bottom-nav "Latest" – jump directly to today's edition (same logic as handleTodayClick,
  // but without opening the calendar modal UI)
  const handleLatestClick = async () => {
    setLoading(true);
    setError('');

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    try {
      const response = await fetch(`/api/editions/by-date?date=${dateStr}`);
      const data = await response.json();

      if (data.found && data.edition) {
        router.push(`/edition/${data.edition.alias}`);
      } else {
        alert('ఈ రోజు ఎడిషన్ ఇంకా అప్‌లోడ్ కాలేదు');
      }
    } catch (err) {
      alert('ఎర్రర్ వచ్చింది. మళ్ళీ ప్రయత్నించండి');
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  return (
    <>
      {/* Share Modal - Fallback for browsers without native share */}
      {isShareModalOpen && (
        <div 
          className="md:hidden fixed inset-0 z-[100] flex items-end justify-center"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-slide-up safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full" />
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
            
            <div className="mt-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 text-center">Share ePaper</h2>
              <p className="text-sm text-gray-500 text-center mt-1">Share with your friends and family</p>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-6">
              <button 
                onClick={copyToClipboard}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                  <Copy size={20} className="text-white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">Copy Link</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#1877f2] flex items-center justify-center">
                  <Facebook size={20} className="text-white" fill="white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">Facebook</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                  <MessageCircle size={20} className="text-white" fill="white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">WhatsApp</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                  <Twitter size={20} className="text-white" fill="white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">Twitter</span>
              </button>
            </div>
            
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {isCalendarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-[100] flex items-end justify-center"
          onClick={() => setIsCalendarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal Content - Slide up from bottom */}
          <div 
            className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-20 animate-slide-up safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full" />
            
            {/* Close button */}
            <button 
              onClick={() => setIsCalendarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
            
            {/* Calendar Header */}
            <div className="mt-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 text-center">Edition Calendar</h2>
              <p className="text-sm text-gray-500 text-center mt-1">Select a date</p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            
            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-[#FFF3C4] p-3 mb-4 rounded-xl">
              <button 
                onClick={goToPrevMonth}
                className="p-2 hover:bg-[#D4A800]/20 rounded-full active:scale-95 transition-all"
              >
                <ChevronLeft size={20} className="text-[#2D2D2D]" />
              </button>
              <span className="font-bold text-lg text-[#2D2D2D]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button 
                onClick={goToNextMonth}
                className="p-2 hover:bg-[#D4A800]/20 rounded-full active:scale-95 transition-all"
              >
                <ChevronRight size={20} className="text-[#2D2D2D]" />
              </button>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-bold mb-3 text-gray-500 uppercase tracking-tighter">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {/* Empty slots for days before 1st */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const today = new Date();
                const isToday = 
                  day === today.getDate() && 
                  currentMonth === today.getMonth() && 
                  currentYear === today.getFullYear();

                const isFuture = () => {
                  const d = new Date(currentYear, currentMonth, day);
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  return d > now;
                };

                const future = isFuture();
                return (
                  <button
                    key={day}
                    onClick={() => !future && handleDateClick(day)}
                    disabled={loading || future}
                    className={`p-2 text-sm rounded-xl transition-all active:scale-95 ${
                      isToday 
                        ? 'bg-[#D4A800] text-white font-bold shadow-lg' 
                        : future
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                          : 'bg-gray-50 text-gray-700 hover:bg-[#FFF3C4]'
                    } ${loading ? 'opacity-50' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleTodayClick}
                disabled={loading}
                className="flex-1 py-3 bg-[#D4A800] text-white font-semibold rounded-xl active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Today's Edition"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50 elevation-3">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && item.href !== '#' && pathname.startsWith(item.href)) ||
              (item.name === 'Calendar' && isCalendarOpen);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(item, e)}
                className={`flex flex-col items-center justify-center flex-1 h-full touch-ripple transition-all duration-200 ${
                  isActive 
                    ? 'text-[#D4A800]' 
                    : 'text-gray-500 active:text-gray-700'
                }`}
              >
                <div className={`p-1.5 rounded-2xl transition-all duration-200 ${
                  isActive ? 'bg-[#FFF3C4]' : ''
                }`}>
                  <Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className="transition-all duration-200"
                  />
                </div>
                <span className={`text-[10px] mt-0.5 font-medium transition-all duration-200 ${
                  isActive ? 'font-semibold' : ''
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
