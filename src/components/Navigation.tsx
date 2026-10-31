'use client';

import React from 'react';
import {
  LayoutDashboard,
  PackageSearch,
  Sparkles,
  FileCheck2,
  Terminal,
  FileSpreadsheet,
} from 'lucide-react';

export type TabType = 'overview' | 'items' | 'search' | 'claims' | 'sql' | 'schema';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingClaimsCount?: number;
  matchesCount?: number;
}

export default function Navigation({
  activeTab,
  onTabChange,
  pendingClaimsCount = 0,
  matchesCount = 0,
}: NavigationProps) {
  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'items' as TabType,
      label: 'Items Directory',
      icon: PackageSearch,
      badge: null,
    },
    {
      id: 'search' as TabType,
      label: 'Semantic Vector Search',
      icon: Sparkles,
      badge: matchesCount > 0 ? `${matchesCount} Matches` : null,
    },
    {
      id: 'claims' as TabType,
      label: 'Claims & Triggers',
      icon: FileCheck2,
      badge: pendingClaimsCount > 0 ? `${pendingClaimsCount} Pending` : null,
    },
    {
      id: 'sql' as TabType,
      label: 'SQL Console & Demos',
      icon: Terminal,
      badge: '9 Queries',
    },
    {
      id: 'schema' as TabType,
      label: 'ER & Schema Design',
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2.5" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-slate-800 text-indigo-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
