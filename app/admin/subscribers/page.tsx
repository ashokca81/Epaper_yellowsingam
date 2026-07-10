'use client';

import { useState } from 'react';
import { 
  Users, 
  Search, 
  Mail,
  Calendar,
  Check,
  Eye,
  Trash2,
  Download
} from 'lucide-react';

interface Subscriber {
  _id: string;
  name: string;
  email: string;
  phone: string;
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  lastLogin: string;
}

export default function SubscribedUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const subscribers: Subscriber[] = [
    { _id: '1', name: 'Ramesh Kumar', email: 'ramesh@email.com', phone: '+91 9876543210', plan: 'yearly', status: 'active', startDate: '2024-01-15', endDate: '2025-01-15', lastLogin: '2 hours ago' },
    { _id: '2', name: 'Lakshmi Devi', email: 'lakshmi@email.com', phone: '+91 9876543211', plan: 'monthly', status: 'active', startDate: '2024-06-01', endDate: '2024-07-01', lastLogin: '1 day ago' },
    { _id: '3', name: 'Suresh Reddy', email: 'suresh@email.com', phone: '+91 9876543212', plan: 'yearly', status: 'expired', startDate: '2023-06-01', endDate: '2024-06-01', lastLogin: '1 month ago' },
    { _id: '4', name: 'Priya Sharma', email: 'priya@email.com', phone: '+91 9876543213', plan: 'free', status: 'active', startDate: '2024-05-20', endDate: '-', lastLogin: '5 hours ago' },
    { _id: '5', name: 'Venkat Rao', email: 'venkat@email.com', phone: '+91 9876543214', plan: 'monthly', status: 'cancelled', startDate: '2024-04-01', endDate: '2024-05-01', lastLogin: '2 months ago' },
  ];

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      monthly: 'bg-blue-100 text-blue-700',
      yearly: 'bg-purple-100 text-purple-700',
    };
    return styles[plan] || styles.free;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || styles.active;
  };

  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.status === 'active').length,
    paid: subscribers.filter(s => s.plan !== 'free' && s.status === 'active').length,
    revenue: 45000,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subscribed Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your subscriber base</p>
        </div>
        <button className="flex items-center gap-2 bg-[#3b5bdb] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#364fc7] transition-colors shadow-lg shadow-[#3b5bdb]/20">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Check size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.paid}</p>
              <p className="text-sm text-gray-500">Paid Subscribers</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-lg">₹</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">₹{stats.revenue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/20 focus:border-[#3b5bdb] md:w-48"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Plan</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Expires</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Last Login</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.map((subscriber) => (
                <tr key={subscriber._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-800">{subscriber.name}</p>
                      <p className="text-sm text-gray-500">{subscriber.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPlanBadge(subscriber.plan)}`}>
                      {subscriber.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(subscriber.status)}`}>
                      {subscriber.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{subscriber.endDate}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{subscriber.lastLogin}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye size={16} className="text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Mail size={16} className="text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscribers.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No subscribers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
