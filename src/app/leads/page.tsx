'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { Lead, User, InterestStatus, CallStatus } from '@/types';
import { useCall } from '@/components/calling/CallContext';
import { exportLeadsToExcel } from '@/lib/excel';
import {
  Users,
  Search,
  Filter,
  Download,
  Phone,
  Clock,
  Eye,
  CheckCircle2,
  Calendar,
  Shield,
  ArrowUpDown,
  Building,
} from 'lucide-react';
import { LeadDetailsModal } from '@/components/leads/LeadDetailsModal';

export default function AllLeadsPage() {
  const { startCall } = useCall();
  const [currentUser, setCurrentUser] = useState<User>(crmStore.getCurrentUser());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterest, setSelectedInterest] = useState<string>('all');
  const [selectedCallStatus, setSelectedCallStatus] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedLeadModalId, setSelectedLeadModalId] = useState<string | null>(null);

  const loadData = () => {
    setCurrentUser(crmStore.getCurrentUser());
    setLeads(crmStore.getLeads());
    setUsers(crmStore.getUsers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  const uniqueLeadEvents = Array.from(
    new Set(leads.map((l) => (l.event_name || l.lead_source || 'Unassigned').trim()))
  ).sort();

  const filteredLeads = leads.filter((lead) => {
    // RBAC: If agent, can access assigned leads (or unassigned)
    if (currentUser.role === 'agent' && lead.assigned_agent_id !== currentUser.id && lead.assigned_agent_id) {
      // In All Leads, agents can see unassigned or their own, or admin sees all
      // Let's filter if agent
      return false;
    }

    if (selectedInterest !== 'all' && lead.interest_status !== selectedInterest) return false;
    if (selectedCallStatus !== 'all' && lead.last_call_status !== selectedCallStatus) return false;
    if (selectedEvent !== 'all' && (lead.event_name || lead.lead_source || 'Unassigned').trim() !== selectedEvent) return false;
    if (selectedAgent !== 'all' && lead.assigned_agent_id !== selectedAgent) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchPhone = lead.phone.includes(q);
      const matchCompany = (lead.company || '').toLowerCase().includes(q);
      const matchLoc = (lead.location || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCompany && !matchLoc) return false;
    }

    return true;
  });

  const handleExportExcel = async () => {
    const blob = await exportLeadsToExcel(filteredLeads, 'SmartCall_Leads_Filtered.xlsx');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartCall_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {currentUser.role === 'admin' ? 'Master Lead Directory' : 'Assigned Customer Leads'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total {filteredLeads.length} leads matching current filters • Click any lead to call or view history
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span>Export to Excel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, phone, company, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Interest Status */}
          <select
            value={selectedInterest}
            onChange={(e) => setSelectedInterest(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Interest Statuses</option>
            <option value="Interested">Interested</option>
            <option value="Follow-up Required">Follow-up Required</option>
            <option value="Callback Requested">Callback Requested</option>
            <option value="Converted">Converted</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Wrong Number">Wrong Number</option>
            <option value="Do Not Contact">Do Not Contact</option>
            <option value="Undecided">Undecided</option>
          </select>

          {/* Call Status */}
          <select
            value={selectedCallStatus}
            onChange={(e) => setSelectedCallStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Call Outcomes</option>
            <option value="connected">Connected</option>
            <option value="busy">Busy</option>
            <option value="no_answer">No Answer</option>
            <option value="never_called">Never Called</option>
          </select>

          {/* Event Filter */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Events ({uniqueLeadEvents.length})</option>
            {uniqueLeadEvents.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>

          {/* Agent Filter (Admin only) */}
          {currentUser.role === 'admin' && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Agents</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Customer & Mobile</th>
                <th className="px-4 py-3.5">Company & City</th>
                <th className="px-4 py-3.5">Interest Status</th>
                <th className="px-4 py-3.5">Last Call Outcome</th>
                <th className="px-4 py-3.5">Attempts & Talk Time</th>
                <th className="px-4 py-3.5">Assigned Agent</th>
                <th className="px-4 py-3.5">Next Follow-Up</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                    No leads found matching your criteria. Try adjusting the search query or filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
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
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {lead.company || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lead.location || 'India'}
                      </div>
                    </td>

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
                        <span className="font-semibold uppercase text-[11px]">
                          {lead.last_call_status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {lead.last_call_at ? new Date(lead.last_call_at).toLocaleDateString() : 'Never dialed'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lead.call_attempts_count} {lead.call_attempts_count === 1 ? 'attempt' : 'attempts'}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {formatSec(lead.total_connected_duration)} talk
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {lead.assigned_agent_name}
                    </td>

                    <td className="px-4 py-3.5">
                      {lead.next_followup_at ? (
                        <div className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono text-[11px] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(lead.next_followup_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None scheduled</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadModalId(lead.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View 360 Customer Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => startCall(lead)}
                          disabled={lead.is_dnc}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition-all hover:scale-105 active:scale-95"
                          title={lead.is_dnc ? 'Suppressed under DNC' : 'Click to Call'}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </button>
                      </div>
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

