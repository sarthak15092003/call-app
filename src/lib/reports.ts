import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { DailyReport, CallAttempt, Lead } from '@/types';

/**
 * Generate a PDF for the Daily Evening Report
 */
export function generateDailyReportPDF(report: DailyReport, callHistory: CallAttempt[]): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Brand Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SmartCall CRM', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Automated Calling & Lead Tracking Daily Performance Report', 14, 24);
  doc.text(`Report Date: ${report.report_date}  |  Generated At: ${new Date(report.generated_at).toLocaleTimeString()}`, 14, 30);

  // Executive KPI Summary
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, 46);

  const totalMin = Math.round(report.total_talk_time_seconds / 60);
  const avgMin = Math.round(report.avg_talk_time_seconds);

  const kpiData = [
    ['Total Uploaded Leads', String(report.total_leads), 'Connected Calls', String(report.connected_calls)],
    ['Total Call Attempts', String(report.total_attempts), 'Unanswered / Missed', String(report.unanswered_calls)],
    ['Total Talk Time', `${totalMin} mins (${report.total_talk_time_seconds}s)`, 'Busy Calls', String(report.busy_calls)],
    ['Avg Connected Duration', `${avgMin}s / call`, 'Failed / Cancelled', String(report.failed_calls)],
    ['Interested Leads', String(report.interested_count), 'Not Interested', String(report.not_interested_count)],
    ['Pending Follow-ups', String(report.pending_followups), 'Schedule Time', `${report.schedule_time} IST`],
  ];

  (doc as any).autoTable({
    startY: 50,
    head: [['Metric', 'Value', 'Metric', 'Value']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  // Agent Performance Breakdown
  const finalY1 = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Agent-wise Performance Breakdown', 14, finalY1);

  const agentRows = report.agent_stats.map((ag) => [
    ag.agent_name,
    String(ag.total_assigned),
    String(ag.call_attempts),
    String(ag.connected_calls),
    `${Math.round(ag.total_duration_seconds / 60)}m ${ag.total_duration_seconds % 60}s`,
    String(ag.interested),
    String(ag.callback_requested),
    String(ag.conversions),
  ]);

  (doc as any).autoTable({
    startY: finalY1 + 4,
    head: [['Agent Name', 'Assigned', 'Attempts', 'Connected', 'Talk Time', 'Interested', 'Callback', 'Converted']],
    body: agentRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2.2 },
  });

  // Detailed Customer Call History for the Day
  const finalY2 = (doc as any).lastAutoTable.finalY + 10;
  if (finalY2 > 240) {
    doc.addPage();
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer-wise Detailed Call Log', 14, 20);
    renderCallHistoryTable(doc, callHistory, 25);
  } else {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer-wise Detailed Call Log', 14, finalY2);
    renderCallHistoryTable(doc, callHistory, finalY2 + 4);
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`SmartCall CRM Automated Evening Dispatch  •  Page ${i} of ${pageCount}`, 14, 290);
  }

  return doc.output('blob');
}

function renderCallHistoryTable(doc: any, callHistory: CallAttempt[], startY: number) {
  const callRows = callHistory.slice(0, 25).map((c) => [
    new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    c.customer_name,
    c.customer_number,
    c.agent_name,
    c.status.toUpperCase(),
    `${c.connected_duration}s`,
    c.is_demo ? 'Demo Sim' : c.provider.toUpperCase(),
  ]);

  (doc as any).autoTable({
    startY,
    head: [['Time', 'Customer', 'Number', 'Agent', 'Status', 'Duration', 'Route']],
    body: callRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    styles: { fontSize: 7.5, cellPadding: 2 },
  });
}

/**
 * Generate Excel Workbook for Daily Report
 */
export async function generateDailyReportExcel(report: DailyReport, callHistory: CallAttempt[], leads: Lead[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartCall CRM Automated Reporter';
  workbook.created = new Date();

  // Sheet 1: Summary KPI
  const summarySheet = workbook.addWorksheet('Daily Summary');
  summarySheet.columns = [
    { header: 'Report Parameter', key: 'param', width: 30 },
    { header: 'Value', key: 'val', width: 25 },
  ];

  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };

  summarySheet.addRow({ param: 'Report Date', val: report.report_date });
  summarySheet.addRow({ param: 'Generated Timestamp', val: report.generated_at });
  summarySheet.addRow({ param: 'Total Leads in Database', val: report.total_leads });
  summarySheet.addRow({ param: 'Total Call Attempts Today', val: report.total_attempts });
  summarySheet.addRow({ param: 'Connected Calls', val: report.connected_calls });
  summarySheet.addRow({ param: 'Unanswered Calls', val: report.unanswered_calls });
  summarySheet.addRow({ param: 'Busy Calls', val: report.busy_calls });
  summarySheet.addRow({ param: 'Failed Calls', val: report.failed_calls });
  summarySheet.addRow({ param: 'Total Talk Time (Seconds)', val: report.total_talk_time_seconds });
  summarySheet.addRow({ param: 'Total Talk Time (Minutes)', val: Math.round(report.total_talk_time_seconds / 60) });
  summarySheet.addRow({ param: 'Average Talk Time (Seconds)', val: report.avg_talk_time_seconds });
  summarySheet.addRow({ param: 'Interested Leads', val: report.interested_count });
  summarySheet.addRow({ param: 'Not Interested Leads', val: report.not_interested_count });
  summarySheet.addRow({ param: 'Pending Follow-ups', val: report.pending_followups });

  // Sheet 2: Agent Performance
  const agentSheet = workbook.addWorksheet('Agent Breakdown');
  agentSheet.columns = [
    { header: 'Agent Name', key: 'agent_name', width: 22 },
    { header: 'Assigned Leads', key: 'total_assigned', width: 16 },
    { header: 'Calls Attempted', key: 'call_attempts', width: 16 },
    { header: 'Connected Calls', key: 'connected_calls', width: 16 },
    { header: 'Total Talk Time (s)', key: 'total_duration_seconds', width: 20 },
    { header: 'Conversions', key: 'conversions', width: 14 },
    { header: 'Interested', key: 'interested', width: 14 },
    { header: 'Not Interested', key: 'not_interested', width: 16 },
    { header: 'Callback Req.', key: 'callback_requested', width: 16 },
  ];
  const agHeader = agentSheet.getRow(1);
  agHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  agHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  report.agent_stats.forEach((ag) => agentSheet.addRow(ag));

  // Sheet 3: Call Details Log
  const callSheet = workbook.addWorksheet('Calls Log');
  callSheet.columns = [
    { header: 'Call ID', key: 'id', width: 20 },
    { header: 'Timestamp', key: 'start_time', width: 22 },
    { header: 'Customer Name', key: 'customer_name', width: 22 },
    { header: 'Customer Number', key: 'customer_number', width: 18 },
    { header: 'Agent Name', key: 'agent_name', width: 18 },
    { header: 'Provider', key: 'provider', width: 14 },
    { header: 'Call Status', key: 'status', width: 16 },
    { header: 'Ringing Duration (s)', key: 'ringing_duration', width: 20 },
    { header: 'Connected Duration (s)', key: 'connected_duration', width: 22 },
    { header: 'Is Demo Sim', key: 'is_demo', width: 14 },
  ];
  const callHead = callSheet.getRow(1);
  callHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  callHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  callHistory.forEach((c) => callSheet.addRow(c));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

