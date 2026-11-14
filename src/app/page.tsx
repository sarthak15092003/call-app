'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { Lead, CallAttempt, LeadImportBatch, User } from '@/types';
import { useCall } from '@/components/calling/CallContext';
import {
  Users,
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Calendar,
  Filter,
  UserCheck,
  Zap,
  ArrowUpRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import Link from 'next/link';
import { LeadDetailsModal } from '@/components/leads/LeadDetailsModal';

const STATUS_COLORS: Record<string, string> = {
  Interested: '#10b981', // emerald-500
  'Follow-up Required': '#6366f1', // indigo-500
  'Callback Requested': '#0284c7', // sky-600
  Converted: '#a855f7', // purple-500
  'Not Interested': '#f43f5e', // rose-500
  'Wrong Number': '#f59e0b', // amber-500
  'Do Not Contact': '#ef4444', // red-500
  Undecided: '#94a3b8', // slate-400
};

export default function DashboardPage() {
  const { startCall } = useCall();
  const [currentUser, setCurrentUser] = useState<User>(crmStore.getCurrentUser());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);
  const [batches, setBatches] = useState<LeadImportBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedLeadModalId, setSelectedLeadModalId] = useState<string | null>(null);

  const loadData = () => {
    setCurrentUser(crmStore.getCurrentUser());
    setLeads(crmStore.getLeads());
    setAttempts(crmStore.getCallAttempts());
    setBatches(crmStore.getBatches());
    setUsers(crmStore.getUsers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    if (selectedAgent !== 'all' && l.assigned_agent_id !== selectedAgent) return false;
    if (selectedBatch !== 'all' && l.batch_id !== selectedBatch) return false;
    return true;
  });

  // Filtered Call Attempts
  const filteredAttempts = attempts.filter((a) => {
    if (selectedAgent !== 'all' && a.agent_id !== selectedAgent) return false;
    if (dateFilter !== 'all') {
      const today = new Date().toISOString().slice(0, 10);
      if (dateFilter === 'today' && !a.start_time.startsWith(today)) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalLeadsUploaded = filteredLeads.length;
  const totalCallAttempts = filteredAttempts.length;

  const attemptedLeadIds = new Set(filteredAttempts.map((a) => a.lead_id));
  const uniqueLeadsAttempted = attemptedLeadIds.size;
  const pendingLeads = filteredLeads.filter((l) => l.call_attempts_count === 0).length;

  const connectedCalls = filteredAttempts.filter((a) => a.status === 'connected');
  const unansweredCalls = filteredAttempts.filter((a) => a.status === 'no_answer');
  const busyCalls = filteredAttempts.filter((a) => a.status === 'busy');
  const failedCalls = filteredAttempts.filter((a) => a.status === 'failed' || a.status === 'cancelled');

  const totalConnectedSeconds = connectedCalls.reduce((sum, a) => sum + (a.connected_duration || 0), 0);
  const avgConnectedDuration = connectedCalls.length > 0 ? Math.round(totalConnectedSeconds / connectedCalls.length) : 0;

  const interestedLeads = filteredLeads.filter((l) => l.interest_status === 'Interested').length;
  const notInterestedLeads = filteredLeads.filter((l) => l.interest_status === 'Not Interested').length;
  const followUpRequiredLeads = filteredLeads.filter((l) => l.interest_status === 'Follow-up Required' || l.interest_status === 'Callback Requested').length;
  const convertedLeads = filteredLeads.filter((l) => l.interest_status === 'Converted').length;

  const connectedRate = totalCallAttempts > 0 ? ((connectedCalls.length / totalCallAttempts) * 100).toFixed(1) : '0';
  const conversionRate = totalLeadsUploaded > 0 ? ((convertedLeads / totalLeadsUploaded) * 100).toFixed(1) : '0';

  // Format Talk Time
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${s}s`;
  };

  // Hourly Call Activity Chart Data
  const hourlyData = [
    { hour: '09:00', attempts: 3, connected: 2 },
    { hour: '10:00', attempts: 7, connected: 5 },
    { hour: '11:00', attempts: 9, connected: 6 },
    { hour: '12:00', attempts: 4, connected: 2 },
    { hour: '13:00', attempts: 2, connected: 1 },
    { hour: '14:00', attempts: 6, connected: 4 },
    { hour: '15:00', attempts: 8, connected: 6 },
    { hour: '16:00', attempts: 5, connected: 4 },
    { hour: '17:00', attempts: 3, connected: 2 },
  ];

  // Daily Trend Data (7 days)
  const dailyTrendData = [
    { day: 'Mon', calls: 32, connected: 22, interested: 7 },
    { day: 'Tue', calls: 45, connected: 31, interested: 11 },
    { day: 'Wed', calls: 38, connected: 25, interested: 8 },
    { day: 'Thu', calls: 52, connected: 39, interested: 14 },
    { day: 'Fri', calls: 48, connected: 34, interested: 12 },
    { day: 'Sat', calls: 18, connected: 12, interested: 4 },
    { day: 'Today', calls: totalCallAttempts, connected: connectedCalls.length, interested: interestedLeads },
  ];

  // Agent Performance Comparison Data
  const agentPerformanceData = users
    .filter((u) => u.role === 'agent')
    .map((agent) => {
      const agCalls = attempts.filter((a) => a.agent_id === agent.id);
      const agConnected = agCalls.filter((a) => a.status === 'connected');
      const agConversions = leads.filter((l) => l.assigned_agent_id === agent.id && l.interest_status === 'Converted').length;
      return {
        name: agent.name.split(' ')[0],
        attempts: agCalls.length,
        connected: agConnected.length,
        converted: agConversions,
      };
    });

  // Lead Status Distribution Data for Pie Chart
  const statusCounts: Record<string, number> = {};
  filteredLeads.forEach((l) => {
    statusCounts[l.interest_status] = (statusCounts[l.interest_status] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      {/* Page Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Executive Telephony Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time outbound call tracking, connected conversation metrics, and lead conversions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs shadow-sm">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Calling Agents</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="dark:bg-slate-900">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs shadow-sm">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Upload Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {b.id} ({b.file_name.slice(0, 16)}...)
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Time History</option>
              <option value="today">Today Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (14 Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Total Leads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Leads</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">{totalLeadsUploaded}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Uploaded in CRM</div>
        </div>

        {/* Call Attempts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Attempts</span>
            <PhoneCall className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">{totalCallAttempts}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Distinct attempts</div>
        </div>

        {/* Connected Calls */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Connected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{connectedCalls.length}</div>
          <div className="text-[10px] text-emerald-600/80 font-medium mt-0.5">{connectedRate}% connect rate</div>
        </div>

        {/* Unanswered */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Unanswered</span>
            <PhoneMissed className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">{unansweredCalls.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Rings timed out</div>
        </div>

        {/* Busy */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Line Busy</span>
            <PhoneForwarded className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{busyCalls.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Customer busy tone</div>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Failed / Cancel</span>
            <Zap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1.5">{failedCalls.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Network errors</div>
        </div>

        {/* Pending Leads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Pending Leads</span>
            <Clock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-xl font-bold text-violet-600 dark:text-violet-400 mt-1.5">{pendingLeads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Zero attempts yet</div>
        </div>

        {/* Total Talk Time */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Talk Time</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">{formatTime(totalConnectedSeconds)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{totalConnectedSeconds}s total speech</div>
        </div>

        {/* Avg Talk Time */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Avg Talk Time</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">{avgConnectedDuration}s</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Per connected call</div>
        </div>

        {/* Interested Leads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Interested</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{interestedLeads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Qualified prospects</div>
        </div>

        {/* Not Interested */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Not Interested</span>
            <Shield className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">{notInterestedLeads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Declined offer</div>
        </div>

        {/* Follow-up Required */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Follow-up Req.</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">{followUpRequiredLeads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Next touch scheduled</div>
        </div>

        {/* Connected Rate % */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Connect Rate</span>
            <Percent className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1.5">{connectedRate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Telephony pickup</div>
        </div>

        {/* Conversion Rate % */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Conversion %</span>
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1.5">{conversionRate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{convertedLeads} deals closed</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Call Activity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hourly Call Activity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total attempts vs answered conversation calls</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Peak: 11:00 AM
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="attempts" name="Call Attempts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="connected" name="Connected Answered" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Calling Trend */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daily Calling Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">7-day outbound volume and qualified interest</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="calls" name="Total Calls" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="connected" name="Connected" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="interested" name="Interested Leads" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Performance Comparison */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Agent Performance Comparison</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Attempts, connected talk, and conversions per agent</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="attempts" name="Calls Attempted" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="connected" name="Connected Calls" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Converted Deals" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Status Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Lead Status Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current disposition breakdown across all leads</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Calling Activity Live Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Calling Activity</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live stream of telephony events and recorded outcomes</p>
          </div>
          <Link
            href="/call-history"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View All Call History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Call Status</th>
                <th className="px-4 py-3">Ringing / Talk Duration</th>
                <th className="px-4 py-3">Provider Route</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredAttempts.slice(0, 6).map((attempt) => (
                <tr key={attempt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {attempt.customer_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400">
                    {attempt.customer_number}
                  </td>
                  <td className="px-4 py-3">
                    {attempt.agent_name}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{attempt.connected_duration}s talk</span>
                    <span className="text-slate-400"> / {attempt.ringing_duration}s ring</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {attempt.is_demo ? 'Demo Sandbox' : attempt.provider.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(attempt.start_time).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadModalId(attempt.lead_id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Lead Modal */}
      <LeadDetailsModal
        leadId={selectedLeadModalId}
        onClose={() => setSelectedLeadModalId(null)}
        onUpdated={loadData}
      />
    </div>
  );
}
