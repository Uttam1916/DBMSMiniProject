'use client';

import React, { useState } from 'react';
import { Item, Category, Location, User } from '@/types';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Trash2,
  Sparkles,
  MapPin,
  Calendar,
  User as UserIcon,
  Tag,
  CheckCircle,
  FileCheck,
} from 'lucide-react';

interface ItemsTabProps {
  items: Item[];
  categories: Category[];
  locations: Location[];
  currentUser: User | null;
  onOpenReportModal: () => void;
  onSelectItem: (item: Item) => void;
  onOpenFileClaimModal: (item: Item) => void;
  onDeleteItem: (itemId: number) => Promise<void>;
  onRefresh: () => void;
}

export default function ItemsTab({
  items,
  categories,
  locations,
  currentUser,
  onOpenReportModal,
  onSelectItem,
  onOpenFileClaimModal,
  onDeleteItem,
  onRefresh,
}: ItemsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredItems = items.filter((item) => {
    if (typeFilter !== 'ALL' && item.item_type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && String(item.category_id) !== categoryFilter) return false;
    if (locationFilter !== 'ALL' && String(item.location_id) !== locationFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.reporter_name.toLowerCase().includes(q) ||
        item.location_name.toLowerCase().includes(q) ||
        item.category_name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLAIMED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLOSED':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'LOST'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search items by title, description, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={onOpenReportModal}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Report Item</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filter:</span>
          </div>

          {/* Type Filter */}
          <select
            aria-label="Filter by Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="LOST">Lost Items</option>
            <option value="FOUND">Found Items</option>
          </select>

          {/* Category Filter */}
          <select
            aria-label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            aria-label="Filter by Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Locations</option>
            {locations.map((l) => (
              <option key={l.location_id} value={l.location_id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="CLAIMED">CLAIMED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {/* Results Count */}
          <span className="ml-auto text-slate-500 font-medium">
            Showing {filteredItems.length} of {items.length} items
          </span>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category &amp; Zone</th>
                <th className="px-4 py-3">Reported By</th>
                <th className="px-4 py-3">Vector</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No items match the current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.item_id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                      #{item.item_id}
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-slate-500 text-xs line-clamp-1">
                        {item.description}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold border ${getTypeBadge(
                          item.item_type
                        )}`}
                      >
                        {item.item_type}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      <div className="font-medium text-slate-800">
                        {item.category_name}
                      </div>
                      <div className="text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.location_name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      <div className="font-medium text-slate-800">
                        {item.reporter_name}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {item.item_date}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.has_embedding ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>384-dim</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          NULL
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      {/* Inspect Button */}
                      <button
                        onClick={() => onSelectItem(item)}
                        title="View item details and matches"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* File Claim Button (Available for OPEN FOUND items) */}
                      {item.item_type === 'FOUND' && item.status === 'OPEN' && (
                        <button
                          onClick={() => onOpenFileClaimModal(item)}
                          title="File ownership claim"
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition"
                        >
                          <FileCheck className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button (for Admin or Reporter) */}
                      {(currentUser?.role === 'ADMIN' ||
                        currentUser?.user_id === item.reporter_id) && (
                        <button
                          onClick={() => onDeleteItem(item.item_id)}
                          title="Delete item (DML demonstration)"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
