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
  const [desktopZoomScale, setDesktopZoomScale] = useState(1);
  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [crop, setCrop] = useState({ x: 20, y: 25, w: 60, h: 35 });
  const [miniMap, setMiniMap] = useState({ top: 0, left: 0, width: 100, height: 100 });
  const [isMiniMapMinimized, setIsMiniMapMinimized] = useState(true);
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

  // Prevent body scroll when zoom is open
  useEffect(() => {
    if (isZoomOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isZoomOpen]);

  const handleZoomIn = () => {
    setIsFitToScreen(false);
    setDesktopZoomScale(prev => Math.min(prev + 0.25, 3));
    setImageTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.25, 4) }));
  };

  const handleZoomOut = () => {
    setIsFitToScreen(false);
    setDesktopZoomScale(prev => Math.max(prev - 0.25, 0.5));
    setImageTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.25, 0.5) }));
  };

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
    <div className="flex flex-col">
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
      <div className="hidden md:flex sticky top-0 z-40 bg-white border-b shadow-sm p-1.5 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <div className="px-3 py-1.5 bg-gray-100 border font-bold text-[#D4A800] mr-2 rounded-sm shrink-0 uppercase tracking-tighter text-[10px]">
            {currentPage + 1} / {totalPages}
          </div>
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
      <div className="md:hidden fixed top-0 left-0 right-0 bottom-[70px] pt-14 bg-black z-40 flex flex-col">
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
          <div className={`absolute border-2 ${isDragging ? 'border-[#D4A800]' : 'border-white'} transition-colors`} style={{ top: `${crop.y}%`, left: `${crop.x}%`, width: `${crop.w}%`, height: `${crop.h}%` }}>
            <div className="absolute inset-4 cursor-move" onTouchStart={(e) => handleTouchStart(e, 'move')} />
            
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/40" />
              <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white/40" />
              <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/40" />
              <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/40" />
            </div>

            <div className="absolute left-0 right-0 flex justify-center gap-3 transition-all duration-300" style={{ top: crop.y < 12 ? 'calc(100% + 12px)' : '-60px' }}>
              <button onClick={handleShareClick} className="bg-[#007bff] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm"><Share2 size={18} /> Share</button>
              <button onClick={() => setIsCropOpen(false)} className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm border border-white/20"><X size={18} /> Cancel</button>
            </div>

            {/* Corner Resize Handles - Large touch targets */}
            <div className="absolute -top-4 -left-4 w-10 h-10 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'nw')}>
              <div className={`w-6 h-6 rounded-full border-2 ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
            <div className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'ne')}>
              <div className={`w-6 h-6 rounded-full border-2 ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
            <div className="absolute -bottom-4 -left-4 w-10 h-10 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'sw')}>
              <div className={`w-6 h-6 rounded-full border-2 ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
            <div className="absolute -bottom-4 -right-4 w-10 h-10 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'se')}>
              <div className={`w-6 h-6 rounded-full border-2 ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>

            {/* Edge Resize Handles */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'n')}>
              <div className={`w-8 h-2 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 's')}>
              <div className={`w-8 h-2 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
            <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-12 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'w')}>
              <div className={`w-2 h-8 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-12 flex items-center justify-center" onTouchStart={(e) => handleTouchStart(e, 'resize', 'e')}>
              <div className={`w-2 h-8 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg`} />
            </div>
          </div>
            </div>
          )}
        </div>
        {!isCropOpen && (
          <div className="relative z-50 bg-[#1a1a1a] p-3 pb-24 safe-bottom overflow-x-auto flex flex-col gap-2 border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center px-1">
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Select Page</span>
              <span className="bg-[#D4A800] text-black text-[10px] px-2 py-0.5 rounded-full font-black">
                {currentPage + 1} OF {totalPages}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {pages.map((p, i) => (
                <button 
                  key={p.pageNum} 
                  onClick={() => setCurrentPage(i)} 
                  className={`min-w-[44px] h-[44px] shrink-0 rounded-lg border-2 text-sm font-bold transition-all active:scale-90 ${i === currentPage ? 'bg-[#D4A800] border-[#D4A800] text-black shadow-[0_0_15px_rgba(212,168,0,0.4)]' : 'bg-white/10 border-white/30 text-white'}`}
                >
                  {p.pageNum}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Viewer */}
      <div className="hidden md:flex gap-4">
        {/* Left Sidebar (Thumbnails) - Sticky */}
        <div className="w-48 shrink-0 bg-white border p-3 flex flex-col gap-3 sticky top-[52px] max-h-[calc(100vh-60px)] overflow-y-auto">
          {pages.map((p, i) => (
            <button key={p.pageNum} onClick={() => setCurrentPage(i)} className={`border p-2 group ${i === currentPage ? 'ring-2 ring-[#D4A800]' : ''}`}>
              <div className={`text-xs font-bold py-1 mb-2 ${i === currentPage ? 'bg-[#D4A800] text-white' : 'bg-gray-100'}`}>PAGE {p.pageNum}</div>
              <div className="relative aspect-[2/3] w-full bg-gray-100">
                <Image 
                  src={getProxyUrl(p.previewUrl || p.url, p.pageNum)} 
                  alt={`Page ${p.pageNum}`} 
                  fill 
                  className="object-cover" 
                  sizes="192px"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Right Column (Main Viewer) - Natural Height */}
        <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col min-h-[calc(100vh-120px)]">
          {/* Desktop Reader Header */}
          <div className="bg-[#2D2D2D] text-white px-4 py-2.5 text-sm flex justify-between items-center shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#D4A800] tracking-wide uppercase">Yellow Singam Telugu Daily</span>
              <span className="text-white/40">|</span>
              <span className="font-medium">{formatDate(edition.date)}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-sm text-xs font-bold ring-1 ring-white/20">
                PAGE {currentPage + 1} OF {totalPages}
              </div>
            </div>
          </div>

          <div 
            ref={containerRef} 
            className={`relative aspect-[2/3] w-full bg-white transition-all duration-300 ${!isCropOpen ? 'cursor-zoom-in' : ''}`}
            style={{ perspective: '1200px' }}
            onClick={() => !isCropOpen && setIsZoomOpen(true)}
          >
            {/* Loader */}
            {mainImageLoading && (
              <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-[2px]">
                <Loader2 className="w-12 h-12 animate-spin text-[#D4A800]" />
                <span className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Page...</span>
              </div>
            )}

              {/* Error State */}
              {mainImageError && !mainImageLoading && (
                <div className="absolute inset-0 z-[46] flex flex-col items-center justify-center bg-white p-6 text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <ImageIcon className="text-red-400" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Failed to load page</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-xs">Something went wrong while fetching the high-quality image. Please try again.</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMainImageLoading(true);
                      setMainImageError(false);
                      setMainImageRetry(prev => prev + 1);
                    }}
                    className="flex items-center gap-2 bg-[#D4A800] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#b89200] transition-colors shadow-lg active:scale-95"
                  >
                    <RotateCcw size={18} />
                    Retry Now
                  </button>
                </div>
              )}

              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentPage}
                  custom={direction}
                  variants={pageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 w-full h-full"
                >
                  {getCurrentPageProxyUrl() && (
                    <Image
                      key={`desktop-main-${currentPage}-${mainImageRetry}`}
                      src={getCurrentPageProxyUrl()}
                      alt={`Yellow Singam Page ${currentPage + 1}`}
                      fill
                      className="object-contain"
                      referrerPolicy="no-referrer"
                      sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 800px, 1200px"
                      priority
                      onLoad={() => {
                        setMainImageLoading(false);
                        setMainImageError(false);
                      }}
                      onError={() => {
                        setMainImageLoading(false);
                        setMainImageError(true);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Crop Overlay */}
              {isCropOpen && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  <div
                    className="absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-auto border-2 border-white cursor-move"
                    style={{
                      top: `${crop.y}%`,
                      left: `${crop.x}%`,
                      width: `${crop.w}%`,
                      height: `${crop.h}%`,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                  >
                    {/* Action buttons - Branded Labeled Style - Smart Positioning */}
                    <div 
                      className="absolute left-0 right-0 flex justify-center gap-3 pointer-events-auto transition-all duration-300"
                      style={{ 
                        top: crop.y < 12 ? 'calc(100% + 15px)' : '-60px',
                        zIndex: 50
                      }}
                    >
                      <button
                        onClick={handleShareClick}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="bg-[#007bff] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-[0_4px_20px_rgba(0,123,255,0.4)] hover:bg-[#0069d9] transition-all font-bold text-sm"
                      >
                        <Share2 size={18} />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={() => setIsCropOpen(false)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:bg-[#000000] transition-all font-bold text-sm border border-white/20"
                      >
                        <X size={18} />
                        <span>Cancel</span>
                      </button>
                    </div>

                    {/* Resize Handles - Blue dots with white border */}
                    <div className="absolute top-0 left-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'nw')} />
                    <div className="absolute top-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'ne')} />
                    <div className="absolute bottom-0 left-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'sw')} />
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md translate-x-1/2 translate-y-1/2 cursor-nwse-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'se')} />

                    <div className="absolute top-0 left-1/2 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'n')} />
                    <div className="absolute bottom-0 left-1/2 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md -translate-x-1/2 translate-y-1/2 cursor-ns-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 's')} />
                    <div className="absolute top-1/2 left-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'w')} />
                    <div className="absolute top-1/2 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-md translate-x-1/2 -translate-y-1/2 cursor-ew-resize" onPointerDown={(e) => handlePointerDown(e, 'resize', 'e')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Share Clip Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2 text-xl font-bold text-gray-800">
                <Share2 size={24} /> Share Clip
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[85vh] bg-gray-50">
              {/* Social Buttons (Top as requested) */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: edition?.name || 'Yellow Singam ePaper Clip',
                        text: 'Check out this ePaper clip',
                        url: generatedLink
                      }).catch(err => console.log('Share failed:', err));
                    }
                  }}
                  className="bg-[#0088ff] text-white p-3 rounded-sm hover:bg-blue-600 transition-colors"
                  title="Share"
                >
                  <Share2 size={24} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    alert('Link copied to clipboard!');
                  }}
                  className="bg-[#0088ff] text-white p-3 rounded-sm hover:bg-blue-600 transition-colors"
                  title="Copy Link"
                >
                  <Copy size={24} />
                </button>
                <button
                  onClick={() => window.open(generatedLink, '_blank')}
                  className="bg-[#0088ff] text-white p-3 rounded-sm hover:bg-blue-600 transition-colors"
                  title="Open Link"
                >
                  <ExternalLink size={24} />
                </button>
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedLink)}`, '_blank')}
                  className="bg-[#1877F2] text-white p-3 rounded-sm hover:bg-blue-700 transition-colors"
                  title="Facebook"
                >
                  <Facebook size={24} />
                </button>
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(edition?.name || 'ePaper Clip')}`, '_blank')}
                  className="bg-black text-white p-3 rounded-sm hover:bg-gray-800 transition-colors flex items-center justify-center w-[48px] h-[48px]"
                  title="X (Twitter)"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M4 20L20 4" /></svg>
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(edition?.name + ' ' + generatedLink)}`, '_blank')}
                  className="bg-[#25D366] text-white p-3 rounded-sm hover:bg-green-600 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={24} />
                </button>
                <button
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(generatedLink)}`, '_blank')}
                  className="bg-[#0A66C2] text-white p-3 rounded-sm hover:bg-blue-800 transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin size={24} />
                </button>
                <button
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(edition?.name || 'ePaper Clip')}`, '_blank')}
                  className="bg-[#229ED9] text-white p-3 rounded-sm hover:bg-blue-500 transition-colors"
                  title="Telegram"
                >
                  <Send size={24} />
                </button>
                <button
                  onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent(edition?.name || 'ePaper Clip')}&body=${encodeURIComponent(generatedLink)}`}
                  className="bg-gray-600 text-white p-3 rounded-sm hover:bg-gray-700 transition-colors"
                  title="Email"
                >
                  <Mail size={24} />
                </button>
              </div>

              {/* Branded Preview Card */}
              <div className="flex justify-center p-2">
                <div 
                  className="bg-white border-[8px] border-[#D4A800] shadow-xl w-full max-w-sm flex flex-col overflow-hidden"
                >
                  {/* Card Header - Banner Style with Text */}
                  <div className="bg-white flex flex-col border-b border-gray-100">
                    <div className="h-1 bg-[#2D3A2D] w-full" />
                    <div className="p-3 flex items-center justify-center bg-white gap-2">
                      <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain flex-shrink-0" />
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#D4A800] leading-none uppercase">
                          Yellow Singam
                        </span>
                        <span className="text-[8px] text-gray-500 font-medium tracking-[0.2em] uppercase italic">
                          hunting for truth
                        </span>
                      </div>
                    </div>
                    <div className="h-[0.5px] bg-black/10 w-full" />
                  </div>

                  {/* Image Area */}
                  <div className="relative h-[250px] bg-white flex items-center justify-center p-2">
                    {getCurrentPageUrl() ? (
                      <div className="relative w-full h-full overflow-hidden">
                        <img
                          src={getCurrentPageUrl()}
                          alt="Cropped Preview"
                          className="absolute max-w-none"
                          style={{
                            width: `${(100 / crop.w) * 100}%`,
                            height: `${(100 / crop.h) * 100}%`,
                            left: `-${(crop.x / crop.w) * 100}%`,
                            top: `-${(crop.y / crop.h) * 100}%`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center">
                        <ImageIcon size={48} />
                        <span className="text-xs">No preview</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="bg-[#D4A800] p-2 text-center">
                    <div className="text-[#2D2D2D] font-bold text-[10px] uppercase tracking-tighter">
                      epaper.yellowsingam.com | {formatDate(edition?.date)} | P: {currentPage + 1} | CID: {currentClipId}
                    </div>
                    <div className="text-[#2D2D2D]/90 text-[8px] font-medium mt-0.5">
                      For more details, visit our ePaper
                    </div>
                  </div>
                </div>
              </div>

              {/* Link Input */}
              <div className="flex justify-center mt-2 px-2">
                <div className="relative w-full max-w-lg">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full border border-gray-300 p-3 pr-12 rounded-xl text-center text-sm font-medium bg-white shadow-inner"
                  />
                  <Copy 
                    size={18} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-[#D4A800]"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      alert('Link copied!');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Overlay - Full Screen Detailed Version */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden"
          >
            {/* Zoom Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md text-white border-b border-white/10 shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsZoomOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Page {currentPage + 1} of {totalPages}</span>
                  <span className="text-[10px] text-[#D4A800] uppercase font-bold tracking-widest">{formatDate(edition.date)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMiniMapMinimized(!isMiniMapMinimized)} 
                  className={`p-2 rounded-full transition-colors ${isMiniMapMinimized ? 'text-white/40' : 'text-[#D4A800] bg-[#D4A800]/10'}`}
                  title="Toggle Mini-map"
                >
                  <Map size={20} />
                </button>
                <button onClick={() => setIsZoomOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

          <div className="flex-1 relative overflow-hidden bg-black">
              {/* Desktop Zoom Scrollable Area */}
              <div 
                ref={zoomContainerRef}
                onScroll={updateMiniMap}
                className={`hidden md:block w-full h-full overflow-auto no-scrollbar scroll-smooth bg-black/40`}
              >
                <div 
                  className={`relative mx-auto transition-all duration-300 ${isFitToScreen ? 'w-full h-auto px-10' : 'mb-20 mt-10 shadow-2xl'}`}
                  style={{ width: isFitToScreen ? '100%' : `${1200 * desktopZoomScale}px` }}
                  onClick={handleZoomImageClick}
                >
                  <div className={`relative ${isFitToScreen ? 'h-full aspect-[2/3]' : 'w-full aspect-[2/3]'}`}>
                    <Image
                      src={getCurrentPageProxyUrl()}
                      alt="Zoomed View"
                      fill
                      className="object-contain"
                      priority
                      unoptimized
                      quality={100}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Zoom Interactive Area */}
              <div 
                ref={mobileZoomRef}
                className="md:hidden w-full h-full relative overflow-hidden"
                onTouchStart={handleZoomTouchStart}
                onTouchMove={handleZoomTouchMove}
                onTouchEnd={handleZoomTouchEnd}
              >
                <div 
                  className="relative w-full h-full transition-transform duration-75"
                  style={{ 
                    transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
                    transformOrigin: 'center center'
                  }}
                >
                  <Image
                    src={getCurrentPageProxyUrl()}
                    alt="Mobile Zoomed"
                    fill
                    className="object-contain object-top"
                    priority
                    unoptimized
                  />
                </div>
              </div>

              {/* Floating Mini-Map */}
              <AnimatePresence>
                {!isMiniMapMinimized && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-24 right-6 w-32 md:w-40 aspect-[2/3] bg-black/80 border border-white/20 rounded-lg overflow-hidden hidden md:block z-50 shadow-2xl backdrop-blur-sm"
                  >
                    <div className="relative w-full h-full opacity-50">
                      <Image src={getCurrentPageProxyUrl()} alt="Mini" fill className="object-cover" />
                    </div>
                    {/* Viewport Indicator */}
                    <div 
                      className="absolute border-2 border-[#D4A800] bg-[#D4A800]/10 cursor-move"
                      style={{
                        top: `${miniMap.top}%`,
                        left: `${miniMap.left}%`,
                        width: `${miniMap.width}%`,
                        height: `${miniMap.height}%`,
                      }}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                        if (!rect) return;
                        const move = (moveEvent: MouseEvent) => {
                          const x = (moveEvent.clientX - rect.left) / rect.width;
                          const y = (moveEvent.clientY - rect.top) / rect.height;
                          handleMiniMapClick({ clientX: moveEvent.clientX, clientY: moveEvent.clientY, currentTarget: e.currentTarget.parentElement } as any);
                        };
                        const up = () => {
                          window.removeEventListener('mousemove', move);
                          window.removeEventListener('mouseup', up);
                        };
                        window.addEventListener('mousemove', move);
                        window.addEventListener('mouseup', up);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Navigation & Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                  <button 
                    onClick={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <div className="flex items-center gap-1 bg-black/60 rounded-full p-1.5 border border-white/10 backdrop-blur-xl">
                    <button 
                      onClick={() => setIsFitToScreen(!isFitToScreen)} 
                      className={`p-2.5 rounded-full transition-all ${isFitToScreen ? 'bg-[#D4A800] text-black shadow-[0_0_20px_rgba(212,168,0,0.5)]' : 'text-white hover:bg-white/10'}`}
                    >
                      {isFitToScreen ? <Maximize size={20} /> : <Minimize2 size={20} />}
                    </button>
                    <div className="w-[1px] h-4 bg-white/20 mx-1" />
                    <button 
                      onClick={handleZoomOut}
                      className="p-2.5 text-white hover:bg-white/10 rounded-full flex items-center justify-center font-bold text-xl w-10 h-10"
                      title="Zoom Out"
                    >
                      <span className="leading-none">−</span>
                    </button>
                    <button 
                      onClick={handleZoomIn}
                      className="p-2.5 text-white hover:bg-white/10 rounded-full flex items-center justify-center font-bold text-xl w-10 h-10"
                      title="Zoom In"
                    >
                      <span className="leading-none">+</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => currentPage < totalPages - 1 && setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
                
                <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">
                  Scroll or Click to zoom
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
