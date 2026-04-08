'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame, Loader2 } from 'lucide-react';
import Image from 'next/image';
import EditionCalendar from '@/components/EditionCalendar';

interface EditionPage {
  filename: string;
  url: string;
  pageNum: number;
}

interface Edition {
  _id: string;
  name: string;
  alias: string;
  date: string;
  pages: EditionPage[];
  status: string;
}

export default function Home() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [editionsRes, settingsRes] = await Promise.all([
          fetch('/api/editions'),
          fetch('/api/settings')
        ]);
        
        const editionsData = await editionsRes.json();
        const settingsData = await settingsRes.json();
        
        if (editionsData.editions) {
          // API already filters out non-public editions securely, so just take what it gives
          setEditions(editionsData.editions);
        }
        
        if (settingsData.success && settingsData.settings) {
          setSettings(settingsData.settings);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const isNew = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  };

  const renderAd = () => {
    if (!settings?.adEnabled) return null;
    return (
      <div className="w-full flex justify-center group relative bg-white p-1 pb-1.5 border border-gray-100 shadow-sm mt-2 lg:mt-0">
        <div className="absolute -top-2 -right-2 bg-white/80 backdrop-blur-sm shadow-sm text-gray-400 text-[9px] uppercase px-1.5 py-0.5 rounded border border-gray-100 z-10 select-none">
          Sponsored
        </div>
        
        {settings.adType === 'google' && settings.googleAdCode ? (
          <div 
            className="w-full h-auto overflow-hidden text-center min-h-[100px] flex items-center justify-center bg-gray-50" 
            dangerouslySetInnerHTML={{ __html: settings.googleAdCode }} 
          />
        ) : settings.adType === 'custom' && settings.customAdImage ? (
          <Link href={settings.customAdLink || '#'} target="_blank" rel="noopener noreferrer" className="block w-full max-w-[350px] mx-auto">
            <Image 
              src={settings.customAdImage} 
              alt="Advertisement" 
              width={300} 
              height={250} 
              className="w-full h-auto object-cover rounded-sm hover:opacity-95 transition-opacity mx-auto" 
            />
          </Link>
        ) : null}
      </div>
    );
  };

  return (
    <div className="pb-4" suppressHydrationWarning>
      {/* Mobile Section Header - App Style */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-[#D4A800] rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">Latest Editions</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {editions.length} issues
          </span>
        </div>
      </div>
      
      {/* Desktop Section Header */}
      <div className="hidden md:block bg-[#D4A800] text-white inline-block px-4 py-2 font-bold mb-4 rounded-sm shadow-sm">
        {settings?.siteName || 'Yellow Singam Telugu Daily'}
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4A800]" />
            </div>
          ) : editions.length === 0 ? (
            <div className="text-center py-20">
              <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No editions available yet</p>
              <p className="text-gray-400 text-sm mt-2">Check back soon!</p>
            </div>
          ) : (
            <>
              {/* Mobile: 2 column card grid with Material Design style */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {editions.map((edition) => (
                  <Link 
                    href={`/edition/${edition.alias}`} 
                    key={edition._id} 
                    className="group block bg-white rounded-xl md:rounded-sm overflow-hidden elevation-1 md:shadow-sm active:scale-[0.98] transition-all duration-150 touch-ripple relative"
                  >
                    {/* New badge for mobile */}
                    {isNew(edition.date) && (
                      <div className="md:hidden absolute top-2 left-2 z-10 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Flame size={10} />
                        NEW
                      </div>
                    )}
                    
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100" suppressHydrationWarning>
                      {edition.pages && edition.pages[0]?.url ? (
                        <Image
                          src={edition.pages[0].url}
                          alt={edition.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <CalendarIcon size={32} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Mobile: Rounded bottom with date */}
                    <div className="md:hidden p-3 bg-white">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <CalendarIcon size={14} className="text-[#D4A800]" />
                        <span className="text-sm font-medium">{formatDate(edition.date)}</span>
                      </div>
                    </div>
                    
                    {/* Desktop: Overlay style */}
                    <div className="hidden md:flex absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-1.5 text-sm items-center justify-center gap-2 backdrop-blur-sm">
                      <CalendarIcon size={14} />
                      {formatDate(edition.date)}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination - Hidden on mobile */}
              <div className="hidden md:flex mt-8 flex-wrap justify-center items-center gap-1.5 sm:gap-2">
                <button className="px-2 sm:px-3 py-1.5 border bg-white text-gray-600 hover:bg-gray-50 rounded-sm text-xs sm:text-sm font-medium transition-colors">&laquo; First</button>
                <button className="px-2 sm:px-3 py-1.5 border bg-white text-gray-600 hover:bg-gray-50 rounded-sm text-xs sm:text-sm font-medium transition-colors">&lsaquo; Prev</button>
                <button className="px-2.5 sm:px-3 py-1.5 border bg-[#D4A800] text-white rounded-sm text-xs sm:text-sm font-bold">1</button>
                <button className="px-2 sm:px-3 py-1.5 border bg-white text-gray-600 hover:bg-gray-50 rounded-sm text-xs sm:text-sm font-medium transition-colors">Next &rsaquo;</button>
                <button className="px-2 sm:px-3 py-1.5 border bg-white text-gray-600 hover:bg-gray-50 rounded-sm text-xs sm:text-sm font-medium transition-colors">Last &raquo;</button>
              </div>
              
              {/* Mobile: Load More Button */}
              <div className="md:hidden mt-6 flex justify-center">
                <button className="flex items-center gap-2 bg-white text-[#D4A800] border-2 border-[#D4A800] px-6 py-3 rounded-[10px] font-semibold text-sm active:bg-[#FFF3C4] transition-colors touch-ripple elevation-1">
                  Load More Editions
                </button>
              </div>
            </>
          )}

          {/* Mobile Ad Render (Below Editions) */}
          <div className="lg:hidden mt-8 mb-4 flex justify-center w-full">
            {renderAd()}
          </div>
        </div>

        {/* Sidebar - Calendar & Ads (Hidden on Mobile) */}
        <div className="hidden lg:flex w-[240px] shrink-0 lg:sticky lg:top-4 self-start flex-col gap-4">
          <EditionCalendar />

          {/* Right Sidebar Ad Space */}
          {renderAd()}
        </div>
      </div>

    </div>
  );
}
