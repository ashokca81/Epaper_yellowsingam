'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Settings, 
  Globe, 
  Palette, 
  Bell, 
  Shield, 
  Save,
  Upload,
  Check,
  MonitorPlay,
  Loader2
} from 'lucide-react';

export default function EpaperSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [settings, setSettings] = useState({
    siteName: 'Yellow Singam Telugu Daily',
    tagline: 'Hunting for Truth',
    siteUrl: 'https://epaper.yellowsingam.com',
    email: 'contact@yellowsingam.com',
    phone: '+91 9876543210',
    address: 'Vijayawada, Andhra Pradesh, India',
    timezone: 'Asia/Kolkata',
    language: 'te',
    primaryColor: '#D4A800',
    secondaryColor: '#2D2D2D',
    enableNotifications: true,
    enableAnalytics: true,
    enableWatermark: true,
    watermarkText: 'Yellow Singam',
    pdfQuality: 'high',
    imageQuality: 'high',
    adEnabled: false,
    adType: 'custom',
    googleAdCode: '',
    customAdImage: '',
    customAdLink: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success && data.url) {
        setSettings(prev => ({ ...prev, customAdImage: data.url }));
      }
    } catch (error) {
      console.error('Failed to upload ad image', error);
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'ads', name: 'Advertisements', icon: MonitorPlay },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#3b5bdb]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ePaper Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure your ePaper platform</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20 disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  activeTab === tab.id 
                    ? 'bg-[#3b5bdb] text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 pb-4 border-b">General Settings</h2>
              
              {/* Logo Upload */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                <div className="w-20 h-20 relative bg-white rounded-xl shadow-sm">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain p-2" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Site Logo</h3>
                  <p className="text-sm text-gray-500 mb-2">Upload your ePaper logo</p>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50">
                    <Upload size={16} />
                    Upload New Logo
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Site Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tagline</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => setSettings(prev => ({ ...prev, tagline: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Site URL</label>
                  <input
                    type="url"
                    value={settings.siteUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
               {/* Unchanged Appearance Settings Body */}
               <h2 className="text-lg font-bold text-gray-800 pb-4 border-b">Appearance Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-800">Enable Watermark</h3>
                    <p className="text-sm text-gray-500">Add watermark to downloaded images</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, enableWatermark: !prev.enableWatermark }))}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.enableWatermark ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enableWatermark ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {settings.enableWatermark && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Watermark Text</label>
                    <input
                      type="text"
                      value={settings.watermarkText}
                      onChange={(e) => setSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">PDF Quality</label>
                    <select
                      value={settings.pdfQuality}
                      onChange={(e) => setSettings(prev => ({ ...prev, pdfQuality: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                    >
                      <option value="low">Low (Fast)</option>
                      <option value="medium">Medium</option>
                      <option value="high">High (Best)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Image Quality</label>
                    <select
                      value={settings.imageQuality}
                      onChange={(e) => setSettings(prev => ({ ...prev, imageQuality: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                    >
                      <option value="low">Low (Fast)</option>
                      <option value="medium">Medium</option>
                      <option value="high">High (Best)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 pb-4 border-b">Notification Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-800">Push Notifications</h3>
                    <p className="text-sm text-gray-500">Send notifications for new editions</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.enableNotifications ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enableNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-800">Analytics Tracking</h3>
                    <p className="text-sm text-gray-500">Track page views and user behavior</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, enableAnalytics: !prev.enableAnalytics }))}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.enableAnalytics ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enableAnalytics ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 pb-4 border-b">Security Settings</h2>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h3 className="font-semibold text-yellow-800">Change Admin Password</h3>
                <p className="text-sm text-yellow-600 mb-4">Update your admin account password</p>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                  />
                  <button className="px-5 py-2.5 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="text-lg font-bold text-gray-800">Sidebar Advertisement</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">Enable Ads</span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, adEnabled: !prev.adEnabled }))}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.adEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.adEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {settings.adEnabled && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Advertisement Type</label>
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.adType === 'google' ? 'border-[#3b5bdb] bg-[#3b5bdb]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input 
                          type="radio" 
                          name="adType" 
                          value="google" 
                          checked={settings.adType === 'google'} 
                          onChange={() => setSettings(prev => ({ ...prev, adType: 'google' }))}
                          className="w-4 h-4 text-[#3b5bdb]"
                        />
                        <span className="font-semibold text-gray-800">Google Ad (HTML/Script)</span>
                      </label>
                      <label className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.adType === 'custom' ? 'border-[#3b5bdb] bg-[#3b5bdb]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input 
                          type="radio" 
                          name="adType" 
                          value="custom" 
                          checked={settings.adType === 'custom'} 
                          onChange={() => setSettings(prev => ({ ...prev, adType: 'custom' }))}
                          className="w-4 h-4 text-[#3b5bdb]"
                        />
                        <span className="font-semibold text-gray-800">Custom Image Ad</span>
                      </label>
                    </div>
                  </div>

                  {settings.adType === 'google' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Google Ad Code Snippet</label>
                      <p className="text-xs text-gray-500 mb-2">Paste your AdSense or custom ad HTML/JS script here. Ensure it fits the sidebar reasonably.</p>
                      <textarea
                        value={settings.googleAdCode}
                        onChange={(e) => setSettings(prev => ({ ...prev, googleAdCode: e.target.value }))}
                        rows={6}
                        placeholder="<!-- Paste your ad code here -->"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                      />
                    </div>
                  )}

                  {settings.adType === 'custom' && (
                    <div className="space-y-4">
                      <div className="flex gap-6 p-4 border border-gray-200 rounded-xl items-start">
                        <div className="w-32 h-40 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden border border-gray-200">
                          {settings.customAdImage ? (
                            <Image src={settings.customAdImage} alt="Ad Preview" fill className="object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs text-center px-2">No Image Selected<br/>(Prefer 300x250)</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-1">Ad Banner Image</h4>
                            <p className="text-xs text-gray-500 mb-3">Upload an image file (JPG, PNG, GIF) to display in the sidebar.</p>
                            <label className={`inline-flex items-center gap-2 px-4 py-2 ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'} border border-gray-200 rounded-lg text-sm font-medium transition-colors`}>
                              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                              {uploading ? 'Uploading...' : 'Upload Image'}
                              <input type="file" accept="image/*" className="hidden" onChange={handleAdImageUpload} disabled={uploading} />
                            </label>
                          </div>
                          
                          <div className="pt-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Click URL</label>
                            <p className="text-xs text-gray-500 mb-2">Where users should go when they click the ad.</p>
                            <input
                              type="url"
                              placeholder="https://example.com"
                              value={settings.customAdLink}
                              onChange={(e) => setSettings(prev => ({ ...prev, customAdLink: e.target.value }))}
                              className="w-full px-4 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
