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
} from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    const list = crmStore.getReports();
    setReports(list);
    if (list.length > 0 && !selectedReport) {
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Automated Evening Performance Reporting
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated 6:00 PM IST daily call ledger, agent performance summaries, PDF exports & executive email dispatches
          </p>
        </div>

        {/* Generate / Send Now Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateToday}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isGenerating ? 'Generating...' : 'Compile Today\'s Report'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendNowEmail}
            disabled={isSendingEmail || !selectedReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingEmail ? 'Dispatching...' : 'Send Now (Email)'}</span>
          </button>
        </div>
      </div>

      {emailSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{emailSuccessMsg}</span>
          </div>
          <button onClick={() => setEmailSuccessMsg(null)}>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Report View Card */}
      {selectedReport && (
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
                Generated at {new Date(selectedReport.generated_at).toLocaleString()} • Dispatched to {selectedReport.email_recipients.join(', ')}
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
                      onClick={() => setSelectedReport(rep)}
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
