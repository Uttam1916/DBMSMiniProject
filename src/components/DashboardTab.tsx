'use client';

import React from 'react';
import {
  Package,
  Sparkles,
  FileCheck2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { TabType } from './Navigation';

interface DashboardTabProps {
  analytics: any;
  onNavigate: (tab: TabType) => void;
  onOpenReportModal: () => void;
}

export default function DashboardTab({
  analytics,
  onNavigate,
  onOpenReportModal,
}: DashboardTabProps) {
  const tableCounts = analytics?.table_counts || [];
  const categoryStats = analytics?.category_stats || [];
  const vectorStats = analytics?.vector_stats || { total_items: 0, items_with_embeddings: 0 };
  const claimStats = analytics?.claim_stats || [];

  const getItemCount = (type: string) => {
    const item = analytics?.type_counts?.find((t: any) => t.item_type === type);
    return item ? item.count : 0;
  };

  const pendingClaims =
    claimStats.find((c: any) => c.claim_status === 'PENDING')?.count || 0;
  const approvedClaims =
    claimStats.find((c: any) => c.claim_status === 'APPROVED')?.count || 0;
  const matchCount =
    tableCounts.find((t: any) => t.table_name === 'item_match')?.row_count || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>PostgreSQL 16 + pgvector HNSW + FastEmbed</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Campus Lost-and-Found Item Matching System
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            A hybrid relational and vector database application. Items reported by students and staff are vectorized using 384-dimensional dense embeddings to automatically discover semantic matches beyond exact keyword search.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenReportModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-sm"
          >
            <Package className="w-4 h-4 text-indigo-400" />
            <span>Report Item</span>
          </button>
          <button
            onClick={() => onNavigate('search')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Semantic Search</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reported Items</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {vectorStats.total_items}
          </div>
          <div className="flex items-center space-x-2 mt-2 text-xs">
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              {getItemCount('FOUND')} Found
            </span>
            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
              {getItemCount('LOST')} Lost
            </span>
          </div>
        </div>

        {/* Dense Vector Embeddings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vector Embeddings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {vectorStats.items_with_embeddings} / {vectorStats.total_items}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-500 inline" />
            <span>384-dim HNSW Cosine Index</span>
          </p>
        </div>

        {/* Automated Matches */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Indexed Matches</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{matchCount}</div>
          <p className="text-xs text-slate-500 mt-2">
            Cross-matched via PL/pgSQL function
          </p>
        </div>

        {/* Claims & Approvals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ownership Claims</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {pendingClaims + approvedClaims}
          </div>
          <div className="flex items-center space-x-2 mt-2 text-xs">
            <span className="text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
              {pendingClaims} Pending
            </span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              {approvedClaims} Approved
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Categories & Advanced Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (SQL Aggregate query) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Item Category Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Aggregated via SQL <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">COUNT FILTER</code> &amp; <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">GROUP BY</code>
              </p>
            </div>
            <button
              onClick={() => onNavigate('items')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {categoryStats.map((cat: any) => (
              <div key={cat.category} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    {cat.category}
                  </span>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                    <span>Lost: {cat.lost_items}</span>
                    <span>•</span>
                    <span>Found: {cat.found_items}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-900">
                    {cat.total_items} items
                  </span>
                  <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          (cat.total_items / (vectorStats.total_items || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Architecture & Level 3 Features */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">
              DBMS Features Active
            </h3>
          </div>

          <ul className="space-y-3 text-xs text-slate-600">
            <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">
                ⚡ Vector Database (pgvector HNSW)
              </span>
              <span>
                Native 384-dim vector type with cosine distance index (<code className="text-indigo-600 font-mono">&lt;=&gt;</code>).
              </span>
            </li>
            <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">
                🔄 Auto-Sync Trigger
              </span>
              <span>
                <code className="text-indigo-600 font-mono">sync_item_status_after_claim</code> auto-transitions item to CLAIMED inside ACID transaction.
              </span>
            </li>
            <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">
                📊 Database Views
              </span>
              <span>
                <code className="text-indigo-600 font-mono">item_details_view</code> and <code className="text-indigo-600 font-mono">pending_claims_view</code> pre-joining complex relations.
              </span>
            </li>
            <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">
                ⚙️ PL/pgSQL Stored Function
              </span>
              <span>
                <code className="text-indigo-600 font-mono">find_matching_items(lost_id, limit)</code> computing nearest neighbors.
              </span>
            </li>
          </ul>

          <button
            onClick={() => onNavigate('sql')}
            className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium text-center transition flex items-center justify-center space-x-1.5"
          >
            <span>Open SQL Console &amp; Test Queries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
