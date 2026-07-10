'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Newspaper, 
  Upload, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  FolderOpen,
  Palette,
  FileText,
  CreditCard,
  Receipt,
  Shield,
  Megaphone,
  ChevronRight,
  Search,
  Bell
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const sidebarSections = [
  {
    title: 'EPAPER MANAGEMENT',
    items: [
      { name: 'Publish Edition', href: '/admin/editions/new', icon: Upload },
      { name: 'Manage Editions', href: '/admin/editions', icon: FolderOpen },
    ]
  },
  {
    title: 'EPAPER SETTING',
    items: [
      { name: 'Edition Category', href: '/admin/categories', icon: Newspaper },
      { name: 'ePaper Setting', href: '/admin/settings', icon: Settings },
      { name: 'Theme Setup', href: '/admin/theme', icon: Palette },
      { name: 'Page Manage', href: '/admin/pages', icon: FileText },
    ]
  },
  {
    title: 'AD MANAGER',
    items: [
      { name: 'Manage', href: '/admin/ads', icon: Megaphone },
    ]
  },
  {
    title: 'ADMINISTRATOR',
    items: [
      { name: 'Admin Users', href: '/admin/users', icon: Shield },
    ]
  },
];

export default function AdminShell({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setProfileDropdownOpen(false);
    if (profileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileDropdownOpen]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3b5bdb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col h-screen`}>
        {/* Logo - Fixed at top */}
        <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              <div>
                <h1 className="text-[#3b5bdb] font-bold text-lg">Yellow Singam</h1>
                <p className="text-gray-400 text-xs">ePaper CMS</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
              />
            </div>
          </div>

          {/* Dashboard Link */}
          <div className="px-4 mb-2">
            <Link
              href="/admin"
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                pathname === '/admin' 
                  ? 'bg-[#3b5bdb] text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard size={20} />
                <span className="font-medium">Dashboard</span>
              </div>
              <ChevronRight size={18} />
            </Link>
          </div>

          {/* Nav Sections */}
          <nav className="px-4 pb-4 space-y-4">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-4 py-2 text-xs font-bold text-[#3b5bdb] bg-[#e8edfc] rounded-lg mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items
                    .filter(item => 
                      searchQuery === '' || 
                      item.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => {
                      // Check if current page matches this menu item - exact match only
                      const isActive = pathname === item.href;
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? 'bg-[#3b5bdb] text-white shadow-lg shadow-[#3b5bdb]/20' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={20} />
                            <span className="font-medium text-sm">{item.name}</span>
                          </div>
                          <ChevronRight size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b px-4 lg:px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Avatar with Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileDropdownOpen(!profileDropdownOpen);
                }}
                className="w-10 h-10 rounded-full bg-[#3b5bdb] flex items-center justify-center text-white font-bold hover:bg-[#364fc7] transition-colors cursor-pointer"
              >
                {session.user?.name?.charAt(0) || 'A'}
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-800">{session.user?.name || 'Admin'}</p>
                    <p className="text-sm text-gray-500">{session.user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link 
                      href="/admin/settings" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={18} />
                      <span>Settings</span>
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/admin/login' })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
