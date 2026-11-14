export type UserRole = 'admin' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  agent_ext: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
}

export type InterestStatus =
  | 'Interested'
  | 'Not Interested'
  | 'Follow-up Required'
  | 'Callback Requested'
  | 'Converted'
  | 'Wrong Number'
  | 'Do Not Contact'
  | 'Undecided';

export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'connected'
  | 'no_answer'
  | 'busy'
  | 'failed'
  | 'cancelled'
  | 'never_called';

export interface LeadImportBatch {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
  total_rows: number;
  imported_count: number;
  invalid_count: number;
  duplicate_count: number;
  status: 'completed' | 'processing' | 'failed';
  error_report?: {
    rowNumber: number;
    phone: string;
    name: string;
    reason: string;
    rawData: Record<string, any>;
  }[];
}

export interface Lead {
  id: string;
  batch_id: string;
  name: string;
  phone: string; // E.164 formatted
  raw_phone: string;
  company: string;
  email: string;
  location: string;
  lead_source: string;
  assigned_agent_id: string;
  assigned_agent_name: string;
  remarks: string;
  interest_status: InterestStatus;
  call_attempts_count: number;
  total_connected_duration: number; // in seconds
  last_call_at: string | null;
  last_call_status: CallStatus;
  next_followup_at: string | null;
  is_dnc: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallAttempt {
  id: string;
  lead_id: string;
  customer_name: string;
  customer_number: string;
  agent_id: string;
  agent_name: string;
  agent_number: string;
  provider: 'exotel' | 'myoperator' | 'demo' | 'mobile_sim';
  provider_call_id: string;
  status: CallStatus;
  start_time: string;
  ringing_start_time?: string;
  connected_start_time?: string;
  end_time?: string;
  ringing_duration: number; // seconds
  connected_duration: number; // seconds
  recording_url?: string;
  is_demo: boolean;
  created_at: string;
  // Optional AI analysis fields
  transcript?: string;
  ai_summary?: string;
  ai_suggested_interest?: InterestStatus;
  ai_confidence?: number;
  ai_objections?: string[];
  ai_action_items?: string[];
}

export interface CallEvent {
  id: string;
  call_attempt_id: string;
  event_type: string;
  provider_event_id: string;
  event_timestamp: string;
  payload: Record<string, any>;
  processed_at: string;
}

export interface LeadDisposition {
  id: string;
  lead_id: string;
  call_attempt_id?: string;
  agent_id: string;
  agent_name: string;
  interest_status: InterestStatus;
  notes: string;
  followup_date?: string;
  followup_priority?: 'urgent' | 'high' | 'normal' | 'low';
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  lead_company: string;
  agent_id: string;
  agent_name: string;
  scheduled_at: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  notes: string;
  completed_at?: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string; // YYYY-MM-DD
  generated_at: string;
  schedule_time: string;
  total_leads: number;
  total_attempts: number;
  connected_calls: number;
  unanswered_calls: number;
  busy_calls: number;
  failed_calls: number;
  total_talk_time_seconds: number;
  avg_talk_time_seconds: number;
  interested_count: number;
  not_interested_count: number;
  pending_followups: number;
  status: 'generated' | 'emailed';
  email_recipients: string[];
  agent_stats: {
    agent_id: string;
    agent_name: string;
    total_assigned: number;
    call_attempts: number;
    connected_calls: number;
    total_duration_seconds: number;
    conversions: number;
    interested: number;
    not_interested: number;
    callback_requested: number;
  }[];
}

export interface IntegrationSettings {
  telephony_provider: 'exotel' | 'myoperator' | 'demo' | 'mobile_sim';
  exotel_account_sid: string;
  exotel_api_key: string;
  exotel_api_token: string;
  exotel_caller_id: string;
  myoperator_token: string;
  myoperator_company_id: string;
  myoperator_caller_id: string;
  webhook_secret: string;
  recording_enabled: boolean;
  transcription_enabled: boolean;
  ai_analysis_enabled: boolean;
  daily_report_time: string; // e.g. "18:00"
  daily_report_emails: string[];
  is_demo_mode: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

