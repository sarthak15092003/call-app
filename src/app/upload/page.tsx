'use client';

import React, { useState, useEffect, useRef } from 'react';
import { crmStore } from '@/lib/store';
import {
  parseExcelBuffer,
  autoDetectColumnMapping,
  ColumnMapping,
  ParsedRowResult,
  generateSampleLeadExcel,
  generateErrorReportExcel,
} from '@/lib/excel';
import { Lead, LeadImportBatch, User } from '@/types';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Check,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileDown,
  Link2,
  Globe,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function UploadLeadsPage() {
  const [currentUser] = useState<User>(crmStore.getCurrentUser());
  const [batches, setBatches] = useState<LeadImportBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Source tab state (Excel/CSV vs Google Sheets)
  const [uploadMode, setUploadMode] = useState<'file' | 'google_sheet'>('file');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Upload workflow state
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileType, setFileType] = useState<'xlsx' | 'xls' | 'csv'>('xlsx');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    phone: '',
    company: '',
    email: '',
    location: '',
    leadSource: '',
    assignedAgent: '',
    remarks: '',
  });

  const [step, setStep] = useState<'drop' | 'mapping' | 'preview' | 'complete'>('drop');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResults, setParsedResults] = useState<{
    validRows: ParsedRowResult[];
    invalidRows: ParsedRowResult[];
    duplicateRows: ParsedRowResult[];
    previewRows: ParsedRowResult[];
  } | null>(null);

  const [lastUploadedBatch, setLastUploadedBatch] = useState<LeadImportBatch | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setBatches(crmStore.getBatches());
    setUsers(crmStore.getUsers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  const handleFileSelected = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      alert('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setFile(selectedFile);
    setFileType(ext as any);
    setIsProcessing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);

      // Read headers first using dummy mapping
      const existingLeads = crmStore.getLeads();
      const existingPhones = new Set(existingLeads.map((l) => l.phone));

      // Initial pass to extract headers
      const initialParsed = await parseExcelBuffer(
        buffer,
        ext as any,
        {
          name: 'Customer Name',
          phone: 'Mobile Number',
          company: 'Company Name',
          email: 'Email',
          location: 'Location',
          leadSource: 'Lead Source',
          assignedAgent: 'Assigned Agent',
          remarks: 'Remarks',
        },
        existingPhones
      );

      setHeaders(initialParsed.headers);
      const autoMap = autoDetectColumnMapping(initialParsed.headers);
      setMapping(autoMap);
      setStep('mapping');
    } catch (err: any) {
      alert(`Error reading file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchGoogleSheet = async (overrideUrl?: string) => {
    const urlToFetch = (overrideUrl || googleSheetUrl).trim();
    if (!urlToFetch) {
      setSheetError('Please enter a valid Google Sheets URL.');
      return;
    }

    setIsFetchingSheet(true);
    setSheetError(null);

    try {
      const res = await fetch('/api/leads/fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch Google Sheet data.');
      }

      // Convert CSV text to virtual File object
      const blob = new Blob([data.csvText], { type: 'text/csv' });
      const virtualFile = new File([blob], `Google_Sheet_${data.sheetId.slice(0, 8)}.csv`, {
        type: 'text/csv',
      });

      await handleFileSelected(virtualFile);
    } catch (err: any) {
      setSheetError(err.message || 'Error fetching Google Sheet.');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleProceedToPreview = async () => {
    if (!mapping.name || !mapping.phone) {
      alert('Customer Name and Mobile Number columns must be mapped.');
      return;
    }

    if (!fileBuffer) return;
    setIsProcessing(true);

    try {
      const existingLeads = crmStore.getLeads();
      const existingPhones = new Set(existingLeads.map((l) => l.phone));

      const results = await parseExcelBuffer(fileBuffer, fileType, mapping, existingPhones);
      setParsedResults({
        validRows: results.validRows,
        invalidRows: results.invalidRows,
        duplicateRows: results.duplicateRows,
        previewRows: results.previewRows,
      });
      setStep('preview');
    } catch (err: any) {
      alert(`Error processing rows: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResults || !file) return;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchId = `BATCH-${dateStr}-${Math.floor(Math.random() * 89 + 10)}`;

    const agentUsers = users.filter((u) => u.role === 'agent');

    // Create Lead objects
    const newLeads: Lead[] = parsedResults.validRows.map((r, idx) => {
      // Find assigned agent if specified in sheet or round-robin assign
      let agent = agentUsers.find(
        (u) => u.name.toLowerCase() === r.data.assigned_agent_name.toLowerCase()
      );
      if (!agent && agentUsers.length > 0) {
        agent = agentUsers[idx % agentUsers.length];
      }

      return {
        id: `lead_${Date.now()}_${idx}`,
        batch_id: batchId,
        name: r.data.name,
        phone: r.data.phone,
        raw_phone: r.data.raw_phone,
        company: r.data.company,
        email: r.data.email,
        location: r.data.location,
        lead_source: r.data.lead_source,
        assigned_agent_id: agent ? agent.id : '',
        assigned_agent_name: agent ? agent.name : 'Unassigned',
        remarks: r.data.remarks,
        interest_status: 'Undecided',
        call_attempts_count: 0,
        total_connected_duration: 0,
        last_call_at: null,
        last_call_status: 'never_called',
        next_followup_at: null,
        is_dnc: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const errorReport = parsedResults.invalidRows.map((r) => ({
      rowNumber: r.rowNumber,
      phone: r.data.raw_phone,
      name: r.data.name,
      reason: r.reason || 'Invalid phone or missing name',
      rawData: r.rawData,
    }));

    const newBatch: LeadImportBatch = {
      id: batchId,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: currentUser.id,
      uploaded_by_name: currentUser.name,
      uploaded_at: new Date().toISOString(),
      total_rows: parsedResults.validRows.length + parsedResults.invalidRows.length + parsedResults.duplicateRows.length,
      imported_count: newLeads.length,
      invalid_count: parsedResults.invalidRows.length,
      duplicate_count: parsedResults.duplicateRows.length,
      status: 'completed',
      error_report: errorReport,
    };

    crmStore.addLeadsFromImport(newLeads, newBatch);
    setLastUploadedBatch(newBatch);
    setStep('complete');
  };

  const handleDownloadSample = async () => {
    const blob = await generateSampleLeadExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartCall_Sample_Morning_Leads.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadErrorReport = async (batch: LeadImportBatch) => {
    const blob = await generateErrorReportExcel(batch);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.id}_Error_Report.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickLoadDemoSample = async () => {
    const blob = await generateSampleLeadExcel();
    const testFile = new File([blob], 'Morning_Campaign_Leads.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    handleFileSelected(testFile);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Morning Lead File Import
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload daily lead batches (.xlsx, .xls, .csv), auto-validate phone numbers, map columns, and assign to calling agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Download Sample Excel</span>
          </button>

          <button
            type="button"
            onClick={handleQuickLoadDemoSample}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Test Upload</span>
          </button>
        </div>
      </div>

      {/* Step Progress Stepper */}
      <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
        {[
          { key: 'drop', label: '1. Select File' },
          { key: 'mapping', label: '2. Column Mapping' },
          { key: 'preview', label: '3. Validation Preview' },
          { key: 'complete', label: '4. Batch Imported' },
        ].map((s, idx) => {
          const isDone =
            (step === 'mapping' && idx === 0) ||
            (step === 'preview' && idx <= 1) ||
            (step === 'complete' && idx <= 2);
          const isCurrent = step === s.key;

          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  isCurrent
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <span
                className={`hidden sm:inline font-medium ${
                  isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Upload Box / Flow Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        {/* Step 1: File or Google Sheet Selection */}
        {step === 'drop' && (
          <div className="space-y-6">
            {/* Import Mode Switcher */}
            <div className="flex items-center justify-center">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('file');
                    setSheetError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    uploadMode === 'file'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Upload Excel / CSV File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('google_sheet');
                    setSheetError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    uploadMode === 'google_sheet'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span>Google Sheets Link</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Live Sync
                  </span>
                </button>
              </div>
            </div>

            {/* Mode A: Drag & Drop File */}
            {uploadMode === 'file' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  Drag & Drop your Lead File here, or browse
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  Supported formats: Microsoft Excel (.xlsx, .xls) and CSV (.csv). Up to 50,000 leads per batch.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Expected columns: Customer Name, Mobile Number, Company, Email, Location...</span>
                </div>
              </div>
            ) : (
              /* Mode B: Google Sheets Link Input */
              <div className="p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                    <Globe className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Import Leads from Google Sheets
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Paste the sharing link to your Google Spreadsheet. We'll automatically fetch all rows, validate phone numbers, and map fields.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Link2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <input
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => {
                        setGoogleSheetUrl(e.target.value);
                        setSheetError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchGoogleSheet();
                        }
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit?usp=sharing"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  {sheetError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Could not fetch Google Sheet</span>
                        <span className="text-[11px] leading-relaxed">{sheetError}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isFetchingSheet}
                      onClick={() => handleFetchGoogleSheet()}
                      className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isFetchingSheet ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Fetching Google Sheet...</span>
                        </>
                      ) : (
                        <>
                          <span>Fetch & Map Leads</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isFetchingSheet}
                      onClick={() => {
                        // Pre-populate with our instant sample test Google Sheet URL or trigger quick import
                        const sampleUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
                        setGoogleSheetUrl(sampleUrl);
                        handleFetchGoogleSheet(sampleUrl);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                      title="Load sample public test sheet"
                    >
                      Try Sample Google Sheet
                    </button>
                  </div>
                </div>

                {/* Instructions Box */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    How to prepare your Google Sheet:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1">
                    <li>Open your Google Sheet and click the blue <b>Share</b> button in the top right.</li>
                    <li>Under <i>General access</i>, change from <b>Restricted</b> to <b>Anyone with the link</b> (Viewer).</li>
                    <li>Click <b>Copy link</b> and paste it above!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Map Excel Columns to SmartCall CRM Fields
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  File: <span className="font-mono text-indigo-600 dark:text-indigo-400">{file?.name}</span> ({headers.length} headers detected)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep('drop')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Choose another file
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Customer Name *', required: true, desc: 'Contact or company owner full name' },
                { key: 'phone', label: 'Mobile Number *', required: true, desc: 'Mobile / Phone number with dialing prefix' },
                { key: 'company', label: 'Company Name', required: false, desc: 'Business or organization name' },
                { key: 'email', label: 'Email Address', required: false, desc: 'Corporate or personal email address' },
                { key: 'location', label: 'Location / City', required: false, desc: 'Geographic city or state' },
                { key: 'leadSource', label: 'Lead Source', required: false, desc: 'Campaign, LinkedIn, Inbound, etc.' },
                { key: 'assignedAgent', label: 'Assigned Agent', required: false, desc: 'Specific agent name to route this lead to' },
                { key: 'remarks', label: 'Remarks / Notes', required: false, desc: 'Preliminary inquiry notes or requirements' },
              ].map((field) => (
                <div key={field.key} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-900 dark:text-white">
                      {field.label}
                    </label>
                    {field.required && (
                      <span className="text-[10px] uppercase font-bold text-rose-500">Required</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{field.desc}</p>
                  <select
                    value={(mapping as any)[field.key] || ''}
                    onChange={(e) =>
                      setMapping({ ...mapping, [field.key]: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Do Not Map --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep('drop')}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToPreview}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <span>Validate & Preview Rows</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Import Preview & Validation Summary */}
        {step === 'preview' && parsedResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Lead Import Validation Summary
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verify duplicate detection, phone formatting, and valid customer counts before committing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Edit Mapping
              </button>
            </div>

            {/* Validation Count KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Scanned Rows</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {parsedResults.validRows.length + parsedResults.invalidRows.length + parsedResults.duplicateRows.length}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Import
                </span>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  {parsedResults.validRows.length}
                </div>
                <div className="text-[10px] text-emerald-600/80 mt-0.5">Valid normalized phone numbers</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate Numbers
                </span>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                  {parsedResults.duplicateRows.length}
                </div>
                <div className="text-[10px] text-amber-600/80 mt-0.5">Will preserve past call history</div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Invalid / Rejected
                </span>
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                  {parsedResults.invalidRows.length}
                </div>
                <div className="text-[10px] text-rose-600/80 mt-0.5">Exportable in error report</div>
              </div>
            </div>

            {/* Preview Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Sample Row Preview (First {parsedResults.previewRows.length} Rows)
              </h4>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">Row</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Customer Name</th>
                      <th className="px-3 py-2.5">Normalized Phone</th>
                      <th className="px-3 py-2.5">Company</th>
                      <th className="px-3 py-2.5">Location</th>
                      <th className="px-3 py-2.5">Assigned Agent</th>
                      <th className="px-3 py-2.5">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedResults.previewRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2.5 font-mono text-slate-400">#{r.rowNumber}</td>
                        <td className="px-3 py-2.5">
                          {r.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              Duplicate
                            </span>
                          ) : r.isValid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                              Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                          {r.data.name || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-indigo-600 dark:text-indigo-400">
                          {r.data.phone || r.data.raw_phone}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.data.company || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.data.location || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.data.assigned_agent_name || 'Auto'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">
                          {r.reason ? <span className="text-rose-600 dark:text-rose-400">{r.reason}</span> : 'E.164 verified'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back to Mapping
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
              >
                Confirm & Import {parsedResults.validRows.length} Leads
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && lastUploadedBatch && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-xl text-slate-900 dark:text-white">
              Morning Lead Batch Successfully Imported!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Batch <strong className="font-mono text-indigo-600 dark:text-indigo-400">{lastUploadedBatch.id}</strong> has been registered with {lastUploadedBatch.imported_count} leads ready for outbound calling.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {lastUploadedBatch.invalid_count > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadErrorReport(lastUploadedBatch)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Error Report ({lastUploadedBatch.invalid_count} Failed Rows)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setStep('drop')}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Upload Another File
              </button>

              <a
                href="/my-calls"
                className="px-6 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
              >
                Go to Calling Dashboard
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Historical Upload Batches Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upload Batch Archive</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">All registered daily morning Excel lead files</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{batches.length} Batches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Batch ID</th>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Uploaded At</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Total Rows</th>
                <th className="px-4 py-3">Imported</th>
                <th className="px-4 py-3">Duplicates</th>
                <th className="px-4 py-3">Invalid</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Error Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {batch.id}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {batch.file_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono">
                    {new Date(batch.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {batch.uploaded_by_name}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {batch.total_rows}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                    {batch.imported_count}
                  </td>
                  <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">
                    {batch.duplicate_count}
                  </td>
                  <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                    {batch.invalid_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {batch.invalid_count > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadErrorReport(batch)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Export ({batch.invalid_count})</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">None</span>
                    )}
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

