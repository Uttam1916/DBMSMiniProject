'use client';

import React, { useEffect, useState } from 'react';
import { Item, User } from '@/types';
import {
  X,
  MapPin,
  Calendar,
  User as UserIcon,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  currentUser: User | null;
  onOpenFileClaimModal: (targetItem: {
    item_id: number;
    title: string;
    location_name: string;
  }) => void;
  onUpdateClaimStatus?: (claimId: number, status: 'APPROVED' | 'REJECTED') => Promise<any>;
  onRefresh?: () => void;
}

export default function ItemDetailModal({
  item,
  onClose,
  currentUser,
  onOpenFileClaimModal,
  onUpdateClaimStatus,
  onRefresh,
}: ItemDetailModalProps) {
  const [details, setDetails] = useState<{
    item: Item;
    matches: any[];
    claims: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    setActionMessage(null);
    fetch(`/api/items/${item.item_id}`)
      .then((res) => res.json())
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => console.error('Error fetching item details:', err))
      .finally(() => setLoading(false));
  }, [item]);

  if (!item) return null;

  const isStaffOrAdmin = currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN';
  const isLost = item.item_type === 'LOST';

  const handleClaimStatusChange = async (claimId: number, newStatus: 'APPROVED' | 'REJECTED') => {
    if (!onUpdateClaimStatus) return;
    setActionLoading(claimId);
    try {
      const res = await onUpdateClaimStatus(claimId, newStatus);
      setActionMessage(
        newStatus === 'APPROVED'
          ? 'Claim approved. Database trigger automatically updated item status to CLAIMED.'
          : 'Claim rejected.'
      );
      // Refresh local item details
      const refreshed = await fetch(`/api/items/${item.item_id}`).then((r) => r.json());
      setDetails(refreshed);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0 bg-white">
          <div className="flex items-center space-x-2.5">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                isLost
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
            >
              {item.item_type} #{item.item_id}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${
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

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Action Message Banner */}
          {actionMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Title & Metadata */}
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">{item.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
              <span className="flex items-center space-x-1 rounded bg-slate-100 px-2 py-1 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{item.location_name}</span>
              </span>
              <span className="flex items-center space-x-1 rounded bg-slate-100 px-2 py-1 text-slate-700">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>{item.category_name}</span>
              </span>
              <span className="flex items-center space-x-1 rounded bg-slate-100 px-2 py-1 text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Reported on {item.item_date}</span>
              </span>
              <span className="flex items-center space-x-1 rounded bg-slate-100 px-2 py-1 text-slate-700">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>{item.reporter_name} ({item.reporter_role})</span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Description &amp; Identifying Details
            </span>
            <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">{item.description}</p>
          </div>

          {/* SECTION: Potential Matches for both LOST and FOUND items */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {isLost ? 'Potential Matches' : 'Matching Lost Reports'} ({details?.matches?.length || 0})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLost
                  ? 'Items found on campus with matching descriptions. These suggestions are potential, unconfirmed matches.'
                  : 'Lost items reported on campus with matching descriptions.'}
              </p>
            </div>

            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Scanning vector embeddings...</div>
            ) : details?.matches && details.matches.length > 0 ? (
              <div className="space-y-2.5">
                {details.matches.map((m: any, idx: number) => {
                  const similarityPct = Math.round(m.similarity_score * 100);

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {m.matched_title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600">
                              {m.matched_status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {isLost ? 'Found at' : 'Lost at'} {m.matched_location || 'Campus'} • {m.matched_date || 'Recent'}
                          </div>
                        </div>

                        {/* Similarity Score */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-700">
                              {similarityPct}% similarity
                            </span>
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  similarityPct >= 70
                                    ? 'bg-slate-800'
                                    : similarityPct >= 50
                                    ? 'bg-slate-600'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.max(similarityPct, 5)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded">
                        {m.matched_description}
                      </p>

                      {/* Claim action (only applicable when viewing a lost item to claim the candidate found item) */}
                      {isLost && m.matched_status === 'OPEN' && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400">
                            Potential match • Subject to verification
                          </span>
                          <button
                            onClick={() => {
                              onClose();
                              onOpenFileClaimModal({
                                item_id: m.matched_item_id,
                                title: m.matched_title,
                                location_name: m.matched_location || 'Campus',
                              });
                            }}
                            className="inline-flex items-center space-x-1 text-xs font-medium text-slate-900 hover:text-indigo-600 transition"
                          >
                            <span>Claim this found item</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No potential matches currently recorded. The system continuously evaluates against newly turned-in belongings.
              </div>
            )}
          </div>

          {/* SECTION: Ownership Claims for FOUND items */}
          {!isLost && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ownership Claims ({details?.claims?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Claims filed by students or staff seeking to verify ownership of this item.
                  </p>
                </div>

                {item.status === 'OPEN' && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFileClaimModal({
                        item_id: item.item_id,
                        title: item.title,
                        location_name: item.location_name,
                      });
                    }}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
                  >
                    File Claim
                  </button>
                )}
              </div>

              {details?.claims && details.claims.length > 0 ? (
                <div className="space-y-2.5">
                  {details.claims.map((claim: any) => (
                    <div
                      key={claim.claim_id}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-900">
                            Claim #{claim.claim_id} by {claim.claimant_name}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-1.5">
                            ({claim.claimant_email})
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            claim.claim_status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : claim.claim_status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {claim.claim_status}
                        </span>
                      </div>

                      <div className="rounded bg-slate-50 p-2.5 text-slate-700">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                          Claimant&apos;s Proof of Ownership:
                        </span>
                        {claim.proof_details}
                      </div>

                      {/* Staff/Admin Action Controls */}
                      {isStaffOrAdmin && (
                        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                          {claim.claim_status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleClaimStatusChange(claim.claim_id, 'APPROVED')}
                                disabled={actionLoading === claim.claim_id}
                                className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                              >
                                {actionLoading === claim.claim_id ? 'Approving...' : 'Approve Claim'}
                              </button>
                              <button
                                onClick={() => handleClaimStatusChange(claim.claim_id, 'REJECTED')}
                                disabled={actionLoading === claim.claim_id}
                                className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {claim.claim_status === 'APPROVED' && (
                            <button
                              onClick={() => handleClaimStatusChange(claim.claim_id, 'REJECTED')}
                              disabled={actionLoading === claim.claim_id}
                              className="text-xs text-slate-500 hover:text-slate-700 underline"
                            >
                              Revoke Approval
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No claims currently filed for this found item.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50 shrink-0">
          <div className="text-xs text-slate-500">
            Item ID: <strong className="font-mono text-slate-800">#{item.item_id}</strong>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
