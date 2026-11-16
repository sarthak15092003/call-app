'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { crmStore } from '@/lib/store';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  UserCheck,
  RotateCcw,
  Shield,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(crmStore.getCurrentUser());
  const [users, setUsers] = useState(crmStore.getUsers());
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState(0);

  useEffect(() => {
    const updateHeader = () => {
      setCurrentUser(crmStore.getCurrentUser());
      setUsers(crmStore.getUsers());
      const fup = crmStore.getFollowUps().filter((f) => f.status === 'pending');
      setPendingFollowupsCount(fup.length);
    };

    updateHeader();
    window.addEventListener('smartcall_store_update', updateHeader);
    return () => window.removeEventListener('smartcall_store_update', updateHeader);
  }, []);

  const handleSwitchUser = (userId: string) => {
    crmStore.setCurrentUser(userId);
    setCurrentUser(crmStore.getCurrentUser());
    window.location.reload();
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      {/* Left side: Hamburger and title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">
            SmartCall CRM
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {currentUser.role === 'admin' ? 'Operations & Telephony Dashboard' : 'Agent Calling Station'}
          </p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Switcher */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden md:inline text-slate-500 dark:text-slate-400 font-medium">Role:</span>
          <select
            value={currentUser.id}
            onChange={(e) => handleSwitchUser(e.target.value)}
            className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs"
            title="Switch User Role for testing RBAC and view filters"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="dark:bg-slate-900">
                {u.name} ({u.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Notifications / Follow-up Reminder link */}
        <Link
          href="/follow-ups"
          className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`${pendingFollowupsCount} pending customer follow-ups`}
        >
          <Bell className="w-4 h-4" />
          {pendingFollowupsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {pendingFollowupsCount}
            </span>
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Clean Live Data / Reset Toggle */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Clear all demo data and start with a 100% clean production database? You can then upload your own Excel files and track real calls.')) {
              crmStore.clearAllDemoData();
            }
          }}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
          title="Clear all demo leads and start fresh with 100% clean live database"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear Data</span>
        </button>
      </div>
    </header>
  );
};

