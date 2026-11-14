'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { Lead, User, CallAttempt } from '@/types';
import { useCall } from '@/components/calling/CallContext';
import {
  Phone,
  PhoneCall,
  History,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  FileText,
  AlertCircle,
  Zap,
  TrendingUp,
  Filter,
  UserCheck,
} from 'lucide-react';
import { LeadDetailsModal } from '@/components/leads/LeadDetailsModal';

export default function MyCallsPage() {
  const { startCall } = useCall();
  const [currentUser, setCurrentUser] = useState<User>(crmStore.getCurrentUser());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'followup' | 'interested'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadModalId, setSelectedLeadModalId] = useState<string | null>(null);

  // Manual dialer phone state
  const [manualPhone, setManualPhone] = useState('');

  const loadData = () => {
    const user = crmStore.getCurrentUser();
    setCurrentUser(user);
    const allLeads = crmStore.getLeads();
    // Filter to current agent's assigned leads (or if admin, show all)
    const myLeads =
      user.role === 'admin'
        ? allLeads
        : allLeads.filter((l) => l.assigned_agent_id === user.id);
    setLeads(myLeads);
    setAttempts(crmStore.getCallAttempts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  // Agent Performance Metrics
  const agentCalls = attempts.filter((a) => a.agent_id === currentUser.id);
  const connectedCalls = agentCalls.filter((a) => a.status === 'connected');
  const totalTalkSec = connectedCalls.reduce((s, c) => s + (c.connected_duration || 0), 0);
  const conversions = leads.filter((l) => l.interest_status === 'Converted').length;

  const filteredLeads = leads.filter((l) => {
    if (activeTab === 'pending' && l.call_attempts_count > 0) return false;
    if (activeTab === 'followup' && l.interest_status !== 'Follow-up Required' && l.interest_status !== 'Callback Requested') return false;
    if (activeTab === 'interested' && l.interest_status !== 'Interested' && l.interest_status !== 'Converted') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchPhone = l.phone.includes(q);
      const matchCompany = (l.company || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCompany) return false;
    }

    return true;
  });

  const handleManualDial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;

    // Create ad-hoc quick lead to dial
    const adHocLead: Lead = {
      id: `lead_adhoc_${Date.now()}`,
      batch_id: 'DIRECT_DIAL',
      name: `Direct Dial (${manualPhone})`,
      phone: manualPhone.startsWith('+') ? manualPhone : `+91${manualPhone}`,
      raw_phone: manualPhone,
      company: 'Ad-hoc Outbound',
      email: '',
      location: 'India',
      lead_source: 'Manual Dial',
      assigned_agent_id: currentUser.id,
      assigned_agent_name: currentUser.name,
      remarks: 'Manually dialed from calling station',
      interest_status: 'Undecided',
      call_attempts_count: 0,
      total_connected_duration: 0,
      last_call_at: null,
      last_call_status: 'never_called',
      next_followup_at: null,
      is_dnc: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    crmStore.saveLeads([adHocLead, ...crmStore.getLeads()]);
    setManualPhone('');
    startCall(adHocLead);
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Agent Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Agent Calling Station
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <strong className="text-indigo-600 dark:text-indigo-400">{currentUser.name}</strong> • Extension {currentUser.agent_ext} • Telephony Ready
          </p>
        </div>

        {/* Manual Quick Dial Bar */}
        <form onSubmit={handleManualDial} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type any 10-digit number to dial..."
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono w-56"
          />
          <button
            type="submit"
            className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Dial</span>
          </button>
        </form>
      </div>

      {/* Agent Personal KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Leads</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{leads.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">In calling queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Calls Attempted</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{agentCalls.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Today by you</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Connected Calls</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{connectedCalls.length}</div>
          <div className="text-[10px] text-emerald-600/80 font-medium mt-0.5">
            {agentCalls.length > 0 ? Math.round((connectedCalls.length / agentCalls.length) * 100) : 0}% connect rate
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Talk Time</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatSec(totalTalkSec)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Connected speech</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Converted Deals</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{conversions}</div>
          <div className="text-[10px] text-purple-600/80 font-medium mt-0.5">High performance</div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/60 w-fit text-xs font-semibold">
          {[
            { key: 'all', label: `All Queue (${leads.length})` },
            { key: 'pending', label: `Pending to Dial (${leads.filter((l) => l.call_attempts_count === 0).length})` },
            { key: 'followup', label: `Follow-up Due (${leads.filter((l) => l.interest_status === 'Follow-up Required' || l.interest_status === 'Callback Requested').length})` },
            { key: 'interested', label: `Interested & Converted (${leads.filter((l) => l.interest_status === 'Interested' || l.interest_status === 'Converted').length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Calling Station Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Customer & Number</th>
                <th className="px-4 py-3.5">Click-to-Call</th>
                <th className="px-4 py-3.5">Last Call Details</th>
                <th className="px-4 py-3.5">Attempts & Talk Time</th>
                <th className="px-4 py-3.5">Interest Status</th>
                <th className="px-4 py-3.5">Notes & Remarks</th>
                <th className="px-4 py-3.5">Next Follow-Up</th>
                <th className="px-4 py-3.5 text-right">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                    No leads in this queue filter.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Customer Name & Number */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadModalId(lead.id)}
                          className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                        >
                          {lead.name}
                        </button>
                        {lead.is_dnc && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                            DNC
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px] mt-0.5">
                        {lead.phone}
                      </div>
                      {lead.company && (
                        <div className="text-[10px] text-slate-400">{lead.company}</div>
                      )}
                    </td>

                    {/* Click-to-Call Button */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => startCall(lead)}
                        disabled={lead.is_dnc}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                        title={lead.is_dnc ? 'Customer opted out (DNC)' : 'Trigger outbound call via integrated telephony'}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Click to Call</span>
                      </button>
                    </td>

                    {/* Last Call Date & Status */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          lead.last_call_status === 'connected'
                            ? 'bg-emerald-500'
                            : lead.last_call_status === 'busy'
                            ? 'bg-amber-500'
                            : lead.last_call_status === 'no_answer'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`} />
                        <span className="font-bold uppercase text-[11px]">
                          {lead.last_call_status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {lead.last_call_at
                          ? new Date(lead.last_call_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : 'Never called'}
                      </div>
                    </td>

                    {/* Number of attempts & Connected Duration */}
                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lead.call_attempts_count} {lead.call_attempts_count === 1 ? 'attempt' : 'attempts'}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatSec(lead.total_connected_duration)} connected
                      </div>
                    </td>

                    {/* Interest Status */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        lead.interest_status === 'Interested'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : lead.interest_status === 'Converted'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : lead.interest_status === 'Follow-up Required' || lead.interest_status === 'Callback Requested'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : lead.interest_status === 'Not Interested'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          : lead.interest_status === 'Do Not Contact'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {lead.interest_status}
                      </span>
                    </td>

                    {/* Notes Snippet */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate" title={lead.remarks}>
                        {lead.remarks || 'No notes added'}
                      </p>
                    </td>

                    {/* Next Follow-up Date */}
                    <td className="px-4 py-3.5">
                      {lead.next_followup_at ? (
                        <div className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono text-[11px] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(lead.next_followup_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Call History Button */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLeadModalId(lead.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadDetailsModal
        leadId={selectedLeadModalId}
        onClose={() => setSelectedLeadModalId(null)}
        onUpdated={loadData}
      />
    </div>
  );
}

