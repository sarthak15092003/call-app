'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { IntegrationSettings, AuditLog } from '@/types';
import {
  Settings,
  Phone,
  Radio,
  Key,
  Shield,
  Clock,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  History,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<IntegrationSettings>(crmStore.getSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedWh, setCopiedWh] = useState(false);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);

  useEffect(() => {
    setSettings(crmStore.getSettings());
    setAuditLogs(crmStore.getAuditLogs());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    crmStore.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTriggerTestWebhook = async () => {
    setTestWebhookStatus('Sending simulated provider webhook event...');
    try {
      const res = await fetch('/api/telephony/webhook?provider=' + settings.telephony_provider, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': settings.webhook_secret,
        },
        body: JSON.stringify({
          Status: 'completed',
          CallSid: `TEST-WEBHOOK-${Date.now()}`,
          Duration: 42,
          ConversationDuration: 35,
          From: '+919811122334',
          To: '+919820154321',
          RecordingUrl: 'https://smartcall-demo.s3.amazonaws.com/test_record.mp3',
        }),
      });
      const data = await res.json();
      setTestWebhookStatus(`Webhook verified and delivered successfully: ${data.message || 'OK'}`);
    } catch (err: any) {
      setTestWebhookStatus(`Webhook error: ${err.message}`);
    }
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/telephony/webhook` : '/api/telephony/webhook';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Settings & Telecom Integrations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure Exotel & MyOperator credentials, webhook signing secrets, reporting schedule, and privacy controls
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Settings Saved Successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Telephony Gateway Mode Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Telephony Provider Configuration
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                settings.is_demo_mode
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {settings.is_demo_mode ? 'Demo Sandbox Active' : 'Live Gateway Mode'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'demo', label: 'Demo Telephony Simulator', desc: 'Zero credentials required. High-fidelity call simulation with ringing & timers.' },
              { id: 'exotel', label: 'Exotel Telephony Gateway', desc: 'Direct outbound click-to-call API with call recording and Indian virtual numbers.' },
              { id: 'myoperator', label: 'MyOperator Cloud Call', desc: 'Enterprise PBX dialer with live agent tracking and webhook callbacks.' },
            ].map((prov) => {
              const isSelected = settings.telephony_provider === prov.id;
              return (
                <div
                  key={prov.id}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      telephony_provider: prov.id as any,
                      is_demo_mode: prov.id === 'demo',
                    })
                  }
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{prov.label}</span>
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => {}}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{prov.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Exotel Fields */}
          {settings.telephony_provider === 'exotel' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 pt-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Exotel API Credentials (Stored Securely on Server)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Account SID</label>
                  <input
                    type="text"
                    value={settings.exotel_account_sid}
                    onChange={(e) => setSettings({ ...settings, exotel_account_sid: e.target.value })}
                    placeholder="e.g. your_subdomain_sid"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Virtual Caller ID Number</label>
                  <input
                    type="text"
                    value={settings.exotel_caller_id}
                    onChange={(e) => setSettings({ ...settings, exotel_caller_id: e.target.value })}
                    placeholder="e.g. 08047190000"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">API Key</label>
                  <input
                    type="text"
                    value={settings.exotel_api_key}
                    onChange={(e) => setSettings({ ...settings, exotel_api_key: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">API Token</label>
                  <input
                    type="password"
                    value={settings.exotel_api_token}
                    onChange={(e) => setSettings({ ...settings, exotel_api_token: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MyOperator Fields */}
          {settings.telephony_provider === 'myoperator' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 pt-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                MyOperator API Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Company ID</label>
                  <input
                    type="text"
                    value={settings.myoperator_company_id}
                    onChange={(e) => setSettings({ ...settings, myoperator_company_id: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Bearer Token</label>
                  <input
                    type="password"
                    value={settings.myoperator_token}
                    onChange={(e) => setSettings({ ...settings, myoperator_token: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Virtual Caller ID</label>
                  <input
                    type="text"
                    value={settings.myoperator_caller_id}
                    onChange={(e) => setSettings({ ...settings, myoperator_caller_id: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Webhook Configuration & Secret */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                Telephony Webhook URL & Signature Verification
              </span>

              <button
                type="button"
                onClick={handleTriggerTestWebhook}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
              >
                Send Test Webhook Event
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                  Provider Callback URL (Paste in Exotel/MyOperator dashboard)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    readOnly
                    value={`${webhookUrl}?provider=${settings.telephony_provider}`}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-600 dark:text-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${webhookUrl}?provider=${settings.telephony_provider}`);
                      setCopiedWh(true);
                      setTimeout(() => setCopiedWh(false), 2000);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                {copiedWh && <span className="text-[10px] text-emerald-500 font-bold">Copied!</span>}
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                  Webhook Secret Key (HMAC SHA-256 Token)
                </label>
                <input
                  type="text"
                  value={settings.webhook_secret}
                  onChange={(e) => setSettings({ ...settings, webhook_secret: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            {testWebhookStatus && (
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {testWebhookStatus}
              </div>
            )}
          </div>
        </div>

        {/* Automated Evening Reporting Schedule */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Automated Evening Report Schedule
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Dispatch Time (India Standard Time) *
              </label>
              <input
                type="time"
                value={settings.daily_report_time}
                onChange={(e) => setSettings({ ...settings, daily_report_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default 18:00 (6:00 PM IST)</p>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Executive Email Recipients (Comma-separated)
              </label>
              <input
                type="text"
                value={settings.daily_report_emails.join(', ')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    daily_report_emails: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="sales-ops@company.com, director@company.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Compliance, AI & Privacy Controls */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Compliance, AI Analysis & Data Retention
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Call Audio Recording</span>
                <span className="text-[11px] text-slate-500">Record customer conversations through telephony gateway with consent</span>
              </div>
              <input
                type="checkbox"
                checked={settings.recording_enabled}
                onChange={(e) => setSettings({ ...settings, recording_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Speech Transcription</span>
                <span className="text-[11px] text-slate-500">Transcribe recorded audio into text transcripts</span>
              </div>
              <input
                type="checkbox"
                checked={settings.transcription_enabled}
                onChange={(e) => setSettings({ ...settings, transcription_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI Call Intelligence & Interest Suggestion
                </span>
                <span className="text-[11px] text-slate-500">
                  Generate conversation summaries, objection tags and confidence scores for agent review
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.ai_analysis_enabled}
                onChange={(e) => setSettings({ ...settings, ai_analysis_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save All Configurations</span>
          </button>
        </div>
      </form>

      {/* Security & Audit Logs Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              System Security & Operational Audit Log
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{auditLogs.length} Entries Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-3 py-2.5 rounded-l-lg">Timestamp</th>
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Details</th>
                <th className="px-3 py-2.5 text-right rounded-r-lg">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.slice(0, 8).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                    {log.user_name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-md truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 text-right text-[11px]">
                    {log.ip_address}
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
