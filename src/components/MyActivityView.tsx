'use client';

import React, { useState } from 'react';
import { Item, Claim, User } from '@/types';
import {
  FileText,
  ClipboardCheck,
  Calendar,
  MapPin,
  Tag,
  ArrowRight,
  Plus,
  LogIn,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

interface MyActivityViewProps {
  currentUser: User | null;
  items: Item[];
  claims: Claim[];
  onSelectItem: (item: Item) => void;
  onOpenReportModal: () => void;
  onOpenSignIn: () => void;
}

export default function MyActivityView({
  currentUser,
  items,
  claims,
  onSelectItem,
  onOpenReportModal,
  onOpenSignIn,
}: MyActivityViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'claims'>('reports');

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <FileText className="h-8 w-8 text-slate-300 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Sign in to view your activity</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Sign in with your campus account to view reports you have filed and check the status of your ownership claims.
        </p>
        <button
          onClick={onOpenSignIn}
          className="mt-4 inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
      </div>
    );
  }

  const myReports = items.filter((i) => i.reporter_id === currentUser.user_id);
  const myClaims = claims.filter((c) => c.claimant_id === currentUser.user_id);

  return (
    <div className="space-y-5">
      {/* Header and Toggle */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">My Campus Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong className="text-slate-700">{currentUser.name}</strong> ({currentUser.email} • {currentUser.role})
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
              activeSubTab === 'reports'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Reports ({myReports.length})
          </button>
          <button
            onClick={() => setActiveSubTab('claims')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
              activeSubTab === 'claims'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Claims ({myClaims.length})
          </button>
        </div>
      </div>

      {/* Subtab 1: My Reported Items */}
      {activeSubTab === 'reports' && (
        <div className="space-y-3">
          {myReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-700">You haven&apos;t reported any items yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                If you have misplaced an item on campus or turned in an item you found, file a report so our matching engine can track it.
              </p>
              <button
                onClick={onOpenReportModal}
                className="mt-3.5 inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Report an Item</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReports.map((item) => {
                const isLost = item.item_type === 'LOST';

                return (
                  <div
                    key={item.item_id}
                    onClick={() => onSelectItem(item)}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition cursor-pointer"
                  >
                    <div>
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

                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2.5">
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{item.location_name}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span>{item.category_name}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      {isLost && item.matches_count && item.matches_count > 0 ? (
                        <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {item.matches_count} potential matches available
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {isLost ? 'Scanning for matches...' : 'Stored in central registry'}
                        </span>
                      )}

                      <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 inline-flex items-center space-x-1">
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: My Claims */}
      {activeSubTab === 'claims' && (
        <div className="space-y-3">
          {myClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <ClipboardCheck className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">You haven&apos;t filed any claims yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                When you find an item in the directory that belongs to you, click &quot;Claim Ownership&quot; to submit identifying proof.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myClaims.map((claim) => (
                <div
                  key={claim.claim_id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-900">
                          Claim #{claim.claim_id}: {claim.item_title}
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
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Found at {claim.location_name} • Submitted on {claim.claim_date}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Item Status: <strong className="text-slate-700">{claim.item_status}</strong>
                    </div>
                  </div>

                  {/* Proof */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700">
                    <span className="font-medium text-slate-500 block mb-0.5 text-[10px] uppercase tracking-wider">
                      Proof Submitted:
                    </span>
                    {claim.proof_details}
                  </div>

                  {/* Status Banner */}
                  {claim.claim_status === 'APPROVED' && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-emerald-900 flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Your ownership claim has been approved by campus staff. Please visit Campus Security (Library Ground Floor) during operating hours with your university ID card to collect your item.
                      </span>
                    </div>
                  )}

                  {claim.claim_status === 'PENDING' && (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>Pending review by campus security staff.</span>
                    </div>
                  )}

                  {claim.claim_status === 'REJECTED' && (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      <span>This claim was not approved based on the verification details provided.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
