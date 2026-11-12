'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Header, { MainNavView } from '@/components/Header';
import BrowseView from '@/components/BrowseView';
import MyActivityView from '@/components/MyActivityView';
import ClaimsReviewView from '@/components/ClaimsReviewView';
import ItemDetailModal from '@/components/ItemDetailModal';
import ReportItemModal from '@/components/ReportItemModal';
import FileClaimModal from '@/components/FileClaimModal';
import SignInModal from '@/components/SignInModal';
import SystemToolsModal from '@/components/SystemToolsModal';
import { User, Category, Location, Item, Claim } from '@/types';

export default function Home() {
  const [currentView, setCurrentView] = useState<MainNavView>('browse');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSystemToolsOpen, setIsSystemToolsOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);
  const [targetItemForClaim, setTargetItemForClaim] = useState<{
    item_id: number;
    title: string;
    location_name: string;
  } | null>(null);

  // Load user session from localStorage or default
  useEffect(() => {
    const savedUserId = localStorage.getItem('campus_lf_user_id');
    if (savedUserId && users.length > 0) {
      const found = users.find((u) => u.user_id === Number(savedUserId));
      if (found) setCurrentUser(found);
    }
  }, [users]);

  // Handle user selection
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('campus_lf_user_id', String(user.user_id));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('campus_lf_user_id');
    if (currentView === 'claims') {
      setCurrentView('browse');
    }
  };

  // Fetch all initial data
  const refreshAll = useCallback(async () => {
    try {
      const [metaRes, itemsRes, claimsRes] = await Promise.all([
        fetch('/api/meta').then((r) => r.json()),
        fetch('/api/items').then((r) => r.json()),
        fetch('/api/claims').then((r) => r.json()),
      ]);

      if (metaRes.users) {
        setUsers(metaRes.users);
        if (!currentUser && !localStorage.getItem('campus_lf_user_id') && metaRes.users.length > 0) {
          // Default to Demo Student on initial load
          setCurrentUser(metaRes.users[0]);
          localStorage.setItem('campus_lf_user_id', String(metaRes.users[0].user_id));
        }
      }
      if (metaRes.categories) setCategories(metaRes.categories);
      if (metaRes.locations) setLocations(metaRes.locations);
      if (itemsRes.items) setItems(itemsRes.items);
      if (claimsRes.claims) setClaims(claimsRes.claims);
    } catch (err) {
      console.error('Error refreshing campus data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handler for claim status update (Trigger & Transaction demonstration with RBAC)
  const handleUpdateClaimStatus = async (
    claimId: number,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    const res = await fetch(`/api/claims/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_status: status,
        user_role: currentUser?.role,
        user_id: currentUser?.user_id,
      }),
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
    if (!confirm(`Delete item #${itemId}? This will delete the item and its candidate matches.`)) {
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

  // Handler for resetting database back to clean baseline state (Admin Only)
  const handleResetDatabase = async () => {
    const res = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_role: currentUser?.role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset database');
    }
    await refreshAll();
  };

  const pendingClaimsCount = claims.filter((c) => c.claim_status === 'PENDING').length;
  const userReportsCount = currentUser ? items.filter((i) => i.reporter_id === currentUser.user_id).length : 0;
  const userClaimsCount = currentUser ? claims.filter((c) => c.claimant_id === currentUser.user_id).length : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header & Navigation */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onOpenReportModal={() => {
          if (!currentUser) {
            setIsSignInOpen(true);
          } else {
            setIsReportModalOpen(true);
          }
        }}
        onOpenSystemTools={() => setIsSystemToolsOpen(true)}
        pendingClaimsCount={pendingClaimsCount}
        userReportsCount={userReportsCount}
        userClaimsCount={userClaimsCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'browse' && (
          <BrowseView
            items={items}
            categories={categories}
            locations={locations}
            currentUser={currentUser}
            onSelectItem={setSelectedItemForDetail}
            onOpenReportModal={() => {
              if (!currentUser) setIsSignInOpen(true);
              else setIsReportModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            loading={loading}
          />
        )}

        {currentView === 'activity' && (
          <MyActivityView
            currentUser={currentUser}
            items={items}
            claims={claims}
            onSelectItem={setSelectedItemForDetail}
            onOpenReportModal={() => {
              if (!currentUser) setIsSignInOpen(true);
              else setIsReportModalOpen(true);
            }}
            onOpenSignIn={() => setIsSignInOpen(true)}
          />
        )}

        {currentView === 'claims' && (
          <ClaimsReviewView
            claims={claims}
            currentUser={currentUser}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            onRefresh={refreshAll}
          />
        )}
      </main>

      {/* Modals */}
      <ReportItemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        categories={categories}
        locations={locations}
        currentUser={currentUser}
        onSuccess={refreshAll}
        onOpenSignIn={() => {
          setIsReportModalOpen(false);
          setIsSignInOpen(true);
        }}
      />

      <ItemDetailModal
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        currentUser={currentUser}
        onOpenFileClaimModal={(target) => {
          setSelectedItemForDetail(null);
          setTargetItemForClaim(target);
        }}
        onUpdateClaimStatus={handleUpdateClaimStatus}
        onRefresh={refreshAll}
      />

      <FileClaimModal
        item={targetItemForClaim}
        currentUser={currentUser}
        isOpen={!!targetItemForClaim}
        onClose={() => setTargetItemForClaim(null)}
        onSuccess={refreshAll}
        onOpenSignIn={() => {
          setTargetItemForClaim(null);
          setIsSignInOpen(true);
        }}
      />

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />

      <SystemToolsModal
        isOpen={isSystemToolsOpen}
        onClose={() => setIsSystemToolsOpen(false)}
        onResetDatabase={handleResetDatabase}
        currentUser={currentUser}
      />

      {/* Restrained Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">Campus Lost &amp; Found Registry</span> — University Central Operations
          </div>
          <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
            <span>PostgreSQL 16 + pgvector</span>
            {currentUser?.role === 'ADMIN' && (
              <>
                <span>•</span>
                <button
                  onClick={() => setIsSystemToolsOpen(true)}
                  className="text-purple-600 hover:text-purple-800 font-medium underline transition"
                >
                  Admin Database Tools
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
