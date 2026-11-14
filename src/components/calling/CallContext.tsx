'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Lead, CallAttempt, CallStatus, InterestStatus } from '@/types';
import { crmStore } from '@/lib/store';

interface CallContextType {
  activeCall: {
    lead: Lead;
    attempt: CallAttempt;
    status: CallStatus;
    ringingDuration: number;
    connectedDuration: number;
  } | null;
  dispositionCall: {
    lead: Lead;
    attempt: CallAttempt;
  } | null;
  startCall: (lead: Lead) => Promise<void>;
  endCall: () => void;
  simulateAnswer: () => void;
  simulateBusy: () => void;
  simulateNoAnswer: () => void;
  simulateFailed: () => void;
  closeDispositionModal: () => void;
  submitDisposition: (status: InterestStatus, notes: string, followupDate?: string, priority?: 'urgent' | 'high' | 'normal' | 'low') => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCall, setActiveCall] = useState<CallContextType['activeCall']>(null);
  const [dispositionCall, setDispositionCall] = useState<CallContextType['dispositionCall']>(null);

  const ringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSimTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (ringTimerRef.current) clearInterval(ringTimerRef.current);
      if (connectTimerRef.current) clearInterval(connectTimerRef.current);
      if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
    };
  }, []);

  const startCall = async (lead: Lead) => {
    if (lead.is_dnc) {
      alert('This customer is on the Do Not Contact (DNC) list. Outbound calls are prohibited.');
      return;
    }

    const currentUser = crmStore.getCurrentUser();
    const settings = crmStore.getSettings();

    // Browser click alone is NEVER counted as completed call!
    // Initialize call attempt in 'initiated' status
    const newAttempt: CallAttempt = {
      id: `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lead_id: lead.id,
      customer_name: lead.name,
      customer_number: lead.phone,
      agent_id: currentUser.id,
      agent_name: currentUser.name,
      agent_number: currentUser.phone,
      provider: settings.is_demo_mode ? 'demo' : settings.telephony_provider,
      provider_call_id: `${settings.is_demo_mode ? 'DEMO' : settings.telephony_provider.toUpperCase()}-${Date.now()}`,
      status: 'initiated',
      start_time: new Date().toISOString(),
      ringing_duration: 0,
      connected_duration: 0,
      is_demo: settings.is_demo_mode,
      created_at: new Date().toISOString(),
    };

    setActiveCall({
      lead,
      attempt: newAttempt,
      status: 'initiated',
      ringingDuration: 0,
      connectedDuration: 0,
    });

    // In demo mode or live, transition to ringing after 1 second
    setTimeout(() => {
      setActiveCall((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'ringing',
          attempt: {
            ...prev.attempt,
            status: 'ringing',
            ringing_start_time: new Date().toISOString(),
          },
        };
      });

      // Start ringing timer
      ringTimerRef.current = setInterval(() => {
        setActiveCall((prev) => {
          if (!prev || prev.status !== 'ringing') return prev;
          return {
            ...prev,
            ringingDuration: prev.ringingDuration + 1,
          };
        });
      }, 1000);

      // In demo mode, automatically simulate customer answering after 5 seconds if not clicked manually
      if (settings.is_demo_mode) {
        autoSimTimerRef.current = setTimeout(() => {
          simulateAnswer();
        }, 5000);
      }
    }, 1200);
  };

  const simulateAnswer = () => {
    if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
    if (ringTimerRef.current) clearInterval(ringTimerRef.current);

    setActiveCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'connected',
        attempt: {
          ...prev.attempt,
          status: 'connected',
          connected_start_time: new Date().toISOString(),
          ringing_duration: prev.ringingDuration,
        },
      };
    });

    // Start connected conversation timer
    connectTimerRef.current = setInterval(() => {
      setActiveCall((prev) => {
        if (!prev || prev.status !== 'connected') return prev;
        return {
          ...prev,
          connectedDuration: prev.connectedDuration + 1,
        };
      });
    }, 1000);
  };

  const simulateBusy = () => {
    finishCallWithStatus('busy');
  };

  const simulateNoAnswer = () => {
    finishCallWithStatus('no_answer');
  };

  const simulateFailed = () => {
    finishCallWithStatus('failed');
  };

  const endCall = () => {
    finishCallWithStatus('connected');
  };

  const finishCallWithStatus = (finalStatus: CallStatus) => {
    if (autoSimTimerRef.current) clearTimeout(autoSimTimerRef.current);
    if (ringTimerRef.current) clearInterval(ringTimerRef.current);
    if (connectTimerRef.current) clearInterval(connectTimerRef.current);

    if (!activeCall) return;

    const completedAttempt: CallAttempt = {
      ...activeCall.attempt,
      status: finalStatus,
      end_time: new Date().toISOString(),
      ringing_duration: activeCall.ringingDuration,
      connected_duration: finalStatus === 'connected' ? activeCall.connectedDuration : 0,
      recording_url:
        finalStatus === 'connected'
          ? 'https://smartcall-demo.s3.amazonaws.com/recordings/sample_demo.mp3'
          : undefined,
    };

    // Record the call attempt in store
    crmStore.recordCallAttempt(completedAttempt);

    // Save for disposition modal
    setDispositionCall({
      lead: activeCall.lead,
      attempt: completedAttempt,
    });

    setActiveCall(null);
  };

  const closeDispositionModal = () => {
    setDispositionCall(null);
  };

  const submitDisposition = (
    status: InterestStatus,
    notes: string,
    followupDate?: string,
    priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal'
  ) => {
    if (!dispositionCall) return;
    const currentUser = crmStore.getCurrentUser();

    crmStore.saveDisposition({
      lead_id: dispositionCall.lead.id,
      call_attempt_id: dispositionCall.attempt.id,
      agent_id: currentUser.id,
      agent_name: currentUser.name,
      interest_status: status,
      notes,
      followup_date: followupDate,
      followup_priority: priority,
    });

    setDispositionCall(null);
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        dispositionCall,
        startCall,
        endCall,
        simulateAnswer,
        simulateBusy,
        simulateNoAnswer,
        simulateFailed,
        closeDispositionModal,
        submitDisposition,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
