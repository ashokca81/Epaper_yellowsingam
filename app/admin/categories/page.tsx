'use client';

import { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Newspaper,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  editionCount: number;
  isActive: boolean;
}

export default function EditionCategories() {
  const [categories, setCategories] = useState<Category[]>([
    { _id: '1', name: 'Main Edition', slug: 'main-edition', description: 'Daily main newspaper edition', editionCount: 1200, isActive: true },
    { _id: '2', name: 'City Edition', slug: 'city-edition', description: 'Local city news and updates', editionCount: 450, isActive: true },
    { _id: '3', name: 'Sports Edition', slug: 'sports-edition', description: 'Sports news and coverage', editionCount: 120, isActive: true },
    { _id: '4', name: 'Business Edition', slug: 'business-edition', description: 'Business and financial news', editionCount: 80, isActive: false },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = () => {
    if (editingCategory) {
      setCategories(prev => prev.map(cat => 
        cat._id === editingCategory._id 
          ? { ...cat, name: formData.name, description: formData.description }
          : cat
      ));
    } else {
      const newCategory: Category = {
        _id: Date.now().toString(),
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        editionCount: 0,
        isActive: true,
      };
      setCategories(prev => [...prev, newCategory]);
    }
    closeModal();
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  const toggleActive = (id: string) => {
    setCategories(prev => prev.map(cat => 
      cat._id === id ? { ...cat, isActive: !cat.isActive } : cat
    ));
  };

  const deleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(prev => prev.filter(cat => cat._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edition Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your ePaper categories</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div 
            key={category._id}
            className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all ${
              category.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#e8edfc] rounded-xl flex items-center justify-center">
                <Newspaper size={24} className="text-[#3b5bdb]" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openModal(category)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => deleteCategory(category._id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-gray-800 text-lg">{category.name}</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">{category.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {category.editionCount.toLocaleString()} editions
              </span>
              <button
                onClick={() => toggleActive(category._id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  category.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {category.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Enter category description"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#3b5bdb] text-white font-semibold rounded-xl hover:bg-[#364fc7] transition-colors"
              >
                <Check size={18} />
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
