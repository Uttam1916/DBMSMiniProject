'use client';

import React, { useState } from 'react';
import { Item, User } from '@/types';
import { X, ShieldCheck, AlertCircle, FileCheck } from 'lucide-react';

interface FileClaimModalProps {
  item: Item | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FileClaimModal({
  item,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}: FileClaimModalProps) {
  const [proofDetails, setProofDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofDetails.trim()) {
      setError('Please provide proof of ownership.');
      return;
    }
    if (!currentUser) {
      setError('No active user selected.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.item_id,
          claimed_by: currentUser.user_id,
          proof_details: proofDetails.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Expose database trigger exception
        throw new Error(data.details || data.error || 'Failed to submit claim');
      }

      onSuccess();
      onClose();
      setProofDetails('');
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                File Ownership Claim
              </h3>
              <p className="text-xs text-slate-500">
                Claiming Found Item #{item.item_id}: {item.title}
              </p>
            </div>
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
              <div>
                <span className="font-semibold block">Validation Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Item Context */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-800">{item.title}</div>
            <div className="text-slate-500 line-clamp-2">{item.description}</div>
            <div className="text-slate-400 text-[11px] pt-1">
              Found at: {item.location_name} • Category: {item.category_name}
            </div>
          </div>

          {/* Proof Details Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proof of Ownership *
            </label>
            <textarea
              required
              rows={4}
              placeholder="State unique identifying details not visible in public listing (e.g. serial numbers, inner tags, passcode, distinct scratches, sticker details)..."
              value={proofDetails}
              onChange={(e) => setProofDetails(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Database trigger <code className="font-mono text-indigo-600">trg_validate_claim_item</code> verifies that this item is OPEN and FOUND before persisting.
            </p>
          </div>

          {/* Claimant Attribution */}
          <div className="text-xs text-slate-600">
            Filing as: <span className="font-semibold text-slate-900">{currentUser?.name}</span> ({currentUser?.email})
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
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Claim...' : 'Submit Ownership Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
