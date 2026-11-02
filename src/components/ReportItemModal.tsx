'use client';

import React, { useState } from 'react';
import { Category, Location, User } from '@/types';
import { X, AlertCircle } from 'lucide-react';

interface ReportItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  locations: Location[];
  currentUser: User | null;
  onSuccess: () => void;
  onOpenSignIn?: () => void;
}

export default function ReportItemModal({
  isOpen,
  onClose,
  categories,
  locations,
  currentUser,
  onSuccess,
  onOpenSignIn,
}: ReportItemModalProps) {
  const [itemType, setItemType] = useState<'LOST' | 'FOUND'>('LOST');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.category_id || 1);
  const [locationId, setLocationId] = useState<number>(locations[0]?.location_id || 1);
  const [itemDate, setItemDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Please sign in before submitting a report.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Please provide both a title and descriptive details.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          item_type: itemType,
          category_id: categoryId,
          location_id: locationId,
          reported_by: currentUser.user_id,
          item_date: itemDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to submit report');
      }

      // Reset form
      setTitle('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {itemType === 'LOST' ? 'Report a Lost Item' : 'Report a Found Item'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter identifying details to record the item in the central campus registry.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!currentUser && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
              <span>You must be signed in to submit an official campus report.</span>
              {onOpenSignIn && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSignIn();
                  }}
                  className="rounded bg-amber-800 px-2.5 py-1 text-white font-medium hover:bg-amber-900 transition"
                >
                  Sign In
                </button>
              )}
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">
              Report Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setItemType('LOST')}
                className={`rounded-lg border p-2.5 text-xs font-medium text-center transition ${
                  itemType === 'LOST'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Lost Item (I misplaced something)
              </button>
              <button
                type="button"
                onClick={() => setItemType('FOUND')}
                className={`rounded-lg border p-2.5 text-xs font-medium text-center transition ${
                  itemType === 'FOUND'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Found Item (I turned in something)
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="item-title" className="text-xs font-medium text-slate-700 block mb-1">
              Item Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="item-title"
              type="text"
              required
              placeholder="e.g., Black stainless-steel water bottle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none transition"
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="item-category" className="text-xs font-medium text-slate-700 block mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="item-category"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none transition"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="item-location" className="text-xs font-medium text-slate-700 block mb-1">
                Campus Location <span className="text-rose-500">*</span>
              </label>
              <select
                id="item-location"
                value={locationId}
                onChange={(e) => setLocationId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none transition"
              >
                {locations.map((l) => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="item-date" className="text-xs font-medium text-slate-700 block mb-1">
              Date {itemType === 'LOST' ? 'Misplaced' : 'Found'} <span className="text-rose-500">*</span>
            </label>
            <input
              id="item-date"
              type="date"
              required
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="item-description" className="text-xs font-medium text-slate-700 block mb-1">
              Identifying Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="item-description"
              rows={3}
              required
              placeholder="Provide color, brand, stickers, scratches, contents, or other distinguishing marks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This text is automatically converted into a 384-dimensional dense vector to identify semantic matches.
            </p>
          </div>

          {/* Footer Submitter Notice */}
          {currentUser && (
            <div className="text-[11px] text-slate-500 pt-1">
              Reporting as: <strong className="text-slate-700">{currentUser.name}</strong> ({currentUser.email} • {currentUser.role})
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !currentUser}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Submitting & Embedding...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
