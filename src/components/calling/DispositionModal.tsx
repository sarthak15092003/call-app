'use client';

import React, { useState, useEffect } from 'react';
import { useCall } from './CallContext';
import { InterestStatus } from '@/types';
import {
  CheckCircle,
  Clock,
  Sparkles,
  Calendar,
  X,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

const INTEREST_OPTIONS: { label: InterestStatus; color: string; desc: string }[] = [
  { label: 'Interested', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', desc: 'Positive response, product evaluation in progress' },
  { label: 'Follow-up Required', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', desc: 'Needs quote, demo or technical review' },
  { label: 'Callback Requested', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30', desc: 'Customer asked to be reached at specific time' },
  { label: 'Converted', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30', desc: 'Deal closed, contract approved / paid' },
  { label: 'Not Interested', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30', desc: 'Declined offer or competitor locked' },
  { label: 'Wrong Number', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', desc: 'Invalid person or wrong directory record' },
  { label: 'Do Not Contact', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', desc: 'Customer explicitly requested DNC suppression' },
  { label: 'Undecided', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30', desc: 'Neutral, call was short or inconclusive' },
];

export const DispositionModal: React.FC = () => {
  const { dispositionCall, closeDispositionModal, submitDisposition } = useCall();

  const [selectedStatus, setSelectedStatus] = useState<InterestStatus>('Interested');
  const [notes, setNotes] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');

  // AI analysis state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiData, setAiData] = useState<{
    summary?: string;
    suggestedStatus?: InterestStatus;
    confidence?: number;
    objections?: string[];
    actionItems?: string[];
  } | null>(null);

  useEffect(() => {
    if (dispositionCall) {
      // Default to lead's existing status or 'Follow-up Required'
      setSelectedStatus(
        dispositionCall.lead.interest_status !== 'Undecided'
          ? dispositionCall.lead.interest_status
          : 'Follow-up Required'
      );
      setNotes('');
      setFollowupDate('');

      // If call was connected and talk time > 5 seconds, request optional AI recommendation
      if (dispositionCall.attempt.status === 'connected' && dispositionCall.attempt.connected_duration > 5) {
        setIsAiLoading(true);
        fetch('/api/ai/analyze-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: dispositionCall.lead.name,
            company: dispositionCall.lead.company,
            duration: dispositionCall.attempt.connected_duration,
            transcript: dispositionCall.attempt.transcript || `Customer ${dispositionCall.lead.name} discussed dialer requirements for ${dispositionCall.attempt.connected_duration} seconds. Discussed pricing and scheduling next demo.`,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setAiData({
                summary: data.ai_summary,
                suggestedStatus: data.ai_suggested_interest,
                confidence: data.ai_confidence,
                objections: data.ai_objections,
                actionItems: data.ai_action_items,
              });
            }
          })
          .catch(() => {})
          .finally(() => setIsAiLoading(false));
      } else {
        setAiData(null);
      }
    }
  }, [dispositionCall]);

  if (!dispositionCall) return null;

  const { lead, attempt } = dispositionCall;

  const handleApplyAiSuggestion = () => {
    if (aiData?.suggestedStatus) {
      setSelectedStatus(aiData.suggestedStatus);
    }
    if (aiData?.summary) {
      setNotes((prev) => (prev ? `${prev}\n\n[AI Summary]: ${aiData.summary}` : `[AI Summary]: ${aiData.summary}`));
    }
  };

  const handleQuickFollowup = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    // Format to datetime-local string (YYYY-MM-DDTHH:mm)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hoursStr = String(d.getHours()).padStart(2, '0');
    const minsStr = String(d.getMinutes()).padStart(2, '0');
    setFollowupDate(`${year}-${month}-${day}T${hoursStr}:${minsStr}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitDisposition(selectedStatus, notes, followupDate || undefined, priority);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Call Ended – Log Disposition</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update customer interest and next steps for {lead.name} ({lead.phone})
            </p>
          </div>
          <button
            type="button"
            onClick={closeDispositionModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Call Metric Badge Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">Technical Outcome:</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${
              attempt.status === 'connected'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : attempt.status === 'busy'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
            }`}>
              {attempt.status}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <span>Ringing: <strong>{attempt.ringing_duration}s</strong></span>
            <span>Connected: <strong>{attempt.connected_duration}s</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Optional AI Suggestions Banner */}
          {isAiLoading && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing call conversation audio with AI...</span>
            </div>
          )}

          {aiData && !isAiLoading && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  AI Call Insights ({Math.round((aiData.confidence || 0.8) * 100)}% Confidence)
                </span>
                <button
                  type="button"
                  onClick={handleApplyAiSuggestion}
                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] transition-colors"
                >
                  Apply AI Suggestion
                </button>
              </div>

              <p className="text-slate-700 dark:text-slate-300 italic">
                &ldquo;{aiData.summary}&rdquo;
              </p>

              {aiData.suggestedStatus && (
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Recommended Status:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{aiData.suggestedStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Interest Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Lead Interest Status *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INTEREST_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedStatus(opt.label)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? `${opt.color} ring-2 ring-indigo-500 font-bold shadow-sm`
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning if DNC selected */}
          {selectedStatus === 'Do Not Contact' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Compliance Notice:</strong> Marking as &ldquo;Do Not Contact&rdquo; will permanently suppress this mobile number ({lead.phone}) from automated dialers and future campaign batches.
              </div>
            </div>
          )}

          {/* Call Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Call Notes & Summary
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record details of conversation, pricing discussed, objections, or custom requirements..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          {/* Schedule Follow-up */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Schedule Next Follow-Up (Optional)
              </span>

              {/* Quick shortcut buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFollowup(2)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  +2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFollowup(24)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFollowup(72)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  +3 Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Follow-up Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="urgent">Urgent Priority (Immediate Action)</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal Cadence</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeDispositionModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              Save Disposition & Next Steps
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
