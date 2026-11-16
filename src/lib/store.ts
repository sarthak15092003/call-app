'use client';

import { supabase } from '@/lib/supabase';
import {
  User,
  Lead,
  LeadImportBatch,
  CallAttempt,
  FollowUp,
  DailyReport,
  IntegrationSettings,
  AuditLog,
  LeadDisposition,
  CallStatus,
  InterestStatus,
} from '@/types';

// Production real user
export const INITIAL_USERS: User[] = [
  {
    id: 'usr_sarthak_1',
    name: 'Sarthak',
    email: 'sarthak@smartcall.com',
    role: 'admin',
    phone: '+918825250913',
    agent_ext: '101',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    is_active: true,
    created_at: '2026-11-16T00:00:00Z',
  },
];

export const INITIAL_BATCHES: LeadImportBatch[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_CALL_ATTEMPTS: CallAttempt[] = [];

export const INITIAL_FOLLOWUPS: FollowUp[] = [];

export const INITIAL_SETTINGS: IntegrationSettings = {
  telephony_provider: 'demo',
  exotel_account_sid: '',
  exotel_api_key: '',
  exotel_api_token: '',
  exotel_caller_id: '',
  myoperator_token: '',
  myoperator_company_id: '',
  myoperator_caller_id: '',
  webhook_secret: 'smartcall_wh_secret_2026',
  recording_enabled: true,
  transcription_enabled: true,
  ai_analysis_enabled: true,
  daily_report_time: '18:00',
  daily_report_emails: [],
  is_demo_mode: false,
  updated_at: new Date().toISOString(),
};

export const INITIAL_REPORTS: DailyReport[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_01',
    user_id: 'usr_admin_1',
    user_name: 'Rajesh Kumar',
    action: 'LEAD_IMPORT',
    entity_type: 'batch',
    entity_id: 'BATCH-20261114-01',
    details: 'Uploaded Q4_Enterprise_Retail_Leads.xlsx (14 leads imported, 1 invalid phone rejected)',
    ip_address: '103.21.124.8',
    created_at: '2026-11-14T08:35:00Z',
  },
  {
    id: 'aud_02',
    user_id: 'usr_agent_1',
    user_name: 'Priya Sharma',
    action: 'CLICK_TO_CALL',
    entity_type: 'lead',
    entity_id: 'lead_01',
    details: 'Initiated call to Ananya Deshmukh (+919820154321) via Exotel adapter',
    ip_address: '103.21.124.9',
    created_at: '2026-11-14T10:15:00Z',
  },
  {
    id: 'aud_03',
    user_id: 'usr_agent_2',
    user_name: 'Vikram Patel',
    action: 'LEAD_CONVERTED',
    entity_type: 'lead',
    entity_id: 'lead_05',
    details: 'Marked Meenakshi Iyer (Coromandel Retail Corp) as Converted (50-user Enterprise plan)',
    ip_address: '103.21.124.12',
    created_at: '2026-11-14T11:45:00Z',
  }
];

const STORAGE_KEYS = {
  USERS: 'smartcall_users',
  CURRENT_USER_ID: 'smartcall_current_user_id',
  LEADS: 'smartcall_leads',
  BATCHES: 'smartcall_batches',
  CALL_ATTEMPTS: 'smartcall_call_attempts',
  FOLLOWUPS: 'smartcall_followups',
  SETTINGS: 'smartcall_settings',
  REPORTS: 'smartcall_reports',
  AUDIT_LOGS: 'smartcall_audit_logs',
};

class CRMStore {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('smartcall_store_update', { detail: { key } }));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  // Current User / Role Switcher
  getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = this.getItem(STORAGE_KEYS.CURRENT_USER_ID, users[0]?.id || 'usr_sarthak_1');
    const user = users.find((u) => u.id === currentId) || users[0] || INITIAL_USERS[0];
    if (['Rajesh Kumar', 'Priya Sharma', 'Vikram Patel'].includes(user.name)) {
      return INITIAL_USERS[0];
    }
    return user;
  }

  setCurrentUser(userId: string): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  getUsers(): User[] {
    const raw = this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    const cleaned = raw.filter((u) => !['Rajesh Kumar', 'Priya Sharma', 'Vikram Patel'].includes(u.name));
    if (cleaned.length === 0) return INITIAL_USERS;
    return cleaned;
  }

  saveUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  // Leads
  getLeads(): Lead[] {
    const raw = this.getItem(STORAGE_KEYS.LEADS, INITIAL_LEADS);
    return raw.filter((l) => !l.batch_id?.startsWith('BATCH-20261114') && !l.id?.startsWith('lead_0') && !l.id?.startsWith('lead_1'));
  }

  saveLeads(leads: Lead[]): void {
    this.setItem(STORAGE_KEYS.LEADS, leads);
  }

  getLeadById(id: string): Lead | undefined {
    return this.getLeads().find((l) => l.id === id);
  }

  updateLead(leadId: string, updates: Partial<Lead>): Lead {
    const leads = this.getLeads();
    const idx = leads.findIndex((l) => l.id === leadId);
    if (idx === -1) throw new Error('Lead not found');
    const updated = {
      ...leads[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    leads[idx] = updated;
    this.saveLeads(leads);
    return updated;
  }

  addLeadsFromImport(newLeads: Lead[], batch: LeadImportBatch): void {
    const existingLeads = this.getLeads();
    const existingPhoneMap = new Map<string, Lead>();
    existingLeads.forEach((l) => existingPhoneMap.set(l.phone, l));

    // Preserve existing call histories when re-importing leads
    const mergedLeads = [...existingLeads];
    for (const lead of newLeads) {
      if (existingPhoneMap.has(lead.phone)) {
        // Lead already exists: preserve call history, update info
        const existing = existingPhoneMap.get(lead.phone)!;
        const targetIdx = mergedLeads.findIndex((l) => l.id === existing.id);
        if (targetIdx !== -1) {
          mergedLeads[targetIdx] = {
            ...existing,
            name: lead.name || existing.name,
            company: lead.company || existing.company,
            email: lead.email || existing.email,
            location: lead.location || existing.location,
            lead_source: lead.lead_source || existing.lead_source,
            assigned_agent_id: lead.assigned_agent_id || existing.assigned_agent_id,
            assigned_agent_name: lead.assigned_agent_name || existing.assigned_agent_name,
            remarks: lead.remarks ? `${existing.remarks} | ${lead.remarks}` : existing.remarks,
            batch_id: batch.id,
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        mergedLeads.unshift(lead);
      }
    }

    this.saveLeads(mergedLeads);

    // Save batch
    const batches = this.getBatches();
    this.saveBatches([batch, ...batches]);

    // Async sync to live Supabase PostgreSQL database
    const client = supabase;
    if (client) {
      const dbLeads = newLeads.map((l) => ({
        batch_id: batch.id,
        name: l.name,
        phone: l.phone,
        raw_phone: l.raw_phone,
        company: l.company || '',
        email: l.email || '',
        location: l.location || '',
        lead_source: l.lead_source || 'Import',
        remarks: l.remarks || '',
        interest_status: l.interest_status || 'Undecided',
        call_attempts_count: l.call_attempts_count || 0,
        total_connected_duration: l.total_connected_duration || 0,
      }));

      (async () => {
        try {
          await client.from('lead_import_batches').upsert({
            id: batch.id,
            file_name: batch.file_name,
            file_size: batch.file_size,
            total_rows: batch.total_rows,
            imported_count: batch.imported_count,
            invalid_count: batch.invalid_count,
            duplicate_count: batch.duplicate_count,
            status: batch.status,
          });
          await client.from('leads').insert(dbLeads);
        } catch (err) {
          console.warn('[Supabase Lead Sync Warning]', err);
        }
      })();
    }

    // Audit log
    this.logAudit({
      action: 'LEAD_IMPORT',
      entity_type: 'batch',
      entity_id: batch.id,
      details: `Imported ${batch.imported_count} leads from ${batch.file_name}. Duplicate: ${batch.duplicate_count}, Invalid: ${batch.invalid_count}.`,
    });
  }

  async syncFromSupabase(): Promise<void> {
    const client = supabase;
    if (!this.isBrowser() || !client) return;
    try {
      const { data: dbLeads, error } = await client.from('leads').select('*').order('created_at', { ascending: false });
      if (error || !dbLeads || dbLeads.length === 0) return;

      const local = this.getLeads();
      const localMap = new Map(local.map((l) => [l.phone, l]));

      const merged: Lead[] = dbLeads.map((d: any) => {
        const loc = localMap.get(d.phone);
        return {
          id: d.id,
          batch_id: d.batch_id || 'supabase',
          name: d.name,
          phone: d.phone,
          raw_phone: d.raw_phone || d.phone,
          company: d.company || '',
          email: d.email || '',
          location: d.location || '',
          lead_source: d.lead_source || 'Import',
          assigned_agent_id: d.assigned_agent_id || '',
          assigned_agent_name: 'Assigned',
          remarks: d.remarks || '',
          interest_status: (loc?.interest_status && loc.interest_status !== 'Undecided') ? loc.interest_status : (d.interest_status || 'Undecided'),
          call_attempts_count: Math.max(d.call_attempts_count || 0, loc?.call_attempts_count || 0),
          total_connected_duration: Math.max(d.total_connected_duration || 0, loc?.total_connected_duration || 0),
          last_call_at: d.last_call_at || loc?.last_call_at || null,
          last_call_status: d.last_call_status || loc?.last_call_status || 'never_called',
          next_followup_at: d.next_followup_at || loc?.next_followup_at || null,
          is_dnc: Boolean(d.is_dnc),
          created_at: d.created_at,
          updated_at: d.updated_at || d.created_at,
        };
      });

      this.saveLeads(merged);
    } catch (err) {
      console.warn('Sync from Supabase failed:', err);
    }
  }

  // Batches
  getBatches(): LeadImportBatch[] {
    const raw = this.getItem(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    return raw.filter((b) => !b.id?.startsWith('BATCH-20261114'));
  }

  saveBatches(batches: LeadImportBatch[]): void {
    this.setItem(STORAGE_KEYS.BATCHES, batches);
  }

  // Call Attempts
  getCallAttempts(): CallAttempt[] {
    const raw = this.getItem(STORAGE_KEYS.CALL_ATTEMPTS, INITIAL_CALL_ATTEMPTS);
    const nonMock = raw.filter((a) => !a.id?.startsWith('call_att_0'));
    
    // Deduplicate calls strictly by provider_call_id or phone + timestamp window
    const seen = new Set<string>();
    const deduplicated: CallAttempt[] = [];
    for (const a of nonMock) {
      const cleanPhone = (a.customer_number || '').replace(/\D/g, '').slice(-10);
      const timeSec = Math.round(new Date(a.start_time).getTime() / 15000); // 15s window
      const key = a.provider_call_id?.startsWith('call_sheet_')
        ? a.provider_call_id
        : `${cleanPhone}_${timeSec}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(a);
      }
    }
    return deduplicated;
  }

  saveCallAttempts(attempts: CallAttempt[]): void {
    this.setItem(STORAGE_KEYS.CALL_ATTEMPTS, attempts);
  }

  recordCallAttempt(attempt: CallAttempt): void {
    const attempts = this.getCallAttempts();
    this.saveCallAttempts([attempt, ...attempts]);

    // Update the lead's counters & last call status
    const lead = this.getLeadById(attempt.lead_id);
    if (lead) {
      const isConnected = attempt.status === 'connected';
      const updatedConnectedDuration = lead.total_connected_duration + (attempt.connected_duration || 0);

      this.updateLead(lead.id, {
        call_attempts_count: lead.call_attempts_count + 1,
        total_connected_duration: updatedConnectedDuration,
        last_call_at: attempt.start_time,
        last_call_status: attempt.status,
      });
    }

    this.logAudit({
      action: 'CALL_RECORDED',
      entity_type: 'call_attempt',
      entity_id: attempt.id,
      details: `Call attempt [${attempt.status}] to ${attempt.customer_name} (${attempt.customer_number}). Connected: ${attempt.connected_duration}s, Ringing: ${attempt.ringing_duration}s.`,
    });
  }

  updateCallAttempt(id: string, updates: Partial<CallAttempt>): CallAttempt {
    const attempts = this.getCallAttempts();
    const idx = attempts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Attempt not found');
    const updated = { ...attempts[idx], ...updates };
    attempts[idx] = updated;
    this.saveCallAttempts(attempts);
    return updated;
  }

  // Dispositions
  saveDisposition(disposition: Omit<LeadDisposition, 'id' | 'created_at'>): LeadDisposition {
    const newDisp: LeadDisposition = {
      ...disposition,
      id: `disp_${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    // Update lead interest status & remarks
    const lead = this.getLeadById(disposition.lead_id);
    if (lead) {
      const isDNC = disposition.interest_status === 'Do Not Contact';
      this.updateLead(lead.id, {
        interest_status: disposition.interest_status,
        remarks: disposition.notes ? `${lead.remarks} [Note]: ${disposition.notes}` : lead.remarks,
        next_followup_at: disposition.followup_date || lead.next_followup_at,
        is_dnc: isDNC,
      });

      // If follow-up date specified, create a FollowUp record
      if (disposition.followup_date) {
        this.addFollowUp({
          lead_id: lead.id,
          lead_name: lead.name,
          lead_phone: lead.phone,
          lead_company: lead.company,
          agent_id: disposition.agent_id,
          agent_name: disposition.agent_name,
          scheduled_at: disposition.followup_date,
          priority: disposition.followup_priority || 'normal',
          status: 'pending',
          notes: disposition.notes || 'Follow-up requested after call.',
        });
      }
    }

    this.logAudit({
      action: 'LEAD_DISPOSITION',
      entity_type: 'lead',
      entity_id: disposition.lead_id,
      details: `Interest status set to "${disposition.interest_status}" by ${disposition.agent_name}. Notes: ${disposition.notes || 'None'}`,
    });

    return newDisp;
  }

  // Follow-ups
  getFollowUps(): FollowUp[] {
    const raw = this.getItem(STORAGE_KEYS.FOLLOWUPS, INITIAL_FOLLOWUPS);
    return raw.filter((f) => !f.id?.startsWith('fup_0'));
  }

  saveFollowUps(followups: FollowUp[]): void {
    this.setItem(STORAGE_KEYS.FOLLOWUPS, followups);
  }

  addFollowUp(followup: Omit<FollowUp, 'id' | 'created_at'>): FollowUp {
    const list = this.getFollowUps();
    const created: FollowUp = {
      ...followup,
      id: `fup_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.saveFollowUps([created, ...list]);
    return created;
  }

  completeFollowUp(id: string): void {
    const list = this.getFollowUps();
    const idx = list.findIndex((f) => f.id === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
      this.saveFollowUps(list);
    }
  }

  // Daily Reports
  getReports(): DailyReport[] {
    const raw = this.getItem(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
    // Filter out obsolete reports that had inflated duplicate call counts (> 100 calls or demo id)
    return raw.filter((r) => !r.id.startsWith('rep_demo') && r.total_attempts < 500);
  }

  saveReports(reports: DailyReport[]): void {
    this.setItem(STORAGE_KEYS.REPORTS, reports);
  }

  generateDailyReport(dateStr: string = new Date().toISOString().slice(0, 10)): DailyReport {
    const leads = this.getLeads();
    const attempts = this.getCallAttempts();
    const users = this.getUsers().filter((u) => u.role === 'agent');
    const settings = this.getSettings();

    // Filter attempts for given date
    const dayAttempts = attempts.filter((a) => a.start_time.startsWith(dateStr));
    const connected = dayAttempts.filter((a) => a.status === 'connected');
    const unanswered = dayAttempts.filter((a) => a.status === 'no_answer');
    const busy = dayAttempts.filter((a) => a.status === 'busy');
    const failed = dayAttempts.filter((a) => a.status === 'failed' || a.status === 'cancelled');

    const totalTalkSec = connected.reduce((acc, c) => acc + (c.connected_duration || 0), 0);
    const avgTalkSec = connected.length > 0 ? Math.round(totalTalkSec / connected.length) : 0;

    const interested = leads.filter((l) => l.interest_status === 'Interested').length;
    const notInterested = leads.filter((l) => l.interest_status === 'Not Interested').length;
    const pendingFups = this.getFollowUps().filter((f) => f.status === 'pending').length;

    // Agent stats
    const agentStats = users.map((agent) => {
      const agLeads = leads.filter((l) => l.assigned_agent_id === agent.id);
      const agCalls = dayAttempts.filter((a) => a.agent_id === agent.id);
      const agConnected = agCalls.filter((a) => a.status === 'connected');
      const agTalkSec = agConnected.reduce((acc, c) => acc + (c.connected_duration || 0), 0);
      const conversions = agLeads.filter((l) => l.interest_status === 'Converted').length;
      const agInterested = agLeads.filter((l) => l.interest_status === 'Interested').length;
      const agNotInterested = agLeads.filter((l) => l.interest_status === 'Not Interested').length;
      const callbackReq = agLeads.filter((l) => l.interest_status === 'Callback Requested').length;

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        total_assigned: agLeads.length,
        call_attempts: agCalls.length,
        connected_calls: agConnected.length,
        total_duration_seconds: agTalkSec,
        conversions,
        interested: agInterested,
        not_interested: agNotInterested,
        callback_requested: callbackReq,
      };
    });

    const report: DailyReport = {
      id: `rep_${dateStr.replace(/-/g, '')}`,
      report_date: dateStr,
      generated_at: new Date().toISOString(),
      schedule_time: settings.daily_report_time,
      total_leads: leads.length,
      total_attempts: dayAttempts.length,
      connected_calls: connected.length,
      unanswered_calls: unanswered.length,
      busy_calls: busy.length,
      failed_calls: failed.length,
      total_talk_time_seconds: totalTalkSec,
      avg_talk_time_seconds: avgTalkSec,
      interested_count: interested,
      not_interested_count: notInterested,
      pending_followups: pendingFups,
      status: 'generated',
      email_recipients: settings.daily_report_emails,
      agent_stats: agentStats,
    };

    // Save and replace if date exists
    const existing = this.getReports().filter((r) => r.report_date !== dateStr);
    this.saveReports([report, ...existing]);

    this.logAudit({
      action: 'REPORT_GENERATED',
      entity_type: 'report',
      entity_id: report.id,
      details: `Generated daily report for ${dateStr}. Connected calls: ${connected.length}, Talk time: ${Math.round(totalTalkSec / 60)} min.`,
    });

    return report;
  }

  // Settings
  getSettings(): IntegrationSettings {
    return this.getItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  saveSettings(settings: IntegrationSettings): void {
    this.setItem(STORAGE_KEYS.SETTINGS, { ...settings, updated_at: new Date().toISOString() });
    this.logAudit({
      action: 'SETTINGS_UPDATED',
      entity_type: 'settings',
      entity_id: 'integration_settings',
      details: `Telephony provider set to ${settings.telephony_provider}. Demo mode: ${settings.is_demo_mode}`,
    });
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.getItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  logAudit(log: Omit<AuditLog, 'id' | 'user_id' | 'user_name' | 'ip_address' | 'created_at'>): void {
    const user = this.getCurrentUser();
    const newLog: AuditLog = {
      ...log,
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      user_id: user.id,
      user_name: user.name,
      ip_address: '103.21.124.9',
      created_at: new Date().toISOString(),
    };
    const logs = this.getAuditLogs();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs.slice(0, 99)]);
  }

  // Clean Data & Mobile Tracker Methods
  clearAllDemoData(): void {
    if (!this.isBrowser()) return;
    this.saveLeads([]);
    this.saveBatches([]);
    this.saveCallAttempts([]);
    this.saveFollowUps([]);
    this.saveReports([]);
    this.logAudit({
      action: 'DATA_CLEARED',
      entity_type: 'system',
      entity_id: 'clean_state',
      details: 'All demo leads, calls, batches and follow-ups were cleared. System is now running on 100% clean live data.',
    });
    window.location.reload();
  }

  isDemoModeActive(): boolean {
    const leads = this.getLeads();
    // If leads are empty or all leads have is_demo !== true
    return leads.some((l) => l.id.startsWith('lead_'));
  }

  // Handle call logs synced from Android Mobile App or Google Sheet
  syncMobileCallLog(log: {
    id?: string;
    customerNumber: string;
    customerName?: string;
    duration: number; // in seconds
    callType: 'OUTGOING' | 'INCOMING' | 'MISSED' | 'REJECTED';
    timestamp: string;
    agentId?: string;
    agentName?: string;
    notes?: string;
  }): { lead?: Lead; attempt: CallAttempt } {
    const leads = this.getLeads();
    const cleanCustomerNum = log.customerNumber.replace(/\D/g, '');
    const cleanLast10 = cleanCustomerNum.slice(-10);

    // 1. Prevent duplicate additions of identical call attempts
    const existingAttempts = this.getCallAttempts();
    const callAttemptId = log.id || `call_mob_${Date.parse(log.timestamp) || Date.now()}_${cleanCustomerNum.slice(-4)}`;
    const duplicate = existingAttempts.find((a) => a.id === callAttemptId || (
      a.customer_number.replace(/\D/g, '').endsWith(cleanLast10) &&
      Math.abs(new Date(a.start_time).getTime() - new Date(log.timestamp).getTime()) < 5000
    ));
    if (duplicate) {
      const matched = leads.find((l) => l.phone.replace(/\D/g, '').endsWith(cleanLast10));
      return { lead: matched, attempt: duplicate };
    }

    // 2. Find matching uploaded lead by phone (exact or last 10 digits)
    let lead = leads.find((l) => {
      const cleanLeadNum = l.phone.replace(/\D/g, '');
      return cleanLeadNum === cleanCustomerNum || 
             (cleanLast10.length >= 7 && cleanLeadNum.endsWith(cleanLast10));
    });

    const isConnected = log.duration > 0;
    const callStatus: CallStatus = isConnected 
      ? 'connected' 
      : (log.callType === 'MISSED' ? 'no_answer' : (log.callType === 'REJECTED' ? 'busy' : 'failed'));

    const agentName = log.agentName || 'sarthak\'s F16';
    const agent = log.agentId 
      ? this.getUsers().find((u) => u.id === log.agentId) || { id: 'usr_agent_1', name: agentName, phone: '' }
      : { id: 'usr_agent_1', name: agentName, phone: '' };

    // 3. If NO lead exists in the database for this number, auto-create a real Lead so it appears on Dashboard and Leads table
    if (!lead) {
      const newLead: Lead = {
        id: `lead_synced_${Date.now()}_${cleanCustomerNum.slice(-4)}`,
        batch_id: 'sheet_synced',
        name: (log.customerName && log.customerName !== 'Unknown' && log.customerName !== 'Caller')
          ? log.customerName
          : `Customer (${log.customerNumber})`,
        phone: log.customerNumber,
        raw_phone: cleanCustomerNum,
        company: '',
        email: '',
        location: '',
        lead_source: 'Mobile Carrier Call',
        assigned_agent_id: agent.id,
        assigned_agent_name: agentName,
        remarks: `Logged via phone call sync (${log.callType})`,
        interest_status: 'Undecided',
        call_attempts_count: 1,
        total_connected_duration: log.duration,
        last_call_at: log.timestamp || new Date().toISOString(),
        last_call_status: callStatus,
        next_followup_at: null,
        is_dnc: false,
        created_at: log.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.saveLeads([newLead, ...leads]);
      lead = newLead;
    } else {
      // 4. If lead exists, update its counters and metrics!
      const bestName = (lead.name.startsWith('Customer (') || lead.name === 'Unknown') &&
                       log.customerName && log.customerName !== 'Unknown' && log.customerName !== 'Caller'
        ? log.customerName
        : lead.name;

      lead = this.updateLead(lead.id, {
        name: bestName,
        call_attempts_count: (lead.call_attempts_count || 0) + 1,
        total_connected_duration: (lead.total_connected_duration || 0) + log.duration,
        last_call_at: log.timestamp || new Date().toISOString(),
        last_call_status: callStatus,
      });
    }

    // 5. Create CallAttempt record
    const attempt: CallAttempt = {
      id: callAttemptId,
      lead_id: lead.id,
      customer_name: lead.name,
      customer_number: log.customerNumber,
      agent_id: agent.id,
      agent_name: agentName,
      agent_number: agent.phone || '',
      provider: 'mobile_sim',
      provider_call_id: callAttemptId,
      status: callStatus,
      start_time: log.timestamp || new Date().toISOString(),
      end_time: new Date(new Date(log.timestamp || Date.now()).getTime() + log.duration * 1000).toISOString(),
      ringing_duration: 0,
      connected_duration: log.duration,
      is_demo: false,
      created_at: new Date().toISOString(),
    };

    this.saveCallAttempts([attempt, ...existingAttempts]);

    this.logAudit({
      action: 'MOBILE_CALL_SYNCED',
      entity_type: 'call',
      entity_id: attempt.id,
      details: `Mobile SIM call synced for ${log.customerNumber}. Duration: ${log.duration}s, Status: ${callStatus}, Agent: ${agentName}`,
    });

    return { lead, attempt };
  }

  // Direct sync that strictly mirrors the Google Sheet data & dynamic agents
  syncAllSheetCalls(sheetCalls: any[]): void {
    if (!Array.isArray(sheetCalls) || sheetCalls.length === 0) return;

    // 1. Convert sheet calls to CallAttempt objects
    const newAttempts: CallAttempt[] = sheetCalls.map((sc, idx) => {
      const isConnected = sc.duration > 0;
      const callStatus: CallStatus = isConnected 
        ? 'connected' 
        : (sc.callType === 'MISSED' ? 'no_answer' : (sc.callType === 'REJECTED' ? 'busy' : 'failed'));

      const agentName = String(sc.agentName || '').trim() || 'Agent';
      const agentId = sc.agentId || ('usr_' + agentName.toLowerCase().replace(/[^a-z0-9]/g, '_'));

      const parsedDate = new Date(sc.timestamp);
      const isoTime = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : sc.timestamp;

      return {
        id: sc.id || `call_sheet_${Date.parse(sc.timestamp) || Date.now()}_${idx}`,
        lead_id: `lead_${(sc.customerNumber || '').replace(/\D/g, '').slice(-10)}`,
        customer_name: sc.customerName || 'Customer',
        customer_number: sc.customerNumber,
        agent_id: agentId,
        agent_name: agentName,
        agent_number: '',
        provider: 'mobile_sim',
        provider_call_id: sc.id || `sheet_${idx}`,
        status: callStatus,
        start_time: isoTime,
        end_time: isoTime,
        ringing_duration: 0,
        connected_duration: sc.duration || 0,
        is_demo: false,
        created_at: isoTime,
      };
    });

    // Save attempts strictly matching the sheet
    this.saveCallAttempts(newAttempts);

    // 2. Extract dynamic agents from the sheet (e.g. "sarthak's F16")
    const uniqueAgents = new Map<string, string>();
    sheetCalls.forEach((sc) => {
      const name = String(sc.agentName || '').trim();
      if (name && name !== 'Agent') {
        const id = sc.agentId || ('usr_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
        uniqueAgents.set(id, name);
      }
    });

    if (uniqueAgents.size > 0) {
      const updatedUsers: User[] = Array.from(uniqueAgents.entries()).map(([id, name], idx) => ({
        id,
        name,
        email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@smartcall.com`,
        role: idx === 0 ? 'admin' : 'agent',
        phone: '',
        agent_ext: String(101 + idx),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: new Date().toISOString(),
      }));

      this.saveUsers(updatedUsers);
      const currentUser = this.getCurrentUser();
      if (!updatedUsers.some((u) => u.id === currentUser.id)) {
        this.setCurrentUser(updatedUsers[0].id);
      }
    }

    // 3. Update or auto-create Leads matching numbers from the sheet
    const currentLeads = this.getLeads();
    const leadsMap = new Map<string, Lead>();
    currentLeads.forEach((l) => {
      const cleanPhone = l.phone.replace(/\D/g, '').slice(-10);
      leadsMap.set(cleanPhone, l);
    });

    const callsByPhone = new Map<string, any[]>();
    sheetCalls.forEach((sc) => {
      const cleanPhone = String(sc.customerNumber || '').replace(/\D/g, '').slice(-10);
      if (!callsByPhone.has(cleanPhone)) callsByPhone.set(cleanPhone, []);
      callsByPhone.get(cleanPhone)!.push(sc);
    });

    callsByPhone.forEach((calls, phone) => {
      const totalDur = calls.reduce((s, c) => s + (c.duration || 0), 0);
      const latestCall = calls[calls.length - 1];
      const callerName = calls.find((c) => c.customerName && c.customerName !== 'Unknown' && !c.customerName.startsWith('Customer ('))?.customerName || latestCall.customerName || `Customer (${latestCall.customerNumber})`;
      const agentName = String(latestCall.agentName || '').trim() || 'Agent';
      const agentId = latestCall.agentId || ('usr_' + agentName.toLowerCase().replace(/[^a-z0-9]/g, '_'));

      if (leadsMap.has(phone)) {
        const existing = leadsMap.get(phone)!;
        leadsMap.set(phone, {
          ...existing,
          name: (existing.name.startsWith('Customer (') || existing.name === 'Unknown') ? callerName : existing.name,
          call_attempts_count: calls.length,
          total_connected_duration: totalDur,
          last_call_at: latestCall.timestamp,
          last_call_status: latestCall.status,
          assigned_agent_name: agentName,
          assigned_agent_id: agentId,
        });
      } else {
        leadsMap.set(phone, {
          id: `lead_${phone}`,
          batch_id: 'sheet_synced',
          name: callerName,
          phone: latestCall.customerNumber,
          raw_phone: phone,
          company: '',
          email: '',
          location: '',
          lead_source: 'Google Sheet Sync',
          assigned_agent_id: agentId,
          assigned_agent_name: agentName,
          remarks: 'Auto-synced from Google Sheet',
          interest_status: 'Undecided',
          call_attempts_count: calls.length,
          total_connected_duration: totalDur,
          last_call_at: latestCall.timestamp,
          last_call_status: latestCall.status,
          next_followup_at: null,
          is_dnc: false,
          created_at: latestCall.timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    this.saveLeads(Array.from(leadsMap.values()));
  }

  resetToDemoData(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(STORAGE_KEYS.LEADS);
    localStorage.removeItem(STORAGE_KEYS.BATCHES);
    localStorage.removeItem(STORAGE_KEYS.CALL_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.FOLLOWUPS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    window.location.reload();
  }
}

export const crmStore = new CRMStore();

