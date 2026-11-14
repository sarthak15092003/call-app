'use client';

import React, { useState } from 'react';
import { Lead, CallAttempt } from '@/types';
import { crmStore } from '@/lib/store';
import { useCall } from '@/components/calling/CallContext';
import {
  X,
  Phone,
  Building,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Shield,
  ShieldAlert,
  FileText,
  Play,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface LeadDetailsModalProps {
  leadId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ leadId, onClose, onUpdated }) => {
  const { startCall } = useCall();
  const [currentUser] = useState(crmStore.getCurrentUser());
  const [users] = useState(crmStore.getUsers());

  if (!leadId) return null;

  const lead = crmStore.getLeadById(leadId);
  if (!lead) return null;

  const allAttempts = crmStore.getCallAttempts();
  const leadAttempts = allAttempts.filter((a) => a.lead_id === lead.id);

  const handleToggleDnc = () => {
    const nextDnc = !lead.is_dnc;
    crmStore.updateLead(lead.id, {
      is_dnc: nextDnc,
      interest_status: nextDnc ? 'Do Not Contact' : 'Undecided',
    });
    crmStore.logAudit({
      action: 'DNC_STATUS_CHANGED',
      entity_type: 'lead',
      entity_id: lead.id,
      details: `${nextDnc ? 'Added to' : 'Removed from'} Do Not Contact (DNC) list.`,
    });
    if (onUpdated) onUpdated();
  };

  const handleReassignAgent = (agentId: string) => {
    const targetAgent = users.find((u) => u.id === agentId);
    if (!targetAgent) return;
    crmStore.updateLead(lead.id, {
      assigned_agent_id: targetAgent.id,
      assigned_agent_name: targetAgent.name,
    });
    crmStore.logAudit({
      action: 'LEAD_REASSIGNED',
      entity_type: 'lead',
      entity_id: lead.id,
      details: `Reassigned lead to ${targetAgent.name}`,
    });
    if (onUpdated) onUpdated();
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">{lead.name}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                lead.is_dnc
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              }`}>
                {lead.interest_status}
              </span>
            </div>
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{lead.phone}</span>
              {lead.company && <span>• {lead.company}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                startCall(lead);
              }}
              disabled={lead.is_dnc}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Now</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Building className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Company</span>
                <span className="font-medium text-slate-900 dark:text-white">{lead.company || 'Not Specified'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Email</span>
                <span className="font-medium text-slate-900 dark:text-white">{lead.email || 'None'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Location</span>
                <span className="font-medium text-slate-900 dark:text-white">{lead.location || 'India'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Assigned Agent</span>
                {currentUser.role === 'admin' ? (
                  <select
                    value={lead.assigned_agent_id}
                    onChange={(e) => handleReassignAgent(e.target.value)}
                    className="mt-0.5 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-slate-900 dark:text-white">{lead.assigned_agent_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Call Performance Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Attempts</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{lead.call_attempts_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Connected Talk Time</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatSec(lead.total_connected_duration)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Last Call Status</div>
              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mt-1.5">{lead.last_call_status}</div>
            </div>
          </div>

          {/* Remarks */}
          {lead.remarks && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Remarks & Lead Notes
              </h4>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {lead.remarks}
              </div>
            </div>
          )}

          {/* Historical Call Log Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Call History Timeline ({leadAttempts.length} Records)
            </h4>

            {leadAttempts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No call attempts recorded for this customer yet.</p>
            ) : (
              <div className="space-y-3">
                {leadAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          attempt.status === 'connected'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : attempt.status === 'busy'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                        }`}>
                          {attempt.status}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(attempt.start_time).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500">
                        <span>Talk: <strong>{attempt.connected_duration}s</strong></span>
                        <span>•</span>
                        <span>Ringing: <strong>{attempt.ringing_duration}s</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Caller: {attempt.agent_name}</span>
                      <span className="font-mono">ID: {attempt.provider_call_id} ({attempt.is_demo ? 'Demo' : attempt.provider})</span>
                    </div>

                    {attempt.ai_summary && (
                      <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200">
                        <span className="font-semibold flex items-center gap-1 mb-0.5">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          AI Conversation Summary:
                        </span>
                        {attempt.ai_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DNC Compliance Box */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${lead.is_dnc ? 'text-red-500' : 'text-slate-400'}`} />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Do Not Contact (DNC) Opt-out Status
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleDnc}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                lead.is_dnc
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {lead.is_dnc ? 'Remove from DNC' : 'Mark as DNC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

