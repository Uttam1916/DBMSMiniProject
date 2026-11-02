'use client';

import React, { useState, useMemo } from 'react';
import { Item, Category, Location, User } from '@/types';
import {
  Search,
  Filter,
  X,
  MapPin,
  Calendar,
  Tag,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface BrowseViewProps {
  items: Item[];
  categories: Category[];
  locations: Location[];
  currentUser: User | null;
  onSelectItem: (item: Item) => void;
  onOpenReportModal: () => void;
  onDeleteItem: (itemId: number) => Promise<void>;
  loading?: boolean;
}

export default function BrowseView({
  items,
  categories,
  locations,
  currentUser,
  onSelectItem,
  onOpenReportModal,
  onDeleteItem,
  loading = false,
}: BrowseViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isAdmin = currentUser?.role === 'ADMIN';

  const isFiltered =
    searchTerm.trim() !== '' ||
    typeFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    locationFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setLocationFilter('ALL');
    setDateFilter('ALL');
    setStatusFilter('ALL');
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (typeFilter !== 'ALL' && item.item_type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && String(item.category_id) !== categoryFilter) return false;

      // Location filter
      if (locationFilter !== 'ALL' && String(item.location_id) !== locationFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Date filter
      if (dateFilter !== 'ALL') {
        const itemDate = new Date(item.item_date);
        const now = new Date();
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === 'TODAY' && diffDays > 1) return false;
        if (dateFilter === 'WEEK' && diffDays > 7) return false;
        if (dateFilter === 'MONTH' && diffDays > 30) return false;
      }

      // Keyword Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.location_name.toLowerCase().includes(q) ||
          item.category_name.toLowerCase().includes(q) ||
          item.reporter_name.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [items, typeFilter, categoryFilter, locationFilter, dateFilter, statusFilter, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* Row 1: Search & Type Segments */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, keywords, or campus zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type Segment Control */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              onClick={() => setTypeFilter('LOST')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === 'LOST'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lost ({items.filter((i) => i.item_type === 'LOST').length})
            </button>
            <button
              onClick={() => setTypeFilter('FOUND')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === 'FOUND'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Found ({items.filter((i) => i.item_type === 'FOUND').length})
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center text-xs text-slate-500 mr-1">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <span>Filters:</span>
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Location */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Campus Zones</option>
            {locations.map((l) => (
              <option key={l.location_id} value={l.location_id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Past 24 Hours</option>
            <option value="WEEK">Past 7 Days</option>
            <option value="MONTH">Past 30 Days</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLAIMED">Claimed</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Reset Filters Link */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-900 underline ml-auto transition"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-800">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Items List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
          <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin mb-3" />
          <span>Loading items from PostgreSQL...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[260px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No items match your filter criteria.</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Try adjusting your search terms, changing the category or location filter, or resetting all filters.
          </p>
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isLost = item.item_type === 'LOST';

            return (
              <div
                key={item.item_id}
                onClick={() => onSelectItem(item)}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition cursor-pointer"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          isLost
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {item.item_type}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                          item.status === 'OPEN'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'CLAIMED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{item.item_date}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                    {item.title}
                  </h3>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Metadata & Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{item.location_name}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Tag className="h-3 w-3 text-slate-400" />
                      <span>{item.category_name}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Potential matches tag for Lost items */}
                    {isLost && item.matches_count && item.matches_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                        {item.matches_count} matches
                      </span>
                    )}

                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.item_id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
