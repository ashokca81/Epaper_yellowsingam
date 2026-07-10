'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  FileText,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';

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
  category: string;
  status: string;
  pages: EditionPage[];
  pageCount: number;
  views: number;
  createdAt: string;
}

export default function ManageEditions() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState<Edition | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfModalEdition, setPdfModalEdition] = useState<Edition | null>(null);
  const [pdfAbortController, setPdfAbortController] = useState<AbortController | null>(null);
  const [downloadedMessage, setDownloadedMessage] = useState<string | null>(null);

  // Fetch editions from API
  const fetchEditions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/editions?all=true', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.editions) {
        setEditions(data.editions);
      }
    } catch (err) {
      setError('Failed to fetch editions');
      console.error('Error fetching editions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEditions();
  }, [fetchEditions]);

  // Delete edition
  const handleDelete = async (edition: Edition) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/editions/${edition._id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEditions(prev => prev.filter(e => e._id !== edition._id));
        setDeleteModal(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete edition');
      }
    } catch (err) {
      setError('Failed to delete edition');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEditions = editions.filter(edition => {
    const matchesSearch = edition.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          edition.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          edition.alias?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || edition.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || edition.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string, dateStr: string) => {
    if (status === 'scheduled' && new Date(dateStr) <= new Date()) {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Published (Auto)</span>;
    }
    switch (status) {
      case 'published':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Published</span>;
      case 'scheduled':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Scheduled</span>;
      case 'draft':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Draft</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDownloadPdf = async (edition: Edition) => {
    if (generatingPdfId) return;
    setError('');

    const controller = new AbortController();
    setPdfAbortController(controller);
    setGeneratingPdfId(edition._id);
    setPdfModalEdition(edition);

    try {
      const endpoint = `/api/editions/${edition._id}/pdf?download=1`;
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const filename = `${(edition.alias || edition.name || 'edition')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'edition'}.pdf`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Keep blob URL briefly so browser can complete handoff even if tab is minimized.
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      setDownloadedMessage(`Downloaded: ${edition.name}`);
      setTimeout(() => setDownloadedMessage(null), 2500);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setError('PDF generation cancelled.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      }
    } finally {
      setGeneratingPdfId(null);
      setPdfModalEdition(null);
      setPdfAbortController(null);
    }
  };

  const handleCancelPdfGeneration = () => {
    if (pdfAbortController) {
      pdfAbortController.abort();
    } else {
      setGeneratingPdfId(null);
      setPdfModalEdition(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Editions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {editions.length} editions total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEditions}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            href="/admin/editions/new"
            className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20"
          >
            <Plus size={18} />
            New Edition
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search editions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="all">All Categories</option>
            <option value="main">Main Edition</option>
            <option value="city">City Edition</option>
            <option value="sports">Sports Edition</option>
            <option value="business">Business Edition</option>
          </select>
        </div>
      </div>

      {/* Editions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#3b5bdb] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredEditions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No editions found</p>
            <Link 
              href="/admin/editions/new"
              className="inline-flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold"
            >
              <Plus size={18} />
              Create First Edition
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Edition</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Pages</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">PDF</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEditions.map((edition) => (
                    <tr key={edition._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                            {edition.pages && edition.pages[0]?.url ? (
                              <Image
                                src={edition.pages[0].url}
                                alt={edition.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText size={20} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{edition.name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={12} />
                              {formatDate(edition.date)}
                            </p>
                            <p className="text-xs text-blue-500 mt-0.5">/{edition.alias}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 capitalize">{edition.category || 'Main'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{edition.pageCount || edition.pages?.length || 0} pages</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDownloadPdf(edition)}
                          disabled={!!generatingPdfId || !(edition.pageCount || edition.pages?.length)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generate and download PDF"
                        >
                          <FileText size={14} className="text-red-600" />
                          {generatingPdfId === edition._id ? 'Generating...' : 'PDF'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(edition.status, edition.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/edition/${edition.alias}`}
                            target="_blank"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                            title="View Live"
                          >
                            <ExternalLink size={18} className="text-gray-500" />
                          </Link>
                          <Link 
                            href={`/admin/editions/${edition._id}/edit`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                            title="Edit"
                          >
                            <Edit size={18} className="text-gray-500" />
                          </Link>
                          <button 
                            onClick={() => setDeleteModal(edition)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors" 
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{filteredEditions.length}</span> editions
              </p>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Delete Edition?</h2>
              <p className="text-gray-500 text-center mb-2">
                Are you sure you want to delete <strong>{deleteModal.name}</strong>?
              </p>
              <p className="text-sm text-gray-400 text-center">
                Date: {formatDate(deleteModal.date)} | {deleteModal.pageCount || deleteModal.pages?.length || 0} pages
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-6 py-4 text-gray-600 font-medium hover:bg-gray-50 transition-colors rounded-bl-2xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                disabled={deleting}
                className="flex-1 px-6 py-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors rounded-br-2xl disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Generation Modal */}
      {pdfModalEdition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText size={26} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center">Generating PDF</h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Generating the PDF for {pdfModalEdition.name}. Please wait a moment.
              </p>
              <div className="mt-5">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-red-500 rounded-full animate-pulse" />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                  Processing pages...
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={handleCancelPdfGeneration}
                className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel Generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Success Toast */}
      {downloadedMessage && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
            {downloadedMessage}
          </div>
        </div>
      )}

    </div>
  );
}
