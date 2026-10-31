'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Navigation, { TabType } from '@/components/Navigation';
import DashboardTab from '@/components/DashboardTab';
import ItemsTab from '@/components/ItemsTab';
import SemanticSearchTab from '@/components/SemanticSearchTab';
import ClaimsTab from '@/components/ClaimsTab';
import SqlConsoleTab from '@/components/SqlConsoleTab';
import SchemaTab from '@/components/SchemaTab';
import ReportItemModal from '@/components/ReportItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import FileClaimModal from '@/components/FileClaimModal';
import { User, Category, Location, Item, ItemMatch, Claim } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);
  const [itemForClaimModal, setItemForClaimModal] = useState<Item | null>(null);

  // Fetch all initial data
  const refreshAll = useCallback(async () => {
    try {
      const [metaRes, itemsRes, matchesRes, claimsRes, analyticsRes] = await Promise.all([
        fetch('/api/meta').then((r) => r.json()),
        fetch('/api/items').then((r) => r.json()),
        fetch('/api/matches').then((r) => r.json()),
        fetch('/api/claims').then((r) => r.json()),
        fetch('/api/analytics').then((r) => r.json()),
      ]);

      if (metaRes.users) {
        setUsers(metaRes.users);
        if (!currentUser && metaRes.users.length > 0) {
          // Default to Student or Admin
          setCurrentUser(metaRes.users[0]);
        }
      }
      if (metaRes.categories) setCategories(metaRes.categories);
      if (metaRes.locations) setLocations(metaRes.locations);
      if (itemsRes.items) setItems(itemsRes.items);
      if (matchesRes.matches) setMatches(matchesRes.matches);
      if (claimsRes.claims) setClaims(claimsRes.claims);
      if (analyticsRes) setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Error refreshing app data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handler for resetting database back to clean baseline state
  const handleResetDatabase = async () => {
    const res = await fetch('/api/demo/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset database');
    }
    await refreshAll();
  };

  // Handler for claim status update (Trigger & Transaction demonstration)
  const handleUpdateClaimStatus = async (
    claimId: number,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    const res = await fetch(`/api/claims/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_status: status }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.details || data.error || 'Failed to update claim');
    }

    await refreshAll();
    return data;
  };

  // Handler for deleting an item (DML demonstration)
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm(`Delete item #${itemId}? This demonstrates relational CASCADE delete on item_match.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to delete item');
      }
      await refreshAll();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Handler for recomputing embeddings and matches
  const handleRefreshMatches = async () => {
    const res = await fetch('/api/matches', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to refresh matches');
    }
    await refreshAll();
  };

  const pendingClaimsCount = claims.filter((c) => c.claim_status === 'PENDING').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onSelectUser={setCurrentUser}
        onResetDatabase={handleResetDatabase}
      />

      {/* Main Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingClaimsCount={pendingClaimsCount}
        matchesCount={matches.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Connecting to PostgreSQL &amp; pgvector...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <DashboardTab
                analytics={analytics}
                onNavigate={setActiveTab}
                onOpenReportModal={() => setIsReportModalOpen(true)}
              />
            )}

            {activeTab === 'items' && (
              <ItemsTab
                items={items}
                categories={categories}
                locations={locations}
                currentUser={currentUser}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                onSelectItem={setSelectedItemForDetail}
                onOpenFileClaimModal={setItemForClaimModal}
                onDeleteItem={handleDeleteItem}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'search' && (
              <SemanticSearchTab
                matches={matches}
                onRefreshMatches={handleRefreshMatches}
                onSelectItemById={(id) => {
                  const it = items.find((i) => i.item_id === id);
                  if (it) setSelectedItemForDetail(it);
                }}
              />
            )}

            {activeTab === 'claims' && (
              <ClaimsTab
                claims={claims}
                currentUser={currentUser}
                onUpdateClaimStatus={handleUpdateClaimStatus}
                onOpenFileClaimModal={setItemForClaimModal}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'sql' && <SqlConsoleTab />}

            {activeTab === 'schema' && <SchemaTab />}
          </>
        )}
      </main>

      {/* Report Item Modal */}
      <ReportItemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        categories={categories}
        locations={locations}
        currentUser={currentUser}
        onSuccess={refreshAll}
      />

      {/* Item Detail & Matches Modal */}
      <ItemDetailModal
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        currentUser={currentUser}
        onOpenFileClaimModal={(it) => {
          setSelectedItemForDetail(null);
          setItemForClaimModal(it);
        }}
      />

      {/* File Claim Modal */}
      <FileClaimModal
        item={itemForClaimModal}
        currentUser={currentUser}
        isOpen={!!itemForClaimModal}
        onClose={() => setItemForClaimModal(null)}
        onSuccess={refreshAll}
      />

      {/* Clean Institutional Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">Campus Lost-and-Found Matching System</span> — DBMS Experiential Learning Project (Level 3)
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>PostgreSQL 16</span>
            <span>•</span>
            <span>pgvector HNSW</span>
            <span>•</span>
            <span>FastEmbed</span>
            <span>•</span>
            <span>Next.js App Router</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
