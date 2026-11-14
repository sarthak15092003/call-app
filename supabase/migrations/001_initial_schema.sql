-- SmartCall CRM - Supabase PostgreSQL Schema Migration
-- Database: PostgreSQL 15+ / Supabase

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Roles Enum & Users Table
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'agent',
  phone VARCHAR(50),
  agent_ext VARCHAR(20),
  avatar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lead Import Batches
CREATE TABLE IF NOT EXISTS lead_import_batches (
  id VARCHAR(64) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_rows INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  invalid_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  error_report JSONB DEFAULT '[]'::jsonb
);

-- 4. Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id VARCHAR(64) REFERENCES lead_import_batches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  raw_phone VARCHAR(50),
  company VARCHAR(255),
  email VARCHAR(255),
  location VARCHAR(255),
  lead_source VARCHAR(100),
  assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  interest_status VARCHAR(50) NOT NULL DEFAULT 'Undecided',
  call_attempts_count INT NOT NULL DEFAULT 0,
  total_connected_duration INT NOT NULL DEFAULT 0, -- in seconds
  last_call_at TIMESTAMPTZ,
  last_call_status VARCHAR(50) NOT NULL DEFAULT 'never_called',
  next_followup_at TIMESTAMPTZ,
  is_dnc BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_batch ON leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(interest_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_call ON leads(last_call_at);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(next_followup_at);

-- 5. Call Attempts
CREATE TABLE IF NOT EXISTS call_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'demo',
  provider_call_id VARCHAR(100) NOT NULL,
  customer_number VARCHAR(50) NOT NULL,
  agent_number VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ringing_start_time TIMESTAMPTZ,
  connected_start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  ringing_duration INT NOT NULL DEFAULT 0, -- in seconds
  connected_duration INT NOT NULL DEFAULT 0, -- in seconds
  recording_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  transcript TEXT,
  ai_summary TEXT,
  ai_suggested_interest VARCHAR(50),
  ai_confidence NUMERIC(4,2),
  ai_objections JSONB DEFAULT '[]'::jsonb,
  ai_action_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_attempts_lead ON call_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_agent ON call_attempts(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_provider_id ON call_attempts(provider_call_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_created_at ON call_attempts(created_at);

-- 6. Call Events (Raw Webhook & Lifecycle Stream)
CREATE TABLE IF NOT EXISTS call_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_attempt_id UUID REFERENCES call_attempts(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  provider_event_id VARCHAR(120),
  event_timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_events_attempt ON call_events(call_attempt_id);
CREATE INDEX IF NOT EXISTS idx_call_events_provider_event ON call_events(provider_event_id);

-- 7. Lead Dispositions
CREATE TABLE IF NOT EXISTS lead_dispositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  call_attempt_id UUID REFERENCES call_attempts(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_status VARCHAR(50) NOT NULL,
  notes TEXT,
  followup_date TIMESTAMPTZ,
  followup_priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispositions_lead ON lead_dispositions(lead_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_agent ON lead_dispositions(agent_id);

-- 8. Follow-ups Table
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_agent ON follow_ups(agent_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status);

-- 9. Daily Reports Table
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  schedule_time VARCHAR(10) NOT NULL DEFAULT '18:00',
  total_leads INT NOT NULL DEFAULT 0,
  total_attempts INT NOT NULL DEFAULT 0,
  connected_calls INT NOT NULL DEFAULT 0,
  unanswered_calls INT NOT NULL DEFAULT 0,
  busy_calls INT NOT NULL DEFAULT 0,
  failed_calls INT NOT NULL DEFAULT 0,
  total_talk_time_seconds INT NOT NULL DEFAULT 0,
  avg_talk_time_seconds INT NOT NULL DEFAULT 0,
  interested_count INT NOT NULL DEFAULT 0,
  not_interested_count INT NOT NULL DEFAULT 0,
  pending_followups INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'generated',
  email_recipients JSONB DEFAULT '[]'::jsonb,
  agent_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Integration & System Settings
CREATE TABLE IF NOT EXISTS integration_settings (
  id INT PRIMARY KEY DEFAULT 1,
  telephony_provider VARCHAR(50) NOT NULL DEFAULT 'demo',
  exotel_account_sid VARCHAR(255),
  exotel_api_key VARCHAR(255),
  exotel_api_token VARCHAR(255),
  exotel_caller_id VARCHAR(50),
  myoperator_token VARCHAR(255),
  myoperator_company_id VARCHAR(100),
  myoperator_caller_id VARCHAR(50),
  webhook_secret VARCHAR(255) NOT NULL DEFAULT 'smartcall_secret_key_demo',
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  transcription_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_analysis_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_report_time VARCHAR(10) NOT NULL DEFAULT '18:00',
  daily_report_emails JSONB DEFAULT '["sales-ops@smartcall.com", "director@smartcall.com"]'::jsonb,
  is_demo_mode BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Row Level Security (RLS) Setup
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_dispositions ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all tables
CREATE POLICY admin_all_leads ON leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Calling agents can view only leads assigned to them or unassigned
CREATE POLICY agent_assigned_leads ON leads FOR ALL TO authenticated
  USING (
    assigned_agent_id = auth.uid() OR
    assigned_agent_id IS NULL OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Calling agents can view only their own call attempts
CREATE POLICY agent_call_attempts ON call_attempts FOR ALL TO authenticated
  USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

