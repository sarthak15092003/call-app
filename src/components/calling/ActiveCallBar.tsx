'use client';

import React, { useState } from 'react';
import { useCall } from './CallContext';
import { Phone, PhoneOff, PhoneCall, Volume2, VolumeX, AlertCircle, Clock, Zap, ShieldCheck } from 'lucide-react';

export const ActiveCallBar: React.FC = () => {
  const {
    activeCall,
    endCall,
    simulateAnswer,
    simulateBusy,
    simulateNoAnswer,
    simulateFailed,
  } = useCall();

  const [isMuted, setIsMuted] = useState(false);

  if (!activeCall) return null;

  const { lead, status, ringingDuration, connectedDuration, attempt } = activeCall;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl rounded-2xl p-4 text-white">
        {/* Top banner: Telephony status info */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              {status === 'initiated' && 'Telephony Gateway: Connecting Agent & Customer...'}
              {status === 'ringing' && `Ringing Customer Handset (${formatTimer(ringingDuration)})`}
              {status === 'connected' && 'Live Connected Call Active'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Zap className="w-3 h-3 text-amber-400" />
              {attempt.is_demo ? 'Telephony Demo Sandbox' : `Provider: ${attempt.provider.toUpperCase()}`}
            </span>
            <span className="text-xs text-slate-400">
              Call ID: <span className="font-mono text-slate-300">{attempt.provider_call_id.slice(-8)}</span>
            </span>
          </div>
        </div>

        {/* Middle: Customer details and live talk timer */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status === 'connected' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' : 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40'
            }`}>
              {status === 'connected' ? (
                <PhoneCall className="w-6 h-6 animate-pulse" />
              ) : (
                <Phone className="w-6 h-6 animate-bounce" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base text-white">{lead.name}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {lead.company || 'Enterprise'}
                </span>
              </div>
              <p className="text-sm font-mono text-indigo-300">{lead.phone}</p>
            </div>
          </div>

          {/* Conversation speech wave & Live Timer */}
          <div className="flex items-center gap-6 self-end md:self-auto">
            {status === 'connected' && (
              <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="flex items-center gap-1 h-6">
                  <span className="w-1 bg-emerald-400 rounded-full animate-call-wave-1"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-call-wave-2"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-call-wave-3"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-call-wave-4"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-call-wave-5"></span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Talk Time</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">
                    {formatTimer(connectedDuration)}
                  </div>
                </div>
              </div>
            )}

            {status === 'ringing' && (
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <div className="text-sm font-mono text-amber-300">
                  Ringing: {formatTimer(ringingDuration)}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isMuted
                    ? 'bg-red-500/20 border-red-500 text-red-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={endCall}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Telephony Simulator Control Toolbar (when in demo mode) */}
        {attempt.is_demo && status === 'ringing' && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Telephony Simulation Controls:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={simulateAnswer}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Customer Answers (Connect)
              </button>
              <button
                type="button"
                onClick={simulateBusy}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                Customer Busy
              </button>
              <button
                type="button"
                onClick={simulateNoAnswer}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              >
                No Answer (Timeout)
              </button>
              <button
                type="button"
                onClick={simulateFailed}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-900/80 hover:bg-rose-800 text-rose-200 transition-colors"
              >
                Network Failed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

