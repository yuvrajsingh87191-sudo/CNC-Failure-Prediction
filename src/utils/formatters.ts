import { PredictionRecord } from '../types/domain';

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatShortTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatRiskPercent(percent: number, decimals = 1): string {
  return `${percent.toFixed(decimals)}%`;
}

export function formatRoundedRisk(percent: number): string {
  return `${Math.round(percent)}%`;
}

/**
 * Escapes a single CSV field per RFC 4180 and neutralizes spreadsheet formula injection.
 */
function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export interface CsvExportSummary {
  rowCount: number;
  filename: string;
}

export function exportHistoryToCsv(
  records: PredictionRecord[],
  options?: { isFiltered?: boolean }
): CsvExportSummary {
  const headers = [
    'Prediction ID',
    'Timestamp (ISO)',
    'Formatted Time',
    'Product Type',
    'Air Temp [K]',
    'Process Temp [K]',
    'Temp Gap [K]',
    'Rotational Speed [rpm]',
    'Torque [Nm]',
    'Mechanical Power [W]',
    'Tool Wear [min]',
    'Prediction Result',
    'Risk %',
    'Risk Level',
    'Maintenance Recommendation',
    'Predictor Engine',
  ];

  const rows = records.map((r) => [
    escapeCsvCell(r.id),
    escapeCsvCell(r.timestamp),
    escapeCsvCell(formatTimestamp(r.timestamp)),
    escapeCsvCell(r.reading.type),
    escapeCsvCell(r.reading.airTempK),
    escapeCsvCell(r.reading.processTempK),
    escapeCsvCell(r.prediction.derivedMetrics.temperatureGapK),
    escapeCsvCell(r.reading.rpm),
    escapeCsvCell(r.reading.torqueNm),
    escapeCsvCell(r.prediction.derivedMetrics.powerWatts),
    escapeCsvCell(r.reading.toolWearMin),
    escapeCsvCell(r.prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'),
    escapeCsvCell(Number(r.prediction.riskPercent.toFixed(1))),
    escapeCsvCell(r.prediction.level),
    escapeCsvCell(r.prediction.advice),
    escapeCsvCell(r.prediction.predictorName),
  ]);

  // Prefix UTF-8 BOM so Excel parses units/symbols cleanly
  const csvContent =
    '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const suffix = options?.isFiltered ? '_filtered' : '';
  const filename = `cnc_prediction_history_${new Date().toISOString().slice(0, 10)}${suffix}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { rowCount: records.length, filename };
}
