'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  PhoneCall,
  History,
  CalendarClock,
  BarChart3,
  UserCog,
  Settings,
  Phone,
  Radio,
  Zap,
} from 'lucide-react';
import { crmStore } from '@/lib/store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const currentUser = crmStore.getCurrentUser();
  const settings = crmStore.getSettings();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Upload Leads', href: '/upload', icon: UploadCloud, adminOnly: true },
    { label: 'All Leads', href: '/leads', icon: Users },
    { label: 'My Calls', href: '/my-calls', icon: PhoneCall },
    { label: 'Call History', href: '/call-history', icon: History },
    { label: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Team Management', href: '/team', icon: UserCog, adminOnly: true },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>SmartCall</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                CRM
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Automated Calling & Tracking</p>
          </div>
        </div>

        {/* Telephony Status Live Pill */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Telephony Mode</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{settings.is_demo_mode ? 'Demo Sandbox' : settings.telephony_provider.toUpperCase()}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {settings.is_demo_mode ? 'Simulated calls active' : 'Live Gateway connected'}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            if (item.adminOnly && currentUser.role !== 'admin') {
              return null; // RBAC hiding for regular agents
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Active Role */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.slice(0, 2)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider font-medium">
                {currentUser.role} • Ext {currentUser.agent_ext}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

