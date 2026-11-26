import ExcelJS from 'exceljs';
import { validateAndNormalizePhone } from './phone';
import { Lead, LeadImportBatch } from '@/types';

export interface ColumnMapping {
  name: string;
  phone: string;
  company: string;
  email: string;
  location: string;
  leadSource: string;
  assignedAgent: string;
  remarks: string;
}

export interface ParsedRowResult {
  rowNumber: number;
  isValid: boolean;
  isDuplicate: boolean;
  reason?: string;
  data: {
    name: string;
    phone: string; // normalized
    raw_phone: string;
    company: string;
    email: string;
    location: string;
    lead_source: string;
    assigned_agent_name: string;
    remarks: string;
  };
  rawData: Record<string, any>;
}

export interface ParseExcelResult {
  headers: string[];
  totalRows: number;
  validRows: ParsedRowResult[];
  invalidRows: ParsedRowResult[];
  duplicateRows: ParsedRowResult[];
  previewRows: ParsedRowResult[];
}

/**
 * Detect column mappings based on common header names
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findMatch = (candidates: string[]): string => {
    for (const h of headers) {
      const clean = normalize(h);
      if (candidates.some((c) => clean.includes(c))) return h;
    }
    return '';
  };

  return {
    name: findMatch(['name', 'customer', 'client', 'contact']),
    phone: findMatch(['phone', 'mobile', 'cell', 'contactnumber', 'tel']),
    company: findMatch(['company', 'org', 'organization', 'business']),
    email: findMatch(['email', 'mail']),
    location: findMatch(['location', 'city', 'address', 'state']),
    leadSource: findMatch(['event', 'eventname', 'source', 'channel', 'campaign', 'origin']),
    assignedAgent: findMatch(['agent', 'assigned', 'rep', 'owner']),
    remarks: findMatch(['remark', 'note', 'comment', 'description']),
  };
}

/**
 * Parse an uploaded Excel or CSV file buffer
 */
export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  fileType: 'xlsx' | 'xls' | 'csv',
  mapping: ColumnMapping,
  existingPhones: Set<string>
): Promise<ParseExcelResult> {
  const workbook = new ExcelJS.Workbook();

  if (fileType === 'csv') {
    const text = new TextDecoder().decode(buffer);
    // Convert CSV text to workbook
    const stream = require('stream');
    const s = new stream.Readable();
    s.push(text);
    s.push(null);
    await workbook.csv.read(s);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The workbook contains no sheets.');
  }

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });

  const validRows: ParsedRowResult[] = [];
  const invalidRows: ParsedRowResult[] = [];
  const duplicateRows: ParsedRowResult[] = [];
  const seenInThisFile = new Set<string>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const cellVal = row.getCell(idx + 1).value;
      if (cellVal !== null && cellVal !== undefined) {
        if (typeof cellVal === 'object' && 'text' in (cellVal as any)) {
          rowObj[h] = (cellVal as any).text;
        } else {
          rowObj[h] = String(cellVal).trim();
        }
      } else {
        rowObj[h] = '';
      }
    });

    const rawName = String(rowObj[mapping.name] || '').trim();
    const rawPhone = String(rowObj[mapping.phone] || '').trim();
    const rawCompany = String(rowObj[mapping.company] || '').trim();
    const rawEmail = String(rowObj[mapping.email] || '').trim();
    const rawLocation = String(rowObj[mapping.location] || '').trim();
    const rawLeadSource = String(rowObj[mapping.leadSource] || 'Excel Import').trim();
    const rawAssigned = String(rowObj[mapping.assignedAgent] || 'Unassigned').trim();
    const rawRemarks = String(rowObj[mapping.remarks] || '').trim();

    // Check empty row
    if (!rawName && !rawPhone && !rawCompany) {
      return;
    }

    if (!rawName) {
      invalidRows.push({
        rowNumber,
        isValid: false,
        isDuplicate: false,
        reason: 'Customer Name is required',
        data: {
          name: '',
          phone: rawPhone,
          raw_phone: rawPhone,
          company: rawCompany,
          email: rawEmail,
          location: rawLocation,
          lead_source: rawLeadSource,
          assigned_agent_name: rawAssigned,
          remarks: rawRemarks,
        },
        rawData: rowObj,
      });
      return;
    }

    // Phone validation
    const phoneVal = validateAndNormalizePhone(rawPhone);
    if (!phoneVal.isValid) {
      invalidRows.push({
        rowNumber,
        isValid: false,
        isDuplicate: false,
        reason: phoneVal.error || 'Invalid telephone number',
        data: {
          name: rawName,
          phone: rawPhone,
          raw_phone: rawPhone,
          company: rawCompany,
          email: rawEmail,
          location: rawLocation,
          lead_source: rawLeadSource,
          assigned_agent_name: rawAssigned,
          remarks: rawRemarks,
        },
        rawData: rowObj,
      });
      return;
    }

    // Duplicate check
    const normalized = phoneVal.normalized;
    const isDup = seenInThisFile.has(normalized) || existingPhones.has(normalized);

    const parsed: ParsedRowResult = {
      rowNumber,
      isValid: true,
      isDuplicate: isDup,
      reason: isDup ? 'Phone number already exists in CRM database or file' : undefined,
      data: {
        name: rawName,
        phone: normalized,
        raw_phone: rawPhone,
        company: rawCompany,
        email: rawEmail,
        location: rawLocation,
        lead_source: rawLeadSource,
        assigned_agent_name: rawAssigned,
        remarks: rawRemarks,
      },
      rawData: rowObj,
    };

    if (isDup) {
      duplicateRows.push(parsed);
    } else {
      validRows.push(parsed);
    }
    seenInThisFile.add(normalized);
  });

  const totalRows = validRows.length + invalidRows.length + duplicateRows.length;
  const previewRows = [...validRows, ...invalidRows, ...duplicateRows].slice(0, 10);

  return {
    headers,
    totalRows,
    validRows,
    invalidRows,
    duplicateRows,
    previewRows,
  };
}

/**
 * Generate Sample Excel Lead File for users to download and test
 */
export async function generateSampleLeadExcel(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartCall CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Morning Leads');

  sheet.columns = [
    { header: 'Customer Name', key: 'name', width: 22 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Company Name', key: 'company', width: 26 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Lead Source', key: 'source', width: 18 },
    { header: 'Assigned Agent', key: 'agent', width: 18 },
    { header: 'Remarks', key: 'remarks', width: 30 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // indigo
  };
  headerRow.height = 26;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const sampleRows = [
    { name: 'Aditya Birla', phone: '+919820011223', company: 'Birla Retail Tech', email: 'aditya@birlaretail.in', location: 'Mumbai', source: 'Website Inbound', agent: 'Priya Sharma', remarks: 'Requires 20-seat dialer with recording' },
    { name: 'Sneha Kapur', phone: '9811223344', company: 'Kapur Logistics Ltd', email: 'sneha@kapurlogistics.com', location: 'Delhi NCR', source: 'Google Ads', agent: 'Vikram Patel', remarks: 'Needs Exotel integration for dispatch team' },
    { name: 'Manish Reddy', phone: '+91 97001 22334', company: 'Deccan Pharma Corp', email: 'manish@deccanpharma.com', location: 'Hyderabad', source: 'LinkedIn Campaign', agent: 'Priya Sharma', remarks: 'Interested in automatic evening reports' },
    { name: 'Deepak Patel', phone: '09825012345', company: 'Gujarat Solar Ventures', email: 'deepak@gujaratsolar.in', location: 'Ahmedabad', source: 'IndiaMART', agent: 'Vikram Patel', remarks: 'Cold lead from energy exhibition' },
    { name: 'Kavita Menon', phone: '+919847123987', company: 'Cochin Maritime Tech', email: 'kavita@cochinmaritime.com', location: 'Kochi', source: 'Referral', agent: 'Priya Sharma', remarks: 'Wants multi-language agent routing' },
    { name: 'Nikhil Agarwal', phone: '9830012399', company: 'Bengal Metal Castings', email: 'nikhil@bengalmetals.in', location: 'Kolkata', source: 'Trade Expo', agent: 'Vikram Patel', remarks: 'Call between 2 PM and 5 PM' },
    { name: 'Sanjay Deshmukh', phone: '9890123450', company: 'Sahyadri Finserve', email: 'sanjay@sahyadrifin.com', location: 'Pune', source: 'Website Chat', agent: 'Priya Sharma', remarks: 'Looking for follow-up reminder alerts' },
    { name: 'Invalid Sample Lead', phone: '9820-BAD-NUM', company: 'Test Corrupt Row', email: 'test@bad.com', location: 'Test City', source: 'Test', agent: 'Unassigned', remarks: 'This row demonstrates phone validation error reporting' },
  ];

  sampleRows.forEach((r) => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate Error Report Excel for failed rows in batch
 */
export async function generateErrorReportExcel(batch: LeadImportBatch): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartCall CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Import Errors');
  sheet.columns = [
    { header: 'Row #', key: 'rowNumber', width: 10 },
    { header: 'Customer Name', key: 'name', width: 22 },
    { header: 'Supplied Phone', key: 'phone', width: 20 },
    { header: 'Rejection Reason', key: 'reason', width: 45 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE11D48' }, // rose-600
  };

  (batch.error_report || []).forEach((err) => {
    sheet.addRow({
      rowNumber: err.rowNumber,
      name: err.name,
      phone: err.phone,
      reason: err.reason,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Export Leads Table to Excel
 */
export async function exportLeadsToExcel(leads: Lead[], fileName = 'SmartCall_Leads_Export.xlsx'): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartCall CRM';

  const sheet = workbook.addWorksheet('Leads');
  sheet.columns = [
    { header: 'Customer Name', key: 'name', width: 22 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Company', key: 'company', width: 24 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Location', key: 'location', width: 18 },
    { header: 'Interest Status', key: 'status', width: 20 },
    { header: 'Call Attempts', key: 'attempts', width: 14 },
    { header: 'Talk Time (sec)', key: 'talkTime', width: 16 },
    { header: 'Last Call Status', key: 'lastStatus', width: 16 },
    { header: 'Last Call Time', key: 'lastTime', width: 22 },
    { header: 'Assigned Agent', key: 'agent', width: 18 },
    { header: 'Remarks', key: 'remarks', width: 30 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF16A34A' }, // green-600
  };

  leads.forEach((l) => {
    sheet.addRow({
      name: l.name,
      phone: l.phone,
      company: l.company,
      email: l.email,
      location: l.location,
      status: l.interest_status,
      attempts: l.call_attempts_count,
      talkTime: l.total_connected_duration,
      lastStatus: l.last_call_status,
      lastTime: l.last_call_at ? new Date(l.last_call_at).toLocaleString() : 'Never',
      agent: l.assigned_agent_name,
      remarks: l.remarks,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

