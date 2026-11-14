'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { FollowUp, User, Lead } from '@/types';
import { useCall } from '@/components/calling/CallContext';
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Search,
  Filter,
  Eye,
  Plus,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { LeadDetailsModal } from '@/components/leads/LeadDetailsModal';

export default function FollowUpsPage() {
  const { startCall } = useCall();
  const [currentUser] = useState<User>(crmStore.getCurrentUser());
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [selectedLeadModalId, setSelectedLeadModalId] = useState<string | null>(null);

  const loadData = () => {
    setFollowups(crmStore.getFollowUps());
    setLeads(crmStore.getLeads());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Categorize follow-ups
  const categorized = {
    today: followups.filter((f) => f.status === 'pending' && f.scheduled_at.startsWith(todayStr)),
    overdue: followups.filter((f) => f.status === 'pending' && new Date(f.scheduled_at) < now && !f.scheduled_at.startsWith(todayStr)),
    upcoming: followups.filter((f) => f.status === 'pending' && new Date(f.scheduled_at) > now && !f.scheduled_at.startsWith(todayStr)),
    completed: followups.filter((f) => f.status === 'completed'),
  };

  const currentList = categorized[activeTab] || [];

  const handleMarkCompleted = (id: string) => {
    crmStore.completeFollowUp(id);
    crmStore.logAudit({
      action: 'FOLLOWUP_COMPLETED',
      entity_type: 'followup',
      entity_id: id,
      details: 'Marked follow-up task as completed.',
    });
    loadData();
  };

  const handleCallLead = (leadId: string) => {
    const lead = crmStore.getLeadById(leadId);
    if (lead) {
      startCall(lead);
    }
  };

  const priorityColors = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-800',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    normal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Follow-Up & Callback Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track scheduled customer touchpoints, callbacks, overdue commitments, and urgent sales follow-ups
          </p>
        </div>

        {/* Quick reminder pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>{categorized.today.length} Due Today</span>
          </div>

          {categorized.overdue.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>{categorized.overdue.length} Overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-semibold">
        {[
          { key: 'today', label: `Today's Follow-ups (${categorized.today.length})`, icon: Clock },
          { key: 'overdue', label: `Overdue (${categorized.overdue.length})`, icon: AlertTriangle },
          { key: 'upcoming', label: `Upcoming Schedule (${categorized.upcoming.length})`, icon: Calendar },
          { key: 'completed', label: `Completed (${categorized.completed.length})`, icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Follow-up Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentList.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 italic">
            No follow-ups in this view.
          </div>
        ) : (
          currentList.map((fup) => (
            <div
              key={fup.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      onClick={() => setSelectedLeadModalId(fup.lead_id)}
                    >
                      {fup.lead_name}
                    </h4>
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 block">
                      {fup.lead_phone}
                    </span>
                    {fup.lead_company && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        {fup.lead_company}
                      </span>
                    )}
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${priorityColors[fup.priority] || priorityColors.normal}`}>
                    {fup.priority}
                  </span>
                </div>

                {/* Scheduled Time Banner */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs font-mono mb-3">
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(fup.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                {/* Notes */}
                {fup.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    &ldquo;{fup.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeadModalId(fup.lead_id)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>

                <div className="flex items-center gap-2">
                  {fup.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleMarkCompleted(fup.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Done
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCallLead(fup.lead_id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <LeadDetailsModal
        leadId={selectedLeadModalId}
        onClose={() => setSelectedLeadModalId(null)}
        onUpdated={loadData}
      />
    </div>
  );
}
