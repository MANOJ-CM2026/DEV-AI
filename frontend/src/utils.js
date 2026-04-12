export const PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#f97316', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6',
  '#a855f7', '#0ea5e9', '#84cc16', '#e11d48', '#7c3aed',
];

export const alpha = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export function detectColumns(headers) {
  const map = {};
  const clean = headers.map(h => h.trim().toLowerCase().replace(/[\s_]+/g, '_'));
  
  // Detect time field
  const timeKws = ['year', 'date', 'month', 'time', 'period'];
  map.timeField = headers.find((_, i) => timeKws.some(k => clean[i].includes(k))) || headers[0];
  
  // Detect categorical fields
  const catKws = ['type', 'category', 'class', 'group', 'status', 'name', 'location', 'city', 'country', 'region', 'department'];
  let categories = headers.filter((h, i) => catKws.some(k => clean[i].includes(k)) && h !== map.timeField);
  if (categories.length === 0) categories = headers.filter(h => h !== map.timeField);
  map.cat1 = categories[0] || headers[0];
  map.cat2 = categories[1] || categories[0] || headers[1] || headers[0];

  // Detect metric fields
  const metricKws = ['cost', 'price', 'revenue', 'value', 'amount', 'score', 'quantity', 'size', 'count', 'total', 'salary', 'area'];
  let metrics = headers.filter((h, i) => metricKws.some(k => clean[i].includes(k)) && h !== map.timeField);
  if (metrics.length === 0) metrics = headers.filter(h => h !== map.timeField && h !== map.cat1 && h !== map.cat2);
  map.metric1 = metrics[0] || headers[1] || headers[0];
  map.metric2 = metrics[1] || metrics[0] || headers[2] || headers[0];

  return map;
}

export function cleanData(rows, columnMap) {
  return rows.map(row => {
    const d = { ...row };
    if (columnMap.timeField) {
        const v = parseFloat(d[columnMap.timeField]);
        if (!isNaN(v)) d[columnMap.timeField] = v;
    }
    if (columnMap.metric1) d[columnMap.metric1] = parseFloat(d[columnMap.metric1]) || null;
    if (columnMap.metric2) d[columnMap.metric2] = parseFloat(d[columnMap.metric2]) || null;
    return d;
  }).filter(d => true);
}

export function countBy(arr, key) {
  const counts = {};
  arr.forEach(d => {
    const v = d[key];
    if (v != null && v !== '') counts[v] = (counts[v] || 0) + 1;
  });
  return counts;
}

export function topN(obj, n) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function uniqueSorted(arr, key) {
  const vals = [...new Set(arr.map(d => d[key]).filter(v => v != null && v !== ''))];
  vals.sort((a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))));
  return vals;
}

export function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

export function createBins(values, numBins) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / numBins || 1;
  const counts = new Array(numBins).fill(0);
  const labels = [];
  for (let i = 0; i < numBins; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    labels.push(`${fmt(Math.round(lo))}–${fmt(Math.round(hi))}`);
    values.forEach(v => {
      if (i === numBins - 1 ? (v >= lo && v <= hi) : (v >= lo && v < hi)) counts[i]++;
    });
  }
  return { labels, counts };
}

export function pearson(x, y) {
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const minLength = Math.min(x.length, y.length);
  const n = minLength;
  if (n === 0) return 0;
  for (let i = 0; i < n; i++) {
    const xi = Number(x[i]);
    const yi = Number(y[i]);
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
  }
  const num = (n * sumXY) - (sumX * sumY);
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
}

export function getNumericCols(data) {
    if (data.length === 0) return [];
    const obj = data[0];
    return Object.keys(obj).filter(k => {
        const val = parseFloat(obj[k]);
        return !isNaN(val) && val !== null;
    });
}
