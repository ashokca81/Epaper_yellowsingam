'use client';

import { useState } from 'react';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor,
  Eye,
  Save,
  Check,
  RotateCcw
} from 'lucide-react';

export default function ThemeSetup() {
  const [saved, setSaved] = useState(false);
  const [activeTheme, setActiveTheme] = useState('light');
  const [previewTheme, setPreviewTheme] = useState('light');

  const [colors, setColors] = useState({
    primary: '#D4A800',
    secondary: '#2D2D2D',
    accent: '#3B5BDB',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#1A1A1A',
    textMuted: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  });

  const [fonts, setFonts] = useState({
    heading: 'Inter',
    body: 'Inter',
    telugu: 'Noto Sans Telugu',
  });

  const themes = [
    { id: 'light', name: 'Light', icon: Sun, description: 'Clean white background' },
    { id: 'dark', name: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { id: 'system', name: 'System', icon: Monitor, description: 'Match device settings' },
  ];

  const fontOptions = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'Noto Sans Telugu',
    'Mandali',
    'Ramabhadra',
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const resetToDefaults = () => {
    setColors({
      primary: '#D4A800',
      secondary: '#2D2D2D',
      accent: '#3B5BDB',
      background: '#FFFFFF',
      surface: '#F8F9FA',
      text: '#1A1A1A',
      textMuted: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Theme Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Customize the look and feel of your ePaper</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={18} />
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20"
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saved ? 'Saved!' : 'Save Theme'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Theme Mode Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Theme Mode */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Theme Mode</h2>
            <div className="grid grid-cols-3 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    activeTheme === theme.id 
                      ? 'border-[#3b5bdb] bg-[#e8edfc]' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <theme.icon 
                    size={24} 
                    className={activeTheme === theme.id ? 'text-[#3b5bdb] mx-auto' : 'text-gray-500 mx-auto'} 
                  />
                  <p className={`font-semibold mt-2 ${activeTheme === theme.id ? 'text-[#3b5bdb]' : 'text-gray-800'}`}>
                    {theme.name}
                  </p>
                  <p className="text-xs text-gray-500">{theme.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Color Palette</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-600 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Typography</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Heading Font</label>
                <select
                  value={fonts.heading}
                  onChange={(e) => setFonts(prev => ({ ...prev, heading: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Body Font</label>
                <select
                  value={fonts.body}
                  onChange={(e) => setFonts(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Telugu Font</label>
                <select
                  value={fonts.telugu}
                  onChange={(e) => setFonts(prev => ({ ...prev, telugu: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                >
                  <option value="Noto Sans Telugu">Noto Sans Telugu</option>
                  <option value="Mandali">Mandali</option>
                  <option value="Ramabhadra">Ramabhadra</option>
                  <option value="NTR">NTR</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Live Preview</h2>
              <Eye size={20} className="text-gray-400" />
            </div>
            
            {/* Preview Card */}
            <div 
              className="rounded-xl overflow-hidden border"
              style={{ backgroundColor: colors.background, borderColor: colors.surface }}
            >
              {/* Preview Header */}
              <div 
                className="p-4"
                style={{ backgroundColor: colors.secondary }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <span className="text-white font-bold text-sm">Yellow Singam</span>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-4 space-y-3">
                <div 
                  className="w-full h-24 rounded-lg"
                  style={{ backgroundColor: colors.surface }}
                />
                <h3 
                  className="font-bold"
                  style={{ color: colors.text, fontFamily: fonts.heading }}
                >
                  హెడ్‌లైన్ టెక్స్ట్
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: colors.textMuted, fontFamily: fonts.body }}
                >
                  Sample body text appears here
                </p>
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Primary Button
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: colors.surface, color: colors.text }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>

            {/* Status Colors */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div 
                className="p-2 rounded-lg text-center text-xs text-white font-medium"
                style={{ backgroundColor: colors.success }}
              >
                Success
              </div>
              <div 
                className="p-2 rounded-lg text-center text-xs text-white font-medium"
                style={{ backgroundColor: colors.warning }}
              >
                Warning
              </div>
              <div 
                className="p-2 rounded-lg text-center text-xs text-white font-medium"
                style={{ backgroundColor: colors.error }}
              >
                Error
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
