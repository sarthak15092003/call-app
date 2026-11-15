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

// Demo initial users
export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@smartcall.com',
    role: 'admin',
    phone: '+919820012345',
    agent_ext: '100',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    is_active: true,
    created_at: '2026-10-01T09:00:00Z',
  },
  {
    id: 'usr_agent_1',
    name: 'Priya Sharma',
    email: 'priya.sharma@smartcall.com',
    role: 'agent',
    phone: '+919811122334',
    agent_ext: '101',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    is_active: true,
    created_at: '2026-10-05T09:00:00Z',
  },
  {
    id: 'usr_agent_2',
    name: 'Vikram Patel',
    email: 'vikram.patel@smartcall.com',
    role: 'agent',
    phone: '+919833344556',
    agent_ext: '102',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    is_active: true,
    created_at: '2026-10-10T09:00:00Z',
  },
];

export const INITIAL_BATCHES: LeadImportBatch[] = [
  {
    id: 'BATCH-20261114-01',
    file_name: 'Q4_Enterprise_Retail_Leads.xlsx',
    file_size: 148200,
    uploaded_by: 'usr_admin_1',
    uploaded_by_name: 'Rajesh Kumar',
    uploaded_at: '2026-11-14T08:30:00Z',
    total_rows: 15,
    imported_count: 14,
    invalid_count: 1,
    duplicate_count: 0,
    status: 'completed',
    error_report: [
      {
        rowNumber: 7,
        name: 'Amitabh Sen',
        phone: '9820-ABC-12',
        reason: 'Contains non-numeric characters in phone number',
        rawData: { 'Customer Name': 'Amitabh Sen', 'Mobile Number': '9820-ABC-12', 'Company Name': 'Sen FinTech' }
      }
    ]
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_01',
    batch_id: 'BATCH-20261114-01',
    name: 'Ananya Deshmukh',
    phone: '+919820154321',
    raw_phone: '9820154321',
    company: 'Nexus Tech Labs',
    email: 'ananya@nexustech.io',
    location: 'Mumbai, Maharashtra',
    lead_source: 'LinkedIn Campaign',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'Looking for 25-seat automated outbound calling dialer.',
    interest_status: 'Interested',
    call_attempts_count: 2,
    total_connected_duration: 324,
    last_call_at: '2026-11-14T10:15:00Z',
    last_call_status: 'connected',
    next_followup_at: '2026-11-14T16:00:00Z',
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T10:20:00Z',
  },
  {
    id: 'lead_02',
    batch_id: 'BATCH-20261114-01',
    name: 'Karthik Raman',
    phone: '+919845012345',
    raw_phone: '09845012345',
    company: 'Skyline Logistics Solutions',
    email: 'karthik@skylinelogistics.in',
    location: 'Bengaluru, Karnataka',
    lead_source: 'Website Inbound',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'Needs Exotel integration for dispatch tracking.',
    interest_status: 'Follow-up Required',
    call_attempts_count: 1,
    total_connected_duration: 180,
    last_call_at: '2026-11-14T11:00:00Z',
    last_call_status: 'connected',
    next_followup_at: '2026-11-14T15:30:00Z',
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T11:05:00Z',
  },
  {
    id: 'lead_03',
    batch_id: 'BATCH-20261114-01',
    name: 'Rohan Mehra',
    phone: '+919988776655',
    raw_phone: '+91 99887 76655',
    company: 'Apex Cloud Solutions',
    email: 'rohan.mehra@apexcloud.co',
    location: 'Gurugram, NCR',
    lead_source: 'Google Ads',
    assigned_agent_id: 'usr_agent_2',
    assigned_agent_name: 'Vikram Patel',
    remarks: 'Currently evaluating between MyOperator and SmartCall CRM.',
    interest_status: 'Callback Requested',
    call_attempts_count: 3,
    total_connected_duration: 410,
    last_call_at: '2026-11-14T09:40:00Z',
    last_call_status: 'connected',
    next_followup_at: '2026-11-15T11:00:00Z',
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T09:45:00Z',
  },
  {
    id: 'lead_04',
    batch_id: 'BATCH-20261114-01',
    name: 'Suresh Varma',
    phone: '+919701234567',
    raw_phone: '9701234567',
    company: 'Varma Global Exports',
    email: 'suresh@varmaglobal.com',
    location: 'Hyderabad, Telangana',
    lead_source: 'Trade Fair 2026',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'Lead answered once, then phone went busy on second try.',
    interest_status: 'Undecided',
    call_attempts_count: 2,
    total_connected_duration: 45,
    last_call_at: '2026-11-14T10:45:00Z',
    last_call_status: 'busy',
    next_followup_at: null,
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T10:46:00Z',
  },
  {
    id: 'lead_05',
    batch_id: 'BATCH-20261114-01',
    name: 'Meenakshi Iyer',
    phone: '+919444123456',
    raw_phone: '+91 94441 23456',
    company: 'Coromandel Retail Corp',
    email: 'meenakshi@coromandel.in',
    location: 'Chennai, Tamil Nadu',
    lead_source: 'Referral',
    assigned_agent_id: 'usr_agent_2',
    assigned_agent_name: 'Vikram Patel',
    remarks: 'Approved budget. Enterprise package demo scheduled.',
    interest_status: 'Converted',
    call_attempts_count: 4,
    total_connected_duration: 890,
    last_call_at: '2026-11-14T11:30:00Z',
    last_call_status: 'connected',
    next_followup_at: null,
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T11:45:00Z',
  },
  {
    id: 'lead_06',
    batch_id: 'BATCH-20261114-01',
    name: 'Devendra Singhal',
    phone: '+919829012345',
    raw_phone: '9829012345',
    company: 'Singhal Steels & Alloys',
    email: 'devendra@singhalsteels.com',
    location: 'Jaipur, Rajasthan',
    lead_source: 'IndiaMART Lead',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'Ringing timeout, no answer after 45 seconds.',
    interest_status: 'Undecided',
    call_attempts_count: 1,
    total_connected_duration: 0,
    last_call_at: '2026-11-14T09:15:00Z',
    last_call_status: 'no_answer',
    next_followup_at: null,
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T09:16:00Z',
  },
  {
    id: 'lead_07',
    batch_id: 'BATCH-20261114-01',
    name: 'Pooja Chawla',
    phone: '+919810098765',
    raw_phone: '9810098765',
    company: 'Glamour House Retail',
    email: 'pooja@glamourhouse.com',
    location: 'New Delhi, Delhi',
    lead_source: 'Meta Instagram Ads',
    assigned_agent_id: 'usr_agent_2',
    assigned_agent_name: 'Vikram Patel',
    remarks: 'Customer requested never to call again. Marked as DNC.',
    interest_status: 'Do Not Contact',
    call_attempts_count: 1,
    total_connected_duration: 40,
    last_call_at: '2026-11-14T10:05:00Z',
    last_call_status: 'connected',
    next_followup_at: null,
    is_dnc: true,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T10:07:00Z',
  },
  {
    id: 'lead_08',
    batch_id: 'BATCH-20261114-01',
    name: 'Tanvi Saxena',
    phone: '+919920045678',
    raw_phone: '9920045678',
    company: 'FinEdge Advisory',
    email: 'tanvi.s@finedge.in',
    location: 'Pune, Maharashtra',
    lead_source: 'Cold Outreach',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'New lead uploaded this morning. Not dialed yet.',
    interest_status: 'Undecided',
    call_attempts_count: 0,
    total_connected_duration: 0,
    last_call_at: null,
    last_call_status: 'never_called',
    next_followup_at: null,
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T08:35:00Z',
  },
  {
    id: 'lead_09',
    batch_id: 'BATCH-20261114-01',
    name: 'Arjun Nambiar',
    phone: '+919847055443',
    raw_phone: '9847055443',
    company: 'Malabar Spices & Co',
    email: 'arjun@malabarspices.com',
    location: 'Kochi, Kerala',
    lead_source: 'Website Form',
    assigned_agent_id: 'usr_agent_2',
    assigned_agent_name: 'Vikram Patel',
    remarks: 'Requested pricing quotation for 5-agent team.',
    interest_status: 'Interested',
    call_attempts_count: 1,
    total_connected_duration: 210,
    last_call_at: '2026-11-14T11:10:00Z',
    last_call_status: 'connected',
    next_followup_at: '2026-11-16T10:00:00Z',
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T11:15:00Z',
  },
  {
    id: 'lead_10',
    batch_id: 'BATCH-20261114-01',
    name: 'Sameer Qureshi',
    phone: '+919890123987',
    raw_phone: '9890123987',
    company: 'Qureshi Automotive Services',
    email: 'sameer@qureshiauto.in',
    location: 'Nagpur, Maharashtra',
    lead_source: 'Local Directory',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'Not interested at this time, existing vendor contract running until Dec.',
    interest_status: 'Not Interested',
    call_attempts_count: 1,
    total_connected_duration: 75,
    last_call_at: '2026-11-14T09:30:00Z',
    last_call_status: 'connected',
    next_followup_at: null,
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T09:32:00Z',
  },
  {
    id: 'lead_11',
    batch_id: 'BATCH-20261114-01',
    name: 'Farhan Zaidi',
    phone: '+919955443322',
    raw_phone: '9955443322',
    company: 'Al-Hasan Trading FZE',
    email: 'farhan@alhasantrading.ae',
    location: 'Dubai / Mumbai',
    lead_source: 'Inbound WhatsApp',
    assigned_agent_id: 'usr_agent_2',
    assigned_agent_name: 'Vikram Patel',
    remarks: 'Wants international calling support with recording.',
    interest_status: 'Follow-up Required',
    call_attempts_count: 2,
    total_connected_duration: 290,
    last_call_at: '2026-11-14T11:50:00Z',
    last_call_status: 'connected',
    next_followup_at: '2026-11-14T17:00:00Z',
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T11:55:00Z',
  },
  {
    id: 'lead_12',
    batch_id: 'BATCH-20261114-01',
    name: 'Bhavna Kulkarni',
    phone: '+919860112233',
    raw_phone: '9860112233',
    company: 'Sahyadri Agro Foods',
    email: 'bhavna@sahyadriagro.in',
    location: 'Nashik, Maharashtra',
    lead_source: 'AgriExpo 2026',
    assigned_agent_id: 'usr_agent_1',
    assigned_agent_name: 'Priya Sharma',
    remarks: 'Pending first morning call.',
    interest_status: 'Undecided',
    call_attempts_count: 0,
    total_connected_duration: 0,
    last_call_at: null,
    last_call_status: 'never_called',
    next_followup_at: null,
    is_dnc: false,
    created_at: '2026-11-14T08:35:00Z',
    updated_at: '2026-11-14T08:35:00Z',
  }
];

export const INITIAL_CALL_ATTEMPTS: CallAttempt[] = [
  {
    id: 'call_att_01',
    lead_id: 'lead_01',
    customer_name: 'Ananya Deshmukh',
    customer_number: '+919820154321',
    agent_id: 'usr_agent_1',
    agent_name: 'Priya Sharma',
    agent_number: '+919811122334',
    provider: 'exotel',
    provider_call_id: 'EXO-LIVE-8921829',
    status: 'connected',
    start_time: '2026-11-14T10:15:00Z',
    ringing_start_time: '2026-11-14T10:15:04Z',
    connected_start_time: '2026-11-14T10:15:18Z',
    end_time: '2026-11-14T10:20:42Z',
    ringing_duration: 14,
    connected_duration: 324,
    recording_url: 'https://smartcall-demo.s3.amazonaws.com/recordings/call_01.mp3',
    is_demo: false,
    created_at: '2026-11-14T10:15:00Z',
    transcript: "Agent: Hello Ananya, calling from SmartCall CRM regarding your inquiry on outbound dialers. Customer: Hi Priya, yes! We have 25 agents spending too much time manual dialing. Does your system have automatic call metric logging and Exotel integration? Agent: Absolutely, we support click-to-call, live duration tracking, and automatic evening reports. Customer: That's great, let's connect again at 4 PM with my tech lead.",
    ai_summary: "Customer confirmed high need for 25-seat automated outbound calling dialer. Expressed strong interest in Exotel integration & evening reports. Requested technical follow-up call at 4:00 PM today.",
    ai_suggested_interest: 'Interested',
    ai_confidence: 0.94,
    ai_objections: ['Wants assurance on Exotel API webhook reliability'],
    ai_action_items: ['Send technical architecture PDF', 'Join 4 PM demo with Tech Lead'],
  },
  {
    id: 'call_att_02',
    lead_id: 'lead_02',
    customer_name: 'Karthik Raman',
    customer_number: '+919845012345',
    agent_id: 'usr_agent_1',
    agent_name: 'Priya Sharma',
    agent_number: '+919811122334',
    provider: 'myoperator',
    provider_call_id: 'MYOP-8829104',
    status: 'connected',
    start_time: '2026-11-14T11:00:00Z',
    ringing_start_time: '2026-11-14T11:00:05Z',
    connected_start_time: '2026-11-14T11:00:15Z',
    end_time: '2026-11-14T11:03:15Z',
    ringing_duration: 10,
    connected_duration: 180,
    recording_url: 'https://smartcall-demo.s3.amazonaws.com/recordings/call_02.mp3',
    is_demo: false,
    created_at: '2026-11-14T11:00:00Z',
    transcript: "Agent: Good morning Karthik, this is Priya from SmartCall. Customer: Hello, yes I checked your website. We need driver dispatch telephony alerts. What is the per-minute rate? Agent: Our provider adapter supports your direct Exotel or MyOperator account with zero markup. Customer: Excellent. Please call me back at 3:30 PM after my logistics standup.",
    ai_summary: "Customer interested in dispatch telephony alerts without call rate markup. Follow-up agreed for 3:30 PM IST.",
    ai_suggested_interest: 'Follow-up Required',
    ai_confidence: 0.88,
    ai_objections: ['Rate comparison with traditional PBX'],
    ai_action_items: ['Confirm zero markup telecom pass-through model', 'Call back at 3:30 PM'],
  },
  {
    id: 'call_att_03',
    lead_id: 'lead_04',
    customer_name: 'Suresh Varma',
    customer_number: '+919701234567',
    agent_id: 'usr_agent_1',
    agent_name: 'Priya Sharma',
    agent_number: '+919811122334',
    provider: 'demo',
    provider_call_id: 'DEMO-CALL-332194',
    status: 'busy',
    start_time: '2026-11-14T10:45:00Z',
    ringing_start_time: '2026-11-14T10:45:03Z',
    connected_start_time: undefined,
    end_time: '2026-11-14T10:45:15Z',
    ringing_duration: 12,
    connected_duration: 0,
    is_demo: true,
    created_at: '2026-11-14T10:45:00Z',
  },
  {
    id: 'call_att_04',
    lead_id: 'lead_06',
    customer_name: 'Devendra Singhal',
    customer_number: '+919829012345',
    agent_id: 'usr_agent_1',
    agent_name: 'Priya Sharma',
    agent_number: '+919811122334',
    provider: 'demo',
    provider_call_id: 'DEMO-CALL-442109',
    status: 'no_answer',
    start_time: '2026-11-14T09:15:00Z',
    ringing_start_time: '2026-11-14T09:15:03Z',
    connected_start_time: undefined,
    end_time: '2026-11-14T09:15:48Z',
    ringing_duration: 45,
    connected_duration: 0,
    is_demo: true,
    created_at: '2026-11-14T09:15:00Z',
  },
  {
    id: 'call_att_05',
    lead_id: 'lead_05',
    customer_name: 'Meenakshi Iyer',
    customer_number: '+919444123456',
    agent_id: 'usr_agent_2',
    agent_name: 'Vikram Patel',
    agent_number: '+919833344556',
    provider: 'exotel',
    provider_call_id: 'EXO-LIVE-9012485',
    status: 'connected',
    start_time: '2026-11-14T11:30:00Z',
    ringing_start_time: '2026-11-14T11:30:04Z',
    connected_start_time: '2026-11-14T11:30:14Z',
    end_time: '2026-11-14T11:45:04Z',
    ringing_duration: 10,
    connected_duration: 890,
    recording_url: 'https://smartcall-demo.s3.amazonaws.com/recordings/call_05.mp3',
    is_demo: false,
    created_at: '2026-11-14T11:30:00Z',
    transcript: "Agent: Hello Ms. Iyer, following up on our proposal. Customer: Hi Vikram! Our executive committee reviewed the pricing and approved the 50-user Enterprise contract. We want to start onboarding on Monday! Agent: Fantastic news! I am sending over the MSA and digital onboarding link right now.",
    ai_summary: "Deal successfully closed! Executive committee approved 50-user enterprise contract with onboarding scheduled for Monday.",
    ai_suggested_interest: 'Converted',
    ai_confidence: 0.98,
    ai_objections: [],
    ai_action_items: ['Send Master Services Agreement', 'Trigger onboarding credentials'],
  }
];

export const INITIAL_FOLLOWUPS: FollowUp[] = [
  {
    id: 'fup_01',
    lead_id: 'lead_01',
    lead_name: 'Ananya Deshmukh',
    lead_phone: '+919820154321',
    lead_company: 'Nexus Tech Labs',
    agent_id: 'usr_agent_1',
    agent_name: 'Priya Sharma',
    scheduled_at: '2026-11-14T16:00:00Z',
    priority: 'urgent',
    status: 'pending',
    notes: 'Conference call with Tech Lead & Ananya regarding Exotel webhook and CRM setup.',
    created_at: '2026-11-14T10:20:00Z',
  },
  {
    id: 'fup_02',
    lead_id: 'lead_02',
    lead_name: 'Karthik Raman',
    lead_phone: '+919845012345',
    lead_company: 'Skyline Logistics Solutions',
    agent_id: 'usr_agent_1',
    agent_name: 'Priya Sharma',
    scheduled_at: '2026-11-14T15:30:00Z',
    priority: 'high',
    status: 'pending',
    notes: 'Discuss per-minute zero-markup telecom model and dispatch API.',
    created_at: '2026-11-14T11:05:00Z',
  },
  {
    id: 'fup_03',
    lead_id: 'lead_11',
    lead_name: 'Farhan Zaidi',
    lead_phone: '+919955443322',
    lead_company: 'Al-Hasan Trading FZE',
    agent_id: 'usr_agent_2',
    agent_name: 'Vikram Patel',
    scheduled_at: '2026-11-14T17:00:00Z',
    priority: 'high',
    status: 'pending',
    notes: 'Verify international DID support and call recording consent banner.',
    created_at: '2026-11-14T11:55:00Z',
  },
  {
    id: 'fup_04',
    lead_id: 'lead_03',
    lead_name: 'Rohan Mehra',
    lead_phone: '+919988776655',
    lead_company: 'Apex Cloud Solutions',
    agent_id: 'usr_agent_2',
    agent_name: 'Vikram Patel',
    scheduled_at: '2026-11-15T11:00:00Z',
    priority: 'normal',
    status: 'pending',
    notes: 'Second demo showing comparison matrix with MyOperator.',
    created_at: '2026-11-14T09:45:00Z',
  },
  {
    id: 'fup_05',
    lead_id: 'lead_09',
    lead_name: 'Arjun Nambiar',
    lead_phone: '+919847055443',
    lead_company: 'Malabar Spices & Co',
    agent_id: 'usr_agent_2',
    agent_name: 'Vikram Patel',
    scheduled_at: '2026-11-16T10:00:00Z',
    priority: 'normal',
    status: 'pending',
    notes: 'Deliver 5-seat startup plan quotation.',
    created_at: '2026-11-14T11:15:00Z',
  }
];

export const INITIAL_SETTINGS: IntegrationSettings = {
  telephony_provider: 'demo',
  exotel_account_sid: 'exotel_subdomain_demo_sid',
  exotel_api_key: 'exo_key_98a72b0c4d',
  exotel_api_token: 'exo_tok_d83e1c2b5f',
  exotel_caller_id: '08047190000',
  myoperator_token: 'myop_auth_tok_88192a',
  myoperator_company_id: 'myop_comp_7721',
  myoperator_caller_id: '01149200000',
  webhook_secret: 'smartcall_wh_secret_2026',
  recording_enabled: true,
  transcription_enabled: true,
  ai_analysis_enabled: true,
  daily_report_time: '18:00',
  daily_report_emails: ['sales-ops@smartcall.com', 'director@smartcall.com'],
  is_demo_mode: true,
  updated_at: '2026-11-14T08:00:00Z',
};

export const INITIAL_REPORTS: DailyReport[] = [
  {
    id: 'rep_20261113',
    report_date: '2026-11-13',
    generated_at: '2026-11-13T18:00:00Z',
    schedule_time: '18:00',
    total_leads: 18,
    total_attempts: 24,
    connected_calls: 16,
    unanswered_calls: 5,
    busy_calls: 2,
    failed_calls: 1,
    total_talk_time_seconds: 3420,
    avg_talk_time_seconds: 213,
    interested_count: 5,
    not_interested_count: 3,
    pending_followups: 4,
    status: 'emailed',
    email_recipients: ['sales-ops@smartcall.com', 'director@smartcall.com'],
    agent_stats: [
      {
        agent_id: 'usr_agent_1',
        agent_name: 'Priya Sharma',
        total_assigned: 10,
        call_attempts: 14,
        connected_calls: 10,
        total_duration_seconds: 2100,
        conversions: 1,
        interested: 3,
        not_interested: 2,
        callback_requested: 2,
      },
      {
        agent_id: 'usr_agent_2',
        agent_name: 'Vikram Patel',
        total_assigned: 8,
        call_attempts: 10,
        connected_calls: 6,
        total_duration_seconds: 1320,
        conversions: 0,
        interested: 2,
        not_interested: 1,
        callback_requested: 1,
      }
    ]
  }
];

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
    const currentId = this.getItem(STORAGE_KEYS.CURRENT_USER_ID, users[0]?.id || 'usr_admin_1');
    return users.find((u) => u.id === currentId) || users[0] || INITIAL_USERS[0];
  }

  setCurrentUser(userId: string): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  getUsers(): User[] {
    return this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  saveUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  // Leads
  getLeads(): Lead[] {
    return this.getItem(STORAGE_KEYS.LEADS, INITIAL_LEADS);
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
    return this.getItem(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  }

  saveBatches(batches: LeadImportBatch[]): void {
    this.setItem(STORAGE_KEYS.BATCHES, batches);
  }

  // Call Attempts
  getCallAttempts(): CallAttempt[] {
    return this.getItem(STORAGE_KEYS.CALL_ATTEMPTS, INITIAL_CALL_ATTEMPTS);
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
    return this.getItem(STORAGE_KEYS.FOLLOWUPS, INITIAL_FOLLOWUPS);
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
    return this.getItem(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
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

  // Handle call logs synced from Android Mobile App
  syncMobileCallLog(log: {
    customerNumber: string;
    duration: number; // in seconds
    callType: 'OUTGOING' | 'INCOMING' | 'MISSED' | 'REJECTED';
    timestamp: string;
    agentId?: string;
    agentName?: string;
    notes?: string;
  }): { lead?: Lead; attempt: CallAttempt } {
    const leads = this.getLeads();
    const cleanCustomerNum = log.customerNumber.replace(/\D/g, '');
    
    // Find lead by exact phone or last 10 digits
    const lead = leads.find((l) => {
      const cleanLeadNum = l.phone.replace(/\D/g, '');
      return cleanLeadNum === cleanCustomerNum || 
             (cleanCustomerNum.length >= 10 && cleanLeadNum.endsWith(cleanCustomerNum.slice(-10)));
    });

    const isConnected = log.duration > 0;
    const callStatus: CallStatus = isConnected 
      ? 'connected' 
      : (log.callType === 'MISSED' ? 'no_answer' : (log.callType === 'REJECTED' ? 'busy' : 'failed'));

    const agent = log.agentId 
      ? this.getUsers().find((u) => u.id === log.agentId) || this.getCurrentUser()
      : this.getCurrentUser();

    // Create CallAttempt record
    const attempt: CallAttempt = {
      id: `call_mob_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lead_id: lead ? lead.id : 'unknown',
      customer_name: lead ? lead.name : `Customer (${log.customerNumber})`,
      customer_number: log.customerNumber,
      agent_id: agent.id,
      agent_name: agent.name,
      agent_number: agent.phone,
      provider: 'mobile_sim',
      provider_call_id: `mob_${Date.now()}`,
      status: callStatus,
      start_time: log.timestamp || new Date().toISOString(),
      end_time: new Date(new Date(log.timestamp || Date.now()).getTime() + log.duration * 1000).toISOString(),
      ringing_duration: 0,
      connected_duration: log.duration,
      is_demo: false,
      created_at: new Date().toISOString(),
    };

    this.saveCallAttempts([attempt, ...this.getCallAttempts()]);

    // If lead matched, update counters
    let updatedLead: Lead | undefined;
    if (lead) {
      updatedLead = this.updateLead(lead.id, {
        call_attempts_count: lead.call_attempts_count + 1,
        total_connected_duration: lead.total_connected_duration + log.duration,
        last_call_at: attempt.start_time,
        last_call_status: attempt.status,
      });
    }

    this.logAudit({
      action: 'MOBILE_CALL_SYNCED',
      entity_type: 'call',
      entity_id: attempt.id,
      details: `Mobile SIM call synced for ${log.customerNumber}. Duration: ${log.duration}s, Status: ${callStatus}, Agent: ${agent.name}`,
    });

    return { lead: updatedLead, attempt };
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

