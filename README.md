# SmartCall CRM – Automated Calling & Lead Tracking System

A complete, production-ready, responsive SaaS web application built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, **PostgreSQL (Supabase)**, **ExcelJS**, and **Recharts**.

Designed for high-velocity outbound calling, telesales teams, and sales operations managers.

---

## Key Features

1. **Morning Excel Upload Engine**:
   - Drag-and-drop support for `.xlsx`, `.xls`, and `.csv` files up to 50,000 rows.
   - Intelligent column mapping auto-detection (`Customer Name`, `Mobile Number`, `Company Name`, `Email`, `Location`, `Lead Source`, `Assigned Agent`, `Remarks`).
   - International dialing code validation (+91, +1, +44, etc.) preserving E.164 standardization.
   - Duplicate phone detection preserving past customer call histories.
   - Live pre-import validation table with row error reporting and downloadable rejection Excel.
   - Pre-loaded sample Excel test file generation with 1-click test upload.

2. **Telephony Provider Adapter (Exotel, MyOperator & Demo Simulator)**:
   - Server-side click-to-call API integration (`/api/telephony/call`).
   - Verified webhook endpoint (`/api/telephony/webhook`) with HMAC SHA-256 signature verification, idempotency checking, and out-of-order event handling.
   - Technical status tracking: `Initiated`, `Ringing`, `Connected`, `No Answer`, `Busy`, `Failed`, `Cancelled`.
   - Distinct metric recording: Ringing duration vs. Connected conversation duration in seconds.
   - Browser actions alone are never counted as answered calls; only verified telephony events record duration.
   - Full interactive **Demo Mode Telephony Sandbox** with live timers, sound wave animations, simulation controls (Answer, Busy, Ring Timeout, Network Fail), and audio playback.

3. **Lead Interest & Call Disposition Management**:
   - Small auto-popping disposition form upon call termination.
   - Independent interest statuses: `Interested`, `Not Interested`, `Follow-up Required`, `Callback Requested`, `Converted`, `Wrong Number`, `Do Not Contact`, `Undecided`.
   - Notes textarea, follow-up datetime scheduler (+2 hours, tomorrow, +3 days shortcuts), and priority levels (`Urgent`, `High`, `Normal`, `Low`).
   - Optional AI Conversation Analysis: automatic audio summary, recommended interest status with confidence percentage, objection extraction, and reviewable next action items.
   - Compliance: Strict Do Not Contact (DNC) suppression enforcement.

4. **Executive Live Telephony Dashboard**:
   - 14 real-time KPI cards: Total Leads, Total Attempts, Unique Leads, Connected Calls, Unanswered, Busy, Failed, Pending, Total Talk Time, Average Duration, Interested, Not Interested, Follow-up Required, Connect Rate (%), Conversion Rate (%).
   - Recharts visual charts: Hourly Call Activity, 7-Day Calling Trend, Agent Performance Comparison, and Lead Status Distribution (Donut).
   - Dynamic filters by Agent, Upload Batch, and Date Range.

5. **Automated Evening Reporting (6:00 PM IST)**:
   - Scheduled daily executive reporting with configurable target time and email list.
   - Formatted **PDF Export** with Executive KPI table, agent-wise performance matrix, and customer call audit trail.
   - Formatted **Excel Export** with multi-sheet workbook (Summary, Agent Breakdown, Call Log).
   - "Send Now" executive email dispatch trigger.
   - Historical archive of all past daily reports.

6. **Follow-Up & Callback Station**:
   - Kanban-style list categorized into Today's follow-ups, Overdue, Upcoming, and Completed.
   - Priority tagging (`Urgent`, `High`, `Normal`, `Low`).
   - Direct click-to-call trigger right from follow-up row.

7. **Role-Based Access Control (RBAC)**:
   - **Admin**: Master leads directory, batch uploads, agent allocation, provider settings, daily report scheduling, team user provisioning.
   - **Calling Agent**: Personal assigned lead queue, click-to-call dialer, manual dial pad, personal call metrics, and follow-up reminders.
   - Built-in instant **Role Switcher** in the top navigation header for evaluating multiple agent perspectives.

---

## Project Structure

```
smartcall-crm/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/analyze-call/route.ts      # AI NLP summarizer & objection extractor
│   │   │   ├── reports/daily/route.ts        # Evening reporting trigger & email sender
│   │   │   ├── telephony/call/route.ts       # Outbound click-to-call gateway
│   │   │   └── telephony/webhook/route.ts    # Exotel/MyOperator verified webhook receiver
│   │   ├── call-history/page.tsx             # Complete telephony call logs & recordings
│   │   ├── follow-ups/page.tsx               # Follow-up schedule & priority management
│   │   ├── leads/page.tsx                    # Master lead directory with search & export
│   │   ├── my-calls/page.tsx                 # Agent calling dashboard & quick dialer
│   │   ├── reports/page.tsx                  # Daily automated reports, PDF & Excel export
│   │   ├── settings/page.tsx                 # Telephony credentials, webhook & DNC controls
│   │   ├── team/page.tsx                     # Team roster, PBX extensions & agent KPIs
│   │   ├── upload/page.tsx                   # Excel drag-and-drop & column mapper
│   │   ├── globals.css                       # Modern Tailwind styles & call waves
│   │   ├── layout.tsx                        # Root layout with responsive sidebar
│   │   └── page.tsx                          # Executive Telephony KPI Dashboard
│   ├── components/
│   │   ├── calling/
│   │   │   ├── ActiveCallBar.tsx             # Floating active call widget & simulator
│   │   │   ├── CallContext.tsx               # Global telephony state manager
│   │   │   └── DispositionModal.tsx          # Post-call interest & notes logger
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx                 # Responsive frame wrapper
│   │   │   ├── Header.tsx                    # Header with role switcher & theme toggle
│   │   │   └── Sidebar.tsx                   # Sidebar navigation
│   │   ├── leads/
│   │   │   └── LeadDetailsModal.tsx          # 360-degree customer profile & call history
│   │   └── theme/
│   │       └── ThemeContext.tsx              # Dark / Light mode toggle provider
│   ├── lib/
│   │   ├── excel.ts                          # ExcelJS parser, sample generator & error reports
│   │   ├── phone.ts                          # International E.164 phone normalizer
│   │   ├── reports.ts                        # PDF (jsPDF) & Excel daily report generator
│   │   ├── store.ts                          # Local enterprise database with realistic seeds
│   │   ├── supabase.ts                       # Supabase client adapter
│   │   └── telephony/
│   │       ├── adapters.ts                   # Exotel, MyOperator & Demo adapters
│   │       ├── provider.ts                   # Provider factory
│   │       └── types.ts                      # Telephony interface definitions
│   └── types/
│       └── index.ts                          # TypeScript interfaces
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql            # Full PostgreSQL schema with RLS & indexes
├── .env.example                              # Environment configuration template
├── package.json
└── tailwind.config.ts
```

---

## Quick Start & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

The application runs immediately in **Demo Telephony Sandbox** mode with realistic enterprise demo leads, historical calls, and follow-ups.

---

## Connecting Supabase (PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of [`supabase/migrations/001_initial_schema.sql`](file:///C:/Users/HI/.gemini/antigravity/scratch/smartcall-crm/supabase/migrations/001_initial_schema.sql) and click **Run**.
   - This creates all 11 relational tables (`users`, `leads`, `lead_import_batches`, `call_attempts`, `call_events`, `lead_dispositions`, `follow_ups`, `daily_reports`, `integration_settings`, `audit_logs`).
   - Configures indexes for phone lookups and timestamps.
   - Enables Row Level Security (RLS) policies for administrators and calling agents.
4. Add your Supabase keys to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

---

## Connecting Real Telephony Providers

### Option A: Exotel Integration
1. Log into your Exotel dashboard and navigate to **API Settings**.
2. Note your **Account SID**, **API Key**, **API Token**, and **Virtual Number (Caller ID)**.
3. In SmartCall CRM, navigate to **Settings** (`/settings`):
   - Select **Exotel Telephony Gateway**.
   - Enter your Account SID, Virtual Caller ID, API Key, and API Token.
   - Copy the generated Webhook URL:
     `https://your-domain.com/api/telephony/webhook?provider=exotel`
   - Paste the Webhook URL into your Exotel Call Flow callback URL setting.
   - Enter your Webhook Secret for signature verification.
4. Click **Save All Configurations**.

### Option B: MyOperator Integration
1. In your MyOperator developer console, generate a **Bearer Auth Token** and note your **Company ID**.
2. In SmartCall CRM navigate to **Settings** (`/settings`):
   - Select **MyOperator Cloud Call**.
   - Fill in Company ID, Bearer Token, and Virtual Number.
   - Set the callback URL to:
     `https://your-domain.com/api/telephony/webhook?provider=myoperator`
3. Click **Save All Configurations**.

---

## Morning Workflow for Teams

1. **8:30 AM – Admin Upload**:
   - Operations admin logs in as **Rajesh Kumar (Admin)** using the top role switcher.
   - Navigates to **Upload Leads** (`/upload`).
   - Drags in today's Excel file, or clicks **1-Click Test Upload** to load sample leads.
   - The system checks for duplicate numbers, formats international dialing codes, and assigns leads to available agents.
2. **9:00 AM to 5:30 PM – Calling Hours**:
   - Calling agents (e.g. **Priya Sharma** or **Vikram Patel**) log in to **My Calls** (`/my-calls`).
   - Agents click **Click to Call** on any customer lead.
   - The active call widget tracks ringing, conversation duration, and ends the call.
   - The disposition popup captures interest status, call notes, and schedules callbacks.
3. **6:00 PM – Evening Automatic Dispatch**:
   - Navigating to **Reports** (`/reports`) displays the generated daily performance report.
   - Export to PDF or Excel with 1-click, or trigger **Send Now (Email)**.
