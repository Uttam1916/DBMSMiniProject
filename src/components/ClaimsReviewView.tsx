'use client';

import React, { useState } from 'react';
import { Claim, User } from '@/types';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  MapPin,
  Tag,
} from 'lucide-react';

interface ClaimsReviewViewProps {
  claims: Claim[];
  currentUser: User | null;
  onUpdateClaimStatus: (claimId: number, status: 'APPROVED' | 'REJECTED') => Promise<any>;
  onRefresh: () => void;
}

export default function ClaimsReviewView({
  claims,
  currentUser,
  onUpdateClaimStatus,
  onRefresh,
}: ClaimsReviewViewProps) {
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    claimId: number;
    status: string;
    details: any;
  } | null>(null);

  const isStaffOrAdmin = currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN';

  if (!isStaffOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[340px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <ShieldCheck className="h-8 w-8 text-slate-300 mb-2" />
        <h3 className="text-base font-semibold text-slate-800">Staff &amp; Admin Access Required</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Claim review and ownership approval is restricted to university staff and administrators. Switch your active role in the header to evaluate claim approval workflows.
        </p>
      </div>
    );
  }

  const filteredClaims = claims.filter((c) => {
    if (filter === 'ALL') return true;
    return c.claim_status === filter;
  });

  const pendingCount = claims.filter((c) => c.claim_status === 'PENDING').length;
  const approvedCount = claims.filter((c) => c.claim_status === 'APPROVED').length;
  const rejectedCount = claims.filter((c) => c.claim_status === 'REJECTED').length;

  const handleAction = async (claimId: number, newStatus: 'APPROVED' | 'REJECTED') => {
    setActionLoading(claimId);
    try {
      const res = await onUpdateClaimStatus(claimId, newStatus);
      if (res && res.transaction_details) {
        setFeedbackBanner({
          claimId,
          status: newStatus,
          details: res.transaction_details,
        });
        setTimeout(() => setFeedbackBanner(null), 8000);
      }
      onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Claims Review &amp; Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate ownership proof submitted by campus members. Approving a claim updates the item status to CLAIMED via database triggers.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 self-start sm:self-auto">
          <button
            onClick={() => setFilter('PENDING')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === 'PENDING'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({claims.length})
          </button>
        </div>
      </div>

      {/* Transaction & Trigger Feedback Banner */}
      {feedbackBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-1">
          <div className="flex items-center space-x-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Claim #{feedbackBanner.claimId} successfully {feedbackBanner.status.toLowerCase()}.
            </span>
          </div>
          {feedbackBanner.details && (
            <p className="text-emerald-700 pl-6">
              Database trigger <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded">sync_item_status_after_claim</code> executed inside an explicit ACID transaction block, updating item &quot;{feedbackBanner.details.item_title}&quot; from status <strong className="font-semibold">{feedbackBanner.details.item_status_before}</strong> to <strong className="font-semibold">{feedbackBanner.details.item_status_after}</strong>.
            </p>
          )}
        </div>
      )}

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
          <ClipboardCheck className="h-6 w-6 text-slate-300 mb-2" />
          <span>No claims currently in the {filter.toLowerCase()} queue.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => {
            const isProcessing = actionLoading === claim.claim_id;

            return (
              <div
                key={claim.claim_id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Claim #{claim.claim_id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          claim.claim_status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : claim.claim_status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {claim.claim_status}
                      </span>
                      <span className="text-xs text-slate-500">
                        submitted on {claim.claim_date}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center space-x-1">
                        <UserIcon className="h-3 w-3 text-slate-400" />
                        <span>Claimant: <strong className="text-slate-800">{claim.claimant_name}</strong> ({claim.claimant_email})</span>
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                        {claim.claimant_role}
                      </span>
                    </div>
                  </div>

                  {/* Target Item summary */}
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-xs font-semibold text-slate-900">
                      Item: {claim.item_title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Found at {claim.location_name} • Current Status: <strong className="text-slate-700">{claim.item_status}</strong>
                    </div>
                  </div>
                </div>

                {/* Claimant Proof Box */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Claimant&apos;s Stated Ownership Proof:
                  </span>
                  <p className="text-slate-800 leading-relaxed">{claim.proof_details}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    {claim.claim_status === 'APPROVED'
                      ? 'Approved by campus administration. Item is marked CLAIMED.'
                      : claim.claim_status === 'REJECTED'
                      ? 'Rejected. Item remains in central inventory.'
                      : 'Pending administrative adjudication.'}
                  </div>

                  <div className="flex items-center space-x-2">
                    {claim.claim_status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(claim.claim_id, 'APPROVED')}
                          disabled={isProcessing}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Approve Claim'}
                        </button>
                        <button
                          onClick={() => handleAction(claim.claim_id, 'REJECTED')}
                          disabled={isProcessing}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {claim.claim_status === 'APPROVED' && (
                      <button
                        onClick={() => handleAction(claim.claim_id, 'REJECTED')}
                        disabled={isProcessing}
                        className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Revoke Approval</span>
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
