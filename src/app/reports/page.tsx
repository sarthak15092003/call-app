'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { DailyReport, CallAttempt, Lead } from '@/types';
import { generateDailyReportPDF, generateDailyReportExcel } from '@/lib/reports';
import {
  BarChart3,
  Download,
  Mail,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Users,
  Shield,
  Layers,
  Search,
  Filter,
  PhoneCall,
  Table,
} from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [callAttempts, setCallAttempts] = useState<CallAttempt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  // Search & Filter for Consolidated Excel Ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'excel_ledger' | 'daily_summary'>('excel_ledger');

  const loadData = () => {
    const attempts = crmStore.getCallAttempts();
    setCallAttempts(attempts);

    // Always regenerate/refresh today's report based on the real deduplicated call attempts
    if (attempts.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      crmStore.generateDailyReport(today);
    }

    const list = crmStore.getReports();
    setReports(list);
    if (list.length > 0) {
      setSelectedReport(list[0]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  const handleGenerateToday = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const rep = crmStore.generateDailyReport(new Date().toISOString().slice(0, 10));
      setSelectedReport(rep);
      setIsGenerating(false);
    }, 600);
  };

  const handleDownloadPDF = () => {
    if (!selectedReport) return;
    const calls = crmStore.getCallAttempts();
    const blob = generateDailyReportPDF(selectedReport, calls);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartCall_Daily_Report_${selectedReport.report_date}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    if (!selectedReport) return;
    const calls = crmStore.getCallAttempts();
    const leads = crmStore.getLeads();
    const blob = await generateDailyReportExcel(selectedReport, calls, leads);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartCall_Daily_Report_${selectedReport.report_date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadConsolidatedCSV = () => {
    if (callAttempts.length === 0) return;
    const headers = ['Row #', 'Date & Time', 'Customer Name', 'Phone Number', 'Duration (s)', 'Status', 'Agent Name', 'Call ID'];
    const rows = filteredAttempts.map((a, idx) => [
      idx + 1,
      `"${new Date(a.start_time).toLocaleString()}"`,
      `"${(a.customer_name || 'Customer').replace(/"/g, '""')}"`,
      `"${a.customer_number}"`,
      a.connected_duration || 0,
      `"${a.status}"`,
      `"${a.agent_name || "sarthak's F16"}"`,
      `"${a.id}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartCall_Consolidated_Call_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendNowEmail = async () => {
    if (!selectedReport) return;
    setIsSendingEmail(true);
    setEmailSuccessMsg(null);

    try {
      const res = await fetch('/api/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedReport.report_date,
          sendEmail: true,
          emails: selectedReport.email_recipients,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSuccessMsg(data.message);
        crmStore.logAudit({
          action: 'REPORT_EMAILED',
          entity_type: 'report',
          entity_id: selectedReport.id,
          details: `Dispatched daily PDF/Excel report to ${selectedReport.email_recipients.join(', ')}`,
        });
      }
    } catch (err: any) {
      alert(`Email dispatch failed: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filtered Calls for Consolidated Excel Table
  const filteredAttempts = callAttempts.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (a.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (a.customer_number || '').includes(q);
      const matchAgent = (a.agent_name || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchAgent) return false;
    }
    return true;
  });

  const totalFilteredCalls = filteredAttempts.length;
  const connectedFilteredCalls = filteredAttempts.filter((a) => a.status === 'connected');
  const totalFilteredDuration = connectedFilteredCalls.reduce((s, c) => s + (c.connected_duration || 0), 0);
  const avgFilteredDuration = connectedFilteredCalls.length > 0 ? Math.round(totalFilteredDuration / connectedFilteredCalls.length) : 0;
  const connectRate = totalFilteredCalls > 0 ? Math.round((connectedFilteredCalls.length / totalFilteredCalls) * 100) : 0;

  const formatDurationStr = (sec: number) => {
    if (!sec || sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Call Performance & Reports</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real carrier calls, live duration tracking, consolidated Excel ledger & PDF executive exports
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveView('excel_ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'excel_ledger'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Consolidated Excel View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('daily_summary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'daily_summary'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Executive Daily Summary</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerateToday}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
          >
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{isGenerating ? 'Compiling...' : 'Refresh Today'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CONSOLIDATED EXCEL SPREADSHEET VIEW */}
      {activeView === 'excel_ledger' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Spreadsheet Header Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Live Call Ledger (Excel Grid)
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {totalFilteredCalls} records synced
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Real time-synced carrier calls from Google Sheet with verified seconds duration
              </p>
            </div>

            {/* Quick KPI Formulas / Summary Banner */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5">
                <span className="text-slate-400">Total Calls:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{totalFilteredCalls}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5">
                <span className="text-slate-400">Connected:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{connectedFilteredCalls.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5">
                <span className="text-slate-400">Total Duration:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatDurationStr(totalFilteredDuration)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5">
                <span className="text-slate-400">Avg Duration:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{avgFilteredDuration}s</span>
              </div>

              {/* Export Buttons */}
              <button
                type="button"
                onClick={handleDownloadConsolidatedCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                title="Export full consolidated records as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone number or agent..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Statuses ({callAttempts.length})</option>
                <option value="connected">Connected Only</option>
                <option value="no_answer">No Answer / Missed</option>
                <option value="busy">Busy</option>
                <option value="failed">Failed / Cancelled</option>
              </select>
            </div>
          </div>

          {/* Excel Spreadsheet Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3.5 py-3 w-12 text-center bg-slate-200/60 dark:bg-slate-800/80">#</th>
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Call Status</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-sans">
                      No calls matching current filters. Real calls will appear here automatically as synced from Google Sheet.
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((call, idx) => {
                    const isConnected = call.status === 'connected';
                    return (
                      <tr
                        key={call.id || idx}
                        className={`hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-850/30'
                        }`}
                      >
                        <td className="px-3.5 py-3 text-center font-mono text-slate-400 bg-slate-50/80 dark:bg-slate-800/40 font-semibold text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                          {new Date(call.start_time).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {call.customer_name || 'Customer'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                          {call.customer_number}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatDurationStr(call.connected_duration || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isConnected
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : call.status === 'no_answer'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {call.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                          {call.agent_name || "sarthak's F16"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400 uppercase">
                          {call.provider || 'mobile_sim'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Excel Summary Total Row (Formula Bar Style) */}
              {filteredAttempts.length > 0 && (
                <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-mono font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <tr>
                    <td className="px-3.5 py-3 text-center text-slate-500 font-bold uppercase text-[11px]">TOTAL</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs font-sans">
                      {totalFilteredCalls} Calls Logged
                    </td>
                    <td className="px-4 py-3 text-indigo-600 font-sans">
                      {new Set(filteredAttempts.map((a) => a.customer_number)).size} Unique Contacts
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">--</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {formatDurationStr(totalFilteredDuration)}
                    </td>
                    <td className="px-4 py-3 text-xs font-sans text-emerald-600">
                      {connectRate}% Connected
                    </td>
                    <td className="px-4 py-3 text-xs font-sans text-slate-500">
                      sarthak's F16
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">--</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY SUMMARY CARD */}
      {activeView === 'daily_summary' && selectedReport && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header of Report Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Daily Closing Report
                </span>
                <span className="text-xs text-slate-400">Scheduled: {selectedReport.schedule_time} IST</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Report Date: {selectedReport.report_date}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generated at {new Date(selectedReport.generated_at).toLocaleString()} • Dispatched to {selectedReport.email_recipients.join(', ') || 'sarthak@smartcall.com'}
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-xs font-bold text-rose-700 dark:text-rose-300 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Grid in Report */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Leads</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedReport.total_leads}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Attempts</span>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{selectedReport.total_attempts}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Connected Calls</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{selectedReport.connected_calls}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Talk Time</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {Math.round(selectedReport.total_talk_time_seconds / 60)}m
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Talk / Call</span>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {selectedReport.avg_talk_time_seconds}s
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Interested Customers</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{selectedReport.interested_count}</div>
            </div>
          </div>

          {/* Agent-wise Performance Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Agent-wise Daily Calling Performance
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Agent Name</th>
                    <th className="px-4 py-3">Assigned Leads</th>
                    <th className="px-4 py-3">Calls Made</th>
                    <th className="px-4 py-3">Connected</th>
                    <th className="px-4 py-3">Total Talk Time</th>
                    <th className="px-4 py-3">Interested</th>
                    <th className="px-4 py-3">Callback Req.</th>
                    <th className="px-4 py-3">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedReport.agent_stats.map((ag) => (
                    <tr key={ag.agent_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {ag.agent_name}
                      </td>
                      <td className="px-4 py-3">{ag.total_assigned}</td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {ag.call_attempts}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {ag.connected_calls}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        {Math.round(ag.total_duration_seconds / 60)}m {ag.total_duration_seconds % 60}s
                      </td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{ag.interested}</td>
                      <td className="px-4 py-3 text-indigo-600">{ag.callback_requested}</td>
                      <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">
                        {ag.conversions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Historical Report Archive */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Historical Daily Report Archive</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Access past executive reports and spreadsheets</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{reports.length} Archived Days</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Report Date</th>
                <th className="px-4 py-3">Total Calls</th>
                <th className="px-4 py-3">Connected</th>
                <th className="px-4 py-3">Talk Time</th>
                <th className="px-4 py-3">Interested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reports.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                    {rep.report_date}
                  </td>
                  <td className="px-4 py-3 font-mono">{rep.total_attempts}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {rep.connected_calls}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {Math.round(rep.total_talk_time_seconds / 60)} mins
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {rep.interested_count}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {rep.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(rep);
                        setActiveView('daily_summary');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
