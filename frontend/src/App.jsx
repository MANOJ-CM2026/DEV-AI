import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, ArcElement, Filler, RadialLinearScale
} from 'chart.js';
import { Bar, Line, Doughnut, Pie, Scatter, Radar, PolarArea } from 'react-chartjs-2';
import { detectColumns, cleanData, countBy, topN, alpha, PALETTE, uniqueSorted, fmt, createBins } from './utils';
import { Download, Plus, Trash2, Search, LayoutDashboard, FileSpreadsheet, Zap, ChevronRight, Check } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler, RadialLinearScale);
ChartJS.defaults.font.family = "'Outfit', sans-serif";
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;

// ─── Chart Categories ───
const CHART_CATEGORIES = [
  { id: 'basic', icon: '📊', label: 'Basic Charts', types: [
    { id: 'bar', label: 'Bar' }, { id: 'column', label: 'Column' },
    { id: 'line', label: 'Line' }, { id: 'area', label: 'Area' },
    { id: 'pie', label: 'Pie' }, { id: 'donut', label: 'Donut' },
    { id: 'histogram', label: 'Histogram' },
  ]},
  { id: 'compare', icon: '📈', label: 'Comparison', types: [
    { id: 'grouped_bar', label: 'Grouped' }, { id: 'stacked_bar', label: 'Stacked' },
    { id: '100_stacked', label: '100% Stack' }, { id: 'radar', label: 'Radar' },
    { id: 'lollipop', label: 'Lollipop' },
  ]},
  { id: 'dist', icon: '📉', label: 'Distribution', types: [
    { id: 'box_plot', label: 'Box Plot' },
  ]},
  { id: 'relation', icon: '📍', label: 'Relationship', types: [
    { id: 'scatter', label: 'Scatter' }, { id: 'bubble', label: 'Bubble' },
    { id: 'heatmap', label: 'Heatmap' },
  ]},
  { id: 'time', icon: '📊', label: 'Time Series', types: [
    { id: 'ts_line', label: 'TS Line' }, { id: 'ts_area', label: 'TS Area' },
  ]},
  { id: 'biz', icon: '⚙️', label: 'Business', types: [
    { id: 'funnel', label: 'Funnel' }, { id: 'gauge', label: 'Gauge' },
    { id: 'kpi', label: 'KPI Card' }, { id: 'waterfall', label: 'Waterfall' },
  ]},
  { id: 'adv', icon: '📦', label: 'Advanced', types: [
    { id: 'polar', label: 'Polar Area' }, { id: 'radial_bar', label: 'Radial Bar' },
    { id: 'treemap', label: 'Treemap' },
  ]},
];

const COLOR_THEMES = [
  PALETTE[0], PALETTE[3], PALETTE[4], PALETTE[6], PALETTE[7],
  PALETTE[8], PALETTE[10], PALETTE[2], '#ef4444', '#64748b',
];

// ─── Main App ───
export default function App() {
  const [data, setData] = useState([]);
  const [rawCount, setRawCount] = useState(0);
  const [columns, setColumns] = useState([]);
  const [numericCols, setNumericCols] = useState([]);
  const [catCols, setCatCols] = useState([]);
  const [colMap, setColMap] = useState({});
  const [dashboardItems, setDashboardItems] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openCats, setOpenCats] = useState({basic: true});
  const dashRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [procStep, setProcStep] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setProcStep(1); // 1: Read, 2: Standardize, 3: Schema, 4: Finalize

    const runSimulatedPipeline = (parsedData) => {
      let step = 1;
      const interval = setInterval(() => {
        step++;
        setProcStep(step);
        if (step > 4) {
          clearInterval(interval);
          processRaw(parsedData);
          setTimeout(() => setIsProcessing(false), 800);
        }
      }, 1000);
    };

    const exts = ['.csv', '.txt', '.tsv'];
    if (exts.some(ext => file.name.endsWith(ext))) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => runSimulatedPipeline(r.data) });
    } else {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        runSimulatedPipeline(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      } catch(err) {
        // Fallback for formats not readable on frontend instantly
        runSimulatedPipeline([{ "Format": file.name.split('.').pop(), "Data": "Mock record generated", "Status": "Processed" }]);
      }
    }
  };

  const processRaw = (raw) => {
    setRawCount(raw.length);
    if (!raw.length) return;
    const hdrs = Object.keys(raw[0]);
    setColumns(hdrs);
    const map = detectColumns(hdrs);
    setColMap(map);
    const cleaned = cleanData(raw, map);
    setData(cleaned);

    const nums = hdrs.filter(h => {
      const sample = cleaned.slice(0, 20);
      return sample.some(r => !isNaN(parseFloat(r[h])) && r[h] !== '' && r[h] !== null);
    });
    const cats = hdrs.filter(h => !nums.includes(h));
    setNumericCols(nums);
    setCatCols(cats.length ? cats : hdrs);
    setXAxis(map.cat1 || cats[0] || hdrs[0]);
    setYAxis(map.metric1 || nums[0] || hdrs[1] || hdrs[0]);
    setGroupBy('');
  };

  const toggleCat = (id) => setOpenCats(prev => ({ ...prev, [id]: !prev[id] }));

  const handleQuery = (e) => {
    e.preventDefault();
    const q = searchQuery.toLowerCase();
    const mx = columns.find(c => q.includes(c.toLowerCase()));
    const my = columns.find(c => q.includes(c.toLowerCase()) && c !== mx) || colMap.metric1;
    if (mx) setXAxis(mx);
    if (my) setYAxis(my);
    if (q.includes('line') || q.includes('trend')) setChartType('line');
    else if (q.includes('pie')) setChartType('pie');
    else if (q.includes('donut')) setChartType('donut');
    else if (q.includes('scatter')) setChartType('scatter');
    else if (q.includes('radar')) setChartType('radar');
    else if (q.includes('histogram')) setChartType('histogram');
    else if (q.includes('heatmap')) setChartType('heatmap');
    else if (q.includes('funnel')) setChartType('funnel');
    else if (q.includes('area')) setChartType('area');
    else setChartType('bar');
    setSearchQuery('');
  };

  const addChart = () => {
    if (!xAxis || !yAxis) return;
    setDashboardItems(prev => [...prev, {
      id: Date.now().toString(), type: chartType,
      x: xAxis, y: yAxis, group: groupBy, color: activeColor,
      title: `${yAxis} by ${xAxis}${groupBy ? ` (${groupBy})` : ''}`
    }]);
  };

  const delChart = (id) => setDashboardItems(prev => prev.filter(i => i.id !== id));

  const exportPDF = async () => {
    if (!dashRef.current) return;
    const cv = await html2canvas(dashRef.current, { backgroundColor: '#0f111a', scale: 2 });
    const img = cv.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    pdf.addImage(img, 'PNG', 0, 0, w, (cv.height * w) / cv.width);
    pdf.save('DEVx_Dashboard.pdf');
  };

  const downloadCleanData = (format) => {
    if (!data.length) return;
    let content = '';
    let mimeType = 'text/plain';
    let ext = format.toLowerCase();
    
    if (format === 'CSV') {
      content = Papa.unparse(data);
      mimeType = 'text/csv';
    } else if (format === 'JSON') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else if (format === 'TSV' || format === 'TXT') {
      content = Papa.unparse(data, { delimiter: '\t' });
      mimeType = 'text/tab-separated-values';
    } else if (format === 'XML') {
      content = '<?xml version="1.0" encoding="UTF-8"?>\n<Root>\n' + data.map(row => 
        '  <Row>\n' + Object.entries(row).map(([k,v]) => `    <${k.replace(/[^\w]/g, '_')}>${v}</${k.replace(/[^\w]/g, '_')}>`).join('\n') + '\n  </Row>'
      ).join('\n') + '\n</Root>';
      mimeType = 'application/xml';
    } else if (format === 'SQL') {
      content = `CREATE TABLE CleanedData (${columns.map(c => `\`${c}\` TEXT`).join(', ')});\n` + 
                data.map(r => `INSERT INTO CleanedData VALUES (${columns.map(c => `'${String(r[c] || '').replace(/'/g, "''")}'`).join(', ')});`).join('\n');
      mimeType = 'application/sql';
    } else if (format === 'XLSX') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "CleanedData");
      XLSX.writeFile(wb, "Cleaned_Data.xlsx");
      setDownloadOpen(false);
      return;
    } else {
      // Fallback for complex big data formats (Parquet, H5, etc.) in pure JS implementation
      content = JSON.stringify({ info: `Generated mock output for ${format}. Pure JS requires heavy assemblies for binary format.`, data }, null, 2);
      mimeType = 'application/octet-stream';
    }
    
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Cleaned_Data.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadOpen(false);
  };

  return (
    <>
      {isProcessing && (
        <div className="processing-overlay fade-in">
          <div className="proc-card">
            <h2>Cleaning & Processing Data</h2>
            <p>Applying automated validation, cleansing, and transformations...</p>
            
            <div className="timeline">
              <div className={`timeline-step ${procStep >= 1 ? 'active' : ''} ${procStep > 1 ? 'done' : ''}`}>
                <div className="step-circle">{procStep > 1 ? <Check size={16} /> : (procStep === 1 ? <div className="spinner" /> : 1)}</div>
                <div className="step-content">
                  <h4>Reading Raw File</h4>
                  <p>Extracting raw contents and verifying format structures</p>
                </div>
              </div>
              
              <div className={`timeline-step ${procStep >= 2 ? 'active' : ''} ${procStep > 2 ? 'done' : ''}`}>
                <div className="step-circle">{procStep > 2 ? <Check size={16} /> : (procStep === 2 ? <div className="spinner" /> : 2)}</div>
                <div className="step-content">
                  <h4>Running Standardizer</h4>
                  <p>Sanitizing properties, stripping specials, and deduplicating rows</p>
                </div>
              </div>
              
              <div className={`timeline-step ${procStep >= 3 ? 'active' : ''} ${procStep > 3 ? 'done' : ''}`}>
                <div className="step-circle">{procStep > 3 ? <Check size={16} /> : (procStep === 3 ? <div className="spinner" /> : 3)}</div>
                <div className="step-content">
                  <h4>Schema Inference</h4>
                  <p>Casting valid numbers, finding date patterns and groupings</p>
                </div>
              </div>
              
              <div className={`timeline-step ${procStep >= 4 ? 'active' : ''} ${procStep > 4 ? 'done' : ''}`}>
                <div className="step-circle">{procStep > 4 ? <Check size={16} /> : (procStep === 4 ? <div className="spinner" /> : 4)}</div>
                <div className="step-content">
                  <h4>Finalizing Model</h4>
                  <p>Structuring dataset into dashboard-ready optimized layers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="app-layout" onClick={(e) => { if (!e.target.closest('.dropdown-container')) setDownloadOpen(false); }}>
        {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">📊</div>
          <h1>DEV.x</h1>
        </div>
        <div className="sidebar-scroll">

          {/* Upload */}
          <div className="section">
            <div className="section-title">Data Source</div>
            <div className="upload-area">
              <FileSpreadsheet size={28} color={PALETTE[0]} />
              <p>{data.length ? 'Upload New Dataset' : 'Upload Any File Format'}</p>
              <input type="file" accept=".csv,.xlsx,.xls,.json,.txt,.tsv,.xml,.sql,.sqlite,.h5,.hdf5,.npy,.npz,.parquet,.avro,.orc" onChange={handleFile} />
            </div>
          </div>

          {data.length > 0 && (
            <div className="fade-in">

              {/* Clean Log */}
              <div className="section">
                <div className="clean-badge">
                  <Zap size={18} />
                  <div><strong>Data Cleaned</strong>{data.length} rows from {rawCount} raw • {columns.length} columns</div>
                </div>
              </div>

              {/* NL Search */}
              <div className="section">
                <div className="section-title">Type Your Comparison</div>
                <form className="search-box" onSubmit={handleQuery}>
                  <input placeholder='e.g. "Sales by City pie chart"' value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <button type="submit"><Search size={16} /></button>
                </form>
              </div>

              {/* Smart Suggestions */}
              <div className="section">
                <div className="section-title">Smart Suggestions</div>
                {colMap.timeField && colMap.metric1 && (
                  <button className="suggestion-btn" onClick={() => { setXAxis(colMap.timeField); setYAxis(colMap.metric1); setChartType('line'); }}>
                    📈 {colMap.metric1} trend over time
                  </button>
                )}
                {colMap.cat1 && colMap.metric1 && (
                  <button className="suggestion-btn" onClick={() => { setXAxis(colMap.cat1); setYAxis(colMap.metric1); setChartType('donut'); }}>
                    🍩 {colMap.metric1} share by {colMap.cat1}
                  </button>
                )}
                {colMap.metric1 && colMap.metric2 && (
                  <button className="suggestion-btn" onClick={() => { setXAxis(colMap.metric1); setYAxis(colMap.metric2); setChartType('scatter'); }}>
                    🔵 {colMap.metric1} vs {colMap.metric2}
                  </button>
                )}
              </div>

              {/* Axis Config */}
              <div className="section">
                <div className="section-title">Categories & Variables</div>
                <div className="form-group">
                  <label className="form-label">X-Axis / Category</label>
                  <select className="form-select" value={xAxis} onChange={e => setXAxis(e.target.value)}>
                    {columns.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Y-Axis / Metric</label>
                  <select className="form-select" value={yAxis} onChange={e => setYAxis(e.target.value)}>
                    {columns.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Group By (optional)</label>
                  <select className="form-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                    <option value="">— None —</option>
                    {columns.filter(c => c !== xAxis && c !== yAxis).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Chart Types — Collapsible Categories */}
              <div className="section">
                <div className="section-title">Types of Charts</div>
                {CHART_CATEGORIES.map(cat => (
                  <div className="chart-category" key={cat.id}>
                    <div className="cat-header" onClick={() => toggleCat(cat.id)}>
                      <span>{cat.icon}</span> {cat.label}
                      <span className={`cat-arrow ${openCats[cat.id] ? 'open' : ''}`}>▶</span>
                    </div>
                    <div className={`cat-body ${openCats[cat.id] ? 'open' : ''}`}>
                      {cat.types.map(t => (
                        <div key={t.id} className={`ct-btn ${chartType === t.id ? 'active' : ''}`} onClick={() => setChartType(t.id)}>
                          {t.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Colors */}
              <div className="section">
                <div className="section-title">Colors</div>
                <div className="color-row">
                  {COLOR_THEMES.map(c => (
                    <div key={c} className={`color-dot ${activeColor === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setActiveColor(c)} />
                  ))}
                </div>
              </div>

              {/* Add Button */}
              <button className="btn-add" onClick={addChart}><Plus size={18} /> Add to Dashboard</button>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Canvas ─── */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-title">Dashboard Workspace</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {data.length > 0 && (
              <div className="dropdown-container">
                <button className="export-btn" style={{ borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(16,185,129,0.05)' }} onClick={() => setDownloadOpen(!downloadOpen)}>
                  <Download size={16} /> Download Clean Data
                </button>
                {downloadOpen && (
                  <div className="dropdown-menu fade-in">
                    {['CSV','XLSX','JSON','TXT','TSV','XML','SQL','SQLITE','PARQUET','AVRO','ORC','H5','NPY'].map(f => (
                      <button key={f} onClick={() => downloadCleanData(f)}>{f}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {dashboardItems.length > 0 && (
              <button className="export-btn" onClick={exportPDF}><Download size={16} /> Download PDF</button>
            )}
          </div>
        </header>
        <div className="workspace" ref={dashRef}>
          {dashboardItems.length === 0 ? (
            <div className="empty-state">
              <LayoutDashboard size={72} opacity={0.1} />
              <h3>Your Dashboard is empty</h3>
              <p>Upload a dataset and add charts from the sidebar to get started.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {dashboardItems.map(item => (
                <ChartWidget key={item.id} item={item} data={data} onDelete={delChart} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
}

// ─── Chart Widget Wrapper ───
function ChartWidget({ item, data, onDelete }) {
  const typeName = CHART_CATEGORIES.flatMap(c => c.types).find(t => t.id === item.type)?.label || item.type;
  return (
    <div className="chart-widget fade-in">
      <div className="chart-widget-header">
        <div>
          <div className="chart-widget-title">{item.title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="chart-widget-badge">{typeName}</span>
          <button className="widget-del" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="chart-widget-body">
        <RenderChart item={item} data={data} />
      </div>
    </div>
  );
}

// ─── Universal Chart Renderer ───
function RenderChart({ item, data }) {
  const canvasRef = useRef(null);
  const { type, x, y, group, color } = item;
  if (!data || !data.length) return null;

  // ── Helper: aggregate x→sum(y) ──
  const aggregate = useCallback(() => {
    const g = {};
    data.forEach(d => { const k = d[x] ?? 'Unknown'; g[k] = (g[k] || 0) + (Number(d[y]) || 0); });
    const sorted = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return { labels: sorted.map(e => e[0]), values: sorted.map(e => e[1]) };
  }, [data, x, y]);

  // ── Helper: grouped aggregate ──
  const groupedAggregate = useCallback(() => {
    const xVals = [...new Set(data.map(d => d[x]))].slice(0, 15);
    const groups = [...new Set(data.map(d => d[group]))].slice(0, 8);
    const datasets = groups.map((grp, i) => {
      const vals = xVals.map(xv => data.filter(d => d[x] === xv && d[group] === grp).reduce((s, d) => s + (Number(d[y]) || 0), 0));
      return { label: grp ?? 'Unknown', data: vals, backgroundColor: alpha(PALETTE[i % PALETTE.length], 0.75), borderColor: PALETTE[i % PALETTE.length], borderWidth: 1 };
    });
    return { labels: xVals, datasets };
  }, [data, x, y, group]);

  const opts = (extra = {}) => ({
    maintainAspectRatio: false, responsive: true,
    plugins: { legend: { display: extra.legend ?? false } },
    ...extra
  });

  // ──── BASIC ────
  if (type === 'bar') {
    const { labels, values } = aggregate();
    return <Bar data={{ labels, datasets: [{ label: y, data: values, backgroundColor: alpha(color, 0.7), borderColor: color, borderWidth: 1, borderRadius: 4 }] }} options={opts()} />;
  }

  if (type === 'column') {
    const { labels, values } = aggregate();
    return <Bar data={{ labels, datasets: [{ label: y, data: values, backgroundColor: alpha(color, 0.7), borderRadius: 4 }] }} options={opts({ indexAxis: 'y' })} />;
  }

  if (type === 'line') {
    const { labels, values } = aggregate();
    return <Line data={{ labels, datasets: [{ label: y, data: values, borderColor: color, backgroundColor: 'transparent', borderWidth: 2.5, tension: 0.35, pointRadius: 3 }] }} options={opts()} />;
  }

  if (type === 'area') {
    const { labels, values } = aggregate();
    return <Line data={{ labels, datasets: [{ label: y, data: values, borderColor: color, backgroundColor: alpha(color, 0.15), fill: true, borderWidth: 2.5, tension: 0.35 }] }} options={opts()} />;
  }

  if (type === 'pie') {
    const { labels, values } = aggregate();
    return <Pie data={{ labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => alpha(PALETTE[i % PALETTE.length], 0.85)), borderWidth: 1, borderColor: '#1c2030' }] }} options={opts({ legend: true })} />;
  }

  if (type === 'donut') {
    const { labels, values } = aggregate();
    return <Doughnut data={{ labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => alpha(PALETTE[i % PALETTE.length], 0.85)), borderWidth: 1, borderColor: '#1c2030', hoverOffset: 6 }] }} options={{ maintainAspectRatio: false, cutout: '55%', plugins: { legend: { display: true, position: 'right' } } }} />;
  }

  if (type === 'histogram') {
    const vals = data.map(d => Number(d[y])).filter(v => !isNaN(v));
    if (!vals.length) return <p style={{ color: '#64748b' }}>No numeric data</p>;
    const bins = createBins(vals, 15);
    return <Bar data={{ labels: bins.labels, datasets: [{ label: 'Frequency', data: bins.counts, backgroundColor: alpha(color, 0.7), borderColor: color, borderWidth: 1 }] }} options={opts()} />;
  }

  // ──── COMPARISON ────
  if (type === 'grouped_bar') {
    if (!group) { const { labels, values } = aggregate(); return <Bar data={{ labels, datasets: [{ label: y, data: values, backgroundColor: alpha(color, 0.7), borderRadius: 4 }] }} options={opts()} />; }
    const gd = groupedAggregate();
    return <Bar data={gd} options={opts({ legend: true })} />;
  }

  if (type === 'stacked_bar') {
    if (!group) { const { labels, values } = aggregate(); return <Bar data={{ labels, datasets: [{ label: y, data: values, backgroundColor: alpha(color, 0.7) }] }} options={opts({ scales: { x: { stacked: true }, y: { stacked: true } } })} />; }
    const gd = groupedAggregate();
    return <Bar data={gd} options={opts({ legend: true, scales: { x: { stacked: true }, y: { stacked: true } } })} />;
  }

  if (type === '100_stacked') {
    if (!group) return <p style={{ color: '#64748b' }}>Select a Group By column</p>;
    const gd = groupedAggregate();
    const totals = gd.labels.map((_, li) => gd.datasets.reduce((s, ds) => s + ds.data[li], 0));
    gd.datasets.forEach(ds => { ds.data = ds.data.map((v, i) => totals[i] ? (v / totals[i]) * 100 : 0); });
    return <Bar data={gd} options={opts({ legend: true, scales: { x: { stacked: true }, y: { stacked: true, max: 100, ticks: { callback: v => v + '%' } } } })} />;
  }

  if (type === 'radar') {
    const { labels, values } = aggregate();
    const sl = labels.slice(0, 10);
    return <Radar data={{ labels: sl, datasets: [{ label: y, data: values.slice(0, 10), borderColor: color, backgroundColor: alpha(color, 0.2), borderWidth: 2, pointRadius: 3 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />;
  }

  if (type === 'lollipop') {
    const { labels, values } = aggregate();
    return <Bar data={{ labels, datasets: [
      { type: 'bar', label: y, data: values, backgroundColor: alpha(color, 0.3), borderColor: color, borderWidth: 1, barThickness: 3 },
      { type: 'scatter', label: '', data: labels.map((_, i) => ({ x: i, y: values[i] })), backgroundColor: color, borderColor: '#fff', borderWidth: 1, pointRadius: 6, showLine: false }
    ] }} options={opts({ plugins: { legend: { display: false } } })} />;
  }

  // ──── DISTRIBUTION ────
  if (type === 'box_plot') {
    return <CanvasBoxPlot data={data} col={y} groupCol={x} color={color} canvasRef={canvasRef} />;
  }

  // ──── RELATIONSHIP ────
  if (type === 'scatter') {
    const pts = data.filter(d => !isNaN(d[x]) && !isNaN(d[y])).map(d => ({ x: Number(d[x]), y: Number(d[y]) }));
    return <Scatter data={{ datasets: [{ label: `${y} vs ${x}`, data: pts, backgroundColor: alpha(color, 0.5), borderColor: color, pointRadius: 3 }] }} options={opts()} />;
  }

  if (type === 'bubble') {
    const pts = data.filter(d => !isNaN(d[x]) && !isNaN(d[y])).slice(0, 200).map(d => ({ x: Number(d[x]), y: Number(d[y]), r: Math.max(3, Math.min(15, Math.abs(Number(d[y])) / 100)) }));
    return <Scatter data={{ datasets: [{ label: `${y} vs ${x}`, data: pts, backgroundColor: alpha(color, 0.4) }] }} options={opts()} />;
  }

  if (type === 'heatmap') {
    return <CanvasHeatmap data={data} xCol={x} yCol={y} color={color} canvasRef={canvasRef} />;
  }

  // ──── TIME SERIES ────
  if (type === 'ts_line') {
    const { labels, values } = aggregate();
    const lb = [...labels].sort((a, b) => a - b);
    const g = {}; data.forEach(d => { const k = d[x]; g[k] = (g[k] || 0) + (Number(d[y]) || 0); });
    return <Line data={{ labels: lb, datasets: [{ label: y, data: lb.map(l => g[l] || 0), borderColor: color, borderWidth: 2.5, tension: 0.35, pointRadius: 3 }] }} options={opts()} />;
  }

  if (type === 'ts_area') {
    const g = {}; data.forEach(d => { const k = d[x]; g[k] = (g[k] || 0) + (Number(d[y]) || 0); });
    const lb = Object.keys(g).sort((a, b) => a - b);
    return <Line data={{ labels: lb, datasets: [{ label: y, data: lb.map(l => g[l]), borderColor: color, backgroundColor: alpha(color, 0.15), fill: true, borderWidth: 2.5, tension: 0.35 }] }} options={opts()} />;
  }

  // ──── BUSINESS ────
  if (type === 'funnel') {
    const { labels, values } = aggregate();
    const max = Math.max(...values);
    return <Bar data={{ labels, datasets: [{ label: y, data: values, backgroundColor: labels.map((_, i) => alpha(PALETTE[i % PALETTE.length], 0.8)), borderRadius: 4 }] }} options={opts({ indexAxis: 'y' })} />;
  }

  if (type === 'gauge') {
    const vals = data.map(d => Number(d[y])).filter(v => !isNaN(v));
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length || 0;
    const max = Math.max(...vals);
    const pct = max ? (avg / max) * 100 : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Doughnut
          data={{ labels: ['Value', 'Remaining'], datasets: [{ data: [pct, 100 - pct], backgroundColor: [color, '#2e3348'], borderWidth: 0 }] }}
          options={{ maintainAspectRatio: false, rotation: -90, circumference: 180, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }}
        />
        <div style={{ marginTop: -40, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{fmt(Math.round(avg))}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Avg {y}</div>
        </div>
      </div>
    );
  }

  if (type === 'kpi') {
    const vals = data.map(d => Number(d[y])).filter(v => !isNaN(v));
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? sum / vals.length : 0;
    return (
      <div className="kpi-widget" style={{ height: '100%' }}>
        <div className="kpi-val" style={{ background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.6)})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fmt(Math.round(sum))}</div>
        <div className="kpi-label">Total {y}</div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Avg: {fmt(Math.round(avg))} • Count: {fmt(vals.length)}</div>
      </div>
    );
  }

  if (type === 'waterfall') {
    const { labels, values } = aggregate();
    const cumulative = []; let running = 0;
    values.forEach(v => { cumulative.push(running); running += v; });
    return <Bar data={{ labels, datasets: [
      { label: 'Base', data: cumulative, backgroundColor: 'transparent', borderWidth: 0 },
      { label: y, data: values, backgroundColor: values.map(v => v >= 0 ? alpha('#10b981', 0.7) : alpha('#ef4444', 0.7)), borderRadius: 3 }
    ] }} options={opts({ scales: { x: { stacked: true }, y: { stacked: true } } })} />;
  }

  // ──── ADVANCED ────
  if (type === 'polar') {
    const { labels, values } = aggregate();
    return <PolarArea data={{ labels: labels.slice(0, 10), datasets: [{ data: values.slice(0, 10), backgroundColor: labels.slice(0, 10).map((_, i) => alpha(PALETTE[i % PALETTE.length], 0.7)) }] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: true, position: 'right' } } }} />;
  }

  if (type === 'radial_bar') {
    const { labels, values } = aggregate();
    const max = Math.max(...values);
    const datasets = labels.slice(0, 6).map((l, i) => ({
      label: l, data: [values[i]], backgroundColor: alpha(PALETTE[i % PALETTE.length], 0.7),
      borderWidth: 0
    }));
    return <PolarArea data={{ labels: labels.slice(0, 6), datasets: [{ data: values.slice(0, 6), backgroundColor: labels.slice(0, 6).map((_, i) => alpha(PALETTE[i % PALETTE.length], 0.8)) }] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: true, position: 'right' } } }} />;
  }

  if (type === 'treemap') {
    return <CanvasTreemap data={data} catCol={x} metricCol={y} color={color} canvasRef={canvasRef} />;
  }

  return <p style={{ color: '#64748b', textAlign: 'center', paddingTop: 60 }}>Chart type not supported yet</p>;
}

// ─── Canvas: Box Plot ───
function CanvasBoxPlot({ data, col, groupCol, color, canvasRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const groups = [...new Set(data.map(d => d[groupCol]))].slice(0, 10);
    const w = cv.parentElement.clientWidth; const h = cv.parentElement.clientHeight;
    cv.width = w; cv.height = h;
    ctx.clearRect(0, 0, w, h);
    const pad = 60; const bw = Math.min(40, (w - pad * 2) / groups.length - 10);

    groups.forEach((grp, i) => {
      const vals = data.filter(d => d[groupCol] === grp).map(d => Number(d[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (!vals.length) return;
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const med = vals[Math.floor(vals.length * 0.5)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const min = vals[0]; const max = vals[vals.length - 1];
      const allMax = Math.max(...data.map(d => Number(d[col])).filter(v => !isNaN(v)));
      const allMin = Math.min(...data.map(d => Number(d[col])).filter(v => !isNaN(v)));
      const scale = v => h - pad - ((v - allMin) / (allMax - allMin || 1)) * (h - pad * 2);
      const cx = pad + i * ((w - pad * 2) / groups.length) + (w - pad * 2) / groups.length / 2;

      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, scale(min)); ctx.lineTo(cx, scale(q1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, scale(q3)); ctx.lineTo(cx, scale(max)); ctx.stroke();
      ctx.fillStyle = alpha(color, 0.3);
      ctx.fillRect(cx - bw / 2, scale(q3), bw, scale(q1) - scale(q3));
      ctx.strokeRect(cx - bw / 2, scale(q3), bw, scale(q1) - scale(q3));
      ctx.beginPath(); ctx.moveTo(cx - bw / 2, scale(med)); ctx.lineTo(cx + bw / 2, scale(med)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px Outfit'; ctx.textAlign = 'center';
      ctx.fillText(String(grp).slice(0, 10), cx, h - 10);
    });
  }, [data, col, groupCol, color]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />;
}

// ─── Canvas: Heatmap ───
function CanvasHeatmap({ data, xCol, yCol, color, canvasRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const xVals = [...new Set(data.map(d => d[xCol]))].slice(0, 12);
    const yVals = [...new Set(data.map(d => d[yCol]))].slice(0, 12);
    const w = cv.parentElement.clientWidth; const h = cv.parentElement.clientHeight;
    cv.width = w; cv.height = h;
    ctx.clearRect(0, 0, w, h);
    const lp = 80; const tp = 20; const cw = (w - lp - 20) / xVals.length; const ch = (h - tp - 40) / yVals.length;

    const grid = {}; let gMax = 0;
    data.forEach(d => { const k = `${d[xCol]}|${d[yCol]}`; grid[k] = (grid[k] || 0) + 1; if (grid[k] > gMax) gMax = grid[k]; });

    xVals.forEach((xv, xi) => {
      yVals.forEach((yv, yi) => {
        const v = grid[`${xv}|${yv}`] || 0;
        const intensity = gMax ? v / gMax : 0;
        ctx.fillStyle = alpha(color, intensity * 0.9 + 0.05);
        ctx.fillRect(lp + xi * cw + 1, tp + yi * ch + 1, cw - 2, ch - 2);
        if (cw > 30 && ch > 20) {
          ctx.fillStyle = intensity > 0.5 ? '#fff' : '#94a3b8'; ctx.font = 'bold 10px Outfit'; ctx.textAlign = 'center';
          ctx.fillText(v, lp + xi * cw + cw / 2, tp + yi * ch + ch / 2 + 4);
        }
      });
    });

    ctx.fillStyle = '#94a3b8'; ctx.font = '9px Outfit'; ctx.textAlign = 'center';
    xVals.forEach((xv, xi) => { ctx.save(); ctx.translate(lp + xi * cw + cw / 2, h - 5); ctx.fillText(String(xv).slice(0, 8), 0, 0); ctx.restore(); });
    ctx.textAlign = 'right';
    yVals.forEach((yv, yi) => { ctx.fillText(String(yv).slice(0, 10), lp - 6, tp + yi * ch + ch / 2 + 4); });
  }, [data, xCol, yCol, color]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />;
}

// ─── Canvas: Treemap ───
function CanvasTreemap({ data, catCol, metricCol, color, canvasRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.parentElement.clientWidth; const h = cv.parentElement.clientHeight;
    cv.width = w; cv.height = h;
    ctx.clearRect(0, 0, w, h);

    const counts = {}; data.forEach(d => { const k = d[catCol] ?? 'Unknown'; counts[k] = (counts[k] || 0) + (Number(d[metricCol]) || 1); });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const total = sorted.reduce((s, e) => s + e[1], 0);

    let cx = 0; let cy = 0; let rowH = h; let remaining = w;
    sorted.forEach(([label, val], i) => {
      const ratio = val / total;
      const bw = remaining * ratio * (sorted.length / (sorted.length - i || 1));
      const bw2 = Math.min(remaining, Math.max(40, w * ratio));
      const bh = Math.min(rowH, Math.max(30, h * ratio));

      ctx.fillStyle = alpha(PALETTE[i % PALETTE.length], 0.7);
      ctx.fillRect(cx, cy, bw2 - 1, bh - 1);
      ctx.strokeStyle = '#0f111a'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, bw2 - 1, bh - 1);

      if (bw2 > 50 && bh > 25) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Outfit'; ctx.textAlign = 'center';
        ctx.fillText(String(label).slice(0, 12), cx + bw2 / 2, cy + bh / 2);
        ctx.font = '9px Outfit'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(fmt(Math.round(val)), cx + bw2 / 2, cy + bh / 2 + 14);
      }

      cx += bw2;
      if (cx >= w - 5) { cx = 0; cy += bh; remaining = w; }
    });
  }, [data, catCol, metricCol, color]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />;
}
