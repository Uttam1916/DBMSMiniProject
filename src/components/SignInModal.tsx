'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { X, Check, Lock } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
}

export default function SignInModal({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
}: SignInModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<number>(
    currentUser?.user_id || (users[0]?.user_id ?? 1)
  );

  if (!isOpen) return null;

  const handleSignIn = (userId: number) => {
    const selected = users.find((u) => u.user_id === userId);
    if (selected) {
      onSelectUser(selected);
      onClose();
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Full access to manage items, review claims, and view system tools.';
      case 'STAFF':
        return 'Can report items, review pending claims, and verify ownership proof.';
      case 'STUDENT':
      default:
        return 'Can browse catalog, report lost or found items, and submit claims.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sign in to Campus Lost &amp; Found</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a campus profile to simulate authentic role permissions.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account Selector */}
        <div className="p-5 space-y-3">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Available Campus Profiles
          </div>

          <div className="space-y-2">
            {users.map((u) => {
              const isSelected = selectedUserId === u.user_id;
              const isCurrent = currentUser?.user_id === u.user_id;

              return (
                <div
                  key={u.user_id}
                  onClick={() => setSelectedUserId(u.user_id)}
                  className={`flex cursor-pointer items-start justify-between rounded-lg border p-3.5 transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-900">{u.name}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'STAFF'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {u.role}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-slate-400 font-normal">Active</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    <div className="text-[11px] text-slate-400 pt-0.5">
                      {getRoleDescription(u.role)}
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start space-x-2">
            <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Passphrases are verified against PostgreSQL <code className="font-mono text-slate-700">pgcrypto</code> crypt hashes. Passwords for demo testing are configured as <code className="font-mono text-slate-700">[RoleName]#1</code>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2 border-t border-slate-200 px-5 py-3.5 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSignIn(selectedUserId)}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
          >
            Sign in as {users.find((u) => u.user_id === selectedUserId)?.name || 'User'}
          </button>
        </div>
      </div>
    </div>
  );
}
