'use client';

import React, { useEffect, useState } from 'react';
import { Item, ItemMatch, Claim, User } from '@/types';
import { X, Sparkles, MapPin, Calendar, User as UserIcon, Tag, CheckCircle, ShieldCheck } from 'lucide-react';

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  currentUser: User | null;
  onOpenFileClaimModal: (item: Item) => void;
}

export default function ItemDetailModal({
  item,
  onClose,
  currentUser,
  onOpenFileClaimModal,
}: ItemDetailModalProps) {
  const [details, setDetails] = useState<{
    item: Item;
    matches: any[];
    claims: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    fetch(`/api/items/${item.item_id}`)
      .then((res) => res.json())
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold border ${
                item.item_type === 'LOST'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {item.item_type} #{item.item_id}
            </span>
            <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
              {item.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Item Meta Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>{item.category_name}</span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{item.location_name}</span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{item.item_date}</span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium flex items-center space-x-1">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>{item.reporter_name} ({item.reporter_role})</span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>{item.has_embedding ? 'Vectorized (384-dim HNSW)' : 'No Vector'}</span>
            </span>
          </div>

          {/* Description */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Description
            </div>
            <p className="text-slate-800 leading-relaxed">{item.description}</p>
          </div>

          {/* Candidate Matches Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>
                  {item.item_type === 'LOST'
                    ? 'Candidate Matching Found Items'
                    : 'Candidate Matching Lost Items'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Via PL/pgSQL <code className="font-mono text-indigo-600">find_matching_items()</code>
              </span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-slate-400 text-xs">Loading matches...</div>
            ) : details?.matches && details.matches.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {details.matches.map((m: any, idx: number) => {
                  const scorePct = Math.round(m.similarity_score * 100);
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center space-x-2">
                          <span>#{m.matched_item_id} - {m.matched_title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                            {m.matched_status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                          {m.matched_description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold text-xs ${
                            scorePct >= 70
                              ? 'text-emerald-700'
                              : scorePct >= 50
                              ? 'text-indigo-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {scorePct}% match
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              scorePct >= 70
                                ? 'bg-emerald-500'
                                : scorePct >= 50
                                ? 'bg-indigo-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.max(scorePct, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-200">
                No automatic matches recorded in item_match table yet.
              </div>
            )}
          </div>

          {/* Claims Filed Section */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Ownership Claims ({details?.claims?.length || 0})
            </div>

            {details?.claims && details.claims.length > 0 ? (
              <div className="space-y-2">
                {details.claims.map((cl: any) => (
                  <div
                    key={cl.claim_id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        Claim #{cl.claim_id} by {cl.claimant_name} ({cl.claimant_email})
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          cl.claim_status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : cl.claim_status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-purple-100 text-purple-800 border-purple-300'
                        }`}
                      >
                        {cl.claim_status}
                      </span>
                    </div>
                    <p className="text-slate-600">Proof: {cl.proof_details}</p>
                    <div className="text-[10px] text-slate-400">Date: {cl.claim_date}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-200">
                No claims filed for this item.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Current Status: <span className="font-semibold text-slate-800">{item.status}</span>
          </div>

          <div className="flex items-center space-x-2">
            {item.item_type === 'FOUND' && item.status === 'OPEN' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFileClaimModal(item);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              >
                File Claim for this Item
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
