'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { CallAttempt, User } from '@/types';
import {
  History,
  Search,
  Filter,
  Download,
  Phone,
  Clock,
  Sparkles,
  Play,
  Volume2,
  Calendar,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export default function CallHistoryPage() {
  const [currentUser] = useState<User>(crmStore.getCurrentUser());
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  const loadData = () => {
    setAttempts(crmStore.getCallAttempts());
    setUsers(crmStore.getUsers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  const filteredAttempts = attempts.filter((a) => {
    // If agent role, restrict to their own calls
    if (currentUser.role === 'agent' && a.agent_id !== currentUser.id) return false;

    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (selectedAgent !== 'all' && a.agent_id !== selectedAgent) return false;
    if (selectedProvider !== 'all' && a.provider !== selectedProvider) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCust = a.customer_name.toLowerCase().includes(q);
      const matchNum = a.customer_number.includes(q);
      const matchAgent = a.agent_name.toLowerCase().includes(q);
      const matchId = a.provider_call_id.toLowerCase().includes(q);
      if (!matchCust && !matchNum && !matchAgent && !matchId) return false;
    }

    return true;
  });

  const totalConnected = filteredAttempts.filter((a) => a.status === 'connected');
  const totalTalkSec = totalConnected.reduce((s, c) => s + (c.connected_duration || 0), 0);

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Telephony Call History & Recordings
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete audit trail of telephony gateway attempts, actual connected talk times, transcripts & AI summaries
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Clock className="w-4 h-4 text-emerald-500" />
          <span>Total Connected Time: <strong className="text-emerald-600 dark:text-emerald-400">{formatSec(totalTalkSec)}</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, phone, agent or Call ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Call Outcomes</option>
            <option value="connected">Connected / Answered</option>
            <option value="no_answer">No Answer / Missed</option>
            <option value="busy">Customer Line Busy</option>
            <option value="failed">Failed / Cancelled</option>
          </select>

          {/* Provider */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Telephony Providers</option>
            <option value="exotel">Exotel Gateway</option>
            <option value="myoperator">MyOperator</option>
            <option value="demo">Demo Telephony Sandbox</option>
          </select>

          {/* Agent (Admin only) */}
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

      {/* Calls Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Call ID & Provider</th>
                <th className="px-4 py-3.5">Customer & Number</th>
                <th className="px-4 py-3.5">Agent</th>
                <th className="px-4 py-3.5">Call Status</th>
                <th className="px-4 py-3.5">Ringing Duration</th>
                <th className="px-4 py-3.5">Connected Talk Time</th>
                <th className="px-4 py-3.5">Call Timestamp</th>
                <th className="px-4 py-3.5 text-right">Details & AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                    No call attempts recorded.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((attempt) => {
                  const isExpanded = expandedAttemptId === attempt.id;

                  return (
                    <React.Fragment key={attempt.id}>
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {attempt.provider_call_id}
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>{attempt.is_demo ? 'Demo Sandbox' : attempt.provider.toUpperCase()}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{attempt.customer_name}</div>
                          <div className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px] mt-0.5">
                            {attempt.customer_number}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                          {attempt.agent_name}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            attempt.status === 'connected'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : attempt.status === 'busy'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {attempt.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {attempt.ringing_duration}s
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {attempt.connected_duration}s ({formatSec(attempt.connected_duration)})
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                          {new Date(attempt.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span>{isExpanded ? 'Hide' : 'AI Analysis'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Accordion for AI summary, Transcript & Recording */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                          <td colSpan={8} className="p-4">
                            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-indigo-500" />
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    AI Call Intelligence Report
                                  </span>
                                  {attempt.ai_confidence && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                      {Math.round(attempt.ai_confidence * 100)}% Confidence
                                    </span>
                                  )}
                                </div>

                                {attempt.recording_url && (
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Call Recording Available (128 kbps stereo)</span>
                                  </div>
                                )}
                              </div>

                              {attempt.ai_summary ? (
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Executive Summary</span>
                                    <p className="text-xs text-slate-800 dark:text-slate-200">{attempt.ai_summary}</p>
                                  </div>

                                  {attempt.transcript && (
                                    <div>
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Conversation Transcript</span>
                                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                                        {attempt.transcript}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  No AI transcription analysis generated for this call. Only connected calls with sufficient audio are processed.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
