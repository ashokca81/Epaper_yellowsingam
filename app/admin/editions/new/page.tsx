'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  FileText,
  ArrowRight,
  RefreshCw,
  Calendar,
  ChevronDown,
  Check,
  AlertCircle,
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const categories = [
  { id: 'main', name: 'Main Edition' },
  { id: 'city', name: 'City Edition' },
  { id: 'sports', name: 'Sports Edition' },
  { id: 'business', name: 'Business Edition' },
];

const statuses = [
  { id: 'live', name: 'LIVE NOW', color: 'bg-green-500' },
  { id: 'scheduled', name: 'MAKE SCHEDULE', color: 'bg-blue-500' },
  { id: 'draft', name: 'SAVE IN DRAFT', color: 'bg-gray-500' },
];

const uploadTypes = [
  { id: 'pdf', name: 'PDF', icon: FileText },
  { id: 'images', name: 'IMAGES JPG/PNG', icon: ImageIcon },
];

// Sortable Item Component for Drag and Drop
interface SortableItemProps {
  id: string;
  index: number;
  preview: string;
  uploadType: string;
  onRemove: (index: number) => void;
}

function SortableItem({ id, index, preview, uploadType, onRemove }: SortableItemProps) {
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
      className={`relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden group border-2 transition-all touch-none ${
        isDragging ? 'border-[#3b5bdb] shadow-lg scale-105' : 'border-transparent hover:border-[#3b5bdb]/30'
      }`}
    >
      {/* Drag Handle - Always visible for better UX */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 transition-all cursor-grab active:cursor-grabbing shadow-sm hover:bg-white touch-none"
        style={{ touchAction: 'none' }}
      >
        <GripVertical size={16} className="text-gray-600" />
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
      >
        <X size={14} />
      </button>

      {/* Preview Content */}
      {uploadType === 'pdf' ? (
        <div className="h-full flex flex-col items-center justify-center bg-red-50">
          <FileText size={24} className="text-red-600 mb-2" />
          <span className="text-xs text-red-700 font-medium">PDF</span>
        </div>
      ) : (
        <img
          src={preview}
          alt={`Preview ${index + 1}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Page Number */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        Page {index + 1}
      </div>
    </div>
  );
}

export default function PublishEdition() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    date: '',
    metaTitle: '',
    metaDescription: '',
    category: 'main',
    status: '',
    uploadType: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  /** Keep under ~2MB so proxies (e.g. Vercel ~4.5MB) never reject; presigned path has no body limit. */
  const MAX_FULL_WEBP_BYTES = 2 * 1024 * 1024;

  const blobToWebp = (
    canvas: HTMLCanvasElement,
    quality: number
  ): Promise<Blob | null> =>
    new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

  /** Resize + lower quality until file is small enough for /api/upload/image fallback. */
  const compressFullWebpForUpload = async (file: File): Promise<Blob> => {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        try {
          let maxSide = Math.min(2000, Math.max(img.width, img.height));
          let quality = 0.78;

          for (let attempt = 0; attempt < 18; attempt++) {
            const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
            const targetW = Math.max(1, Math.round(img.width * ratio));
            const targetH = Math.max(1, Math.round(img.height * ratio));

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              URL.revokeObjectURL(objectUrl);
              reject(new Error('Canvas not available'));
              return;
            }
            ctx.drawImage(img, 0, 0, targetW, targetH);

            let blob = await blobToWebp(canvas, quality);
            if (!blob) {
              URL.revokeObjectURL(objectUrl);
              reject(new Error('Could not encode image'));
              return;
            }

            if (blob.size <= MAX_FULL_WEBP_BYTES) {
              URL.revokeObjectURL(objectUrl);
              resolve(blob);
              return;
            }

            if (quality > 0.45) {
              quality -= 0.06;
            } else {
              maxSide = Math.max(960, Math.floor(maxSide * 0.88));
            }
          }

          URL.revokeObjectURL(objectUrl);
          reject(new Error('Image still too large after compression. Use smaller scans.'));
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image'));
      };

      img.src = objectUrl;
    });
  };

  const compressThumbWebp = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = async () => {
        const maxW = 420;
        const maxH = 630;
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const targetW = Math.max(1, Math.round(img.width * ratio));
        const targetH = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const blob = await blobToWebp(canvas, 0.68);
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error('Thumb encode failed'));
          return;
        }
        resolve(blob);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image for thumb'));
      };
      img.src = objectUrl;
    });
  };

  const uploadEditionPageViaPresign = async (
    folderName: string,
    pageNum: number,
    fullBlob: Blob,
    thumbBlob: Blob
  ) => {
    const presignRes = await fetch('/api/editions/presign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName, pageNum }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => null);
      throw new Error(err?.error || 'Could not get upload URLs');
    }
    const data = await presignRes.json();
    const fullPut = await fetch(data.full.putUrl, {
      method: 'PUT',
      body: fullBlob,
      headers: { 'Content-Type': 'image/webp' },
    });
    if (!fullPut.ok) {
      throw new Error(`Full image upload failed (${fullPut.status})`);
    }
    const thumbPut = await fetch(data.thumb.putUrl, {
      method: 'PUT',
      body: thumbBlob,
      headers: { 'Content-Type': 'image/webp' },
    });
    if (!thumbPut.ok) {
      throw new Error(`Thumbnail upload failed (${thumbPut.status})`);
    }
    return {
      filename: data.full.filename as string,
      url: data.full.publicUrl as string,
      previewFilename: data.thumb.filename as string,
      previewUrl: data.thumb.publicUrl as string,
      pageNum,
    };
  };

  const uploadEditionPageViaApi = async (
    folderName: string,
    pageNum: number,
    fullFile: File
  ) => {
    const singleUploadData = new FormData();
    singleUploadData.append('file', fullFile);
    singleUploadData.append('kind', 'edition');
    singleUploadData.append('folderName', folderName);
    singleUploadData.append('pageNum', String(pageNum));

    const uploadResponse = await fetch('/api/upload/image', {
      method: 'POST',
      body: singleUploadData,
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.json().catch(() => null);
      throw new Error(uploadError?.error || `Page ${pageNum} upload failed (${uploadResponse.status})`);
    }

    const uploadJson = await uploadResponse.json();
    if (!uploadJson?.page) {
      throw new Error(`Page ${pageNum} upload response invalid`);
    }
    return uploadJson.page as {
      filename: string;
      url: string;
      previewFilename?: string;
      previewUrl?: string;
      pageNum: number;
    };
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end (reordering)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id }); // Debug log

    if (active.id !== over?.id && over) {
      const oldIndex = files.findIndex((_, index) => index.toString() === active.id);
      const newIndex = files.findIndex((_, index) => index.toString() === over.id);
      
      console.log('Reordering:', { oldIndex, newIndex }); // Debug log

      // Reorder both files and previews arrays
      setFiles((items) => arrayMove(items, oldIndex, newIndex));
      setPreviews((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate alias from name
    if (name === 'name') {
      const alias = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, alias }));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [formData.uploadType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (formData.uploadType === 'pdf') {
        return file.type === 'application/pdf';
      } else {
        return file.type.startsWith('image/');
      }
    });

    setFiles(prev => [...prev, ...validFiles]);

    // Generate previews for images
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        setPreviews(prev => [...prev, 'pdf']);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFormData({
      name: '',
      alias: '',
      date: '',
      metaTitle: '',
      metaDescription: '',
      category: 'main',
      status: '',
      uploadType: '',
    });
    setFiles([]);
    setPreviews([]);
    setUploadProgress(0);
    setError('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.date || !formData.status || !formData.uploadType || files.length === 0) {
      setError('Please fill all required fields and upload files');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const normalizedDate = new Date(formData.date).toISOString();
      const folderName = formData.alias || normalizedDate;

      // Avoid 413: presigned PUT to R2 (no Next body), else tiny file to /api/upload/image.
      if (formData.uploadType === 'images') {
        const uploadedPages: Array<{
          filename: string;
          url: string;
          previewFilename?: string;
          previewUrl?: string;
          pageNum: number;
        }> = [];

        for (let i = 0; i < files.length; i++) {
          const original = files[i];
          const fullBlob = await compressFullWebpForUpload(original);
          const thumbBlob = await compressThumbWebp(original);

          let pageMeta: (typeof uploadedPages)[0];
          try {
            pageMeta = await uploadEditionPageViaPresign(folderName, i + 1, fullBlob, thumbBlob);
          } catch (presignErr) {
            console.warn(`Presigned upload failed for page ${i + 1}, using fallback:`, presignErr);
            const fullFile = new File([fullBlob], `page_${i + 1}.webp`, { type: 'image/webp' });
            pageMeta = await uploadEditionPageViaApi(folderName, i + 1, fullFile);
          }
          uploadedPages.push(pageMeta);

          const perFileProgress = Math.round(((i + 1) / files.length) * 90);
          setUploadProgress(Math.max(1, perFileProgress));
        }

        const createResponse = await fetch('/api/editions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            alias: folderName,
            date: normalizedDate,
            pages: uploadedPages,
          }),
        });

        if (!createResponse.ok) {
          const createError = await createResponse.json().catch(() => null);
          throw new Error(createError?.error || 'Edition create failed');
        }

        setUploadProgress(100);
        router.push('/admin/editions');
        return;
      }

      // Keep existing multipart flow for non-image upload types.
      const uploadData = new FormData();
      uploadData.append('name', formData.name);
      uploadData.append('alias', folderName);
      uploadData.append('date', normalizedDate);
      uploadData.append('metaTitle', formData.metaTitle);
      uploadData.append('metaDescription', formData.metaDescription);
      uploadData.append('category', formData.category);
      uploadData.append('status', formData.status);
      uploadData.append('uploadType', formData.uploadType);
      files.forEach((file, index) => uploadData.append(`file_${index}`, file));

      const multipartResponse = await fetch('/api/editions', {
        method: 'POST',
        body: uploadData,
      });

      if (!multipartResponse.ok) {
        const data = await multipartResponse.json().catch(() => null);
        throw new Error(data?.error || 'Upload failed');
      }
      setUploadProgress(100);
      router.push('/admin/editions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#e8edfc] rounded-lg flex items-center justify-center">
          <Upload size={20} className="text-[#3b5bdb]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">CREATE NEW EDITION</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          {/* Edition Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              EDITION NAME: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
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
                name="alias"
                value={formData.alias}
                onChange={handleInputChange}
                placeholder="auto-generated"
                className="w-full px-4 py-3 bg-[#3b5bdb] text-white rounded-xl focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                EDITION DATE & TIME: <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
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
              name="metaTitle"
              value={formData.metaTitle}
              onChange={handleInputChange}
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
              name="metaDescription"
              value={formData.metaDescription}
              onChange={handleInputChange}
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
                name="category"
                value={formData.category}
                onChange={handleInputChange}
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
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all appearance-none cursor-pointer"
              >
                <option value="">Select One</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>

            {/* Upload Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                UPLOAD TYPE: <span className="text-red-500">*</span>
              </label>
              <select
                name="uploadType"
                value={formData.uploadType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] transition-all appearance-none cursor-pointer"
              >
                <option value="">Select One</option>
                {uploadTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right - Upload Area */}
        <div className="space-y-4">
          <div 
            className={`bg-white rounded-2xl p-8 shadow-sm border-2 border-dashed transition-all min-h-[300px] flex flex-col items-center justify-center ${
              isDragging 
                ? 'border-[#3b5bdb] bg-[#e8edfc]' 
                : 'border-gray-200 hover:border-[#3b5bdb]/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {files.length === 0 ? (
              <>
                <div className="w-24 h-24 mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl transform rotate-6" />
                  <div className="absolute inset-0 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <ImageIcon size={40} className="text-green-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Drop, Upload or Paste {formData.uploadType === 'pdf' ? 'PDF' : 'image'}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Supported formats: {formData.uploadType === 'pdf' ? 'PDF' : 'JPG, PNG'}
                </p>
                <label className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold cursor-pointer hover:bg-gray-800 transition-colors">
                  <span>+ BROWSE</span>
                  <input
                    type="file"
                    accept={formData.uploadType === 'pdf' ? '.pdf' : 'image/*'}
                    multiple={formData.uploadType !== 'pdf'}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <div className="w-full">
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => {
                    console.log('Drag started:', event.active.id); // Debug log
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                      <GripVertical size={16} />
                      <span>Drag to reorder pages</span>
                    </div>
                    <SortableContext 
                      items={files.map((_, index) => index.toString())}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {previews.map((preview, index) => (
                          <SortableItem
                            key={index.toString()}
                            id={index.toString()}
                            index={index}
                            preview={preview}
                            uploadType={formData.uploadType}
                            onRemove={removeFile}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </DndContext>
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                  <span>+ Add More</span>
                  <input
                    type="file"
                    accept={formData.uploadType === 'pdf' ? '.pdf' : 'image/*'}
                    multiple={formData.uploadType !== 'pdf'}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {uploading && (
              <div className="w-full">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading files...</span>
                  <span className="font-semibold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3b5bdb] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 bg-[#3b5bdb] text-white rounded-xl font-semibold hover:bg-[#364fc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Review & Upload
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              <RefreshCw size={18} />
              Reset
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
