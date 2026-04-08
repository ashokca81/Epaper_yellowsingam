import { 
  Newspaper, 
  Eye, 
  Download, 
  Users,
  TrendingUp,
  Calendar,
  ChevronRight,
  FileText,
  Upload,
  Clock
} from 'lucide-react';
import clientPromise from '@/lib/mongodb';
import Link from 'next/link';

export const revalidate = 0; // Ensure dashboard is always dynamic

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default async function AdminDashboard() {
  const client = await clientPromise;
  const db = client.db('yellowsingam_epaper');

  // Fetch data concurrently
  const [
    totalEditions,
    statsAggregation,
    recentEditionsRaw,
    activeSubscribers
  ] = await Promise.all([
    db.collection('editions').countDocuments(),
    db.collection('editions').aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalDownloads: { $sum: '$downloads' }
        }
      }
    ]).toArray(),
    db.collection('editions')
      .find({})
      .sort({ createdAt: -1, date: -1 })
      .limit(5)
      .project({ name: 1, alias: 1, date: 1, category: 1, pages: 1, views: 1, status: 1, pageCount: 1, createdAt: 1 })
      .toArray(),
    db.collection('subscribers').countDocuments().catch(() => 0)
  ]);

  const totalViews = statsAggregation[0]?.totalViews || 0;
  const totalDownloads = statsAggregation[0]?.totalDownloads || 0;

  const stats = [
    { title: 'Total Editions', value: totalEditions.toString(), change: 'Overall', icon: Newspaper, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    { title: 'Total Views', value: formatNumber(totalViews), change: 'Overall', icon: Eye, color: 'bg-green-500', bgColor: 'bg-green-50' },
    { title: 'Downloads', value: formatNumber(totalDownloads), change: 'Overall', icon: Download, color: 'bg-purple-500', bgColor: 'bg-purple-50' },
    { title: 'Active Users', value: formatNumber(activeSubscribers), change: 'Overall', icon: Users, color: 'bg-[#D4A800]', bgColor: 'bg-yellow-50' },
  ];

  const recentEditions = recentEditionsRaw.map((ed) => ({
    name: ed.name || 'Untitled Edition',
    date: new Date(ed.date || new Date()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    pages: ed.pageCount || ed.pages?.length || 0,
    views: ed.views || 0,
    status: (ed.status || 'draft').charAt(0).toUpperCase() + (ed.status || 'draft').slice(1),
    category: ed.category || 'Main Edition'
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome to Yellow Singam ePaper CMS</p>
        </div>
        <Link href="/admin/upload" className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20">
          <Upload size={18} />
          Publish Edition
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className={`${stat.bgColor} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <stat.icon size={22} className={stat.color.replace('bg-', 'text-')} />
              </div>
              <span className="text-green-500 text-xs font-semibold bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} />
                {stat.change}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mt-4">{stat.value}</h3>
              <p className="text-gray-500 text-sm">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Editions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-800">Recent Editions</h3>
            <Link href="/admin/editions" className="text-[#3b5bdb] text-sm font-semibold flex items-center gap-1 hover:underline">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Edition</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pages</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEditions.map((edition, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#e8edfc] min-w-[40px] rounded-lg flex items-center justify-center">
                          <FileText size={18} className="text-[#3b5bdb]" />
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-medium text-gray-800 block truncate" title={`${edition.name} - ${edition.date}`}>
                            {edition.name} - {edition.date}
                          </span>
                          <span className="text-xs text-gray-400">{edition.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{edition.pages} pages</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{edition.views.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        edition.status === 'Published' 
                          ? 'bg-green-100 text-green-700'
                          : edition.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {edition.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentEditions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No editions found. Upload one to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/admin/upload" className="w-full flex items-center gap-3 p-3 bg-[#e8edfc] rounded-xl hover:bg-[#dde3fa] transition-colors text-left">
                <div className="w-10 h-10 bg-[#3b5bdb] shrink-0 rounded-lg flex items-center justify-center">
                  <Upload size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Upload PDF Edition</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add new ePaper from PDF</p>
                </div>
              </Link>

              <Link href="/admin/upload" className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-left">
                <div className="w-10 h-10 bg-green-500 shrink-0 rounded-lg flex items-center justify-center">
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Upload Images</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add pages as JPG/PNG</p>
                </div>
              </Link>

              <Link href="/admin/editions" className="w-full flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-left">
                <div className="w-10 h-10 bg-purple-500 shrink-0 rounded-lg flex items-center justify-center">
                  <Calendar size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Schedule Edition</p>
                  <p className="text-xs text-gray-500 mt-0.5">Plan future uploads</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentEditionsRaw.slice(0, 4).map((edition, i) => {
                 let actionText = 'Edition Created';
                 let TheIcon = FileText;
                 
                 if (edition.status === 'published') {
                   actionText = 'Edition Published';
                   TheIcon = Newspaper;
                 } else if (edition.status === 'scheduled') {
                   actionText = 'Edition Scheduled';
                   TheIcon = Clock;
                 }
                 
                 // Compute simple time relative string safely
                 let timeText = 'Recently';
                 try {
                   const createdDate = new Date(edition.createdAt || edition.date || new Date());
                   const diff = Date.now() - createdDate.getTime();
                   if (diff >= 0) {
                     const hours = Math.floor(diff / (1000 * 60 * 60));
                     const days = Math.floor(hours / 24);
                     if (days > 0) timeText = `${days} day${days > 1 ? 's' : ''} ago`;
                     else if (hours > 0) timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
                     else {
                       const minutes = Math.floor(diff / (1000 * 60));
                       if (minutes > 0) timeText = `${minutes} min${minutes > 1 ? 's' : ''} ago`;
                       else timeText = 'Just now';
                     }
                   }
                 } catch (e) {
                   // Fallback
                 }

                 return (
                  <div key={i} className="flex flex-row gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex shrink-0 items-center justify-center mt-1">
                      <TheIcon size={14} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{actionText}</p>
                      <p className="text-xs text-gray-500 mb-0.5">{edition.name || 'Untitled Edition'}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{timeText}</p>
                    </div>
                  </div>
                 );
              })}
              {recentEditionsRaw.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
