'use client';

import { ChevronLeft, ChevronRight, ZoomIn, Crop, X, Share2, Copy, ExternalLink, Facebook, Linkedin, Send, Mail, Image as ImageIcon, Maximize, Minimize2, Map, Loader2, Calendar, MoreHorizontal, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { pageFlipAudioBase64 } from '../utils/audioBase64';
import WhatsAppIcon from './WhatsAppIcon';

let pageFlipAudio: HTMLAudioElement | null = null;
if (typeof window !== 'undefined') {
  pageFlipAudio = new window.Audio(pageFlipAudioBase64);
  pageFlipAudio.volume = 0.4;
  pageFlipAudio.preload = 'auto';
}

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
  updatedAt?: string;
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
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [currentClipId, setCurrentClipId] = useState('');
  const [cropImageLoaded, setCropImageLoaded] = useState(false);
  const [pageImageSize, setPageImageSize] = useState<{ width: number; height: number } | null>(null);
  const [clipPreviewLoading, setClipPreviewLoading] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [desktopZoomScale, setDesktopZoomScale] = useState(1);
  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQuickShareOpen, setIsQuickShareOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [crop, setCrop] = useState({ x: 20, y: 25, w: 60, h: 35 });
  const [miniMap, setMiniMap] = useState({ top: 0, left: 0, width: 100, height: 100 });
  const [isMiniMapMinimized, setIsMiniMapMinimized] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  const [imageTransform, setImageTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDesktopPanning, setIsDesktopPanning] = useState(false);
  const [highlightRect, setHighlightRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [highlightVisible, setHighlightVisible] = useState(false);
  const mobileZoomRef = useRef<HTMLDivElement>(null);
  const desktopPanRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const desktopPanMovedRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const loadedPageNumsRef = useRef<Set<number>>(new Set());
  const initialPageAppliedRef = useRef(false);
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
    initialPageAppliedRef.current = false;
  }, [initialEdition._id]);

  useEffect(() => {
    if (initialPageAppliedRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pageParam = Number(params.get('page'));
    if (!Number.isFinite(pageParam) || pageParam < 1) return;
    const targetIndex = Math.min(Math.max(pageParam - 1, 0), Math.max(0, (edition?.pages?.length || 1) - 1));
    if (targetIndex !== currentPage) {
      setPage([targetIndex, 0]);
    }
    initialPageAppliedRef.current = true;
  }, [edition?._id, edition?.pages?.length, currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pageParam = Number(params.get('page'));
    const hx = Number(params.get('hx'));
    const hy = Number(params.get('hy'));
    const hw = Number(params.get('hw'));
    const hh = Number(params.get('hh'));

    if (!Number.isFinite(pageParam) || pageParam !== currentPage + 1) return;
    if (![hx, hy, hw, hh].every((v) => Number.isFinite(v))) return;

    setHighlightRect({ x: hx, y: hy, w: hw, h: hh });
    setHighlightVisible(true);

    const timer = window.setTimeout(() => {
      setHighlightVisible(false);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [currentPage]);

  useEffect(() => {
    if (!highlightRect || !highlightVisible) return;
    if (typeof window === 'undefined') return;
    if (mainImageLoading) return;

    const targetEl = containerRef.current || mobileContainerRef.current;
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const targetScroll =
      absoluteTop + (highlightRect.y / 100) * rect.height - window.innerHeight * 0.3;

    window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [highlightRect, highlightVisible, mainImageLoading]);

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
    const v = edition?.updatedAt ? `v=${new Date(edition.updatedAt).getTime()}` : '';
    let url = raw;
    if (v) {
      url = `${raw}${raw.includes('?') ? '&' : '?'}${v}`;
    }
    if (mainImageRetry <= 0) return url;
    return `${url}${url.includes('?') ? '&' : '?'}r=${mainImageRetry}`;
  };

  const getProxyUrl = (rawUrl: string, pageNum?: number) => {
    if (!rawUrl) return '';
    const retryCount = pageNum !== undefined ? (thumbRetries[pageNum] || 0) : 0;
    const v = edition?.updatedAt ? `v=${new Date(edition.updatedAt).getTime()}` : '';
    let url = rawUrl;
    if (v) {
      url = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}${v}`;
    }
    if (retryCount === 0) return url;
    return `${url}${url.includes('?') ? '&' : '?'}r=${retryCount}`;
  };

  useEffect(() => {
    const activePageNum = edition?.pages?.[currentPage]?.pageNum;
    if (activePageNum && loadedPageNumsRef.current.has(activePageNum)) {
      setMainImageLoading(false);
    } else {
      setMainImageLoading(true);
    }
    setMainImageError(false);
    setMainImageRetry(0);
    setPageImageSize(null);
  }, [currentPage, edition?._id]);

  useEffect(() => {
    if (isShareModalOpen) {
      setClipPreviewLoading(true);
    }
  }, [isShareModalOpen, crop.x, crop.y, crop.w, crop.h, currentPage, edition?._id]);

  useEffect(() => {
    setIsPageTurning(true);
    const timer = window.setTimeout(() => setIsPageTurning(false), 480);
    return () => window.clearTimeout(timer);
  }, [currentPage]);

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

  // Keep viewport fixed while adjusting crop on mobile.
  useEffect(() => {
    if (isCropOpen) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    } else {
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.touchAction = '';
      if (!isZoomOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isCropOpen, isZoomOpen]);

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

    if (newIndex !== currentPage) {
      setMainImageLoading(true);
    }

    if (newIndex !== currentPage && pageFlipAudio) {
      pageFlipAudio.currentTime = 0;
      pageFlipAudio.play().catch(e => console.log('Audio play failed:', e));
    }

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

  const getImageBounds = (container: HTMLDivElement | null) => {
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    if (!containerWidth || !containerHeight) return null;

    if (!pageImageSize?.width || !pageImageSize?.height) {
      return {
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight,
        containerWidth,
        containerHeight,
      };
    }

    const imageAspect = pageImageSize.width / pageImageSize.height;
    const containerAspect = containerWidth / containerHeight;
    let width = containerWidth;
    let height = containerHeight;
    let left = 0;
    let top = 0;

    if (containerAspect > imageAspect) {
      height = containerHeight;
      width = height * imageAspect;
      left = (containerWidth - width) / 2;
    } else {
      width = containerWidth;
      height = width / imageAspect;
      top = (containerHeight - height) / 2;
    }

    return {
      left,
      top,
      width,
      height,
      containerWidth,
      containerHeight,
    };
  };

  const getCropLayout = (container: HTMLDivElement | null) => {
    const bounds = getImageBounds(container);
    if (!bounds) return null;

    const cropLeft = bounds.left + (crop.x / 100) * bounds.width;
    const cropTop = bounds.top + (crop.y / 100) * bounds.height;
    const cropWidth = (crop.w / 100) * bounds.width;
    const cropHeight = (crop.h / 100) * bounds.height;

    return {
      ...bounds,
      cropLeft,
      cropTop,
      cropWidth,
      cropHeight,
    };
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
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const { type, handle, startX, startY, startCrop } = touchRef.current;
    const bounds = getImageBounds(mobileContainerRef.current);
    if (!bounds) return;

    const dx = ((touch.clientX - startX) / bounds.width) * 100;
    const dy = ((touch.clientY - startY) / bounds.height) * 100;

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

  const pageVariants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 84 : -84,
      x: direction > 0 ? 34 : -34,
      scale: 0.972,
      opacity: 0.24,
      filter: 'brightness(0.78) contrast(1.04)',
      transformOrigin: direction > 0 ? 'right center' : 'left center',
      boxShadow: 'none',
    }),
    center: {
      zIndex: 2,
      rotateY: 0,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'brightness(1)',
      boxShadow: 'none',
      transition: {
        rotateY: { duration: 0.78, ease: [0.2, 0.9, 0.22, 1] } as any,
        x: { duration: 0.74, ease: [0.2, 0.9, 0.22, 1] } as any,
        scale: { duration: 0.56 } as any,
        opacity: { duration: 0.42 },
      }
    },
    exit: (direction: number) => ({
      zIndex: 1,
      rotateY: direction > 0 ? -84 : 84,
      x: direction > 0 ? -34 : 34,
      scale: 0.972,
      opacity: 0.24,
      filter: 'brightness(0.78) contrast(1.04)',
      transformOrigin: direction > 0 ? 'left center' : 'right center',
      boxShadow: 'none',
      transition: {
        rotateY: { duration: 0.78, ease: [0.2, 0.9, 0.22, 1] } as any,
        x: { duration: 0.74, ease: [0.2, 0.9, 0.22, 1] } as any,
        opacity: { duration: 0.42 },
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
    if (desktopPanMovedRef.current) {
      desktopPanMovedRef.current = false;
      return;
    }
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

  const handleResetToNormalView = () => {
    // Desktop zoom container reset
    setIsFitToScreen(true);
    setDesktopZoomScale(1);
    if (zoomContainerRef.current) {
      zoomContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'auto' });
    }

    // Mobile pinch/pan reset
    setImageTransform({ scale: 1, x: 0, y: 0 });
  };

  const isAnyZoomActive =
    !isFitToScreen ||
    desktopZoomScale > 1 ||
    imageTransform.scale > 1.01;

  const handleDesktopPanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFitToScreen || desktopZoomScale <= 1 || !zoomContainerRef.current) return;
    e.preventDefault();
    desktopPanMovedRef.current = false;
    const container = zoomContainerRef.current;
    desktopPanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: container.scrollLeft,
      startTop: container.scrollTop,
    };
    setIsDesktopPanning(true);
  };

  useEffect(() => {
    if (!isDesktopPanning) return;

    const handleMouseMove = (event: MouseEvent) => {
      const pan = desktopPanRef.current;
      const container = zoomContainerRef.current;
      if (!pan || !container) return;
      const dx = event.clientX - pan.startX;
      const dy = event.clientY - pan.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        desktopPanMovedRef.current = true;
      }
      container.scrollTo({
        left: pan.startLeft - dx,
        top: pan.startTop - dy,
        behavior: 'auto',
      });
      updateMiniMap();
    };

    const stopPanning = () => {
      setIsDesktopPanning(false);
      desktopPanRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopPanning);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopPanning);
    };
  }, [isDesktopPanning]);

  const handleClipDownload = async (pageUrl: string, displayDate: string, pageNum: number) => {
    setIsDownloading(true);
    try {
      const downloadUrl = `/api/clip-download?url=${encodeURIComponent(pageUrl)}&x=${crop.x}&y=${crop.y}&w=${crop.w}&h=${crop.h}&date=${encodeURIComponent(displayDate)}&page=${pageNum}&filename=${encodeURIComponent(`yellow-singam-clip-${currentClipId || 'clip'}.png`)}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yellow-singam-clip-${currentClipId || 'clip'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };
  const handleShareClick = (e: React.MouseEvent) => {
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

  const handleMobileEpaperShare = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    const shareData = {
      title: edition?.name || 'Yellow Singam ePaper',
      text: `Read ${edition?.name || 'Yellow Singam ePaper'} online`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        // 1) Try Android native "share image" style when supported.
        const pageUrl = getCurrentPageUrl();
        if (pageUrl) {
          const imageRes = await fetch(pageUrl, { cache: 'no-store' });
          if (imageRes.ok) {
            const blob = await imageRes.blob();
            const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
            const file = new File([blob], `yellow-singam-page-${currentPage + 1}.${ext}`, { type: blob.type || 'image/jpeg' });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                title: shareData.title,
                text: shareData.text,
                url: shareData.url,
                files: [file],
              });
              return;
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }

      try {
        // 2) Fallback to plain native share.
        await navigator.share({ url: shareUrl, title: shareData.title, text: shareData.text });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Native share unavailable (common on http/non-supported browsers).
    alert('Native share is not available in this browser/context. Please open via HTTPS on Android Chrome.');
  };

  const handleCopyEditionLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied');
      setIsQuickShareOpen(false);
      return;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Link copied');
        setIsQuickShareOpen(false);
      } catch {
        alert('Could not copy link');
      }
    }
  };

  const openPlatformShare = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin') => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    const title = encodeURIComponent(edition?.name || 'Yellow Singam ePaper');
    const encodedUrl = encodeURIComponent(shareUrl);

    const map = {
      whatsapp: `https://wa.me/?text=${title}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    } as const;

    window.open(map[platform], '_blank', 'noopener,noreferrer');
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
      const bounds = getImageBounds(containerRef.current);
      if (!bounds) return;
      const dx = ((moveEvent.clientX - startX) / bounds.width) * 100;
      const dy = ((moveEvent.clientY - startY) / bounds.height) * 100;
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

  const mobileCropLayout = getCropLayout(mobileContainerRef.current);
  const desktopCropLayout = getCropLayout(containerRef.current);

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
            <button onClick={handleMobileEpaperShare} className="p-2.5 rounded-full active:bg-[#D4A800]/20 transition-all duration-200 active:scale-95 hover:bg-[#D4A800]/10">
              <Share2 size={20} className="text-[#D4A800]" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Toolbar */}
      <div className="hidden md:flex sticky top-0 z-40 bg-white border-b shadow-sm p-1.5 flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-sm shrink-0">
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
          <button onClick={() => setIsQuickShareOpen(true)} className="flex items-center gap-1 bg-[#3b5bdb] text-white px-3 py-1.5 rounded-sm text-sm hover:bg-[#364fc7] transition-colors"><Share2 size={16} /> Share</button>
        </div>
      </div>

      {/* Mobile Viewer */}
      <div
        className="md:hidden fixed inset-0 bg-black z-40 flex flex-col"
        style={{
          height: '100dvh',
          paddingTop: 'calc(var(--safe-area-top) + 52px)',
          paddingBottom: 'calc(var(--safe-area-bottom) + 56px)',
        }}
      >
        <div
          ref={mobileContainerRef}
          className="relative w-full flex-1 min-h-0 overflow-hidden"
          style={{ perspective: '1200px' }}
          onTouchMove={isCropOpen ? handleTouchMove : undefined}
          onTouchEnd={isCropOpen ? handleTouchEnd : undefined}
        >
          {!isCropOpen ? (
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={`mobile-flip-${currentPage}`}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 w-full h-full bg-[#f3efe5]"
                style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
              >
                {getCurrentPageProxyUrl() && (
                  <Image
                    key={`mobile-main-${currentPage}-${mainImageRetry}`}
                    src={getCurrentPageProxyUrl()}
                    alt={`Page ${currentPage + 1}`}
                    fill
                    className="object-contain p-1"
                    sizes="100vw"
                    priority
                    referrerPolicy="no-referrer"
                    onLoad={(e) => {
                      const active = pages[currentPage];
                      if (active?.pageNum) loadedPageNumsRef.current.add(active.pageNum);
                      setMainImageLoading(false);
                      setMainImageError(false);
                      const target = e.currentTarget;
                      if (target?.naturalWidth && target?.naturalHeight) {
                        setPageImageSize({ width: target.naturalWidth, height: target.naturalHeight });
                      }
                    }}
                    onError={() => {
                      setMainImageLoading(false);
                      setMainImageError(true);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 w-full h-full">
              <Image
                key={`mobile-main-crop-${currentPage}-${mainImageRetry}`}
                src={getCurrentPageProxyUrl()}
                alt="Main Page View"
                fill
                className="object-contain"
                sizes="100vw"
                priority
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  const active = pages[currentPage];
                  if (active?.pageNum) loadedPageNumsRef.current.add(active.pageNum);
                  setMainImageLoading(false);
                  setMainImageError(false);
                  const target = e.currentTarget;
                  if (target?.naturalWidth && target?.naturalHeight) {
                    setPageImageSize({ width: target.naturalWidth, height: target.naturalHeight });
                  }
                }}
                onError={() => {
                  setMainImageLoading(false);
                  setMainImageError(true);
                }}
              />
            </div>
          )}
          <div
            className={`pointer-events-none absolute inset-y-0 transition-all duration-500 ${direction > 0 ? 'left-0' : 'right-0'
              } ${isPageTurning ? 'w-16 opacity-100' : 'w-0 opacity-0'}`}
            style={{ background: 'transparent' }}
          />
          {mainImageLoading && <div className="fixed inset-0 z-[100] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#D4A800]" /></div>}
          {highlightRect && highlightVisible && (
            <div
              className="absolute z-30 pointer-events-none border-2 border-red-500 border-dotted bg-red-200/50 animate-pulse shadow-[0_0_0_3px_rgba(255,0,0,0.15)]"
              style={{
                top: `${highlightRect.y}%`,
                left: `${highlightRect.x}%`,
                width: `${highlightRect.w}%`,
                height: `${highlightRect.h}%`,
              }}
            />
          )}
          {!isCropOpen && (
            <>
              <button
                onClick={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/25 text-white backdrop-blur-[1px] flex items-center justify-center disabled:opacity-30 active:scale-95"
                aria-label="Previous page"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => currentPage < totalPages - 1 && setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/25 text-white backdrop-blur-[1px] flex items-center justify-center disabled:opacity-30 active:scale-95"
                aria-label="Next page"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Crop controls */}
          {isCropOpen && (
            <div className="absolute inset-0 z-10">
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute top-0 left-0 right-0 bg-black/60"
                  style={{ height: mobileCropLayout ? mobileCropLayout.cropTop : `${crop.y}%` }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/60"
                  style={{
                    height: mobileCropLayout
                      ? Math.max(0, mobileCropLayout.containerHeight - (mobileCropLayout.cropTop + mobileCropLayout.cropHeight))
                      : `${100 - crop.y - crop.h}%`,
                  }}
                />
                <div
                  className="absolute bg-black/60"
                  style={{
                    top: mobileCropLayout ? mobileCropLayout.cropTop : `${crop.y}%`,
                    left: 0,
                    width: mobileCropLayout ? mobileCropLayout.cropLeft : `${crop.x}%`,
                    height: mobileCropLayout ? mobileCropLayout.cropHeight : `${crop.h}%`,
                  }}
                />
                <div
                  className="absolute bg-black/60"
                  style={{
                    top: mobileCropLayout ? mobileCropLayout.cropTop : `${crop.y}%`,
                    right: 0,
                    width: mobileCropLayout
                      ? Math.max(0, mobileCropLayout.containerWidth - (mobileCropLayout.cropLeft + mobileCropLayout.cropWidth))
                      : `${100 - crop.x - crop.w}%`,
                    height: mobileCropLayout ? mobileCropLayout.cropHeight : `${crop.h}%`,
                  }}
                />
              </div>
              <div
                className={`absolute border-2 ${isDragging ? 'border-[#D4A800]' : 'border-white'} transition-colors`}
                style={{
                  top: mobileCropLayout ? mobileCropLayout.cropTop : `${crop.y}%`,
                  left: mobileCropLayout ? mobileCropLayout.cropLeft : `${crop.x}%`,
                  width: mobileCropLayout ? mobileCropLayout.cropWidth : `${crop.w}%`,
                  height: mobileCropLayout ? mobileCropLayout.cropHeight : `${crop.h}%`,
                }}
              >
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
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+8px)] left-0 right-0 z-50 px-2">
            <div className="mx-auto w-fit max-w-full bg-[#1a1a1a]/90 border border-white/20 rounded-2xl px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {pages.map((p, i) => (
                  <button
                    key={`mobile-page-box-${p.pageNum}`}
                    onClick={() => setCurrentPage(i)}
                    className={`min-w-[34px] h-[34px] shrink-0 rounded-lg border text-xs font-bold transition-all active:scale-90 ${i === currentPage
                        ? 'bg-[#D4A800] border-[#D4A800] text-black shadow-[0_0_10px_rgba(212,168,0,0.45)]'
                        : 'bg-white/10 border-white/30 text-white'
                      }`}
                  >
                    {p.pageNum}
                  </button>
                ))}
              </div>
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
        <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col min-h-[calc(100vh-120px)] overflow-hidden">
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
            className={`relative aspect-[2/3] w-full bg-white transition-all duration-300 overflow-hidden ${!isCropOpen ? 'cursor-zoom-in' : ''}`}
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
                style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
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
                    onLoad={(e) => {
                      const active = pages[currentPage];
                      if (active?.pageNum) loadedPageNumsRef.current.add(active.pageNum);
                      setMainImageLoading(false);
                      setMainImageError(false);
                      const target = e.currentTarget;
                      if (target?.naturalWidth && target?.naturalHeight) {
                        setPageImageSize({ width: target.naturalWidth, height: target.naturalHeight });
                      }
                    }}
                    onError={() => {
                      setMainImageLoading(false);
                      setMainImageError(true);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
            {highlightRect && highlightVisible && (
              <div
                className="absolute z-[44] pointer-events-none border-2 border-red-500 border-dotted bg-red-200/50 animate-pulse shadow-[0_0_0_3px_rgba(255,0,0,0.15)]"
                style={{
                  top: `${highlightRect.y}%`,
                  left: `${highlightRect.x}%`,
                  width: `${highlightRect.w}%`,
                  height: `${highlightRect.h}%`,
                }}
              />
            )}
            <div
              className={`pointer-events-none absolute inset-y-0 transition-all duration-500 ${direction > 0 ? 'left-0' : 'right-0'
                } ${isPageTurning ? 'w-16 opacity-100' : 'w-0 opacity-0'}`}
              style={{ background: 'transparent' }}
            />

            {/* Crop Overlay */}
            {isCropOpen && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div
                  className="absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-auto border-2 border-white cursor-move"
                  style={{
                    top: desktopCropLayout ? desktopCropLayout.cropTop : `${crop.y}%`,
                    left: desktopCropLayout ? desktopCropLayout.cropLeft : `${crop.x}%`,
                    width: desktopCropLayout ? desktopCropLayout.cropWidth : `${crop.w}%`,
                    height: desktopCropLayout ? desktopCropLayout.cropHeight : `${crop.h}%`,
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
                  <WhatsAppIcon size={24} />
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
                <button
                  onClick={() => {
                    const pageUrl = getCurrentPageUrl();
                    if (!pageUrl) return;
                    const displayDate = formatDate(edition?.date);
                    const pageNum = currentPage + 1;
                    handleClipDownload(pageUrl, displayDate, pageNum);
                  }}
                  disabled={isDownloading}
                  className="bg-[#D4A800] text-black p-3 rounded-sm hover:bg-[#c29800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Download Clip"
                >
                  {isDownloading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Branded Preview Card */}
              <div className="flex justify-center p-2">
                <div
                  className="bg-white border-[8px] border-[#D4A800] shadow-xl inline-flex flex-col max-w-full"
                >
                  {/* Card Header - Banner Style with Text */}
                  <div className="bg-white flex flex-col border-b border-gray-100">
                    <div className="h-1 bg-[#2D3A2D] w-full" />
                    <div className="p-3 flex items-center justify-center bg-white">
                      <img
                        src="/ys-logo.jpeg"
                        alt="Yellow Singam"
                        className="h-12 w-auto object-contain"
                      />
                    </div>
                    <div className="pb-1 px-3 text-center text-[11px] font-bold uppercase tracking-tight text-[#2D2D2D]">
                      {formatDate(edition?.date)} | Page {currentPage + 1}
                    </div>
                    <div className="pb-2 px-3 text-center text-[9px] font-medium tracking-tight text-[#2D2D2D]/70">
                      https://epaper.yellowsingam.com/
                    </div>
                    <div className="h-[0.5px] bg-black/10 w-full" />
                  </div>

                  {/* Image Area */}
                  <div className="relative bg-white flex items-center justify-center min-h-[260px]">
                    {getCurrentPageUrl() ? (
                      <>
                        <img
                          src={`/api/crop?url=${encodeURIComponent(getCurrentPageUrl())}&x=${crop.x}&y=${crop.y}&w=${crop.w}&h=${crop.h}&inline=true`}
                          alt="Cropped Preview"
                          className="block max-w-full h-auto object-contain"
                          onLoad={() => setClipPreviewLoading(false)}
                          onError={() => setClipPreviewLoading(false)}
                        />
                        {clipPreviewLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                            <Loader2 size={28} className="text-[#D4A800] animate-spin" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center py-10">
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

      {/* Quick Share Sheet (mobile fallback + desktop popup) */}
      {isQuickShareOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3 md:p-6"
          onClick={() => setIsQuickShareOpen(false)}
        >
          <div
            className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-4 md:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">Share ePaper</h3>
              <button
                onClick={() => setIsQuickShareOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Close share"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <button onClick={() => openPlatformShare('whatsapp')} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center"><WhatsAppIcon size={18} /></div>
                <span className="text-[11px] text-gray-600">WhatsApp</span>
              </button>
              <button onClick={() => openPlatformShare('facebook')} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center"><Facebook size={18} /></div>
                <span className="text-[11px] text-gray-600">Facebook</span>
              </button>
              <button onClick={() => openPlatformShare('twitter')} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M4 20L20 4" /></svg>
                </div>
                <span className="text-[11px] text-gray-600">Twitter</span>
              </button>
              <button onClick={() => openPlatformShare('linkedin')} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center"><Linkedin size={18} /></div>
                <span className="text-[11px] text-gray-600">LinkedIn</span>
              </button>
              <button onClick={handleCopyEditionLink} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center"><Copy size={18} /></div>
                <span className="text-[11px] text-gray-600">Copy Link</span>
              </button>
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
                onMouseDown={handleDesktopPanStart}
                className={`hidden md:block w-full h-full overflow-auto no-scrollbar bg-black/40 ${isDesktopPanning ? 'cursor-grabbing select-none' : (!isFitToScreen && desktopZoomScale > 1 ? 'cursor-grab' : 'cursor-default')}`}
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
                  className="relative w-full h-full transition-transform duration-0 will-change-transform"
                  style={{
                    transform: `translate3d(${imageTransform.x}px, ${imageTransform.y}px, 0) scale(${imageTransform.scale})`,
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
              <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
                  <button
                    onClick={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="p-2.5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all active:scale-90"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleResetToNormalView}
                      className={`p-2.5 transition-all ${isAnyZoomActive
                          ? 'rounded-lg text-white bg-white/12 hover:bg-white/20'
                          : 'rounded-full text-[#D4A800] bg-[#D4A800]/10'
                        }`}
                    >
                      {isAnyZoomActive ? <Minimize2 size={18} /> : <Maximize size={18} />}
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
