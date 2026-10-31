'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { Database, RotateCcw, ShieldCheck, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  users: User[];
  onSelectUser: (user: User) => void;
  onResetDatabase: () => Promise<void>;
}

export default function Header({
  currentUser,
  users,
  onSelectUser,
  onResetDatabase,
}: HeaderProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (!confirm('Reset database to clean baseline demo state? This will clear test items and restore demo records.')) {
      return;
    }
    setIsResetting(true);
    try {
      await onResetDatabase();
      setResetMessage('Baseline demo data restored successfully!');
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'STAFF':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STUDENT':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Campus Lost & Found
                </h1>
                <span className="text-xs px-2 py-0.5 font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PostgreSQL + pgvector
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                DBMS Level 3 Experiential Learning System
              </p>
            </div>
          </div>

          {/* Action Bar & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Reset Database Button */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
              title="Resets database to baseline demo records for presentation"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isResetting ? 'Resetting...' : 'Reset Demo DB'}</span>
            </button>

            {/* Role Switcher Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <div className="text-xs text-slate-600 hidden lg:block">Active Role:</div>
              <select
                aria-label="Active User Role"
                className="text-xs font-medium bg-transparent text-slate-800 outline-none cursor-pointer"
                value={currentUser?.user_id || ''}
                onChange={(e) => {
                  const selected = users.find((u) => u.user_id === Number(e.target.value));
                  if (selected) onSelectUser(selected);
                }}
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              {currentUser && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded font-semibold border ${getRoleBadge(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {resetMessage && (
        <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-2 flex items-center justify-center space-x-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}
    </header>
  );
}
