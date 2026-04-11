'use client';

import { ChevronLeft, ChevronRight, ZoomIn, Crop, X, Share2, Copy, ExternalLink, Facebook, MessageCircle, Linkedin, Send, Mail, Image as ImageIcon, Maximize, Minimize2, Map, Loader2, Calendar, MoreHorizontal, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EditionPage {
  filename: string;
  url: string;
  pageNum: number;
  previewUrl?: string;
}

interface Edition {
  _id: string;
  name: string;
  alias: string;
  date: string;
  pages: EditionPage[];
  pageCount: number;
}

interface EditionReaderProps {
  initialEdition: Edition;
  alias: string;
}

export default function EditionReader({ initialEdition, alias }: EditionReaderProps) {
  const [edition, setEdition] = useState<Edition>(initialEdition);
  const [loading, setLoading] = useState(false);
  const [mainImageLoading, setMainImageLoading] = useState(true);
  const [mainImageError, setMainImageError] = useState(false);
  const [mainImageRetry, setMainImageRetry] = useState(0);
  const [thumbRetries, setThumbRetries] = useState<Record<number, number>>({});
  const [[currentPage, direction], setPage] = useState([0, 0]);
  const [currentClipId, setCurrentClipId] = useState('');
  const [cropImageLoaded, setCropImageLoaded] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isFitToScreen, setIsFitToScreen] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [crop, setCrop] = useState({ x: 20, y: 25, w: 60, h: 35 });
  const [miniMap, setMiniMap] = useState({ top: 0, left: 0, width: 100, height: 100 });
  const [isMiniMapMinimized, setIsMiniMapMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [imageTransform, setImageTransform] = useState({ scale: 1, x: 0, y: 0 });
  const mobileZoomRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ touches: { x: number; y: number }[]; scale: number; x: number; y: number } | null>(null);
  const lastDistanceRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: 'move' | 'resize', handle?: string, startX: number, startY: number, startCrop: typeof crop } | null>(null);
  const touchRef = useRef<{ type: 'move' | 'resize', handle?: string, startX: number, startY: number, startCrop: typeof crop } | null>(null);

  // Sync if initialEdition changes (e.g. on navigation)
  useEffect(() => {
    setEdition(initialEdition);
    setPage([0, 0]);
  }, [initialEdition._id]);

  // Get current page image URL
  const getCurrentPageUrl = () => {
    if (!edition || !edition.pages || edition.pages.length === 0) {
      return '';
    }
    return edition.pages[currentPage]?.url || '';
  };

  // Proxy URL logic
  const getCurrentPageProxyUrl = () => {
    const raw = getCurrentPageUrl();
    if (!raw) return '';
    if (mainImageRetry <= 0) return raw;
    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}r=${mainImageRetry}`;
  };

  const getProxyUrl = (rawUrl: string, pageNum?: number) => {
    if (!rawUrl) return '';
    const retryCount = pageNum !== undefined ? (thumbRetries[pageNum] || 0) : 0;
    if (retryCount === 0) return rawUrl;
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}r=${retryCount}`;
  };

  useEffect(() => {
    setMainImageLoading(true);
    setMainImageError(false);
    setMainImageRetry(0);
  }, [currentPage, edition?._id]);

  const setCurrentPage = (newVal: number | ((prev: number) => number)) => {
    const newIndex = typeof newVal === 'function' ? newVal(currentPage) : newVal;
    const newDirection = newIndex > currentPage ? 1 : -1;
    setPage([newIndex, newDirection]);
  };
  
  const pages = edition?.pages || [];
  const totalPages = pages.length;

  // Preloading Logic
  const preloadImage = (url: string) => {
    if (!url || typeof window === 'undefined') return;
    const img = new window.Image();
    img.src = url;
  };

  useEffect(() => {
    if (!edition || !edition.pages) return;
    const pagesToPreload = [currentPage + 1, currentPage + 2, currentPage - 1];
    pagesToPreload.forEach(idx => {
      if (idx >= 0 && idx < totalPages) {
        preloadImage(getProxyUrl(pages[idx].url, pages[idx].pageNum));
      }
    });
  }, [currentPage, edition, totalPages]);

  const handlePageHover = (idx: number) => {
    if (idx >= 0 && idx < totalPages) {
      preloadImage(getProxyUrl(pages[idx].url, pages[idx].pageNum));
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent, type: 'move' | 'resize', handle?: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    touchRef.current = {
      type,
      handle,
      startX: touch.clientX,
      startY: touch.clientY,
      startCrop: { ...crop }
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current || !mobileContainerRef.current) return;
    e.stopPropagation();

    const touch = e.touches[0];
    const { type, handle, startX, startY, startCrop } = touchRef.current;
    const rect = mobileContainerRef.current.getBoundingClientRect();

    const dx = ((touch.clientX - startX) / rect.width) * 100;
    const dy = ((touch.clientY - startY) / rect.height) * 100;

    if (type === 'move') {
      let newX = startCrop.x + dx;
      let newY = startCrop.y + dy;
      newX = Math.max(0, Math.min(newX, 100 - startCrop.w));
      newY = Math.max(0, Math.min(newY, 100 - startCrop.h));
      setCrop({ x: newX, y: newY, w: startCrop.w, h: startCrop.h });
    } else if (type === 'resize' && handle) {
      let newX = startCrop.x;
      let newY = startCrop.y;
      let newW = startCrop.w;
      let newH = startCrop.h;

      if (handle.includes('e')) newW = Math.min(100 - startCrop.x, Math.max(15, startCrop.w + dx));
      if (handle.includes('s')) newH = Math.min(100 - startCrop.y, Math.max(15, startCrop.h + dy));
      if (handle.includes('w')) {
        const maxDx = startCrop.w - 15;
        const actualDx = Math.min(dx, maxDx);
        const boundedDx = Math.max(-startCrop.x, actualDx);
        newX = startCrop.x + boundedDx;
        newW = startCrop.w - boundedDx;
      }
      if (handle.includes('n')) {
        const maxDy = startCrop.h - 15;
        const actualDy = Math.min(dy, maxDy);
        const boundedDy = Math.max(-startCrop.y, actualDy);
        newY = startCrop.y + boundedDy;
        newH = startCrop.h - boundedDy;
      }
      setCrop({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
    setIsDragging(false);
  };

  // Zoom Logic
  const getDistance = (touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2));
  };

  const handleZoomTouchStart = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    touchStartRef.current = {
      touches,
      scale: imageTransform.scale,
      x: imageTransform.x,
      y: imageTransform.y
    };
    if (touches.length === 2) {
      lastDistanceRef.current = getDistance(touches[0], touches[1]);
    }
    if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (imageTransform.scale > 1) {
          setImageTransform({ scale: 1, x: 0, y: 0 });
        } else {
          const rect = mobileZoomRef.current?.getBoundingClientRect();
          if (rect) {
            const centerX = touches[0].x - rect.left - rect.width / 2;
            const centerY = touches[0].y - rect.top - rect.height / 2;
            setImageTransform({ scale: 2.5, x: -centerX, y: -centerY });
          }
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  const handleZoomTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !mobileZoomRef.current) return;
    const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    const startData = touchStartRef.current;
    const container = mobileZoomRef.current.getBoundingClientRect();

    if (touches.length === 2 && startData.touches.length >= 2) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const scaleDiff = currentDistance / lastDistanceRef.current;
      const newScale = Math.min(4, Math.max(1, startData.scale * scaleDiff));
      const centerX = (touches[0].x + touches[1].x) / 2;
      const centerY = (touches[0].y + touches[1].y) / 2;
      const startCenterX = (startData.touches[0].x + startData.touches[1].x) / 2;
      const startCenterY = (startData.touches[0].y + startData.touches[1].y) / 2;
      let newX = startData.x + (centerX - startCenterX);
      let newY = startData.y + (centerY - startCenterY);
      const maxX = (container.width * (newScale - 1)) / 2;
      const maxY = (container.height * (newScale - 1)) / 2;
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));
      setImageTransform({ scale: newScale, x: newX, y: newY });
    } else if (touches.length === 1 && imageTransform.scale > 1) {
      const dx = touches[0].x - startData.touches[0].x;
      const dy = touches[0].y - startData.touches[0].y;
      let newX = startData.x + dx;
      let newY = startData.y + dy;
      const maxX = (container.width * (imageTransform.scale - 1)) / 2;
      const maxY = (container.height * (imageTransform.scale - 1)) / 2;
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));
      setImageTransform(prev => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handleZoomTouchEnd = () => {
    if (imageTransform.scale < 1) {
      setImageTransform({ scale: 1, x: 0, y: 0 });
    }
    if (imageTransform.scale > 0.95 && imageTransform.scale < 1.05) {
      setImageTransform({ scale: 1, x: 0, y: 0 });
    }
  };

  // Swipe logic
  const handleSwipeStart = (e: React.TouchEvent) => {
    if (isZoomOpen || isCropOpen) return;
    setSwipeStart(e.touches[0].clientX);
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStart === null || isZoomOpen || isCropOpen) return;
    const swipeEnd = e.changedTouches[0].clientX;
    const diff = swipeStart - swipeEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        if (currentPage < totalPages - 1) setPage([currentPage + 1, 1]);
      } else {
        if (currentPage > 0) setPage([currentPage - 1, -1]);
      }
    }
    setSwipeStart(null);
  };

  const pageVariants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      opacity: 0,
      transformOrigin: direction > 0 ? "left" : "right"
    }),
    center: {
      zIndex: 1,
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transition: {
        rotateY: { type: 'spring', stiffness: 200, damping: 25 } as any,
        opacity: { duration: 0.3 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      rotateY: direction < 0 ? 90 : -90,
      opacity: 0,
      transformOrigin: direction < 0 ? "left" : "right",
      transition: {
        rotateY: { type: 'spring', stiffness: 200, damping: 25 } as any,
        opacity: { duration: 0.3 }
      }
    })
  };

  const updateMiniMap = () => {
    if (!zoomContainerRef.current) return;
    const { scrollTop, scrollLeft, clientHeight, clientWidth, scrollHeight, scrollWidth } = zoomContainerRef.current;
    if (scrollHeight === 0 || scrollWidth === 0) return;
    setMiniMap({
      top: (scrollTop / scrollHeight) * 100,
      left: (scrollLeft / scrollWidth) * 100,
      height: Math.min((clientHeight / scrollHeight) * 100, 100),
      width: Math.min((clientWidth / scrollWidth) * 100, 100),
    });
  };

  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomContainerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const widthPercent = clickX / rect.width;
    const heightPercent = clickY / rect.height;
    const { scrollWidth, scrollHeight, clientWidth, clientHeight } = zoomContainerRef.current;
    zoomContainerRef.current.scrollTo({
      left: (widthPercent * scrollWidth) - (clientWidth / 2),
      top: (heightPercent * scrollHeight) - (clientHeight / 2),
      behavior: 'smooth'
    });
  };

  const handleZoomImageClick = (e: React.MouseEvent) => {
    if (isFitToScreen) {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPercent = (e.clientX - rect.left) / rect.width;
      const yPercent = (e.clientY - rect.top) / rect.height;
      setIsFitToScreen(false);
      setTimeout(() => {
        if (zoomContainerRef.current) {
          const { scrollWidth, scrollHeight, clientWidth, clientHeight } = zoomContainerRef.current;
          zoomContainerRef.current.scrollTo({
            left: (xPercent * scrollWidth) - (clientWidth / 2),
            top: (yPercent * scrollHeight) - (clientHeight / 2),
            behavior: 'smooth'
          });
        }
      }, 50);
    } else {
      setIsFitToScreen(true);
    }
  };

  const handleShareClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    const currentPageUrl = getCurrentPageUrl();
    if (!currentPageUrl) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yellowsingam.com';
    const clipId = `C-${Math.floor(100000 + Math.random() * 900000)}`;
    const displayDate = formatDate(edition?.date);
    const pageNum = currentPage + 1;
    const dynamicLink = `${baseUrl}/edition/${alias}/clip?url=${encodeURIComponent(currentPageUrl)}&x=${crop.x}&y=${crop.y}&w=${crop.w}&h=${crop.h}&title=${encodeURIComponent(edition?.name || 'ePaper Clip')}&base=${encodeURIComponent(baseUrl)}&date=${encodeURIComponent(displayDate)}&page=${pageNum}&cid=${clipId}`;
    setGeneratedLink(dynamicLink);
    setCurrentClipId(clipId);
    setIsShareModalOpen(true);
  };

  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      type, handle, startX: e.clientX, startY: e.clientY, startCrop: { ...crop }
    };
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      if (!dragRef.current || !containerRef.current) return;
      const { type, handle, startX, startY, startCrop } = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
      if (type === 'move') {
        let newX = Math.max(0, Math.min(startCrop.x + dx, 100 - startCrop.w));
        let newY = Math.max(0, Math.min(startCrop.y + dy, 100 - startCrop.h));
        setCrop({ x: newX, y: newY, w: startCrop.w, h: startCrop.h });
      } else if (type === 'resize' && handle) {
        let newX = startCrop.x, newY = startCrop.y, newW = startCrop.w, newH = startCrop.h;
        if (handle.includes('e')) newW = Math.min(100 - startCrop.x, Math.max(10, startCrop.w + dx));
        if (handle.includes('s')) newH = Math.min(100 - startCrop.y, Math.max(10, startCrop.h + dy));
        if (handle.includes('w')) {
          const boundedDx = Math.max(-startCrop.x, Math.min(dx, startCrop.w - 10));
          newX = startCrop.x + boundedDx; newW = startCrop.w - boundedDx;
        }
        if (handle.includes('n')) {
          const boundedDy = Math.max(-startCrop.y, Math.min(dy, startCrop.h - 10));
          newY = startCrop.y + boundedDy; newH = startCrop.h - boundedDy;
        }
        setCrop({ x: newX, y: newY, w: newW, h: newH });
      }
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      dragRef.current = null;
      (upEvent.target as HTMLElement)?.releasePointerCapture?.(upEvent.pointerId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="flex flex-col md:gap-4">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#2D2D2D] text-white safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Page {currentPage + 1} of {totalPages}</span>
              <span className="text-xs text-[#D4A800]">{formatDate(edition.date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsZoomOpen(true)} className="p-2.5 rounded-full active:bg-white/20 transition-all duration-200 active:scale-95 hover:bg-white/10">
              <ZoomIn size={20} />
            </button>
            <button onClick={() => setIsCropOpen(true)} className="p-2.5 rounded-full active:bg-[#D4A800]/20 transition-all duration-200 active:scale-95 hover:bg-[#D4A800]/10">
              <Crop size={20} className="text-[#D4A800]" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Toolbar */}
      <div className="hidden md:flex sticky top-0 z-40 bg-white border shadow-sm p-2 flex-wrap items-center justify-between gap-4 rounded-sm">
        <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button onClick={() => !isCropOpen && setCurrentPage(0)} disabled={currentPage === 0 || isCropOpen} className="px-3 py-1.5 border hover:bg-gray-50 bg-white disabled:opacity-30">&laquo; First</button>
          {pages.map((p, i) => (
            <button key={p.pageNum} onClick={() => !isCropOpen && setCurrentPage(i)} onMouseEnter={() => !isCropOpen && handlePageHover(i)} className={`px-3 py-1.5 border ${i === currentPage ? 'bg-[#D4A800] text-white font-bold' : 'hover:bg-gray-50 bg-white'} ${isCropOpen ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isCropOpen}>{p.pageNum}</button>
          ))}
          <button onClick={() => !isCropOpen && setCurrentPage(totalPages - 1)} disabled={currentPage === totalPages - 1 || isCropOpen} className="px-3 py-1.5 border hover:bg-gray-50 bg-white disabled:opacity-30">Last &raquo;</button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button onClick={() => !isCropOpen && setIsZoomOpen(true)} disabled={isCropOpen} className={`flex items-center gap-2 bg-[#1f1f1f] text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-md font-medium ${isCropOpen ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#2a2a2a] active:scale-95'}`}><ZoomIn size={16} /> Zoom</button>
          <button onClick={() => setIsCropOpen(true)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-sm text-sm hover:bg-red-700 transition-colors"><Crop size={16} /> Crop</button>
        </div>
      </div>

      {/* Mobile Viewer */}
      <div className="md:hidden fixed inset-0 pt-14 bg-black z-40 flex flex-col">
        <div ref={mobileContainerRef} className={`relative w-full flex-1 min-h-0 ${!isCropOpen ? 'cursor-zoom-in' : ''} overflow-hidden`} style={{ perspective: '1200px' }} onClick={() => !isCropOpen && setIsZoomOpen(true)} onTouchStart={isCropOpen ? undefined : handleSwipeStart} onTouchMove={isCropOpen ? handleTouchMove : undefined} onTouchEnd={isCropOpen ? handleTouchEnd : handleSwipeEnd}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div key={currentPage} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0 w-full h-full">
              <Image key={`mobile-main-${currentPage}-${mainImageRetry}`} src={getCurrentPageProxyUrl()} alt="Main Page View" fill className="object-contain" sizes="100vw" priority referrerPolicy="no-referrer" onLoad={() => setMainImageLoading(false)} onError={() => { setMainImageLoading(false); setMainImageError(true); }} />
            </motion.div>
          </AnimatePresence>
          {mainImageLoading && <div className="fixed inset-0 z-[100] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#D4A800]" /></div>}
          
          {/* Crop controls */}
          {isCropOpen && (
            <div className="absolute inset-0 z-10">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: `${crop.y}%` }} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${100 - crop.y - crop.h}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${crop.y}%`, left: 0, width: `${crop.x}%`, height: `${crop.h}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${crop.y}%`, right: 0, width: `${100 - crop.x - crop.w}%`, height: `${crop.h}%` }} />
              </div>
              <div className={`absolute border-2 ${isDragging ? 'border-[#D4A800]' : 'border-white'}`} style={{ top: `${crop.y}%`, left: `${crop.x}%`, width: `${crop.w}%`, height: `${crop.h}%` }}>
                <div className="absolute inset-4 cursor-move" onTouchStart={(e) => handleTouchStart(e, 'move')} />
                <div className="absolute left-0 right-0 flex justify-center gap-3 transition-all duration-300" style={{ top: crop.y < 12 ? 'calc(100% + 12px)' : '-60px' }}>
                  <button onClick={handleShareClick} className="bg-[#007bff] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm"><Share2 size={18} /> Share</button>
                  <button onClick={() => setIsCropOpen(false)} className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm border border-white/20"><X size={18} /> Cancel</button>
                </div>
                {['nw', 'ne', 'sw', 'se'].map(h => <div key={h} className={`absolute ${h.includes('n') ? '-top-4' : '-bottom-4'} ${h.includes('w') ? '-left-4' : '-right-4'} w-10 h-10 flex items-center justify-center`} onTouchStart={(e) => handleTouchStart(e, 'resize', h)}><div className="w-6 h-6 rounded-full bg-white" /></div>)}
              </div>
            </div>
          )}
        </div>
        {!isCropOpen && <div className="bg-[#1a1a1a] p-3 pb-[60px] overflow-x-auto flex gap-2">{pages.map((p, i) => <button key={p.pageNum} onClick={() => setCurrentPage(i)} className={`min-w-[42px] h-[42px] rounded-lg border-2 text-sm font-bold ${i === currentPage ? 'bg-[#D4A800] border-[#D4A800]' : 'bg-white/5 border-white/20 text-white'}`}>{p.pageNum}</button>)}</div>}
      </div>

      {/* Desktop Viewer */}
      <div className="hidden md:flex gap-4">
        <div className="w-48 shrink-0 bg-white border p-3 flex flex-col gap-4 overflow-y-auto max-h-screen">
          {pages.map((p, i) => (
            <button key={p.pageNum} onClick={() => setCurrentPage(i)} className={`border p-2 group ${i === currentPage ? 'ring-2 ring-[#D4A800]' : ''}`}>
              <div className={`text-xs font-bold py-1 mb-2 ${i === currentPage ? 'bg-[#D4A800] text-white' : 'bg-gray-100'}`}>PAGE {p.pageNum}</div>
              <div className="relative aspect-[2/3]"><Image src={getProxyUrl(p.previewUrl || p.url)} alt={`Page ${p.pageNum}`} fill className="object-cover" /></div>
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white border overflow-hidden">
          <div className="bg-[#2D2D2D] text-white px-4 py-2 text-sm">Yellow Singam Telugu Daily / {formatDate(edition.date)} / Page: {currentPage + 1}</div>
          <div ref={containerRef} className={`relative aspect-[2/3] w-full bg-white overflow-hidden ${!isCropOpen ? 'cursor-zoom-in' : ''}`} style={{ perspective: '1200px' }} onClick={() => !isCropOpen && setIsZoomOpen(true)}>
            <AnimatePresence initial={false} custom={direction}><motion.div key={currentPage} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0"><Image key={`desktop-${currentPage}`} src={getCurrentPageProxyUrl()} alt="Main View" fill className="object-contain" onLoad={() => setMainImageLoading(false)} /></motion.div></AnimatePresence>
            {isCropOpen && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-auto border-2 border-white" style={{ top: `${crop.y}%`, left: `${crop.x}%`, width: `${crop.w}%`, height: `${crop.h}%` }} onPointerDown={(e) => handlePointerDown(e, 'move')}>
                  <div className="absolute left-0 right-0 flex justify-center gap-3" style={{ top: crop.y < 12 ? 'calc(100% + 15px)' : '-60px' }}>
                    <button onClick={handleShareClick} onPointerDown={e => e.stopPropagation()} className="bg-[#007bff] text-white px-6 py-2.5 rounded-xl font-bold">Share</button>
                    <button onClick={() => setIsCropOpen(false)} onPointerDown={e => e.stopPropagation()} className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-xl font-bold underline">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">Share Clip</h3><button onClick={() => setIsShareModalOpen(false)}><X size={24}/></button></div>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
              <div className="bg-[#D4A800] text-black font-bold text-sm p-1">CID: {currentClipId}</div>
              <p className="text-sm mt-2 truncate">{generatedLink}</p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert('Copied!'); }} className="bg-[#D4A800] px-4 py-2 rounded font-bold">Copy Link</button>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generatedLink)}`)} className="bg-[#25D366] text-white px-4 py-2 rounded font-bold">WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Overlay (Minimal Version for brevity) */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" onTouchStart={handleZoomTouchStart} onTouchMove={handleZoomTouchMove} onTouchEnd={handleZoomTouchEnd}>
          <div className="flex justify-between items-center p-4 text-white"><span>Page {currentPage + 1}</span><button onClick={() => setIsZoomOpen(false)}><X size={32}/></button></div>
          <div className="flex-1 relative overflow-hidden">
             <div className="w-full h-full relative" style={{ transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`, transformOrigin: 'center center' }}>
               <Image src={getCurrentPageProxyUrl()} alt="Zoomed" fill className="object-contain" />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
