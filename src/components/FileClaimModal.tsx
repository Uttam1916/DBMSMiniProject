'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { X, AlertCircle } from 'lucide-react';

interface FileClaimModalProps {
  item: {
    item_id: number;
    title: string;
    location_name: string;
  } | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenSignIn?: () => void;
}

export default function FileClaimModal({
  item,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  onOpenSignIn,
}: FileClaimModalProps) {
  const [proofDetails, setProofDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Please sign in before submitting an ownership claim.');
      return;
    }

    if (!proofDetails.trim()) {
      setError('Please provide identifying details or proof of ownership.');
      return;
    }

    setLoading(true);
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
        throw new Error(data.details || data.error || 'Failed to submit claim');
      }

      setProofDetails('');
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
            <h2 className="text-base font-semibold text-slate-900">Submit Ownership Claim</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Claiming: <strong className="text-slate-800">{item.title}</strong> (Found at {item.location_name})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!currentUser && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
              <span>You must be signed in to submit an ownership claim.</span>
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

          <div>
            <label htmlFor="proof-details" className="text-xs font-medium text-slate-700 block mb-1">
              Identifying Proof &amp; Verification Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="proof-details"
              rows={4}
              required
              placeholder="Describe distinguishing details only the owner would know: brand, serial number, stickers, phone wallpaper, internal contents, purchase date, or time of loss..."
              value={proofDetails}
              onChange={(e) => setProofDetails(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Campus security staff inspects these details before approving claim status.
            </p>
          </div>

          {currentUser && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 space-y-0.5">
              <div>Claimant: <strong className="text-slate-800">{currentUser.name}</strong></div>
              <div>University Email: <strong className="text-slate-800">{currentUser.email}</strong></div>
              <div>Role: <strong className="text-slate-800">{currentUser.role}</strong></div>
            </div>
          )}

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
              {loading ? 'Submitting Claim...' : 'Submit Ownership Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
