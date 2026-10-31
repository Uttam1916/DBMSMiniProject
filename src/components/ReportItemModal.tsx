'use client';

import React, { useState } from 'react';
import { Category, Location, User } from '@/types';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface ReportItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  locations: Location[];
  currentUser: User | null;
  onSuccess: () => void;
}

export default function ReportItemModal({
  isOpen,
  onClose,
  categories,
  locations,
  currentUser,
  onSuccess,
}: ReportItemModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'LOST' | 'FOUND'>('LOST');
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.category_id ? String(categories[0].category_id) : '1'
  );
  const [locationId, setLocationId] = useState<string>(
    locations[0]?.location_id ? String(locations[0].location_id) : '1'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both a title and description.');
      return;
    }
    if (!currentUser) {
      setError('No active user selected.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          item_type: itemType,
          category_id: Number(categoryId),
          location_id: Number(locationId),
          reported_by: currentUser.user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to submit item');
      }

      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Report Campus Belonging
            </h3>
            <p className="text-xs text-slate-500">
              Item will be indexed and auto-matched using 384-dim text embeddings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setItemType('LOST')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                  itemType === 'LOST'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔴 Lost Something
              </button>
              <button
                type="button"
                onClick={() => setItemType('FOUND')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                  itemType === 'FOUND'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🟢 Found Something
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Black stainless-steel bottle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description &amp; Identifying Details *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide color, brand, stickers, distinct markings, or contents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-500 inline" />
              <span>Used by FastEmbed to compute semantic cosine distance.</span>
            </p>
          </div>

          {/* Category & Location Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {locations.map((l) => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reporting Attribution Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600">
            Reporting as: <span className="font-semibold text-slate-900">{currentUser?.name}</span> ({currentUser?.email} - {currentUser?.role})
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isSubmitting ? 'Generating Embeddings...' : 'Submit & Match'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
