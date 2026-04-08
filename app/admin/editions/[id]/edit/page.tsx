'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Upload,
  Save, 
  Calendar, 
  FileText,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  GripVertical
} from 'lucide-react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  metaTitle: string;
  metaDescription: string;
  category: string;
  status: string;
  pages: EditionPage[];
  pageCount: number;
}

const categories = [
  { id: 'main', name: 'Main Edition' },
  { id: 'city', name: 'City Edition' },
  { id: 'sports', name: 'Sports Edition' },
  { id: 'business', name: 'Business Edition' },
];

const statuses = [
  { id: 'published', name: 'PUBLISHED', color: 'bg-green-500' },
  { id: 'scheduled', name: 'SCHEDULED', color: 'bg-blue-500' },
  { id: 'draft', name: 'DRAFT', color: 'bg-gray-500' },
];

// Sortable Page Item Component for Edit Page
interface SortablePageItemProps {
  id: string;
  page: EditionPage;
  index: number;
}

function SortablePageItem({ id, page, index }: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-gray-50 rounded-xl p-3 border-2 transition-all ${
        isDragging ? 'border-[#3b5bdb] shadow-lg' : 'border-gray-200 hover:border-[#3b5bdb]/30'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-1 cursor-grab active:cursor-grabbing shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={14} className="text-gray-600" />
      </div>

      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative mb-2">
        <Image
          src={page.url}
          alt={`Page ${page.pageNum}`}
          fill
          className="object-cover"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">Page {index + 1}</p>
        <p className="text-xs text-gray-400 truncate">{page.filename}</p>
      </div>
    </div>
  );
}

export default function EditEdition({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPages, setSavingPages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [edition, setEdition] = useState<Edition | null>(null);
  const [reorderedPages, setReorderedPages] = useState<EditionPage[]>([]);
  const [hasReordered, setHasReordered] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    date: '',
    metaTitle: '',
    metaDescription: '',
    category: 'main',
    status: 'published'
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end (page reordering)
  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && edition?.pages) {
      const oldIndex = reorderedPages.findIndex((_, index) => index.toString() === active.id);
      const newIndex = reorderedPages.findIndex((_, index) => index.toString() === over?.id);

      const newPages = arrayMove(reorderedPages, oldIndex, newIndex);
      setReorderedPages(newPages);
      setHasReordered(true);
    }
  };

  // Save reordered pages
  const handleSavePageOrder = async () => {
    if (!hasReordered || !edition) return;

    setSavingPages(true);
    setError('');

    try {
      const response = await fetch(`/api/editions/${id}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pages: reorderedPages }),
      });

      const data = await response.json();

      if (response.ok) {
        setEdition(prev => prev ? { ...prev, pages: data.pages } : null);
        setHasReordered(false);
        setSuccess('Page order updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update page order');
      }
    } catch (err) {
      setError('Failed to update page order');
      console.error('Page reorder error:', err);
    } finally {
      setSavingPages(false);
    }
  };

  // Reset page order
  const handleResetPageOrder = () => {
    if (edition?.pages) {
      setReorderedPages([...edition.pages]);
      setHasReordered(false);
    }
  };

  // Fetch edition data
  useEffect(() => {
    const fetchEdition = async () => {
      try {
        const response = await fetch(`/api/editions/${id}`);
        const data = await response.json();
        
        if (data.edition) {
          setEdition(data.edition);
          setReorderedPages(data.edition.pages || []); // Initialize reordered pages
          setFormData({
            name: data.edition.name || '',
            alias: data.edition.alias || '',
            date: data.edition.date ? (() => {
              const d = new Date(data.edition.date);
              return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            })() : '',
            metaTitle: data.edition.metaTitle || '',
            metaDescription: data.edition.metaDescription || '',
            category: data.edition.category || 'main',
            status: data.edition.status || 'published'
          });
        } else {
          setError('Edition not found');
        }
      } catch (err) {
        setError('Failed to fetch edition');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEdition();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    console.log('Form data being sent:', formData); // Debug log

    try {
      const payload = { ...formData, date: new Date(formData.date).toISOString() };
      const response = await fetch(`/api/editions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Server response:', data); // Debug log

      if (response.ok) {
        setSuccess('Edition updated successfully!');
        setTimeout(() => {
          router.push('/admin/editions');
        }, 1500);
      } else {
        console.error('Server error:', data);
        setError(data.error || 'Failed to update edition');
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error: Failed to update edition');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#3b5bdb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <p className="text-gray-600 mb-4">Edition not found</p>
        <button
          onClick={() => router.push('/admin/editions')}
          className="text-[#3b5bdb] hover:underline"
        >
          Go back to editions
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#e8edfc] rounded-lg flex items-center justify-center">
          <Upload size={20} className="text-[#3b5bdb]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">EDIT EDITION</h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-600">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Edition Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                EDITION NAME: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter edition name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all"
              />
            </div>

            {/* Alias & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ALIAS (URL):
                </label>
                <input
                  type="text"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="edition-alias"
                  className="w-full px-4 py-3 bg-[#3b5bdb] text-white rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  EDITION DATE & TIME: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Meta Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                META TITLE:
              </label>
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="SEO title for search engines"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all"
              />
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                META DESCRIPTION:
              </label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                rows={4}
                placeholder="SEO description for search engines"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all resize-none"
              />
            </div>

            {/* Category, Status, Upload Type */}
            <div className="grid grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CATEGORY: <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all appearance-none cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  STATUS: <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all appearance-none cursor-pointer"
                >
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Type (Disabled for Edit) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  UPLOAD TYPE:
                </label>
                <select
                  value="images"
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed opacity-50 appearance-none"
                >
                  <option value="images">IMAGES JPG/PNG</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-[#3b5bdb] text-white rounded-xl font-semibold hover:bg-[#364fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                    <Save size={18} />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/editions')}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                <RefreshCw size={18} />
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right - Pages Preview with Drag & Drop */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} />
              CURRENT PAGES ({reorderedPages.length})
            </h3>
            {hasReordered && (
              <div className="flex gap-2">
                <button
                  onClick={handleResetPageOrder}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSavePageOrder}
                  disabled={savingPages}
                  className="px-3 py-1 text-xs bg-[#3b5bdb] text-white rounded-lg hover:bg-[#364fc7] transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {savingPages ? (
                    <>
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save Order
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {reorderedPages.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePageDragEnd}
            >
              <div className="mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <GripVertical size={14} />
                  <span>Drag to reorder pages</span>
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <SortableContext 
                  items={reorderedPages.map((_, index) => index.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-2 gap-3 group">
                    {reorderedPages.map((page, index) => (
                      <SortablePageItem
                        key={`${page.filename}-${index}`}
                        id={index.toString()}
                        page={page}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          ) : (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 font-medium">No pages uploaded</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-700 font-medium mb-2">
              ✨ Page Management:
            </p>
            <p className="text-xs text-green-600">
              You can now reorder pages by dragging them. Changes will be saved to the database when you click "Save Order".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
