'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import {
  Compass,
  FileText,
  ClipboardCheck,
  Plus,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Terminal,
  RotateCcw,
} from 'lucide-react';

export type MainNavView = 'browse' | 'activity' | 'claims';

interface HeaderProps {
  currentView: MainNavView;
  onSelectView: (view: MainNavView) => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenSignIn: () => void;
  onOpenReportModal: () => void;
  onOpenSystemTools: () => void;
  pendingClaimsCount: number;
  userReportsCount: number;
  userClaimsCount: number;
}

export default function Header({
  currentView,
  onSelectView,
  currentUser,
  onSignOut,
  onOpenSignIn,
  onOpenReportModal,
  onOpenSystemTools,
  pendingClaimsCount,
  userReportsCount,
  userClaimsCount,
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isStaffOrAdmin = currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand & Main Navigation */}
          <div className="flex items-center space-x-6">
            {/* Campus Brand */}
            <div
              onClick={() => onSelectView('browse')}
              className="flex cursor-pointer items-center space-x-2.5 select-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-semibold text-xs">
                LF
              </div>
              <div>
                <span className="text-sm font-semibold tracking-tight text-slate-900 block leading-tight">
                  Campus Lost &amp; Found
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  University Central Registry
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              <button
                onClick={() => onSelectView('browse')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  currentView === 'browse'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Browse Items</span>
              </button>

              <button
                onClick={() => onSelectView('activity')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  currentView === 'activity'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>My Activity</span>
                {currentUser && (userReportsCount + userClaimsCount > 0) && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                    {userReportsCount + userClaimsCount}
                  </span>
                )}
              </button>

              {isStaffOrAdmin && (
                <button
                  onClick={() => onSelectView('claims')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    currentView === 'claims'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>Review Claims</span>
                  {pendingClaimsCount > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-white font-semibold">
                      {pendingClaimsCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* Right Utilities & Auth */}
          <div className="flex items-center space-x-2.5">
            {/* Primary Action: Report Item */}
            <button
              onClick={onOpenReportModal}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Report Item</span>
            </button>

            {/* System / SQL Console Utility for Evaluation - Restricted to ADMIN */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={onOpenSystemTools}
                className="hidden lg:inline-flex items-center space-x-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition"
                title="Admin Only: DBMS Level 3 Evaluation Console, SQL Runner & Schema Inspector"
              >
                <Terminal className="h-3.5 w-3.5 text-purple-600" />
                <span>Database Tools</span>
              </button>
            )}

            {/* User Profile / Authentication Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-300 transition"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline font-medium">{currentUser.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700'
                        : currentUser.role === 'STAFF'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSelectView('activity');
                        }}
                        className="w-full text-left flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>My Reports &amp; Claims</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSignIn();
                        }}
                        className="w-full text-left flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition"
                      >
                        <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span>Switch Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSystemTools();
                        }}
                        className="w-full text-left flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition lg:hidden"
                      >
                        <Terminal className="h-3.5 w-3.5 text-slate-400" />
                        <span>Database Tools</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenSignIn}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 space-x-1 overflow-x-auto">
          <button
            onClick={() => onSelectView('browse')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
              currentView === 'browse'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Browse</span>
          </button>

          <button
            onClick={() => onSelectView('activity')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
              currentView === 'activity'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>My Activity</span>
          </button>

          {isStaffOrAdmin && (
            <button
              onClick={() => onSelectView('claims')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                currentView === 'claims'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>Review Claims</span>
              {pendingClaimsCount > 0 && (
                <span className="ml-1 text-[10px] px-1.5 rounded-full bg-slate-200 text-slate-800">
                  {pendingClaimsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenSystemTools}
            className="flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>DB Tools</span>
          </button>
        </div>
      </div>
    </header>
  );
}
