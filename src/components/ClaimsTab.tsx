'use client';

import React, { useState } from 'react';
import { Claim, User, Item } from '@/types';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Zap,
  ShieldCheck,
  Clock,
  User as UserIcon,
} from 'lucide-react';

interface ClaimsTabProps {
  claims: Claim[];
  currentUser: User | null;
  onUpdateClaimStatus: (claimId: number, status: 'APPROVED' | 'REJECTED') => Promise<any>;
  onOpenFileClaimModal: (item: any) => void;
  onRefresh: () => void;
}

export default function ClaimsTab({
  claims,
  currentUser,
  onUpdateClaimStatus,
  onOpenFileClaimModal,
  onRefresh,
}: ClaimsTabProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [transactionBanner, setTransactionBanner] = useState<{
    claimId: number;
    status: string;
    details: any;
  } | null>(null);

  const canApproveReject = currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF';

  const filteredClaims = claims.filter((cl) => {
    if (statusFilter !== 'ALL' && cl.claim_status !== statusFilter) return false;
    return true;
  });

  const handleAction = async (claimId: number, newStatus: 'APPROVED' | 'REJECTED') => {
    setActionLoading(claimId);
    try {
      const res = await onUpdateClaimStatus(claimId, newStatus);
      if (res && res.transaction_details) {
        setTransactionBanner({
          claimId,
          status: newStatus,
          details: res.transaction_details,
        });
        setTimeout(() => setTransactionBanner(null), 8000);
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'PENDING':
      default:
        return 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>ACID Transaction &amp; Trigger Demonstration</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Ownership Claims &amp; Status Auto-Synchronization
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              When a Staff or Admin approves a claim, PostgreSQL trigger <code className="font-mono text-indigo-600">sync_item_status_after_claim</code> automatically transitions the item&apos;s status from <code className="font-mono text-emerald-600">OPEN</code> to <code className="font-mono text-amber-600">CLAIMED</code> inside the same ACID transaction!
            </p>
          </div>

          {/* Role Status Tag */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs self-start">
            <span className="text-slate-500 block">Your Current Permissions:</span>
            <span className="font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>
                {canApproveReject
                  ? `${currentUser?.role}: Can Approve & Reject Claims`
                  : 'STUDENT: Can View and Submit Claims'}
              </span>
            </span>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium mr-2">Filter Claims:</span>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st} ({claims.filter((c) => st === 'ALL' || c.claim_status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Trigger & Transaction Real-time Feedback Banner */}
      {transactionBanner && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm text-xs sm:text-sm text-indigo-900 flex items-start space-x-3 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">
              Transaction Committed &amp; Trigger Fired Successfully!
            </div>
            <p className="text-xs text-indigo-700">
              Claim #{transactionBanner.claimId} was updated to{' '}
              <span className="font-mono font-bold">{transactionBanner.status}</span>.
              PostgreSQL trigger <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">sync_item_status_after_claim</code> automatically synchronized Item #{transactionBanner.details.item_id} status from{' '}
              <span className="font-mono font-bold text-emerald-800">{transactionBanner.details.item_status_before}</span> to{' '}
              <span className="font-mono font-bold text-amber-800">{transactionBanner.details.item_status_after}</span> in the same transaction block!
            </p>
          </div>
        </div>
      )}

      {/* Claims List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Found Item</th>
                <th className="px-4 py-3">Proof Details</th>
                <th className="px-4 py-3">Claimant</th>
                <th className="px-4 py-3">Claim Status</th>
                <th className="px-4 py-3">Item Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                    No claims match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((cl) => {
                  const isProcessing = actionLoading === cl.claim_id;
                  return (
                    <tr key={cl.claim_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">
                        #{cl.claim_id}
                        <div className="text-[10px] text-slate-400">{cl.claim_date}</div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          #{cl.item_id} {cl.item_title}
                        </div>
                        <div className="text-slate-500 text-xs line-clamp-1">
                          {cl.item_description}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Zone: {cl.location_name} • Category: {cl.category_name}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-sm">
                        <div className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                          {cl.proof_details}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        <div className="font-semibold text-slate-900">
                          {cl.claimant_name}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {cl.claimant_email}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600">
                          {cl.claimant_role}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded font-bold border ${getStatusBadge(
                            cl.claim_status
                          )}`}
                        >
                          {cl.claim_status}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                            cl.item_status === 'CLAIMED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {cl.item_status}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                        {canApproveReject && cl.claim_status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleAction(cl.claim_id, 'APPROVED')}
                              disabled={isProcessing}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center space-x-1"
                              title="Approves claim and triggers sync_item_status_after_claim"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isProcessing ? '...' : 'Approve'}</span>
                            </button>
                            <button
                              onClick={() => handleAction(cl.claim_id, 'REJECTED')}
                              disabled={isProcessing}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : canApproveReject && cl.claim_status === 'APPROVED' ? (
                          <button
                            onClick={() => handleAction(cl.claim_id, 'REJECTED')}
                            disabled={isProcessing}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition inline-flex items-center space-x-1"
                            title="Revokes approval, restoring item status to OPEN"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                            <span>Revoke</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {cl.claim_status !== 'PENDING' ? 'Finalized' : 'Staff Only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
