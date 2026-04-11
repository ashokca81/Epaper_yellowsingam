'use client';

import { ChevronLeft, ChevronRight, ZoomIn, Crop, X, Share2, Copy, ExternalLink, Facebook, MessageCircle, Linkedin, Send, Mail, Image as ImageIcon, Maximize, Minimize2, Map, Loader2, Calendar, MoreHorizontal, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, use, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';

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

export default function EditionDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Fetch edition data
  useEffect(() => {
    const fetchEdition = async () => {
      try {
        const response = await fetch(`/api/editions/by-alias?alias=${id}`);
        const data = await response.json();
        if (data.edition) {
          setEdition(data.edition);
        }
      } catch (error) {
        console.error('Error fetching edition:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEdition();
  }, [id]);

  // Get current page image URL
  const getCurrentPageUrl = () => {
    if (!edition || !edition.pages || edition.pages.length === 0) {
      return '';
    }
    return edition.pages[currentPage]?.url || '';
  };

  // Proxy URL so that image requests go through epaper.yellowsingam.com instead of direct R2 hostname
  const getCurrentPageProxyUrl = () => {
    const raw = getCurrentPageUrl();
    if (!raw) return '';
    // Direct CDN URL is faster than app-level proxy.
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
    // Show skeleton whenever user changes page / edition.
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
    
    // Preload next 2 pages and previous 1 page
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

  // Mobile Touch Handlers for Crop
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

  // Mobile Zoom Touch Handlers - Native Android Feel
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

    // Double tap detection
    if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap - toggle zoom
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
      // Pinch to zoom
      const currentDistance = getDistance(touches[0], touches[1]);
      const scaleDiff = currentDistance / lastDistanceRef.current;
      const newScale = Math.min(4, Math.max(1, startData.scale * scaleDiff));

      // Calculate pinch center
      const centerX = (touches[0].x + touches[1].x) / 2;
      const centerY = (touches[0].y + touches[1].y) / 2;
      const startCenterX = (startData.touches[0].x + startData.touches[1].x) / 2;
      const startCenterY = (startData.touches[0].y + startData.touches[1].y) / 2;

      let newX = startData.x + (centerX - startCenterX);
      let newY = startData.y + (centerY - startCenterY);

      // Add boundary constraints for pinch
      const maxX = (container.width * (newScale - 1)) / 2;
      const maxY = (container.height * (newScale - 1)) / 2;
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));

      setImageTransform({ scale: newScale, x: newX, y: newY });
    } else if (touches.length === 1 && imageTransform.scale > 1) {
      // Pan when zoomed - with boundary constraints
      const dx = touches[0].x - startData.touches[0].x;
      const dy = touches[0].y - startData.touches[0].y;

      let newX = startData.x + dx;
      let newY = startData.y + dy;

      // Calculate boundaries based on current scale
      const maxX = (container.width * (imageTransform.scale - 1)) / 2;
      const maxY = (container.height * (imageTransform.scale - 1)) / 2;

      // Constrain position within bounds
      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));

      setImageTransform(prev => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handleZoomTouchEnd = () => {
    // Snap back if scale is less than 1
    if (imageTransform.scale < 1) {
      setImageTransform({ scale: 1, x: 0, y: 0 });
    }
    // Snap to 1 if very close
    if (imageTransform.scale > 0.95 && imageTransform.scale < 1.05) {
      setImageTransform({ scale: 1, x: 0, y: 0 });
    }
  };

  // Swipe logic for page navigation
  const handleSwipeStart = (e: React.TouchEvent) => {
    if (isZoomOpen || isCropOpen) return;
    setSwipeStart(e.touches[0].clientX);
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStart === null || isZoomOpen || isCropOpen) return;
    const swipeEnd = e.changedTouches[0].clientX;
    const diff = swipeStart - swipeEnd;

    if (Math.abs(diff) > 50) { // Threshold for swipe
      if (diff > 0) {
        // Swipe left -> Next page
        if (currentPage < totalPages - 1) {
          setPage([currentPage + 1, 1]);
        }
      } else {
        // Swipe right -> Prev page
        if (currentPage > 0) {
          setPage([currentPage - 1, -1]);
        }
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

  // Reset zoom when opening
  useEffect(() => {
    if (isZoomOpen) {
      setImageTransform({ scale: 1, x: 0, y: 0 });
      setShowZoomControls(true);

      // Auto-hide controls after 4 seconds for immersive experience
      const hideTimer = setTimeout(() => {
        setShowZoomControls(false);
      }, 4000);

      return () => clearTimeout(hideTimer);
    }
  }, [isZoomOpen]);

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

  useEffect(() => {
    if (isZoomOpen && !isFitToScreen) {
      updateMiniMap();
      window.addEventListener('resize', updateMiniMap);
      return () => window.removeEventListener('resize', updateMiniMap);
    }
  }, [isZoomOpen, isFitToScreen]);

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

      // Timeout to wait for the container to update layout after setIsFitToScreen(false)
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
    const displayDate = formatDate(edition?.date || new Date().toISOString());
    const pageNum = currentPage + 1;

    const dynamicLink = `${baseUrl}/edition/${id}/clip?url=${encodeURIComponent(currentPageUrl)}&x=${crop.x}&y=${crop.y}&w=${crop.w}&h=${crop.h}&title=${encodeURIComponent(edition?.name || 'ePaper Clip')}&base=${encodeURIComponent(baseUrl)}&date=${encodeURIComponent(displayDate)}&page=${pageNum}&cid=${clipId}`;
    
    setGeneratedLink(dynamicLink);
    setCurrentClipId(clipId);
    setIsShareModalOpen(true);
  };

  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture pointer for better touch handling
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop }
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      if (!dragRef.current || !containerRef.current) return;
      const { type, handle, startX, startY, startCrop } = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();

      const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100;

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

        if (handle.includes('e')) newW = Math.min(100 - startCrop.x, Math.max(10, startCrop.w + dx));
        if (handle.includes('s')) newH = Math.min(100 - startCrop.y, Math.max(10, startCrop.h + dy));
        if (handle.includes('w')) {
          const maxDx = startCrop.w - 10;
          const actualDx = Math.min(dx, maxDx);
          const boundedDx = Math.max(-startCrop.x, actualDx);
          newX = startCrop.x + boundedDx;
          newW = startCrop.w - boundedDx;
        }
        if (handle.includes('n')) {
          const maxDy = startCrop.h - 10;
          const actualDy = Math.min(dy, maxDy);
          const boundedDy = Math.max(-startCrop.y, actualDy);
          newY = startCrop.y + boundedDy;
          newH = startCrop.h - boundedDy;
        }
        setCrop({ x: newX, y: newY, w: newW, h: newH });
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      dragRef.current = null;
      (upEvent.target as HTMLElement)?.releasePointerCapture?.(upEvent.pointerId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#D4A800] mx-auto mb-4" />
          <p className="text-gray-600">Loading edition...</p>
        </div>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Edition Not Found</h2>
          <p className="text-gray-600 mb-6">The edition you're looking for doesn't exist.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#D4A800] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c09700] transition-colors">
            <ChevronLeft size={20} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Pages are now declared higher up for preloading logic

  return (
    <div className="flex flex-col md:gap-4">
      {/* Mobile Native App Header */}
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

      {/* Desktop Toolbar - Hidden on Mobile */}
      <div className="hidden md:flex sticky top-0 z-40 bg-white border shadow-sm p-2 flex-wrap items-center justify-between gap-4 rounded-sm">
        <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            onClick={() => !isCropOpen && setCurrentPage(0)}
            disabled={currentPage === 0 || isCropOpen}
            className="px-3 py-1.5 border hover:bg-gray-50 bg-white whitespace-nowrap disabled:opacity-30"
          >
            &laquo; First
          </button>
          {pages.map((page, index) => (
            <button
              key={page.pageNum}
              onClick={() => !isCropOpen && setCurrentPage(index)}
              onMouseEnter={() => !isCropOpen && handlePageHover(index)}
              className={`px-3 py-1.5 border whitespace-nowrap ${index === currentPage
                ? 'bg-[#D4A800] text-white font-bold'
                : 'hover:bg-gray-50 bg-white'
                } ${isCropOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isCropOpen}
            >
              {page.pageNum}
            </button>
          ))}
          <button
            onClick={() => !isCropOpen && setCurrentPage(totalPages - 1)}
            disabled={currentPage === totalPages - 1 || isCropOpen}
            className="px-3 py-1.5 border hover:bg-gray-50 bg-white whitespace-nowrap disabled:opacity-30"
          >
            Last &raquo;
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={() => !isCropOpen && setIsZoomOpen(true)} 
            disabled={isCropOpen}
            className={`flex items-center gap-2 bg-[#1f1f1f] text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-md font-medium ${isCropOpen ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#2a2a2a] active:bg-[#1f1f1f] active:scale-95 hover:shadow-lg'}`}
          >
            <ZoomIn size={16} /> <span className="hidden sm:inline">Zoom</span>
          </button>
          <button onClick={() => setIsCropOpen(true)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-sm text-sm hover:bg-red-700 transition-colors">
            <Crop size={16} /> <span className="hidden sm:inline">Crop</span>
          </button>
        </div>
      </div>

      {/* Mobile Full Screen Viewer */}
      <div className="md:hidden fixed inset-0 pt-14 bg-black z-40 flex flex-col">
        {/* Main Image - Full width touch area */}
        <div
          ref={mobileContainerRef}
          className={`relative w-full flex-1 min-h-0 ${!isCropOpen ? 'cursor-zoom-in' : ''} overflow-hidden`}
          style={{ perspective: '1200px' }}
          onClick={() => !isCropOpen && setIsZoomOpen(true)}
          onTouchStart={isCropOpen ? undefined : handleSwipeStart}
          onTouchMove={isCropOpen ? handleTouchMove : undefined}
          onTouchEnd={isCropOpen ? handleTouchEnd : handleSwipeEnd}
        >
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
              <Image
                key={`mobile-main-${currentPage}-${mainImageRetry}`}
                src={getCurrentPageProxyUrl()}
                alt="Main Page View"
                fill
                className="object-contain"
                sizes="100vw"
                priority
                referrerPolicy="no-referrer"
                onLoad={() => {
                  setMainImageLoading(false);
                  setMainImageError(false);
                }}
                onError={() => {
                  setMainImageLoading(false);
                  setMainImageError(true);
                }}
              />
            </motion.div>
          </AnimatePresence>
          {mainImageLoading && (
            <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-6">
              <div className="flex flex-col items-center gap-4 bg-black/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 shadow-2xl pointer-events-auto animate-in fade-in zoom-in duration-300">
                <div className="relative">
                  <Loader2 className="w-10 h-10 animate-spin text-[#D4A800]" />
                  <div className="absolute inset-0 blur-sm bg-[#D4A800]/20 animate-pulse rounded-full" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-white font-bold text-sm tracking-widest uppercase">Loading Page</span>
                  <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-[#D4A800] animate-progress-loading" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {mainImageError && !mainImageLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
              <div className="text-center text-white">
                <p className="text-sm mb-3">Image load కాలేదు. మళ్లీ ప్రయత్నించండి.</p>
                <button
                  onClick={() => {
                    setMainImageError(false);
                    setMainImageLoading(true);
                    setMainImageRetry((prev) => prev + 1);
                  }}
                  className="px-4 py-2 bg-[#D4A800] text-black rounded-md font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Swipe controls */}
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(0, prev - 1)); }}
            disabled={currentPage === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full backdrop-blur-sm active:bg-white/20 disabled:opacity-0 transition-all z-10"
            aria-label="Previous Page"
          >
            <ChevronLeft size={28} className="text-white/80" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPages - 1, prev + 1)); }}
            disabled={currentPage === totalPages - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full backdrop-blur-sm active:bg-white/20 disabled:opacity-0 transition-all z-10"
            aria-label="Next Page"
          >
            <ChevronRight size={28} className="text-white/80" />
          </button>

          {/* Mobile Crop Overlay - Touch Optimized */}
          {isCropOpen && (
            <div className="absolute inset-0 z-10">
              {/* Dark overlay around crop area */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top */}
                <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: `${crop.y}%` }} />
                {/* Bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${100 - crop.y - crop.h}%` }} />
                {/* Left */}
                <div className="absolute bg-black/60" style={{ top: `${crop.y}%`, left: 0, width: `${crop.x}%`, height: `${crop.h}%` }} />
                {/* Right */}
                <div className="absolute bg-black/60" style={{ top: `${crop.y}%`, right: 0, width: `${100 - crop.x - crop.w}%`, height: `${crop.h}%` }} />
              </div>

              {/* Crop Selection Box */}
              <div
                className={`absolute border-2 ${isDragging ? 'border-[#D4A800]' : 'border-white'} transition-colors`}
                style={{
                  top: `${crop.y}%`,
                  left: `${crop.x}%`,
                  width: `${crop.w}%`,
                  height: `${crop.h}%`,
                }}
              >
                {/* Move handle - center area */}
                <div
                  className="absolute inset-4 cursor-move"
                  onTouchStart={(e) => handleTouchStart(e, 'move')}
                />

                {/* Grid lines for better visual */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/40" />
                  <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white/40" />
                  <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/40" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/40" />
                </div>

                {/* Action buttons - Labeled & Large - Smart Positioning */}
                <div 
                  className="absolute left-0 right-0 flex justify-center gap-3 transition-all duration-300"
                  style={{ 
                    top: crop.y < 12 ? 'calc(100% + 12px)' : '-60px',
                    zIndex: 50
                  }}
                >
                  <button
                    onClick={handleShareClick}
                    className="bg-[#007bff] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-[0_4px_15px_rgba(0,123,255,0.4)] active:scale-95 transition-all font-bold text-sm"
                  >
                    <Share2 size={18} />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={() => setIsCropOpen(false)}
                    className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.4)] active:scale-95 transition-all font-bold text-sm border border-white/20"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>

                {/* Corner Resize Handles - Large touch targets */}
                <div
                  className="absolute -top-4 -left-4 w-10 h-10 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'nw')}
                >
                  <div className={`w-6 h-6 rounded-full border-3 ${isDragging ? 'bg-[#D4A800] border-[#D4A800]' : 'bg-white border-white'} shadow-lg transition-colors`} />
                </div>
                <div
                  className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'ne')}
                >
                  <div className={`w-6 h-6 rounded-full border-3 ${isDragging ? 'bg-[#D4A800] border-[#D4A800]' : 'bg-white border-white'} shadow-lg transition-colors`} />
                </div>
                <div
                  className="absolute -bottom-4 -left-4 w-10 h-10 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'sw')}
                >
                  <div className={`w-6 h-6 rounded-full border-3 ${isDragging ? 'bg-[#D4A800] border-[#D4A800]' : 'bg-white border-white'} shadow-lg transition-colors`} />
                </div>
                <div
                  className="absolute -bottom-4 -right-4 w-10 h-10 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'se')}
                >
                  <div className={`w-6 h-6 rounded-full border-3 ${isDragging ? 'bg-[#D4A800] border-[#D4A800]' : 'bg-white border-white'} shadow-lg transition-colors`} />
                </div>

                {/* Edge Resize Handles */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'n')}
                >
                  <div className={`w-8 h-2 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg transition-colors`} />
                </div>
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 's')}
                >
                  <div className={`w-8 h-2 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg transition-colors`} />
                </div>
                <div
                  className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-12 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'w')}
                >
                  <div className={`w-2 h-8 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg transition-colors`} />
                </div>
                <div
                  className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-12 flex items-center justify-center"
                  onTouchStart={(e) => handleTouchStart(e, 'resize', 'e')}
                >
                  <div className={`w-2 h-8 rounded-full ${isDragging ? 'bg-[#D4A800]' : 'bg-white'} shadow-lg transition-colors`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Page Navigation (Number Box) */}
        {!isCropOpen && (
          <div className="relative z-[45] bg-[#1a1a1a] border-t border-white/10 p-3 pt-1 pb-[60px] shadow-[0_-4px_12px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1">
              {pages.map((page, index) => (
                <button
                  key={page.pageNum}
                  onClick={() => setCurrentPage(index)}
                  onMouseEnter={() => handlePageHover(index)}
                  className={`min-w-[42px] h-[42px] flex items-center justify-center rounded-lg border-2 text-sm font-bold transition-all active:scale-90 shrink-0 ${index === currentPage
                    ? 'bg-[#D4A800] border-[#D4A800] text-white shadow-[0_0_10px_rgba(212,168,0,0.3)]'
                    : 'bg-white/5 border-white/20 text-white/90 font-medium'
                    }`}
                >
                  {page.pageNum}
                </button>
              ))}
            </div>
            {/* Scroll Indicator Hint */}
            {pages.length > 6 && (
              <div className="mt-0 text-center">
                <div className="inline-block w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D4A800] transition-all duration-300"
                    style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Main Content Area */}
      <div className="hidden md:flex flex-col md:flex-row gap-4 items-stretch">
        {/* Left Sidebar - Pages */}
        <div className="w-full md:w-48 shrink-0 bg-white border shadow-sm rounded-sm p-2 md:p-3 relative">
          <div className="flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:absolute md:top-3 md:bottom-3 md:left-3 md:right-1 pb-2 md:pb-0 md:pr-2 custom-scrollbar">
            {pages.map((page, index) => (
              <button
                key={page.pageNum}
                onClick={() => setCurrentPage(index)}
                onMouseEnter={() => handlePageHover(index)}
                className={`border bg-white p-2 shadow-sm min-w-[120px] md:min-w-0 hover:border-[#D4A800] transition-colors group shrink-0 ${index === currentPage ? 'border-[#D4A800] ring-2 ring-[#D4A800]/20' : ''
                  }`}
              >
                <div className={`text-center font-bold text-sm mb-2 py-1 transition-colors ${index === currentPage ? 'bg-[#D4A800] text-white' : 'bg-gray-100 group-hover:bg-[#FFF3C4] group-hover:text-[#2D2D2D]'
                  }`}>
                  PAGE {page.pageNum}
                </div>
                <div className="relative aspect-[2/3] w-full bg-gray-100">
                  <Image
                    src={getProxyUrl(page.previewUrl || page.url, page.pageNum)}
                    alt={`Page ${page.pageNum}`}
                    fill
                    className="object-cover border border-gray-200"
                    sizes="(max-width: 768px) 120px, 200px"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      const currentRetry = thumbRetries[page.pageNum] || 0;
                      if (currentRetry < 3) { // Try up to 3 times
                        setThumbRetries(prev => ({
                          ...prev,
                          [page.pageNum]: currentRetry + 1
                        }));
                      }
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Viewer */}
        <div className="flex-1 w-full bg-white border shadow-sm rounded-sm overflow-hidden">
          <div className="bg-[#2D2D2D] text-white px-4 py-2 flex items-center gap-2 text-sm sm:text-base">
            <span className="font-bold">Yellow Singam Telugu Daily</span>
            <span className="text-[#D4A800]">/ {formatDate(edition.date)} / Page: {currentPage + 1}</span>
          </div>
          <div className="bg-gray-50">
            <div 
              ref={containerRef} 
              className={`relative aspect-[2/3] w-full bg-white shadow-md border-b overflow-hidden touch-none ${!isCropOpen ? 'cursor-zoom-in' : ''}`}
              style={{ perspective: '1200px' }}
              onClick={() => !isCropOpen && setIsZoomOpen(true)}
            >
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
                  <Image
                    key={`desktop-main-${currentPage}-${mainImageRetry}`}
                    src={getCurrentPageProxyUrl()}
                    alt="Main Page View"
                    fill
                    className="object-contain"
                    referrerPolicy="no-referrer"
                    sizes="(max-width: 1024px) 100vw, 800px"
                    loading="eager"
                    onLoad={() => {
                      setMainImageLoading(false);
                      setMainImageError(false);
                    }}
                    onError={() => {
                      setMainImageLoading(false);
                      setMainImageError(true);
                    }}
                  />
                </motion.div>
              </AnimatePresence>
              {mainImageLoading && (
                <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 bg-white/90 backdrop-blur-xl p-10 rounded-3xl border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto animate-in fade-in zoom-in duration-300">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 animate-spin text-[#D4A800]" />
                      <div className="absolute inset-0 blur-md bg-[#D4A800]/10 animate-pulse rounded-full" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-gray-900 font-bold text-base tracking-widest uppercase">Loading Edition</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-[#D4A800] animate-progress-loading" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {mainImageError && !mainImageLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 px-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-700 mb-3">Page image load కాలేదు.</p>
                    <button
                      onClick={() => {
                        setMainImageError(false);
                        setMainImageLoading(true);
                        setMainImageRetry((prev) => prev + 1);
                      }}
                      className="px-4 py-2 bg-[#D4A800] text-black rounded-md font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

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

                    {/* Resize Handles */}
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
      </div>

      {/* Zoom Modal */}
      {isZoomOpen && (
        <>
          {/* Mobile Native Zoom View - Clean Immersive Design */}
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black"
            onClick={() => setShowZoomControls(!showZoomControls)}
          >
            {/* Minimal Top Bar - Auto-hide after 3s */}
            <div
              className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/90 via-black/60 to-transparent safe-top transition-all duration-500 ${showZoomControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Larger touch target */}
              <button
                onClick={() => {
                  setIsZoomOpen(false);
                  setImageTransform({ scale: 1, x: 0, y: 0 });
                }}
                className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full active:bg-black/60 transition-all duration-200 active:scale-95"
              >
                <X size={24} className="text-white" />
              </button>

              {/* Page Info */}
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full">
                  <span className="text-white text-sm font-medium">Page {currentPage + 1}</span>
                </div>
                <div className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                  <span className="text-white text-sm font-bold">{Math.round(imageTransform.scale * 100)}%</span>
                </div>
              </div>

              {/* Actions Menu */}
              <button
                className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full active:bg-black/60 transition-all duration-200 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle actions menu
                }}
              >
                <MoreHorizontal size={24} className="text-white" />
              </button>
            </div>

            {/* Image Container - Pinch/Pan Area */}
            <div
              ref={mobileZoomRef}
              className="absolute inset-0 overflow-hidden"
              onTouchStart={handleZoomTouchStart}
              onTouchMove={handleZoomTouchMove}
              onTouchEnd={handleZoomTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <div
                className="relative w-full h-full"
                style={{
                  transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
                  transition: touchStartRef.current ? 'none' : 'transform 0.2s ease-out',
                  transformOrigin: 'center center',
                }}
              >
                <Image
                  src={getCurrentPageProxyUrl()}
                  alt="Zoomed Page View"
                  fill
                  className="object-contain pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                  sizes="100vw"
                  draggable={false}
                  loading="lazy"
                />
              </div>
            </div>

            {/* Zoom Level Indicator - Shows temporarily when zooming */}
            {imageTransform.scale !== 1 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-4 scale-110 transition-all duration-200">
                  <span className="text-white text-3xl font-bold tracking-wider">
                    {Math.round(imageTransform.scale * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Gesture Hint - Show only on first use */}
            {imageTransform.scale === 1 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 animate-pulse">
                  <div className="flex items-center gap-3 text-white/90">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm font-medium">Pinch to zoom • Drag to pan</span>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Bottom Actions - Context-aware */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-500 ${showZoomControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Page Navigation - Primary actions */}
              <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-8 safe-bottom">
                <div className="flex items-center justify-center px-6">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 flex items-center gap-1">
                    {/* Previous Page */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="w-14 h-14 flex items-center justify-center rounded-full active:bg-white/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={28} className="text-white" />
                    </button>

                    {/* Page Indicator */}
                    <div className="px-6 py-3 bg-[#D4A800]/20 backdrop-blur-sm rounded-full border border-[#D4A800]/30">
                      <span className="text-[#D4A800] text-lg font-bold">{currentPage + 1}</span>
                      <span className="text-white/60 text-sm"> / {totalPages}</span>
                    </div>

                    {/* Next Page */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="w-14 h-14 flex items-center justify-center rounded-full active:bg-white/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={28} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Secondary Actions - Slide up menu */}
                <div className="flex items-center justify-center gap-4 mt-4 px-6">
                  <button
                    onClick={() => setImageTransform({ scale: 1, x: 0, y: 0 })}
                    className="px-4 py-3 bg-white/10 backdrop-blur-sm rounded-full flex items-center gap-2 active:bg-white/20 transition-all duration-200"
                  >
                    <RotateCcw size={18} className="text-white" />
                    <span className="text-white text-sm font-medium">Reset</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsZoomOpen(false);
                      setTimeout(() => setIsCropOpen(true), 100);
                    }}
                    className="px-4 py-3 bg-[#D4A800] rounded-full flex items-center gap-2 active:bg-[#D4A800]/80 transition-all duration-200 shadow-lg shadow-[#D4A800]/30"
                  >
                    <Crop size={18} className="text-black" />
                    <span className="text-black text-sm font-bold">Crop</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Gesture Hint - Shows on first open */}
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse" style={{ display: showZoomControls && imageTransform.scale === 1 ? 'block' : 'none' }}>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                <ZoomIn size={16} className="text-white/80" />
                <span className="text-white/80 text-xs font-medium">Pinch to zoom • Double-tap to 2.5×</span>
              </div>
            </div>
          </div>

          {/* Desktop Zoom View */}
          <div className="hidden md:flex fixed inset-0 z-50 bg-white flex-col">
            <div className="flex items-center justify-between p-3 border-b shadow-sm bg-white">
              <div className="flex items-center gap-2 font-bold text-lg">
                <ZoomIn size={20} /> Zoom View
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFitToScreen(!isFitToScreen)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-sm text-sm transition-colors font-medium"
                >
                  {isFitToScreen ? <ZoomIn size={16} /> : <Maximize size={16} />}
                  <span className="hidden sm:inline">{isFitToScreen ? 'Zoom to Width' : 'Fit to Screen'}</span>
                </button>
                <button onClick={() => setIsZoomOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors ml-2">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div
              className={`flex-1 overflow-auto bg-gray-100 ${isFitToScreen ? 'flex items-center justify-center p-4' : 'relative'}`}
              ref={zoomContainerRef}
              onScroll={updateMiniMap}
            >
              <div className={`bg-white shadow-sm ${isFitToScreen ? 'h-full w-full relative' : 'w-full'}`}>
                <Image
                  src={getCurrentPageProxyUrl()}
                  alt="Zoomed Page View"
                  width={1200}
                  height={1800}
                  className={`${isFitToScreen ? 'object-contain w-full h-full cursor-zoom-in' : 'w-full h-auto cursor-zoom-out'}`}
                  referrerPolicy="no-referrer"
                  sizes="100vw"
                  onLoad={updateMiniMap}
                  onClick={handleZoomImageClick}
                  loading="lazy"
                />
              </div>

              {/* Mini-map */}
              {!isFitToScreen && (
                <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
                  {isMiniMapMinimized ? (
                    <button
                      onClick={() => setIsMiniMapMinimized(false)}
                      className="bg-white border-2 border-gray-300 shadow-xl p-2.5 rounded-full hover:bg-gray-50 text-gray-700 transition-colors flex items-center justify-center"
                      title="Show Mini-map"
                    >
                      <Map size={20} />
                    </button>
                  ) : (
                    <div className="relative w-24 md:w-32 bg-white border-2 border-gray-300 shadow-xl overflow-hidden rounded-sm opacity-75 hover:opacity-100 transition-opacity group">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsMiniMapMinimized(true); }}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/80"
                        title="Minimize Map"
                      >
                        <Minimize2 size={14} />
                      </button>
                      <div
                        className="relative w-full aspect-[2/3] bg-gray-100 cursor-pointer"
                        onClick={handleMiniMapClick}
                        title="Click to navigate"
                      >
                        <Image
                          src={getCurrentPageProxyUrl()}
                          alt="Mini-map"
                          fill
                          className="object-contain pointer-events-none"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        {/* Viewport Indicator */}
                        <div
                          className="absolute border-2 border-red-600 bg-red-500/20 pointer-events-none transition-all duration-75"
                          style={{
                            top: `${miniMap.top}%`,
                            left: `${miniMap.left}%`,
                            width: `${miniMap.width}%`,
                            height: `${miniMap.height}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
              {/* Branded Preview Card */}
              <div className="flex justify-center p-2">
                <div 
                  ref={previewRef} 
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
                          onLoad={() => setCropImageLoaded(true)}
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
                    <div className="text-[#2D2D2D] font-bold text-[9px] uppercase tracking-tighter">
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

              {/* Social Buttons */}
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
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(generatedLink)
                        .then(() => alert('Link copied to clipboard!'))
                        .catch(() => {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = generatedLink;
                          textArea.style.position = 'fixed';
                          textArea.style.left = '-999999px';
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            alert('Link copied to clipboard!');
                          } catch (err) {
                            alert('Failed to copy link');
                          }
                          document.body.removeChild(textArea);
                        });
                    } else {
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = generatedLink;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        alert('Link copied to clipboard!');
                      } catch (err) {
                        alert('Failed to copy link');
                      }
                      document.body.removeChild(textArea);
                    }
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
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
